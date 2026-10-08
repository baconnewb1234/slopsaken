import React from 'react';
import { X, Award, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { AchievementItem } from '../types/game';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: AchievementItem[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
}) => {
  if (!isOpen) return null;

  const completedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none font-doodle text-stone-900">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto sketch-card p-6 bg-[#fcf8f0] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-stone-300 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-stone-700" />
        </button>

        <div className="flex items-center justify-between border-b border-stone-300 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-800" />
            <h2 className="text-2xl font-sketch font-bold text-stone-900">
              SKETCH TRIALS ACHIEVEMENTS
            </h2>
          </div>
          <div className="text-xs font-mono font-bold text-stone-600">
            {completedCount} / {achievements.length} UNLOCKED
          </div>
        </div>

        <div className="space-y-3">
          {achievements.map((item) => (
            <div
              key={item.id}
              className={`p-3 sketch-card flex items-center justify-between gap-3 ${
                item.unlocked ? 'bg-amber-50/70 border-amber-600' : 'opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    item.unlocked ? 'bg-amber-500 text-stone-900' : 'bg-stone-300 text-stone-600'
                  }`}
                >
                  {item.unlocked ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>

                <div>
                  <h4 className="font-sketch font-bold text-sm text-stone-900 flex items-center gap-1.5">
                    {item.title}
                  </h4>
                  <p className="text-xs text-stone-600">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-sketch font-bold text-amber-900 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>+{item.rewardDroplets} DROPLETS</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
