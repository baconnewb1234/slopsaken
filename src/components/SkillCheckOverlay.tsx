import React, { useEffect, useState, useRef } from 'react';

interface SkillCheckOverlayProps {
  successZone: [number, number]; // 0..100
  greatZone: [number, number];   // 0..100
  onHit: (value: number) => void;
  onMiss: () => void;
}

export const SkillCheckOverlay: React.FC<SkillCheckOverlayProps> = ({
  successZone,
  greatZone,
  onHit,
  onMiss,
}) => {
  const [needleAngle, setNeedleAngle] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const hasResolvedRef = useRef<boolean>(false);
  const needleRef = useRef<number>(0);

  const onMissRef = useRef(onMiss);
  const onHitRef = useRef(onHit);
  onMissRef.current = onMiss;
  onHitRef.current = onHit;

  // Needle completes 360 degrees (0..100%) in 1.15 seconds
  const DURATION_MS = 1150;

  useEffect(() => {
    hasResolvedRef.current = false;
    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = (elapsed / DURATION_MS) * 100;

      if (progress >= 100) {
        if (!hasResolvedRef.current) {
          hasResolvedRef.current = true;
          onMissRef.current();
        }
        return;
      }

      needleRef.current = progress;
      setNeedleAngle(progress);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleStrike = () => {
    if (hasResolvedRef.current) return;
    hasResolvedRef.current = true;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    onHitRef.current(needleRef.current);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        handleStrike();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const [succStart, succEnd] = successZone;
  const [grtStart, grtEnd] = greatZone;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 animate-doodle">
      <div className="relative w-64 h-64 flex items-center justify-center pointer-events-auto">
        {/* Outer Doodle Ring */}
        <svg className="w-full h-full" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="rgba(24, 20, 18, 0.88)"
            stroke="#f5ebe0"
            strokeWidth="5"
            strokeDasharray="5 3"
          />

          {/* Success Zone Arc (yellow parchment) */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#f4d35e"
            strokeWidth="15"
            strokeDasharray={`${((succEnd - succStart) / 100) * 502} 502`}
            strokeDashoffset={-((succStart / 100) * 502)}
            transform="rotate(-90 100 100)"
            opacity="0.9"
          />

          {/* Great Zone Arc (vibrant emerald green) */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#2a9d8f"
            strokeWidth="18"
            strokeDasharray={`${((grtEnd - grtStart) / 100) * 502} 502`}
            strokeDashoffset={-((grtStart / 100) * 502)}
            transform="rotate(-90 100 100)"
          />

          {/* Center Hub */}
          <circle cx="100" cy="100" r="18" fill="#1b1816" stroke="#f4d35e" strokeWidth="3" />
        </svg>

        {/* Rotating Needle */}
        <div
          className="absolute w-1.5 h-26 origin-bottom shadow-lg transition-none"
          style={{
            top: '18px',
            transform: `rotate(${needleAngle * 3.6}deg)`,
            transformOrigin: '50% 100%',
            filter: 'drop-shadow(0 0 8px rgba(239, 35, 60, 0.95))',
          }}
        >
          <div className="w-full h-full bg-red-600 rounded-t-full" />
          <div className="w-3.5 h-3.5 bg-red-400 -ml-1 -mt-1 rounded-full border border-black shadow" />
        </div>

        {/* Center Strike Button */}
        <button
          onClick={handleStrike}
          className="absolute flex flex-col items-center justify-center w-26 h-26 rounded-full bg-[#fefae0] text-stone-900 border-3 border-stone-800 shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer font-sketch z-10"
        >
          <span className="text-[11px] uppercase font-black tracking-widest text-red-700 leading-none mb-0.5">
            HIT NOW!
          </span>
          <span className="text-xl font-black font-doodle tracking-tight text-stone-900 leading-none">
            [SPACE]
          </span>
          <span className="text-[9px] text-stone-600 font-mono mt-0.5">GREAT +5%</span>
        </button>
      </div>
    </div>
  );
};
