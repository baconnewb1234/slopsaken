import React from 'react';
import { X, Settings, Sliders, Eye, Volume2, RotateCcw } from 'lucide-react';
import { GameSettings } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);

    if (key === 'volume') {
      soundEngine.setVolume(value as number);
    }
  };

  const handleResetDefaults = () => {
    const defaults: GameSettings = {
      invertHorizontalLook: false,
      invertVerticalLook: false,
      invertStrafe: false,
      mouseSensitivity: 1.0,
      showHitboxes: false,
      fov: 65,
      volume: 80,
    };
    onUpdateSettings(defaults);
    soundEngine.setVolume(80);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-doodle text-stone-900 select-none">
      <div className="sketch-card w-full max-w-lg p-6 bg-[#fbf7ed] shadow-2xl animate-doodle relative border-3 border-stone-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-stone-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-600 animate-spin-slow" />
            <h2 className="text-2xl font-black font-sketch tracking-wider text-stone-900">
              GAME & CONTROLS SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-300 text-stone-700 hover:text-stone-950 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* 1. CONTROLS & CAMERA */}
          <div className="bg-stone-100/70 p-3 rounded-lg border-2 border-stone-300">
            <div className="flex items-center gap-1.5 font-sketch font-bold text-sm text-stone-800 mb-2">
              <Sliders className="w-4 h-4 text-amber-700" />
              <span>CAMERA & MOVEMENT CONTROLS</span>
            </div>

            {/* Invert Horizontal Camera */}
            <label className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-stone-200/50 px-2 rounded">
              <div>
                <div className="font-sketch font-bold text-xs text-stone-900">Invert Horizontal Look (X-Axis)</div>
                <div className="text-[11px] text-stone-500">Reverses left/right mouse camera rotation</div>
              </div>
              <input
                type="checkbox"
                checked={settings.invertHorizontalLook}
                onChange={(e) => handleChange('invertHorizontalLook', e.target.checked)}
                className="w-5 h-5 accent-amber-600 cursor-pointer"
              />
            </label>

            {/* Invert Vertical Camera */}
            <label className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-stone-200/50 px-2 rounded">
              <div>
                <div className="font-sketch font-bold text-xs text-stone-900">Invert Vertical Look (Y-Axis)</div>
                <div className="text-[11px] text-stone-500">Reverses up/down mouse camera pitch</div>
              </div>
              <input
                type="checkbox"
                checked={settings.invertVerticalLook}
                onChange={(e) => handleChange('invertVerticalLook', e.target.checked)}
                className="w-5 h-5 accent-amber-600 cursor-pointer"
              />
            </label>

            {/* Invert Strafe */}
            <label className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-stone-200/50 px-2 rounded">
              <div>
                <div className="font-sketch font-bold text-xs text-stone-900">Invert Left / Right Strafe (A / D)</div>
                <div className="text-[11px] text-stone-500">Swaps A (move left) and D (move right)</div>
              </div>
              <input
                type="checkbox"
                checked={settings.invertStrafe}
                onChange={(e) => handleChange('invertStrafe', e.target.checked)}
                className="w-5 h-5 accent-amber-600 cursor-pointer"
              />
            </label>

            {/* Mouse Sensitivity */}
            <div className="mt-2 px-2 py-1">
              <div className="flex items-center justify-between font-sketch font-bold text-xs text-stone-900 mb-1">
                <span>Mouse Sensitivity</span>
                <span className="font-mono text-amber-700">{settings.mouseSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={settings.mouseSensitivity}
                onChange={(e) => handleChange('mouseSensitivity', parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Field of View */}
            <div className="mt-2 px-2 py-1">
              <div className="flex items-center justify-between font-sketch font-bold text-xs text-stone-900 mb-1">
                <span>Field of View (FOV)</span>
                <span className="font-mono text-amber-700">{settings.fov}°</span>
              </div>
              <input
                type="range"
                min="50"
                max="85"
                step="1"
                value={settings.fov}
                onChange={(e) => handleChange('fov', parseInt(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          {/* 2. HITBOXES DEBUG VISUALIZER */}
          <div className="bg-stone-100/70 p-3 rounded-lg border-2 border-stone-300">
            <div className="flex items-center gap-1.5 font-sketch font-bold text-sm text-stone-800 mb-2">
              <Eye className="w-4 h-4 text-purple-700" />
              <span>HITBOX & HURTBOX VISUALIZER</span>
            </div>

            <label className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-stone-200/50 px-2 rounded">
              <div>
                <div className="font-sketch font-bold text-xs text-stone-900">Show 3D Hitboxes in Match</div>
                <div className="text-[11px] text-stone-500">
                  Renders colored wireframes for weapon attack swing (red), grab area (purple), and survivor hurtboxes (cyan).
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showHitboxes}
                onChange={(e) => handleChange('showHitboxes', e.target.checked)}
                className="w-5 h-5 accent-purple-600 cursor-pointer"
              />
            </label>
          </div>

          {/* 3. AUDIO VOLUME */}
          <div className="bg-stone-100/70 p-3 rounded-lg border-2 border-stone-300">
            <div className="flex items-center gap-1.5 font-sketch font-bold text-sm text-stone-800 mb-2">
              <Volume2 className="w-4 h-4 text-emerald-700" />
              <span>AUDIO MASTER VOLUME</span>
            </div>

            <div className="px-2 py-1">
              <div className="flex items-center justify-between font-sketch font-bold text-xs text-stone-900 mb-1">
                <span>Volume</span>
                <span className="font-mono text-emerald-700">{settings.volume ?? 80}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.volume ?? 80}
                onChange={(e) => handleChange('volume', parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t-2 border-stone-800">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-sketch text-stone-600 hover:text-stone-900 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-sketch font-bold text-sm rounded-md border-2 border-stone-900 shadow-md cursor-pointer transition-colors"
          >
            APPLY & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
