"use client";
import React, { useEffect, useState } from "react";

export default function OrientationGate({ children }: { children: React.ReactNode }) {
  const [needsRotate, setNeedsRotate] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;
      const { innerWidth: w, innerHeight: h } = window;
      const portrait = h > w;
      const narrow = Math.min(w, h) < 820;
      setNeedsRotate(portrait && narrow);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!needsRotate) return <>{children}</>;
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
