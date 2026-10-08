import React from 'react';
import { MatchStats, GameRole, PlayerProfile } from '../types/game';
import { Trophy, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';

interface EndGameSummaryProps {
  victory: boolean;
  role: GameRole;
  stats: MatchStats;
  profile: PlayerProfile;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const EndGameSummary: React.FC<EndGameSummaryProps> = ({
  victory,
  role,
  stats,
  profile,
  onPlayAgain,
  onReturnToLobby,
}) => {
  const isSurvivor = role === 'survivor';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-doodle text-stone-900">
      <div className="relative w-full max-w-xl sketch-card p-6 bg-[#fcf8f0] shadow-2xl text-center">
        {/* Large Ink Stamp */}
        <div
          className={`inline-block px-6 py-2 mb-4 text-3xl font-sketch font-black tracking-widest uppercase border-4 rounded rotate-[-3deg] shadow-lg ${
            victory
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50'
              : 'border-red-700 text-red-800 bg-red-50'
          }`}
        >
          {victory
            ? isSurvivor
              ? 'TRIAL ESCAPED!'
              : 'HUNTER DOMINANCE!'
            : isSurvivor
            ? 'SACRIFICED TO THE INK!'
            : 'SURVIVORS ESCAPED!'}
        </div>

        <p className="text-sm text-stone-600 mb-6 font-sketch">
          {victory
            ? isSurvivor
              ? 'You decoded the sketch engines and made it past the iron gates!'
              : 'You hunted down the intruding survivors and returned them to parchment.'
            : isSurvivor
            ? 'The quill reached you before the final switch could be thrown.'
            : 'The survivors coordinated and broke free from your sketchbook arena.'}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6 text-left">
          <div className="sketch-card p-2.5 bg-amber-50/60">
            <div className="text-[11px] text-stone-500 font-mono">TRIAL DURATION</div>
            <div className="text-lg font-bold font-sketch text-stone-900">
              {formatTime(stats.matchDurationSec)}
            </div>
          </div>

          <div className="sketch-card p-2.5 bg-amber-50/60">
            <div className="text-[11px] text-stone-500 font-mono">ENGINES FIXED</div>
            <div className="text-lg font-bold font-sketch text-stone-900">
              {stats.generatorsCompleted} / 5
            </div>
          </div>

          <div className="sketch-card p-2.5 bg-amber-50/60">
            <div className="text-[11px] text-stone-500 font-mono">
              {isSurvivor ? 'PALLET STUNS' : 'HITS DEALT'}
            </div>
            <div className="text-lg font-bold font-sketch text-stone-900">
              {isSurvivor ? stats.palletsStunned : stats.hitsDealt}
            </div>
          </div>

          <div className="sketch-card p-2.5 bg-amber-50/60">
            <div className="text-[11px] text-stone-500 font-mono">
              {isSurvivor ? 'CAGE RESCUES' : 'SURVIVORS CAGED'}
            </div>
            <div className="text-lg font-bold font-sketch text-stone-900">
              {isSurvivor ? stats.rescuesMade : stats.survivorsSacrificed}
            </div>
          </div>
        </div>

        {/* Level & XP Reward Bar */}
        <div className="p-4 sketch-card-dark text-stone-200 mb-6 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="font-sketch font-bold text-base text-amber-300">
                PLAYER LEVEL {profile.level}
              </span>
            </div>
            <span className="text-xs font-mono text-stone-400">
              +{stats.xpEarned} XP
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full bg-stone-700 h-2.5 rounded-full overflow-hidden mb-2">
            <div
              className="bg-amber-400 h-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (profile.xp / profile.xpToNextLevel) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
            <span>
              {profile.xp} / {profile.xpToNextLevel} XP
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" /> +{stats.inkDropletsEarned} Ink Droplets
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onReturnToLobby}
            className="flex items-center gap-2 px-5 py-2.5 rounded sketch-card text-stone-800 font-sketch font-bold hover:bg-stone-200 transition-colors cursor-pointer"
          >
            LOBBY
          </button>

          <button
            onClick={onPlayAgain}
            className="flex items-center gap-2 px-6 py-2.5 rounded sketch-card-dark text-amber-300 font-sketch font-bold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> PLAY AGAIN
          </button>
        </div>
      </div>
    </div>
  );
};
