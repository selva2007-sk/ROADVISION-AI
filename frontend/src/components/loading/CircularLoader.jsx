import React, { useEffect, useRef, useState } from 'react';
import { Eye, Shield, Cpu, Activity } from 'lucide-react';

/**
 * CircularLoader: Scroll-triggered showcase section
 * Detects viewport intersection and runs a 3-second circular rotating ring
 * around centered JSTV letters, completing with an active telemetry state.
 */
export default function CircularLoader() {
  const sectionRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          // Entering viewport: trigger 3-second animation
          setIsAnimating(true);
          setAnimationCompleted(false);

          const timer = setTimeout(() => {
            setIsAnimating(false);
            setAnimationCompleted(true);
          }, 3000);

          return () => clearTimeout(timer);
        } else {
          // Leaving viewport: reset for next re-entry
          setIsAnimating(false);
          setAnimationCompleted(false);
        }
      },
      {
        threshold: 0.35, // Trigger when 35% visible
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerCount]);

  return (
    <div
      ref={sectionRef}
      className="bg-gradient-to-r from-[#0B1220] via-[#101828] to-[#0B1220] rounded-3xl p-8 border border-slate-800 shadow-xl text-white relative overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left: Text & System Narrative */}
        <div className="space-y-4 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Cpu size={14} />
            <span>ROADVISION AI · JSTV Integrated Scanning Core</span>
          </div>

          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            High-Precision Pavement Perception Engine
          </h3>

          <p className="text-sm text-slate-300 leading-relaxed">
            The <strong className="text-sky-300 font-bold">JSTV</strong> visual telemetry framework continuously correlates dashcam frames with RTK satellite coordinates. When road damage is detected, spatial duplicate filtering automatically binds the pothole or crack directly to the municipal GIS map.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400">Scan Frequency</div>
              <div className="text-white font-bold text-sm mt-0.5">30 FPS Video</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400">Position Fix</div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">&lt; 3.5m GPS</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400">Pothole Accuracy</div>
              <div className="text-blue-400 font-bold text-sm mt-0.5">94.2% AI Conf</div>
            </div>
          </div>
        </div>

        {/* Right: The 3-Second Scroll-Triggered Circular Ring Animation */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative flex items-center justify-center w-40 h-40">
            {/* Outer Spinning Ring (Active during scroll intersection) */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-transparent transition-all duration-700 ${
                isAnimating
                  ? 'border-t-blue-500 border-r-sky-400 animate-spin shadow-[0_0_25px_rgba(37,99,235,0.6)]'
                  : animationCompleted
                  ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'border-slate-800'
              }`}
            ></div>

            {/* Orbiting Laser Point */}
            {isAnimating && (
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1.5s' }}>
                <div className="w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_15px_#22d3ee] -top-1.5 left-1/2 -translate-x-1/2 absolute"></div>
              </div>
            )}

            {/* Secondary Dashed Ring */}
            <div
              className={`absolute inset-2.5 rounded-full border border-dashed transition-colors duration-500 ${
                isAnimating
                  ? 'border-blue-400/50'
                  : animationCompleted
                  ? 'border-emerald-500/40'
                  : 'border-slate-800'
              }`}
              style={{
                animation: isAnimating ? 'spin 5s linear infinite reverse' : 'none',
              }}
            ></div>

            {/* Inner Dark Lens */}
            <div className="absolute inset-5 rounded-full bg-[#080d17] border border-blue-500/20 flex flex-col items-center justify-center shadow-inner">
              {/* JSTV Centered & Non-Rotating */}
              <span className="font-mono font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-white via-sky-100 to-blue-400 select-none">
                JSTV
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                {isAnimating ? 'SCANNING' : animationCompleted ? 'SYNCED' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Interactive Retrigger Indicator */}
          <div className="mt-3 text-center">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                isAnimating
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : animationCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isAnimating
                ? '● 3s Telemetry Scan Active'
                : animationCompleted
                ? '✓ AI Scan Cycle Calibrated'
                : 'Scroll into view to scan'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
