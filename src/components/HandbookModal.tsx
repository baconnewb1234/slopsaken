import React from 'react';
import { X, BookOpen, Shield, Zap, Wrench, Footprints, Skull, Eye, Flame } from 'lucide-react';

interface HandbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandbookModal: React.FC<HandbookModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none font-doodle text-stone-900">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto sketch-card p-6 bg-[#fcf8f0] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-stone-300 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-stone-700" />
        </button>

        <div className="flex items-center gap-2 mb-4 border-b border-stone-300 pb-2">
          <BookOpen className="w-6 h-6 text-amber-800" />
          <h2 className="text-2xl font-sketch font-bold text-stone-900">
            SLOPSAKEN SURVIVAL & COMBAT GUIDE
          </h2>
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          {/* Section 1 */}
          <div className="p-3 bg-amber-50/80 rounded border border-amber-200">
            <h3 className="font-sketch font-bold text-base text-amber-950 flex items-center gap-1.5 mb-1">
              <Wrench className="w-4 h-4 text-amber-700" /> 1. The Core Objective
            </h3>
            <p>
              4 Survivors are trapped in a living nightmare notebook. <strong>5 Sketch Engines</strong> are scattered
              around the arena. Work together to repair at least <strong>4 Engines</strong> to restore electrical
              power to the 2 Escape Gates. Once powered, pull the gate lever to escape!
            </p>
          </div>

          {/* Section 2: Newb Abilities */}
          <div className="p-3 bg-emerald-50/80 rounded border border-emerald-200">
            <h3 className="font-sketch font-bold text-base text-emerald-950 flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-emerald-700" /> 2. Newb Survivor's 2 Potions
            </h3>
            <p>
              <strong>[1] / [Q] Speed Potion:</strong> Take a quick 0.8s drink to gain <strong>+25% movement speed</strong> for 5 seconds to outrun the killer!
            </p>
            <p className="mt-1">
              <strong>[2] / [R] Invisibility Potion:</strong> Drink the spectral potion to become <strong>80% transparent and undetectable</strong> for 8 seconds. The killer cannot see your aura or hear terror footsteps!
            </p>
          </div>

          {/* Section 3: Black Slasher Abilities */}
          <div className="p-3 bg-red-50/80 rounded border border-red-200">
            <h3 className="font-sketch font-bold text-base text-red-950 flex items-center gap-1.5 mb-1">
              <Skull className="w-4 h-4 text-red-700" /> 3. Black Slasher Killer's 4 Powers
            </h3>
            <ul className="list-disc list-inside space-y-1 text-xs text-stone-800">
              <li><strong>[1] Slash (0.7s CD):</strong> Deals 20 dmg + Bleeding (2 dmg/s for 3s, leaves blood trail).</li>
              <li><strong>[2] Ink Charge:</strong> 5s high-speed dash leaving slowing ink trail. Catching a survivor grabs and throws them for 30 dmg & ragdolls them!</li>
              <li><strong>[3] Gashing Wound:</strong> Combo punch delivering 40 dmg and pushes the survivor back!</li>
              <li><strong>[4] Raging Ink:</strong> Red glowing eyes highlight nearest survivor. Slows killer to walking speed, but supercharges all other abilities (lunges, 8s charge, 50 dmg combo)!</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="p-3 bg-purple-50/80 rounded border border-purple-200">
            <h3 className="font-sketch font-bold text-base text-purple-950 flex items-center gap-1.5 mb-1">
              <Shield className="w-4 h-4 text-purple-700" /> 4. Health, Bleeding & Cages
            </h3>
            <p>
              Survivors start with <strong>100 HP</strong>. Bleeding deals 2 damage/sec but cannot kill (stops at 1 HP).
              At 0 HP, survivors are trapped in a <strong>Scribble Iron Cage</strong> with a 60-second sacrifice timer.
              Teammates can press <strong>[E]</strong> to rescue you!
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 sketch-card-dark text-amber-200 font-sketch font-bold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            LET'S PLAY SLOPSAKEN
          </button>
        </div>
      </div>
    </div>
  );
};
