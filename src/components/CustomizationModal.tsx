import React, { useState } from 'react';
import { X, Sparkles, Shirt, Shield, Palette } from 'lucide-react';
import { PlayerProfile } from '../types/game';

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (newProfile: PlayerProfile) => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'survivor' | 'hunter' | 'perks'>('survivor');

  if (!isOpen) return null;

  const survivorOutfits = [
    { id: 'classic_pencil', name: 'Classic Pencil', cost: 0, desc: 'Original sketchbook graphite outfit' },
    { id: 'noir_charcoal', name: 'Noir Charcoal', cost: 80, desc: 'Smudged deep charcoal textures' },
    { id: 'neon_highlighter', name: 'Neon Highlighter', cost: 150, desc: 'Fluorescent yellow ink accents' },
    { id: 'watercolor_splash', name: 'Watercolor Splash', cost: 220, desc: 'Hand-painted watercolor wash' },
  ];

  const hunterSkins = [
    { id: 'black_slasher_classic', name: 'Black Slasher Prime', cost: 0, desc: 'Dripping razor scythe & pointed ink horns' },
    { id: 'blood_sepia', name: 'Blood Sepia', cost: 100, desc: 'Aged vintage reddish ink tone' },
    { id: 'hollow_void', name: 'Hollow Void', cost: 200, desc: 'Starry chalkboard void textures' },
  ];

  const weaponSkins = [
    { id: 'quill_scythe', name: 'Giant Feather Quill', cost: 0, desc: 'Razor sharp drafting feather' },
    { id: 'drafting_compass', name: 'Steel Drafting Compass', cost: 90, desc: 'Heavy dual-pin geometry weapon' },
    { id: 'vintage_ruler', name: 'Broken Vintage Ruler', cost: 140, desc: 'Beveled wooden edge with carved inches' },
  ];

  const perksList = [
    { id: 'quick_fix', name: 'Quick Fix', role: 'survivor', cost: 50, desc: '+15% repair speed when teammates are caged' },
    { id: 'fleet_foot', name: 'Fleet Foot', role: 'survivor', cost: 75, desc: 'Stamina recovers 20% faster after vaulting' },
    { id: 'keen_eyes', name: 'Keen Eyes', role: 'survivor', cost: 60, desc: 'Unfinished generators are highlighted at start' },
    { id: 'hunter_brutality', name: 'Ink Brutality', role: 'hunter', cost: 80, desc: 'Slightly faster weapon recovery after hitting' },
    { id: 'relentless_chase', name: 'Relentless Chase', role: 'hunter', cost: 100, desc: 'Scratch marks remain visible for 2 seconds longer' },
  ];

  const handleEquipSurvivorSkin = (id: string, cost: number) => {
    if (!profile.unlockedOutfits.includes(id)) {
      if (profile.inkDroplets >= cost) {
        onUpdateProfile({
          ...profile,
          inkDroplets: profile.inkDroplets - cost,
          unlockedOutfits: [...profile.unlockedOutfits, id],
          equippedSurvivorSkin: id,
        });
      }
    } else {
      onUpdateProfile({ ...profile, equippedSurvivorSkin: id });
    }
  };

  const handleEquipHunterSkin = (id: string, cost: number) => {
    if (!profile.unlockedOutfits.includes(id)) {
      if (profile.inkDroplets >= cost) {
        onUpdateProfile({
          ...profile,
          inkDroplets: profile.inkDroplets - cost,
          unlockedOutfits: [...profile.unlockedOutfits, id],
          equippedHunterSkin: id,
        });
      }
    } else {
      onUpdateProfile({ ...profile, equippedHunterSkin: id });
    }
  };

  const handleTogglePerk = (id: string, cost: number, role: 'survivor' | 'hunter') => {
    const isUnlocked = profile.unlockedOutfits.includes(id);
    if (!isUnlocked) {
      if (profile.inkDroplets >= cost) {
        onUpdateProfile({
          ...profile,
          inkDroplets: profile.inkDroplets - cost,
          unlockedOutfits: [...profile.unlockedOutfits, id],
          equippedSurvivorPerks: role === 'survivor' ? [...profile.equippedSurvivorPerks, id] : profile.equippedSurvivorPerks,
          equippedHunterPerks: role === 'hunter' ? [...profile.equippedHunterPerks, id] : profile.equippedHunterPerks,
        });
      }
      return;
    }

    if (role === 'survivor') {
      const equipped = profile.equippedSurvivorPerks.includes(id);
      const newPerks = equipped
        ? profile.equippedSurvivorPerks.filter((p) => p !== id)
        : [...profile.equippedSurvivorPerks, id].slice(0, 2); // max 2 perks
      onUpdateProfile({ ...profile, equippedSurvivorPerks: newPerks });
    } else {
      const equipped = profile.equippedHunterPerks.includes(id);
      const newPerks = equipped
        ? profile.equippedHunterPerks.filter((p) => p !== id)
        : [...profile.equippedHunterPerks, id].slice(0, 2);
      onUpdateProfile({ ...profile, equippedHunterPerks: newPerks });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none font-doodle text-stone-900">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto sketch-card p-6 bg-[#fcf8f0] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-stone-300 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-stone-700" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-300 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-amber-800" />
            <h2 className="text-2xl font-sketch font-bold text-stone-900">
              SKETCHBOOK CLOSET & LOADOUT
            </h2>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 rounded-full border border-amber-300 text-sm font-sketch font-bold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>{profile.inkDroplets} INK DROPLETS</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('survivor')}
            className={`px-4 py-1.5 rounded font-sketch font-bold text-sm transition-colors cursor-pointer ${
              activeTab === 'survivor' ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            Survivor Outfits
          </button>
          <button
            onClick={() => setActiveTab('hunter')}
            className={`px-4 py-1.5 rounded font-sketch font-bold text-sm transition-colors cursor-pointer ${
              activeTab === 'hunter' ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            Hunter Skins & Weapons
          </button>
          <button
            onClick={() => setActiveTab('perks')}
            className={`px-4 py-1.5 rounded font-sketch font-bold text-sm transition-colors cursor-pointer ${
              activeTab === 'perks' ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            Perk Loadouts
          </button>
        </div>

        {/* Content */}
        {activeTab === 'survivor' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {survivorOutfits.map((outfit) => {
              const isUnlocked = profile.unlockedOutfits.includes(outfit.id) || outfit.cost === 0;
              const isEquipped = profile.equippedSurvivorSkin === outfit.id;
              const canAfford = profile.inkDroplets >= outfit.cost;

              return (
                <div
                  key={outfit.id}
                  className={`p-3.5 sketch-card flex flex-col justify-between ${
                    isEquipped ? 'ring-2 ring-emerald-600 bg-emerald-50/50' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-sketch font-bold text-base text-stone-900">
                        {outfit.name}
                      </h4>
                      {isEquipped && (
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          EQUIPPED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 mb-3">{outfit.desc}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                    <span className="text-xs font-sketch text-amber-900 font-bold">
                      {isUnlocked ? 'UNLOCKED' : `${outfit.cost} DROPLETS`}
                    </span>
                    <button
                      onClick={() => handleEquipSurvivorSkin(outfit.id, outfit.cost)}
                      disabled={!isUnlocked && !canAfford}
                      className={`px-3 py-1 rounded text-xs font-sketch font-bold transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-stone-300 text-stone-600'
                          : isUnlocked
                          ? 'bg-stone-900 text-white hover:bg-stone-800'
                          : canAfford
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {isEquipped ? 'IN USE' : isUnlocked ? 'EQUIP' : 'UNLOCK'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'hunter' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-sketch font-bold text-stone-700 mb-2">HUNTER FORMS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hunterSkins.map((skin) => {
                  const isUnlocked = profile.unlockedOutfits.includes(skin.id) || skin.cost === 0;
                  const isEquipped = profile.equippedHunterSkin === skin.id;
                  const canAfford = profile.inkDroplets >= skin.cost;

                  return (
                    <div
                      key={skin.id}
                      className={`p-3.5 sketch-card flex flex-col justify-between ${
                        isEquipped ? 'ring-2 ring-red-600 bg-red-50/50' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-sketch font-bold text-base text-stone-900">
                            {skin.name}
                          </h4>
                          {isEquipped && (
                            <span className="text-xs font-mono font-bold text-red-700">
                              EQUIPPED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 mb-3">{skin.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                        <span className="text-xs font-sketch text-amber-900 font-bold">
                          {isUnlocked ? 'UNLOCKED' : `${skin.cost} DROPLETS`}
                        </span>
                        <button
                          onClick={() => handleEquipHunterSkin(skin.id, skin.cost)}
                          disabled={!isUnlocked && !canAfford}
                          className={`px-3 py-1 rounded text-xs font-sketch font-bold transition-all cursor-pointer ${
                            isEquipped
                              ? 'bg-stone-300 text-stone-600'
                              : isUnlocked
                              ? 'bg-stone-900 text-white hover:bg-stone-800'
                              : canAfford
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          {isEquipped ? 'IN USE' : isUnlocked ? 'EQUIP' : 'UNLOCK'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-sketch font-bold text-stone-700 mb-2">WEAPON BLADES</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weaponSkins.map((w) => {
                  const isUnlocked = profile.unlockedWeapons.includes(w.id) || w.cost === 0;
                  const isEquipped = profile.equippedWeaponSkin === w.id;
                  const canAfford = profile.inkDroplets >= w.cost;

                  return (
                    <div
                      key={w.id}
                      className={`p-3.5 sketch-card flex flex-col justify-between ${
                        isEquipped ? 'ring-2 ring-amber-600 bg-amber-50/50' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-sketch font-bold text-base text-stone-900">{w.name}</h4>
                          {isEquipped && (
                            <span className="text-xs font-mono font-bold text-amber-800">
                              EQUIPPED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 mb-3">{w.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                        <span className="text-xs font-sketch text-amber-900 font-bold">
                          {isUnlocked ? 'UNLOCKED' : `${w.cost} DROPLETS`}
                        </span>
                        <button
                          onClick={() => {
                            if (!isUnlocked && canAfford) {
                              onUpdateProfile({
                                ...profile,
                                inkDroplets: profile.inkDroplets - w.cost,
                                unlockedWeapons: [...profile.unlockedWeapons, w.id],
                                equippedWeaponSkin: w.id,
                              });
                            } else if (isUnlocked) {
                              onUpdateProfile({ ...profile, equippedWeaponSkin: w.id });
                            }
                          }}
                          disabled={!isUnlocked && !canAfford}
                          className={`px-3 py-1 rounded text-xs font-sketch font-bold cursor-pointer ${
                            isEquipped
                              ? 'bg-stone-300 text-stone-600'
                              : isUnlocked
                              ? 'bg-stone-900 text-white'
                              : canAfford
                              ? 'bg-amber-600 text-white'
                              : 'bg-stone-200 text-stone-400'
                          }`}
                        >
                          {isEquipped ? 'IN USE' : isUnlocked ? 'EQUIP' : 'UNLOCK'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'perks' && (
          <div className="space-y-4">
            <div className="text-xs text-stone-600 mb-2">
              Equip up to 2 perks per role. Unlock perks with ink droplets earned from playing matches!
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {perksList.map((perk) => {
                const isUnlocked = profile.unlockedOutfits.includes(perk.id) || perk.cost === 0;
                const isEquipped =
                  perk.role === 'survivor'
                    ? profile.equippedSurvivorPerks.includes(perk.id)
                    : profile.equippedHunterPerks.includes(perk.id);
                const canAfford = profile.inkDroplets >= perk.cost;

                return (
                  <div
                    key={perk.id}
                    className={`p-3.5 sketch-card flex flex-col justify-between ${
                      isEquipped ? 'ring-2 ring-indigo-600 bg-indigo-50/50' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-sketch font-bold text-base text-stone-900">
                          {perk.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-stone-200 rounded">
                          {perk.role}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mb-3">{perk.desc}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                      <span className="text-xs font-sketch text-amber-900 font-bold">
                        {isUnlocked ? 'UNLOCKED' : `${perk.cost} DROPLETS`}
                      </span>
                      <button
                        onClick={() => handleTogglePerk(perk.id, perk.cost, perk.role as 'survivor' | 'hunter')}
                        disabled={!isUnlocked && !canAfford}
                        className={`px-3 py-1 rounded text-xs font-sketch font-bold transition-all cursor-pointer ${
                          isEquipped
                            ? 'bg-indigo-700 text-white'
                            : isUnlocked
                            ? 'bg-stone-900 text-white hover:bg-stone-800'
                            : canAfford
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        {isEquipped ? 'ACTIVE' : isUnlocked ? 'EQUIP' : 'UNLOCK'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
