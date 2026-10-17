import React, { useEffect, useState } from 'react';

/**
 * InitialLoadingScreen: Premium 3-second smart-city startup loader
 * Features a circular rotating animation around centered JSTV letters,
 * ROADVISION AI branding, and smooth fade-out transition.
 * Avoids any page scrolling during initial loading.
 */
export default function InitialLoadingScreen({ isReady, onFinish }) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [progressText, setProgressText] = useState('Initializing RoadVision AI Engine...');

  // Prevent background scrolling while loading screen is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    // Progress ticker text
    const textTimer1 = setTimeout(() => {
      setProgressText('Calibrating OpenCV Pavement Heuristics...');
    }, 1000);

    const textTimer2 = setTimeout(() => {
      setProgressText('Synchronizing GIS Road Network & Telemetry...');
    }, 2000);

    // 3-second minimum duration requirement
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 3000);

    return () => {
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(minTimer);
    };
  }, []);

  // When both the 3-second animation and app readiness are satisfied, fade out smoothly
  useEffect(() => {
    if (minTimeElapsed && isReady) {
      setFadingOut(true);
      const fadeTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 500); // 500ms fade transition
      return () => clearTimeout(fadeTimer);
    }
  }, [minTimeElapsed, isReady, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1220] text-white transition-opacity duration-500 overflow-hidden select-none ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Application Loading"
      role="progressbar"
    >
      {/* Background ambient smart-city grid light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/40 via-[#0B1220]/80 to-[#0B1220] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center max-w-xs sm:max-w-sm px-4 sm:px-6 text-center w-full">
        {/* Animated Circular Loader with JSTV Centered & Upright */}
        <div className="relative flex items-center justify-center w-28 h-28 xs:w-32 xs:h-32 sm:w-36 sm:h-36 mb-5 sm:mb-8 shrink-0">
          {/* Outer Glowing Rotating Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-400 animate-spin shadow-[0_0_20px_rgba(37,99,235,0.4)]"></div>

          {/* Secondary Counter-Rotating Dashed Ring */}
          <div
            className="absolute inset-2 rounded-full border border-dashed border-sky-400/40"
            style={{ animation: 'spin 6s linear infinite reverse' }}
          ></div>

          {/* Inner Accent Ring with Radar Pulse */}
          <div className="absolute inset-3.5 sm:inset-4 rounded-full bg-blue-950/60 border border-blue-500/20 backdrop-blur-sm flex items-center justify-center">
            {/* Center JSTV Letters - Non-rotating, perfectly upright & legible */}
            <div className="flex flex-col items-center justify-center select-none">
              <span className="font-mono font-black text-xl xs:text-2xl sm:text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-sky-400 drop-shadow-[0_2px_10px_rgba(56,189,248,0.5)]">
                JSTV
              </span>
              <span className="text-[8px] xs:text-[9px] font-bold uppercase tracking-wider text-blue-400/80 -mt-0.5 sm:-mt-1">
                VISION
              </span>
            </div>
          </div>

          {/* Orbiting Photon Dot */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="w-2.5 h-2.5 rounded-full bg-sky-300 shadow-[0_0_12px_#38bdf8] -top-1 left-1/2 -translate-x-1/2 absolute"></div>
          </div>
        </div>

        {/* ROADVISION AI Branding */}
        <div className="space-y-1 mb-5 sm:mb-6">
          <div className="flex items-center justify-center gap-2">
            <span className="font-extrabold text-lg xs:text-xl sm:text-2xl tracking-wider text-white">ROADVISION</span>
            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded bg-blue-600 text-white shadow-sm">AI</span>
          </div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-slate-400 font-medium truncate">
            Intelligent Road Monitoring
          </p>
        </div>

        {/* Dynamic Progress Ticker & Progress Bar */}
        <div className="w-48 xs:w-56 sm:w-64 space-y-2">
          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full animate-[progress_3s_ease-in-out_infinite]"></div>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono tracking-tight animate-pulse truncate">
            {progressText}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 10%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 100%; margin-left: 0%; }
        }
      `}</style>
    </div>
  );
}
