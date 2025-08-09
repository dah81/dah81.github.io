"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Midi } from "@tonejs/midi";

const MUSIC_KEY = "zamboni.music.v1"; // "1" or "0"
const VOL_KEY = "zamboni.music.vol.v1"; // number 0..1

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const ftom = (f: number) => 69 + 12 * Math.log2(f / 440);

const MIDI_URL = "/midi/custom.mid"; // Put your MIDI file at public/midi/custom.mid

declare global {
  interface Window {
    ZAMBONI_AUDIO?: {
      setEngine: (level: number, speedNorm?: number) => void;
      bump: (intensity?: number) => void;
      cheer: (intensity?: number) => void;
    };
  }
}

function createPulse(ctx: AudioContext, duty = 0.25) {
  const N = 2048;
  const real = new Float32Array(N);
  const imag = new Float32Array(N);
  for (let n = 1; n < N; n++) {
    real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    imag[n] = 0;
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: true });
}

function createNoiseBuffer(ctx: AudioContext) {
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  return buf;
}

class NesLoop {
  private ctx: AudioContext;
  private master: GainNode;
  private running = false;
  private intervalId: number | null = null;
  private nextTime = 0;
  private step = 0;
  private stepsPerBeat = 4;
  private secondsPerStep: number;
  private pulse1: PeriodicWave;
  private pulse2: PeriodicWave;
  private noise: AudioBuffer;
  private bass: number[];
  private mel1: (number | null)[];
  private mel2: (number | null)[];
  private drums: { kick: boolean; snare: boolean; hat: boolean; hatOpen?: boolean }[];

  constructor(
    ctx: AudioContext,
    master: GainNode,
    tempoBpm = 154,
    keyRootMidi = 57,
    duty1 = 0.125,
    duty2 = 0.25,
  ) {
    this.ctx = ctx;
    this.master = master;
    this.secondsPerStep = 60 / tempoBpm / this.stepsPerBeat;
    this.pulse1 = createPulse(ctx, duty1);
    this.pulse2 = createPulse(ctx, duty2);
    this.noise = createNoiseBuffer(ctx);
    const roots = [keyRootMidi, keyRootMidi - 2, keyRootMidi - 3, keyRootMidi - 2]; // I - bVII - bVI - bVII
    // Driving bass with fifth-leaps (triangle), 8th-note feel
    this.bass = Array.from({ length: 16 }, (_, i) => {
      const chord = Math.floor(i / 4); // 4 steps per beat
      const r = roots[chord];
      const useFifth = i % 2 === 1;
      return useFifth ? r - 12 + 7 : r - 12;
    });

    const triads = { i: [0, 3, 7], bVII: [-2, 2, 5], bVI: [-3, 1, 5], bVII2: [-2, 2, 5] } as const;
    const t = [triads.i, triads.bVII, triads.bVI, triads.bVII2];
    const note = (ci: number, oct = 0, which = 0) => roots[ci] + t[ci][which] + 12 * oct;

    // Syncopated arps (voice 1): root-3rd-5th with a backbeat skip
    this.mel1 = [
      note(0, 1, 0),
      null,
      note(0, 1, 2),
      null,
      note(0, 1, 1),
      null,
      note(0, 1, 2),
      null,
      note(1, 1, 0),
      null,
      note(1, 1, 2),
      null,
      note(1, 1, 1),
      null,
      note(1, 1, 2),
      null,
      note(2, 1, 0),
      null,
      note(2, 1, 2),
      null,
      note(2, 1, 1),
      null,
      note(2, 1, 2),
      null,
      note(3, 1, 0),
      null,
      note(3, 1, 2),
      null,
      note(3, 1, 1),
      null,
      note(3, 1, 2),
      null,
    ];

    // Counter (voice 2): off-beat hits lower octave
    this.mel2 = [
      null,
      note(0, 0, 0),
      null,
      note(0, 0, 2),
      null,
      note(0, 0, 1),
      null,
      note(0, 0, 2),
      null,
      note(1, 0, 0),
      null,
      note(1, 0, 2),
      null,
      note(1, 0, 1),
      null,
      note(1, 0, 2),
      null,
      note(2, 0, 0),
      null,
      note(2, 0, 2),
      null,
      note(2, 0, 1),
      null,
      note(2, 0, 2),
      null,
      note(3, 0, 0),
      null,
      note(3, 0, 2),
      null,
      note(3, 0, 1),
      null,
      note(3, 0, 2),
    ];

    // Rock backbeat: kick on 1/3, snare on 2/4, hats on 8ths, open hats at 4-& and fill
    this.drums = Array.from({ length: 16 }, (_, i) => {
      const kick = i % 8 === 0 || i === 6; // 1 & 3, plus pickup
      const snare = i % 8 === 4 || i === 15; // 2 & 4, little fill on last 16th
      const hat = i % 2 === 0; // 8ths
      const hatOpen = i === 7 || i === 15; // open hat on the & of 2 and 4
      return { kick, snare, hat, hatOpen };
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    const lookahead = 0.025;
    const scheduleAhead = 0.2;
    const tick = () => {
      if (!this.running) return;
      const tNow = this.ctx.currentTime;
      while (this.nextTime < tNow + scheduleAhead) {
        this.scheduleStep(this.step, this.nextTime);
        this.nextTime += this.secondsPerStep;
        this.step = (this.step + 1) % 16;
      }
    };
    tick();
    this.intervalId = window.setInterval(tick, lookahead * 1000);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private scheduleStep(step: number, t: number) {
    // Triangle bass, slightly shorter to leave room for drums
    this.playTri(this.bass[step], t, 0.16, 0.75);

    // Pulse voices with subtle vibrato
    const n1 = this.mel1[step];
    if (typeof n1 === "number") this.playPulse(n1, t, 0.11, 0.17, 0.55, this.pulse1, 10, 6);
    const n2 = this.mel2[step];
    if (typeof n2 === "number") this.playPulse(n2, t, 0.09, 0.15, 0.38, this.pulse2, 4, 5.5);

    // Drums
    const d = this.drums[step];
    if (d.kick) this.playKick(t);
    if (d.snare) this.playSnare(t);
    if (d.hat) {
      if (d.hatOpen) this.playOpenHat(t);
      else this.playHat(t);
    }
  }

  private playPulse(
    midi: number,
    t: number,
    a: number,
    d: number,
    gAmp: number,
    wave: PeriodicWave,
    vibratoCents = 0,
    vibratoHz = 6,
  ) {
    const osc = this.ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = mtof(midi);
    // Subtle vibrato via detune
    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (vibratoCents > 0) {
      lfo = this.ctx.createOscillator();
      lfo.frequency.value = vibratoHz;
      lfoGain = this.ctx.createGain();
      lfoGain.gain.value = vibratoCents; // cents
      lfo.connect(lfoGain).connect(osc.detune);
      lfo.start(t);
      lfo.stop(t + a + d + 0.02);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gAmp, t + a);
    g.gain.linearRampToValueAtTime(0.0001, t + a + d);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + a + d + 0.02);
  }

  private playTri(midi: number, t: number, d: number, gAmp: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = mtof(midi);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gAmp, t);
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + d + 0.02);
  }

  private playKick(t: number) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  private playSnare(t: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1800, t);
    bp.Q.setValueAtTime(0.6, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.08);
  }

  private playHat(t: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(6000, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.04);
  }

  private playOpenHat(t: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(5500, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.1);
  }
}

// --- Simple SFX bus for engine hum and board bumps ---
class SfxBus {
  private ctx: AudioContext;
  private out: GainNode;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineNoise: AudioBufferSourceNode | null = null;
  private engineNoiseGain: GainNode | null = null;
  private engineNoiseFilter: BiquadFilterNode | null = null;
  private noiseBuf: AudioBuffer;

  constructor(ctx: AudioContext, master: GainNode) {
    this.ctx = ctx;
    this.out = master;
    this.noiseBuf = createNoiseBuffer(ctx);
  }

  private ensureEngine() {
    if (this.engineGain) return;
    const g = this.ctx.createGain();
    g.gain.value = 0.0; // will be modulated

    // Low triangle as engine fundamental
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 70; // idle

    // Broadband mechanical noise, gently band-passed
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuf;
    noiseSrc.loop = true;
    const nFilt = this.ctx.createBiquadFilter();
    nFilt.type = "bandpass";
    nFilt.frequency.value = 250;
    nFilt.Q.value = 0.6;
    const nGain = this.ctx.createGain();
    nGain.gain.value = 0.35; // mixed under the tone

    // Wire up
    const mix = this.ctx.createGain();
    osc.connect(mix);
    noiseSrc.connect(nFilt).connect(nGain).connect(mix);
    mix.connect(g).connect(this.out);

    // Start sources
    const t = this.ctx.currentTime + 0.01;
    osc.start(t);
    noiseSrc.start(t);

    this.engineGain = g;
    this.engineOsc = osc;
    this.engineNoise = noiseSrc;
    this.engineNoiseGain = nGain;
    this.engineNoiseFilter = nFilt;
  }

  // level: 0..1, speedNorm: 0..1 (optional)
  setEngine(level: number, speedNorm = 0) {
    this.ensureEngine();
    const g = this.engineGain!;
    const now = this.ctx.currentTime;
    const lvl = Math.max(0, Math.min(1, level));
    // Map to a modest mix so it doesn't overpower BGM
    const target = 0.0 + 0.28 * lvl;
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(target, now, 0.08);
    // Pitch up slightly with speed and throttle
    const baseHz = 70;
    const span = 110; // up to ~180 Hz at max
    if (this.engineOsc) {
      const f = baseHz + span * Math.max(lvl * 0.6, speedNorm * 0.8);
      this.engineOsc.frequency.setTargetAtTime(f, now, 0.1);
    }
    // Subtle noise color and amount with level
    if (this.engineNoiseFilter)
      this.engineNoiseFilter.frequency.setTargetAtTime(220 + 180 * lvl, now, 0.1);
    if (this.engineNoiseGain)
      this.engineNoiseGain.gain.setTargetAtTime(0.18 + 0.32 * lvl, now, 0.1);
  }

  // Quick board bump thud; intensity 0..1
  bump(intensity = 0.6) {
    const t = this.ctx.currentTime + 0.005;
    // Low thud (sine drop)
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    const og = this.ctx.createGain();
    const i = Math.max(0.1, Math.min(1, intensity));
    osc.frequency.setValueAtTime(180 + 120 * i, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    og.gain.setValueAtTime(0.6 * i, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(og).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.13);

    // Wooden click (filtered noise ping)
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(2200, t);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.22 * i, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    n.connect(hp).connect(ng).connect(this.out);
    n.start(t);
    n.stop(t + 0.05);
  }

  // Silence engine immediately (used when disabling audio)
  killEngine() {
    if (!this.engineGain) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.setValueAtTime(0, now);
  }

  // Crowd cheer: layered band-passed noise with clap ticks
  cheer(intensity = 1) {
    const i = Math.max(0.1, Math.min(1, intensity));
    const t = this.ctx.currentTime + 0.01;
    const dur = 1.2 + 0.4 * i;

    // Main cheer bed
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.75 * i, t + 0.12);
    // slow-ish release
    g.gain.setTargetAtTime(0.0, t + 0.45, 0.5);
    g.connect(this.out);

    // 3-4 noise bands for a fuller crowd timbre
    const layers = 3 + Math.round(i);
    for (let k = 0; k < layers; k++) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 600 + k * 380 + Math.random() * 320; // ~600..1800 Hz
      bp.Q.value = 0.9 - k * 0.1;
      const lg = this.ctx.createGain();
      lg.gain.value = 0.45 * (1 - k * 0.15) * i;
      src.connect(bp).connect(lg).connect(g);
      src.start(t);
      src.stop(t + dur);
    }

    // Sprinkle clap ticks (highpassed noise pings)
    const clapCount = 3 + Math.floor(3 * i);
    for (let c = 0; c < clapCount; c++) {
      const st = t + 0.08 + Math.random() * 0.5;
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const hp = this.ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(3000 + Math.random() * 2500, st);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.2 * i, st);
      ng.gain.exponentialRampToValueAtTime(0.0001, st + 0.06);
      n.connect(hp).connect(ng).connect(this.out);
      n.start(st);
      n.stop(st + 0.08);
    }

    // Short stadium air horn layer: dual detuned saws -> soft waveshaper -> lowpass -> envelope
    const hornDur = 0.6 + 0.2 * i; // short punchy
    const hornStart = t + 0.03; // slight delay after cheer onset
    const hornBase = 200 + 40 * i; // ~200-240 Hz base
    // Oscillators
    const horn1 = this.ctx.createOscillator();
    const horn2 = this.ctx.createOscillator();
    horn1.type = "sawtooth";
    horn2.type = "sawtooth";
    horn1.frequency.setValueAtTime(hornBase, hornStart);
    horn2.frequency.setValueAtTime(hornBase, hornStart);
    // slight unison detune for thickness
    horn1.detune.setValueAtTime(-6, hornStart); // cents
    horn2.detune.setValueAtTime(6, hornStart);
    // Subtle pitch drop across sustain
    horn1.frequency.exponentialRampToValueAtTime(hornBase * 0.9, hornStart + hornDur * 0.6);
    horn2.frequency.exponentialRampToValueAtTime(hornBase * 0.9, hornStart + hornDur * 0.6);
    // Gentle vibrato to both
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 6; // cents
    const lfoGain2 = this.ctx.createGain();
    lfoGain2.gain.value = 6;
    lfo.connect(lfoGain).connect(horn1.detune);
    lfo.connect(lfoGain2).connect(horn2.detune);
    // Pre-gain to drive the shaper
    const pre = this.ctx.createGain();
    pre.gain.setValueAtTime(0.9 + 0.5 * i, hornStart);
    // Mild distortion waveshaper
    const shaper = this.ctx.createWaveShaper();
    shaper.oversample = "2x";
    const makeCurve = (amount = 12) => {
      const k = amount,
        n = 256;
      const curve = new Float32Array(n);
      for (let j = 0; j < n; j++) {
        const x = (j / (n - 1)) * 2 - 1;
        curve[j] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      return curve;
    };
    shaper.curve = makeCurve(14);
    // Warm lowpass for horn timbre
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(950, hornStart);
    lp.Q.setValueAtTime(0.7, hornStart);
    // Envelope
    const hg = this.ctx.createGain();
    hg.gain.setValueAtTime(0.0, hornStart);
    hg.gain.linearRampToValueAtTime(0.36 * i, hornStart + 0.03); // quick attack
    hg.gain.setTargetAtTime(0.0, hornStart + 0.26, 0.22); // decay
    // Wire
    horn1.connect(pre);
    horn2.connect(pre);
    pre.connect(shaper).connect(lp).connect(hg).connect(this.out);
    // Start/stop
    horn1.start(hornStart);
    horn2.start(hornStart);
    lfo.start(hornStart);
    lfo.stop(hornStart + hornDur);
    horn1.stop(hornStart + hornDur);
    horn2.stop(hornStart + hornDur);
  }
}

class WarmUpsLoop {
  private ctx: AudioContext;
  private master: GainNode;
  private running = false;
  private intervalId: number | null = null;
  private nextTime = 0;
  private step = 0;
  private stepsPerBeat = 2; // 8th notes
  private secondsPerStep: number;

  private pulse1: PeriodicWave;
  private pulse2: PeriodicWave;
  private noise: AudioBuffer;

  // Melody/harmony/bass sequences (Hz), defaulted but may be replaced by MIDI snapshot
  private melodyHz: number[];
  private harmonyHz: number[];
  private bassHz: number[];

  constructor(ctx: AudioContext, master: GainNode, tempoBpm = 140, duty1 = 0.125, duty2 = 0.25) {
    this.ctx = ctx;
    this.master = master;
    this.secondsPerStep = 60 / tempoBpm / this.stepsPerBeat;
    this.pulse1 = createPulse(ctx, duty1);
    this.pulse2 = createPulse(ctx, duty2);
    this.noise = createNoiseBuffer(ctx);
    // Defaults
    this.melodyHz = [
      523.25, 587.33, 659.25, 698.46, 784.0, 698.46, 659.25, 587.33, 523.25, 587.33, 659.25, 698.46,
      784.0, 880.0, 784.0, 698.46,
    ];
    this.harmonyHz = [
      392.0, 440.0, 523.25, 587.33, 659.25, 587.33, 523.25, 440.0, 392.0, 440.0, 523.25, 587.33,
      659.25, 698.46, 659.25, 587.33,
    ];
    this.bassHz = [130.81, 130.81, 196.0, 130.81];
    // Try to load a MIDI snapshot so fallback matches the user's custom.mid
    try {
      const raw = localStorage.getItem("zamboni.midi.snapshot.v1");
      if (raw) {
        const snap = JSON.parse(raw) as {
          melodyHz?: number[];
          harmonyHz?: number[];
          bassHz?: number[];
          tempoBpm?: number;
        };
        const valid16 = (a?: number[]) =>
          Array.isArray(a) && a.length === 16 && a.every((x) => typeof x === "number");
        if (valid16(snap.melodyHz) && valid16(snap.harmonyHz) && valid16(snap.bassHz)) {
          this.melodyHz = snap.melodyHz!;
          this.harmonyHz = snap.harmonyHz!;
          this.bassHz = snap.bassHz!;
          if (typeof snap.tempoBpm === "number" && snap.tempoBpm > 40 && snap.tempoBpm < 220) {
            this.secondsPerStep = 60 / snap.tempoBpm / this.stepsPerBeat;
          }
        }
      }
    } catch {}
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    const lookahead = 0.025;
    const scheduleAhead = 0.2;
    const tick = () => {
      if (!this.running) return;
      const tNow = this.ctx.currentTime;
      while (this.nextTime < tNow + scheduleAhead) {
        this.scheduleStep(this.step, this.nextTime);
        this.nextTime += this.secondsPerStep;
        this.step = (this.step + 1) % 16; // 16 steps
      }
    };
    tick();
    this.intervalId = window.setInterval(tick, lookahead * 1000);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private scheduleStep(step: number, t: number) {
    // Melody/harmony: 8th notes (use snapshot if present)
    const mHz = this.melodyHz[step % this.melodyHz.length];
    const hHz = this.harmonyHz[step % this.harmonyHz.length];
    const dur = this.secondsPerStep * 0.9;
    if (mHz) this.playPulseHz(mHz, t, 0.012, dur, 0.5, this.pulse1, 6, 6);
    if (hHz) this.playPulseHz(hHz, t, 0.01, dur, 0.32, this.pulse2, 4, 5.5);

    // Bass: if snapshot provided (16 steps), follow per-step; else hit on beats
    if (this.bassHz.length === 16) {
      const bHz = this.bassHz[step % 16];
      if (bHz) this.playTriHz(bHz, t, this.secondsPerStep * 0.95, 0.7);
    } else if (step % this.stepsPerBeat === 0) {
      const beatIdx = Math.floor(step / this.stepsPerBeat);
      const bHz = this.bassHz[beatIdx % this.bassHz.length];
      this.playTriHz(bHz, t, this.secondsPerStep * 2 * 0.95, 0.7);
    }

    // Drums: snare on beats 2,4,6,8; kick on 1,3,5,7; hats every 8th
    const beatIdx = Math.floor(step / this.stepsPerBeat); // 0..7
    if (step % this.stepsPerBeat === 0) {
      if (beatIdx % 2 === 0)
        this.playKick(t); // 1,3,5,7
      else this.playSnare(t); // 2,4,6,8
    }
    // Closed hat each 8th
    this.playHat(t);
  }

  private playPulseHz(
    freq: number,
    t: number,
    a: number,
    d: number,
    gAmp: number,
    wave: PeriodicWave,
    vibratoCents = 0,
    vibratoHz = 6,
  ) {
    const midi = ftom(freq);
    this.playPulse(midi, t, a, d, gAmp, wave, vibratoCents, vibratoHz);
  }
  private playTriHz(freq: number, t: number, d: number, gAmp: number) {
    const midi = ftom(freq);
    this.playTri(midi, t, d, gAmp);
  }

  private playPulse(
    midi: number,
    t: number,
    a: number,
    d: number,
    gAmp: number,
    wave: PeriodicWave,
    vibratoCents = 0,
    vibratoHz = 6,
  ) {
    const osc = this.ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = mtof(midi);
    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (vibratoCents > 0) {
      lfo = this.ctx.createOscillator();
      lfo.frequency.value = vibratoHz;
      lfoGain = this.ctx.createGain();
      lfoGain.gain.value = vibratoCents;
      lfo.connect(lfoGain).connect(osc.detune);
      lfo.start(t);
      lfo.stop(t + a + d + 0.02);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gAmp, t + a);
    g.gain.linearRampToValueAtTime(0.0001, t + a + d);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + a + d + 0.02);
  }
  private playTri(midi: number, t: number, d: number, gAmp: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = mtof(midi);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gAmp, t);
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + d + 0.02);
  }
  private playKick(t: number) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }
  private playSnare(t: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1800, t);
    bp.Q.setValueAtTime(0.6, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.08);
  }
  private playHat(t: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(6000, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.04);
  }
}

type MidiNote = {
  time: number;
  duration: number;
  midi: number;
  velocity: number;
  channel?: number;
};

class MidiLoop {
  private ctx: AudioContext;
  private master: GainNode;
  private running = false;
  private intervalId: number | null = null;
  private startTime = 0;
  private scheduleAhead = 0.2;
  private lookahead = 0.025;
  private loopDur = 0; // seconds

  private pulse1: PeriodicWave;
  private pulse2: PeriodicWave;
  private noise: AudioBuffer;

  private notesPulse1: MidiNote[] = [];
  private notesPulse2: MidiNote[] = [];
  private notesTri: MidiNote[] = [];
  private drums: { time: number; type: "kick" | "snare" | "hat" | "hatOpen" }[] = [];

  constructor(ctx: AudioContext, master: GainNode, duty1 = 0.125, duty2 = 0.25) {
    this.ctx = ctx;
    this.master = master;
    this.pulse1 = createPulse(ctx, duty1);
    this.pulse2 = createPulse(ctx, duty2);
    this.noise = createNoiseBuffer(ctx);
  }

  async load(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load MIDI ${url}`);
    const buf = await res.arrayBuffer();
    const midi = new Midi(buf);
    // total duration in seconds
    this.loopDur =
      midi.duration ||
      Math.max(
        1,
        ...midi.tracks.map((t: (typeof midi.tracks)[number]) => {
          const last = t.notes[t.notes.length - 1];
          return last ? last.time + last.duration : 0;
        }),
      );
    // Collect notes
    const allNotes: MidiNote[] = [];
    midi.tracks.forEach((t: (typeof midi.tracks)[number]) => {
      t.notes.forEach((n: (typeof t.notes)[number]) => {
        allNotes.push({
          time: n.time,
          duration: n.duration,
          midi: n.midi,
          velocity: n.velocity,
          channel: t.channel,
        });
      });
    });
    // Separate drums (channel 10 -> 9 zero-based)
    const drums = allNotes.filter((n) => n.channel === 9);
    const pitched = allNotes.filter((n) => n.channel !== 9);
    // Assign pitched notes to voices by pitch
    pitched.forEach((n) => {
      if (n.midi < 50) this.notesTri.push(n);
      else if (n.midi % 2 === 0) this.notesPulse1.push(n);
      else this.notesPulse2.push(n);
    });
    // Map drums by MIDI note
    drums.forEach((n) => {
      const m = n.midi;
      if (m === 35 || m === 36) this.drums.push({ time: n.time, type: "kick" });
      else if (m === 38 || m === 40) this.drums.push({ time: n.time, type: "snare" });
      else if (m === 46) this.drums.push({ time: n.time, type: "hatOpen" });
      else if (m === 42 || m === 44 || m === 49 || m === 57)
        this.drums.push({ time: n.time, type: "hat" });
    });
    // Sort
    const byTime = (a: { time: number }, b: { time: number }) => a.time - b.time;
    this.notesPulse1.sort(byTime);
    this.notesPulse2.sort(byTime);
    this.notesTri.sort(byTime);
    this.drums.sort(byTime);

    // Persist a simplified fallback snapshot so the default loop matches the current MIDI
    try {
      const steps = 16;
      const stepDur = this.loopDur > 0 ? this.loopDur / steps : 0.25;
      const sample = (notes: MidiNote[], t: number): number => {
        // Find a note active at t (no wrap handling for simplicity)
        for (let i = 0; i < notes.length; i++) {
          const n = notes[i];
          if (t >= n.time && t < n.time + n.duration) return mtof(n.midi);
        }
        return 0;
      };
      const melodyHz: number[] = [];
      const harmonyHz: number[] = [];
      const bassHz: number[] = [];
      for (let s = 0; s < steps; s++) {
        const t = s * stepDur;
        const p1 = sample(this.notesPulse1, t);
        const p2 = sample(this.notesPulse2, t);
        const hi = Math.max(p1, p2);
        const lo = hi === p1 ? p2 : p1;
        melodyHz.push(hi);
        harmonyHz.push(lo);
        bassHz.push(sample(this.notesTri, t));
      }
      const beats = 8; // 16 8th-note steps
      const tempoBpm =
        this.loopDur > 0
          ? Math.max(40, Math.min(220, Math.round((60 * beats) / this.loopDur)))
          : 90;
      const payload = { melodyHz, harmonyHz, bassHz, tempoBpm };
      localStorage.setItem("zamboni.midi.snapshot.v1", JSON.stringify(payload));
    } catch {}
  }

  start() {
    if (this.running || this.loopDur <= 0) return;
    this.running = true;
    this.startTime = this.ctx.currentTime + 0.05;
    const tick = () => {
      if (!this.running) return;
      const tNow = this.ctx.currentTime;
      this.scheduleWindow(tNow, tNow + this.scheduleAhead);
    };
    tick();
    this.intervalId = window.setInterval(tick, this.lookahead * 1000);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private scheduleWindow(absStart: number, absEnd: number) {
    const loopStart = this.startTime;
    const dur = this.loopDur;
    const loopPos = (((absStart - loopStart) % dur) + dur) % dur; // 0..dur
    const ahead = absEnd - absStart;
    const endPos = loopPos + ahead;
    const scheduleNote = (n: MidiNote, pulseIdx: 1 | 2 | 3) => {
      const rel = n.time >= loopPos ? n.time - loopPos : n.time + (dur - loopPos);
      const when = absStart + rel;
      const vel = clamp(n.velocity, 0, 1);
      if (pulseIdx === 3) this.playTri(n.midi, when, Math.min(n.duration, 0.45), 0.6 * vel);
      else if (pulseIdx === 1)
        this.playPulse(
          n.midi,
          when,
          0.01,
          Math.min(n.duration, 0.28),
          0.55 * vel,
          this.pulse1,
          8,
          6,
        );
      else
        this.playPulse(
          n.midi,
          when,
          0.008,
          Math.min(n.duration, 0.24),
          0.38 * vel,
          this.pulse2,
          5,
          5.5,
        );
    };
    const scheduleDrum = (d: { time: number; type: "kick" | "snare" | "hat" | "hatOpen" }) => {
      const rel = d.time >= loopPos ? d.time - loopPos : d.time + (dur - loopPos);
      const when = absStart + rel;
      if (d.type === "kick") this.playKick(when);
      else if (d.type === "snare") this.playSnare(when);
      else if (d.type === "hatOpen") this.playOpenHat(when);
      else this.playHat(when);
    };
    const inWindow = (t: number) => {
      if (endPos <= dur) return t >= loopPos && t < endPos;
      return t >= loopPos || t < endPos - dur;
    };
    for (const n of this.notesTri) if (inWindow(n.time)) scheduleNote(n, 3);
    for (const n of this.notesPulse1) if (inWindow(n.time)) scheduleNote(n, 1);
    for (const n of this.notesPulse2) if (inWindow(n.time)) scheduleNote(n, 2);
    for (const d of this.drums) if (inWindow(d.time)) scheduleDrum(d);
  }

  // Reuse tone generators from NES loop
  private playPulse(
    midi: number,
    t: number,
    a: number,
    d: number,
    gAmp: number,
    wave: PeriodicWave,
    vibratoCents = 0,
    vibratoHz = 6,
  ) {
    const osc = this.ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = mtof(midi);
    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (vibratoCents > 0) {
      lfo = this.ctx.createOscillator();
      lfo.frequency.value = vibratoHz;
      lfoGain = this.ctx.createGain();
      lfoGain.gain.value = vibratoCents;
      lfo.connect(lfoGain).connect(osc.detune);
      lfo.start(t);
      lfo.stop(t + a + d + 0.02);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gAmp, t + a);
    g.gain.linearRampToValueAtTime(0.0001, t + a + d);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + a + d + 0.02);
  }
  private playTri(midi: number, t: number, d: number, gAmp: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = mtof(midi);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gAmp, t);
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + d + 0.02);
  }
  private playKick(t: number) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }
  private playSnare(t: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1800, t);
    bp.Q.setValueAtTime(0.6, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.08);
  }
  private playHat(t: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(6000, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.04);
  }
  private playOpenHat(t: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(5500, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.1);
  }
}

export default function ChiptuneBG() {
  // Start with deterministic SSR/CSR defaults; load real prefs after mount
  const [enabled, setEnabled] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.6);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const musicBusRef = useRef<GainNode | null>(null);
  const musicBaseRef = useRef<number>(0.35);
  const sfxRef = useRef<SfxBus | null>(null);
  const loopRef = useRef<NesLoop | null>(null);
  const warmLoopRef = useRef<WarmUpsLoop | null>(null);
  const midiLoopRef = useRef<MidiLoop | null>(null);
  const midiTriedRef = useRef(false);
  const midiLoadedRef = useRef(false);
  const didInitRef = useRef(false);
  const enabledRef = useRef(false);

  type AudioContextCtor = new (contextOptions?: AudioContextOptions) => AudioContext;
  const createAudioContext = useCallback((): AudioContext => {
    const w = window as unknown as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) throw new Error("WebAudio not supported");
    return new Ctor();
  }, []);

  const ensureAudio = useCallback(() => {
    if (ctxRef.current) return;
    const ctx = createAudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);
    // Create submix buses so we can balance BGM vs SFX independently
    const musicBus = ctx.createGain();
    const sfxBus = ctx.createGain();
    // Lower music relative to SFX so impacts/engine are more audible
    musicBus.gain.value = 0.35; // ~ -9 dB
    sfxBus.gain.value = 1.0;
    musicBus.connect(master);
    sfxBus.connect(master);

    const loop = new NesLoop(ctx, musicBus, 154, 57, 0.125, 0.25);
    const warmLoop = new WarmUpsLoop(ctx, musicBus, 90, 0.125, 0.25);
    const midiLoop = new MidiLoop(ctx, musicBus, 0.125, 0.25);
    const sfx = new SfxBus(ctx, sfxBus);
    ctxRef.current = ctx;
    masterRef.current = master;
    musicBusRef.current = musicBus;
    musicBaseRef.current = 0.35;
    loopRef.current = loop;
    warmLoopRef.current = warmLoop;
    midiLoopRef.current = midiLoop;
    sfxRef.current = sfx;
    // Expose minimal SFX API for the game to call
    window.ZAMBONI_AUDIO = {
      setEngine: (lvl: number, sp?: number) => sfxRef.current?.setEngine(lvl, sp),
      bump: (intensity?: number) => {
        // Trigger SFX
        sfxRef.current?.bump(intensity);
        // Gentle ducking of music so SFX pops through
        const ctx = ctxRef.current;
        const music = musicBusRef.current;
        if (!ctx || !music) return;
        const now = ctx.currentTime;
        const base = musicBaseRef.current;
        const i = Math.max(0, Math.min(1, intensity ?? 0.6));
        // Duck factor between 0.9 (very gentle) and 0.7 (still subtle)
        const factor = 0.9 - 0.2 * i; // i=0 -> 0.9, i=1 -> 0.7
        const target = base * factor;
        const g = music.gain;
        g.cancelScheduledValues(now);
        // Fast attack, slower release
        g.setTargetAtTime(target, now, 0.02);
        g.setTargetAtTime(base, now + 0.08, 0.2);
      },
      cheer: (intensity?: number) => {
        // Play crowd cheer and apply a stronger, longer duck
        sfxRef.current?.cheer(intensity ?? 1);
        const ctx = ctxRef.current;
        const music = musicBusRef.current;
        if (!ctx || !music) return;
        const now = ctx.currentTime;
        const base = musicBaseRef.current;
        const i = clamp(intensity ?? 1, 0, 1);
        const factor = 0.7 - 0.25 * i; // ~0.45..0.7 of base
        const target = base * factor;
        const g = music.gain;
        g.cancelScheduledValues(now);
        // Slightly slower attack, release length scales with intensity
        const hold = 0.45 + 0.4 * i; // 0.45..0.85s
        const tau = 0.5 + 0.35 * i; // 0.5..0.85s
        g.setTargetAtTime(target, now, 0.035);
        g.setTargetAtTime(base, now + hold, tau);
      },
    };
  }, [createAudioContext]);

  const resumeIfNeeded = useCallback(() => {
    if (!ctxRef.current) return;
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
  }, []);

  const startLoop = useCallback(async () => {
    if (!enabled) return;
    ensureAudio();
    resumeIfNeeded();
    if (masterRef.current) masterRef.current.gain.value = volume;
    // If MIDI already loaded, use it
    if (midiLoadedRef.current && midiLoopRef.current) {
      midiLoopRef.current.start();
      return;
    }
    // If we haven't checked yet, try to load MIDI first; only fall back on failure
    if (!midiTriedRef.current && midiLoopRef.current) {
      midiTriedRef.current = true;
      try {
        await midiLoopRef.current.load(MIDI_URL);
        midiLoadedRef.current = true;
        if (!enabledRef.current) return; // user turned it off meanwhile
        midiLoopRef.current.start();
        return;
      } catch {
        // custom.mid not present or failed; fall back to warm loop
        if (enabledRef.current) warmLoopRef.current?.start();
        return;
      }
    }
    // We already tried and failed previously -> use warm loop
    warmLoopRef.current?.start();
  }, [enabled, ensureAudio, resumeIfNeeded, volume]);

  const stopLoop = useCallback(async () => {
    loopRef.current?.stop();
    warmLoopRef.current?.stop();
    midiLoopRef.current?.stop();
    if (masterRef.current) masterRef.current.gain.value = 0.0;
    sfxRef.current?.killEngine();
    if (ctxRef.current && ctxRef.current.state === "running") await ctxRef.current.suspend();
  }, []);

  // Load saved prefs once on mount to avoid hydration mismatches
  useEffect(() => {
    try {
      const v = localStorage.getItem(MUSIC_KEY);
      if (v != null) setEnabled(v === "1");
    } catch {}
    try {
      const vs = localStorage.getItem(VOL_KEY);
      if (vs != null) setVolume(clamp(parseFloat(vs), 0, 1));
    } catch {}
    didInitRef.current = true;
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!didInitRef.current) return;
    try {
      localStorage.setItem(MUSIC_KEY, enabled ? "1" : "0");
    } catch {}
    if (enabled) startLoop();
    else stopLoop();
  }, [enabled, startLoop, stopLoop]);

  useEffect(() => {
    if (!didInitRef.current) return;
    try {
      localStorage.setItem(VOL_KEY, String(volume));
    } catch {}
    if (enabled && masterRef.current) masterRef.current.gain.value = volume;
  }, [volume, enabled]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        stopLoop();
      } else if (enabled) {
        startLoop();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled, startLoop, stopLoop]);

  useEffect(() => {
    return () => {
      loopRef.current?.stop();
      try {
        masterRef.current?.disconnect();
      } catch {}
      if (ctxRef.current && ctxRef.current.state !== "closed") ctxRef.current.close();
    };
  }, []);

  const onUserGesture = useCallback(() => {
    ensureAudio();
    resumeIfNeeded();
    if (enabled) startLoop();
  }, [ensureAudio, resumeIfNeeded, enabled, startLoop]);

  const handleToggle = useCallback(() => {
    // Ensure/resume context within the same gesture
    onUserGesture();
    // Try to resume explicitly before starting
    if (ctxRef.current && ctxRef.current.state === "suspended") void ctxRef.current.resume();
    setEnabled((prev) => {
      const next = !prev;
      if (process.env.NODE_ENV !== "production") {
        console.info("BGM:", next ? "enable" : "disable");
      }
      // Let the effect call startLoop/stopLoop; context is already resumed
      return next;
    });
  }, [onUserGesture]);

  // Global one-time gesture catch-all (in case users tap elsewhere first)
  useEffect(() => {
    let armed = true;
    const once = () => {
      if (!armed) return;
      armed = false;
      onUserGesture();
      window.removeEventListener("pointerdown", once, { capture: true });
      window.removeEventListener("keydown", once, { capture: true });
      window.removeEventListener("touchstart", once, { capture: true });
    };
    window.addEventListener("pointerdown", once, { capture: true });
    window.addEventListener("keydown", once, { capture: true });
    window.addEventListener("touchstart", once, { capture: true });
    return () => {
      armed = false;
      window.removeEventListener("pointerdown", once, { capture: true });
      window.removeEventListener("keydown", once, { capture: true });
      window.removeEventListener("touchstart", once, { capture: true });
    };
  }, [onUserGesture]);

  return (
    <div
      className="fixed left-2 bottom-2 z-50 bg-white/80 pixel-card px-2 py-1 font-pixel text-[12px] text-blue-900/90"
      style={{ userSelect: "none" }}
    >
      <div className="flex items-center gap-2">
        <button
          aria-pressed={enabled}
          type="button"
          onMouseDown={onUserGesture}
          onTouchStart={onUserGesture}
          onClick={handleToggle}
          className="pixel-button px-2 py-0.5"
        >
          Music: {enabled ? "On" : "Off"}
        </button>
        <label htmlFor="bgm-volume" className="flex items-center gap-1">
          <span id="bgm-volume-label">Vol</span>
          <input
            id="bgm-volume"
            aria-labelledby="bgm-volume-label"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onMouseDown={onUserGesture}
            onTouchStart={onUserGesture}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="pixel-range"
            disabled={!enabled}
          />
        </label>
      </div>
    </div>
  );
}
