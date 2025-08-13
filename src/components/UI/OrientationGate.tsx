"use client";
import React, { useEffect, useState } from "react";

export default function OrientationGate({ children }: { children: React.ReactNode }) {
  const [needsRotate, setNeedsRotate] = useState(false);
  const [override, setOverride] = useState(false);
  const OVERRIDE_KEY = "zamboni.orientation.override.v1";

  useEffect(() => {
    // Load persisted override on mount
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage?.getItem(OVERRIDE_KEY);
        if (saved === "1") setOverride(true);
      }
    } catch {}

    const computeNeedsRotate = () => {
      if (typeof window === "undefined") return false;
      // Determine portrait/landscape robustly across iOS Safari quirks
      const isPortrait = (() => {
        try {
          // 1) screen.orientation (not fully supported on iOS but safe when present)
          const so: unknown = (
            screen as unknown as {
              orientation?: { type?: string };
            }
          ).orientation;
          if (so && typeof (so as { type?: string }).type === "string") {
            return ((so as { type?: string }).type || "").startsWith("portrait");
          }
          // 2) window.orientation (deprecated but works on iOS Safari)
          const wo = (window as unknown as { orientation?: number }).orientation;
          if (typeof wo === "number") {
            return wo === 0 || wo === 180;
          }
          // 3) CSS media query is generally reliable on iOS
          if (typeof window.matchMedia === "function") {
            const m = window.matchMedia("(orientation: portrait)");
            if (typeof m.matches === "boolean") return m.matches;
          }
          // 4) visualViewport fallback
          const vv = (window as Window & { visualViewport?: VisualViewport }).visualViewport;
          if (vv) return vv.height > vv.width;
        } catch {}
        // Final fallback
        return window.innerHeight > window.innerWidth;
      })();

      const { innerWidth: w, innerHeight: h } = window;
      const narrow = Math.min(w, h) < 820;
      return isPortrait && narrow;
    };

    const check = () => setNeedsRotate(computeNeedsRotate());

    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    // React to CSS media query orientation changes when supported
    const m =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(orientation: portrait)")
        : null;
    const onMedia = () => check();
    try {
      m?.addEventListener?.("change", onMedia);
    } catch {
      // Older Safari uses addListener/removeListener
      m?.addListener?.(onMedia as unknown as EventListener);
    }
    // visualViewport can change on iOS as UI bars appear/disappear
    const vv = (window as Window & { visualViewport?: VisualViewport }).visualViewport;
    vv?.addEventListener?.("resize", check);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
      try {
        m?.removeEventListener?.("change", onMedia);
      } catch {
        // Older Safari removeListener fallback
        m?.removeListener?.(onMedia as unknown as EventListener);
      }
      vv?.removeEventListener?.("resize", check);
    };
  }, []);

  if (!needsRotate || override) return <>{children}</>;
  return (
    <>
      {children}
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-blue-900 text-white p-6 text-center font-pixel">
        <div>
          <div className="text-2xl mb-4">Rotate Device</div>
          <div className="text-sm max-w-xs mx-auto leading-snug opacity-90">
            For the best experience, please rotate your device to landscape.
          </div>
          <div className="mt-6 flex items-center justify-center">
            <svg
              width="96"
              height="96"
              viewBox="0 0 96 96"
              className="animate-pulse-slow"
              aria-hidden="true"
            >
              <rect
                x="8"
                y="28"
                width="80"
                height="40"
                rx="4"
                fill="#ffffff11"
                stroke="#fff"
                strokeWidth="3"
              />
              <rect
                x="28"
                y="8"
                width="40"
                height="80"
                rx="4"
                fill="#ffffff22"
                stroke="#fff"
                strokeWidth="3"
              />
              <path d="M40 20 L56 20 L56 16 L64 24 L56 32 L56 28 L40 28 Z" fill="#fff" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => {
              setOverride(true);
              try {
                window.localStorage?.setItem(OVERRIDE_KEY, "1");
              } catch {}
            }}
            className="mt-6 inline-block bg-white/15 hover:bg-white/25 active:bg-white/30 text-white px-4 py-2 rounded"
          >
            Continue anyway
          </button>
          <style jsx>{`
            @keyframes pulse-slow {
              0%,
              100% {
                opacity: 1;
              }
              50% {
                opacity: 0.6;
              }
            }
            .animate-pulse-slow {
              animation: pulse-slow 2s ease-in-out infinite;
            }
          `}</style>
        </div>
      </div>
    </>
  );
}
