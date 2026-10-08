import React from 'react';
import { GeneratorEntity, EscapeGateEntity, GameRole } from '../types/game';

interface MinimapProps {
  playerPos: { x: number; z: number; rotY: number };
  hunterPos?: { x: number; z: number };
  generators: GeneratorEntity[];
  gates: EscapeGateEntity[];
  role: GameRole;
  radarActive?: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerPos,
  hunterPos,
  generators,
  gates,
  role,
  radarActive = false,
}) => {
  const mapSize = 90; // 90m arena
  const radarRadius = 45; // view radius

  // Map world coord to SVG radar relative to player
  const toRadar = (wx: number, wz: number) => {
    const dx = wx - playerPos.x;
    const dz = wz - playerPos.z;
    // Map radius 50px
    const scale = 50 / radarRadius;
    const rx = Math.max(-50, Math.min(50, dx * scale));
    const ry = Math.max(-50, Math.min(50, dz * scale));
    return { x: 60 + rx, y: 60 + ry };
  };

  const hunterDist = hunterPos ? Math.hypot(hunterPos.x - playerPos.x, hunterPos.z - playerPos.z) : 999;
  const showHunter = role === 'hunter' || radarActive || hunterDist < 12;

  return (
    <div className="relative w-28 h-28 p-1 sketch-card-dark select-none shadow-lg opacity-90 hover:opacity-100 transition-opacity">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        {/* Radar grid ring */}
        <circle cx="60" cy="60" r="52" fill="#1b1816" stroke="#483f38" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="34" fill="none" stroke="#362f2a" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="60" cy="60" r="18" fill="none" stroke="#362f2a" strokeWidth="1" strokeDasharray="2 2" />

        {/* Compass Crosshairs */}
        <line x1="60" y1="8" x2="60" y2="112" stroke="#362f2a" strokeWidth="1" />
        <line x1="8" y1="60" x2="112" y2="60" stroke="#362f2a" strokeWidth="1" />

        {/* Generators */}
        {generators.map((g) => {
          const pt = toRadar(g.x, g.z);
          const col = g.isRepaired ? '#2ecc71' : g.progress > 0 ? '#f7d070' : '#8d99ae';
          return (
            <g key={g.id}>
              <rect
                x={pt.x - 3}
                y={pt.y - 3}
                width="6"
                height="6"
                fill={col}
                stroke="#111"
                strokeWidth="0.8"
              />
            </g>
          );
        })}

        {/* Escape Gates */}
        {gates.map((gate) => {
          const pt = toRadar(gate.x, gate.z);
          const col = gate.isOpened ? '#2ecc71' : gate.leverProgress > 0 ? '#ffd166' : '#e63946';
          return (
            <polygon
              key={gate.id}
              points={`${pt.x},${pt.y - 4} ${pt.x + 4},${pt.y + 3} ${pt.x - 4},${pt.y + 3}`}
              fill={col}
              stroke="#111"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Hunter Blip */}
        {hunterPos && showHunter && (
          <circle
            cx={toRadar(hunterPos.x, hunterPos.z).x}
            cy={toRadar(hunterPos.x, hunterPos.z).y}
            r="4.5"
            fill="#e63946"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
        )}

        {/* Player Cursor */}
        <g transform={`translate(60, 60) rotate(${(playerPos.rotY * 180) / Math.PI})`}>
          <polygon points="0,-6 4,5 -4,5" fill="#f4d35e" stroke="#111" strokeWidth="1" />
        </g>
      </svg>
      <div className="absolute bottom-0 right-1 text-[9px] font-mono text-stone-400">RADAR</div>
    </div>
  );
};
