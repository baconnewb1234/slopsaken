import React from 'react';
import {
  SurvivorData,
  HunterData,
  GeneratorEntity,
  EscapeGateEntity,
  ComicPop,
  GameRole,
} from '../types/game';
import { Minimap } from './Minimap';
import { soundEngine } from '../audio/soundEngine';
import {
  Volume2,
  VolumeX,
  Heart,
  Footprints,
  Wrench,
  Shield,
  Skull,
  Zap,
  Eye,
  Droplet,
  Flame,
  Settings,
  Sparkles,
  Coins,
  Hammer,
  Crosshair,
  Award,
  AlertTriangle,
  Crown,
  Lock,
} from 'lucide-react';

interface GameHUDProps {
  userRole: GameRole;
  survivors: SurvivorData[];
  hunter: HunterData;
  generators: GeneratorEntity[];
  gates: EscapeGateEntity[];
  actionPrompt: string | null;
  comicPops: ComicPop[];
  matchTimerSec: number; // remaining match seconds (e.g. 180s countdown)
  isLastManStanding?: boolean;
  terrorDist: number;
  isShiftLock?: boolean;
  isFirstPerson?: boolean;
  onToggleShiftLock?: () => void;
  onToggleFirstPerson?: () => void;
  onQuitMatch: () => void;
  onOpenSettings?: () => void;
  onTriggerSurvivorAbility1?: () => void;
  onTriggerSurvivorAbility2?: () => void;
  onTriggerSurvivorAbility3?: () => void;
  onTriggerSurvivorAbility4?: () => void;
  onTriggerSurvivorAbility?: (index: number) => void;
  onTriggerHunterAbility?: (index: number) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  userRole,
  survivors,
  hunter,
  generators,
  gates,
  actionPrompt,
  comicPops,
  matchTimerSec,
  isLastManStanding = false,
  terrorDist,
  isShiftLock = false,
  isFirstPerson = false,
  onToggleShiftLock,
  onToggleFirstPerson,
  onQuitMatch,
  onOpenSettings,
  onTriggerSurvivorAbility1,
  onTriggerSurvivorAbility2,
  onTriggerSurvivorAbility3,
  onTriggerSurvivorAbility4,
  onTriggerSurvivorAbility,
  onTriggerHunterAbility,
}) => {
  const [isMuted, setIsMuted] = React.useState(soundEngine.getIsMuted());

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  const formatCountdown = (sec: number) => {
    const safeSec = Math.max(0, Math.floor(sec));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playerSurvivor = survivors[0];
  const activeHunter = hunter;
  const isSurvivor = userRole === 'survivor';

  const completedGens = generators.filter((g) => g.isRepaired).length;
  const gatesPowered = completedGens >= 4 || isLastManStanding;
  const anyGateOpen = gates.some((g) => g.isOpened);

  // Vignette intensity
  let vignetteOpacity = 0;
  if (isSurvivor && terrorDist < 28 && !playerSurvivor?.isInvisible) {
    vignetteOpacity = Math.max(0, Math.min(0.85, (28 - terrorDist) / 28));
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden font-doodle text-stone-900">
      {/* Dynamic Terror Vignette */}
      {isSurvivor && vignetteOpacity > 0 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: `inset 0 0 ${vignetteOpacity * 130}px rgba(180, 20, 20, ${vignetteOpacity})`,
            background:
              terrorDist < 10
                ? 'radial-gradient(circle, transparent 40%, rgba(200, 10, 10, 0.32) 100%)'
                : 'none',
          }}
        />
      )}

      {/* Top Header Bar */}
      <header className="pointer-events-auto flex items-center justify-between px-6 py-2.5 border-b-2 border-stone-800 bg-[#1e1b18]/95 backdrop-blur-sm text-stone-200 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-wider font-sketch text-amber-300 animate-doodle">
            SLOPSAKEN
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-900/90 rounded border border-stone-700">
            <span className="text-xs text-stone-400 font-mono">TIME:</span>
            <span
              className={`font-mono text-sm font-bold tracking-wider ${
                matchTimerSec <= 30
                  ? 'text-red-400 animate-pulse font-extrabold'
                  : matchTimerSec <= 60
                  ? 'text-amber-400'
                  : 'text-stone-200'
              }`}
            >
              {formatCountdown(matchTimerSec)}
            </span>
          </div>
        </div>

        {/* Center: Objective / Last Man Standing Banner */}
        {isLastManStanding ? (
          <div className="flex items-center gap-2 bg-red-950/90 border-2 border-red-600 px-4 py-1.5 rounded-lg shadow-[0_0_15px_rgba(239,35,60,0.5)] animate-pulse">
            <Skull className="w-5 h-5 text-red-500 animate-bounce" />
            <span className="text-sm font-sketch font-black tracking-widest text-red-300">
              LAST MAN STANDING! SURVIVE OR DIE!
            </span>
            <span className="text-xs text-red-200 font-mono font-bold">
              {matchTimerSec > 30 ? `GATES OPEN IN ${Math.floor(matchTimerSec - 30)}s` : 'GATES ARE OPEN! ESCAPE!'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4 bg-stone-800/80 px-4 py-1.5 rounded-lg border-2 border-stone-700 sketch-border">
            <div className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-sketch font-bold">
                {completedGens} / 4 ENGINES
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {generators.map((g, idx) => (
                <div
                  key={g.id}
                  className={`w-3.5 h-3.5 rounded-full border-2 border-stone-900 transition-colors ${
                    g.isRepaired
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : g.progress > 0
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-stone-600'
                  }`}
                  title={`Engine ${idx + 1}: ${Math.floor(g.progress)}%`}
                />
              ))}
            </div>

            <span className="text-stone-500">|</span>

            <span
              className={`text-xs uppercase font-sketch font-bold ${
                anyGateOpen
                  ? 'text-emerald-400 animate-bounce'
                  : gatesPowered
                  ? 'text-amber-400 animate-pulse'
                  : 'text-stone-400'
              }`}
            >
              {anyGateOpen
                ? 'ESCAPE GATE OPEN!'
                : gatesPowered
                ? 'GATES POWERED - PULL LEVERS!'
                : 'GATES SEALED'}
            </span>
          </div>
        )}

        {/* Camera controls: Shiftlock & 1st Person */}
        <div className="flex items-center gap-2">
          {onToggleShiftLock && (
            <button
              onClick={onToggleShiftLock}
              className={`px-2.5 py-1 text-xs rounded sketch-card flex items-center gap-1.5 transition-all cursor-pointer font-sketch font-bold ${
                isShiftLock
                  ? 'bg-amber-400 text-stone-900 ring-2 ring-amber-300 shadow-md'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
              title="Toggle Shiftlock Screen Lock [Ctrl]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>[CTRL] SHIFTLOCK: {isShiftLock ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {onToggleFirstPerson && (
            <button
              onClick={onToggleFirstPerson}
              className={`px-2.5 py-1 text-xs rounded sketch-card flex items-center gap-1.5 transition-all cursor-pointer font-sketch font-bold ${
                isFirstPerson
                  ? 'bg-sky-400 text-stone-900 ring-2 ring-sky-300 shadow-md'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
              title="Toggle 1st Person Mode [V] or Mouse Scroll Wheel"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>[V] 1ST PERSON: {isFirstPerson ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-md hover:bg-stone-800 text-stone-300 hover:text-amber-300 transition-colors cursor-pointer"
              title="Settings (Hitboxes, Controls, Inversion)"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-md hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onQuitMatch}
            className="px-3 py-1 text-xs font-sketch font-bold text-stone-300 hover:text-white bg-stone-800 hover:bg-red-950/70 rounded-md border border-stone-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            SURRENDER
          </button>
        </div>
      </header>

      {/* Roblox Shiftlock / First Person Screen Center Reticle */}
      {(isShiftLock || isFirstPerson) && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40 select-none">
          <div className="relative flex items-center justify-center">
            {/* Outer Circle with drop shadow */}
            <div className="w-6 h-6 rounded-full border-2 border-white/95 shadow-[0_0_6px_rgba(0,0,0,0.85)] flex items-center justify-center">
              {/* Inner Center Dot */}
              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_3px_rgba(0,0,0,0.9)]" />
            </div>
            {/* Shiftlock label subtle badge */}
            {isShiftLock && (
              <span className="absolute -bottom-5 text-[9px] font-mono font-bold tracking-widest text-amber-300 bg-black/60 px-1.5 py-0.5 rounded shadow">
                🔒 SHIFTLOCK
              </span>
            )}
            {isFirstPerson && (
              <span className="absolute -bottom-5 text-[9px] font-mono font-bold tracking-widest text-sky-300 bg-black/60 px-1.5 py-0.5 rounded shadow">
                👁️ 1ST PERSON
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Screen Layout */}
      <div className="flex justify-between p-4 h-[calc(100vh-100px)] pointer-events-none">
        {/* Left Side: Teammate Status Cards */}
        <div className="flex flex-col gap-2 max-w-xs pointer-events-auto">
          <div className="text-[11px] font-sketch uppercase text-stone-400 tracking-wider">
            SURVIVORS SQUAD
          </div>
          {survivors.map((s) => {
            let statusColor = 'text-emerald-600';
            let statusLabel = `${Math.floor(s.hp)} / ${s.maxHp || 100} HP`;
            if (s.health === 'injured') {
              statusColor = 'text-amber-600 font-bold';
              statusLabel = `INJURED (${Math.floor(s.hp)} HP)`;
            } else if (s.health === 'caged') {
              statusColor = 'text-purple-600 font-extrabold animate-bounce';
              statusLabel = `CAGED (${Math.ceil(s.cageTimeRemaining)}s)`;
            } else if (s.health === 'escaped') {
              statusColor = 'text-cyan-600 font-bold';
              statusLabel = 'ESCAPED';
            } else if (s.health === 'sacrificed') {
              statusColor = 'text-red-700 line-through';
              statusLabel = 'SACRIFICED';
            }

            const isCaretaker = s.characterClass === 'caretaker';

            return (
              <div
                key={s.id}
                className="sketch-card p-2 flex items-center gap-2.5 shadow-sm min-w-[210px] bg-[#fbf6ec]"
              >
                <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-200 flex items-center justify-center font-sketch text-sm border-2 border-stone-700 shrink-0">
                  {isCaretaker ? '+' : s.characterClass[0].toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 leading-tight">
                  <div className="text-xs font-bold font-sketch text-stone-900 truncate flex items-center justify-between">
                    <span>{isCaretaker ? `${s.name} (Caretaker)` : s.name}</span>
                    {s.isInvisible && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-mono font-bold">
                        GHOST
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={statusColor}>{statusLabel}</span>
                    <span className="text-stone-500 font-mono text-[10px]">
                      {s.score} PTS
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Hunter Badge */}
          <div className="sketch-card-dark p-2 mt-1 flex items-center gap-2.5 border-red-900/60 bg-[#1f1917]">
            <div className="w-8 h-8 rounded-full bg-red-950 text-red-300 flex items-center justify-center font-sketch text-sm border-2 border-red-700 shrink-0">
              <Skull className="w-4 h-4" />
            </div>
            <div className="flex flex-col flex-1 leading-tight">
              <div className="text-xs font-bold font-sketch text-red-300 flex items-center justify-between">
                <span>{activeHunter.name}</span>
                {activeHunter.isRagingInk && (
                  <span className="text-[9px] bg-red-800 text-white px-1.5 py-0.5 rounded font-mono animate-pulse">
                    RAGING
                  </span>
                )}
                {activeHunter.isStunImmune && (
                  <span className="text-[9px] bg-cyan-700 text-cyan-100 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                    SHIELDED
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-400 font-mono">
                {activeHunter.weapon} · {Math.floor(activeHunter.hp)}/1000 HP
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Radar and Keybind Help */}
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <Minimap
            playerPos={{ x: 0, z: 0, rotY: 0 }}
            generators={generators}
            gates={gates}
            role={userRole}
            radarActive={isSurvivor && playerSurvivor?.characterClass === 'newb'}
          />

          <div className="sketch-card p-2.5 text-[11px] leading-relaxed max-w-[210px] shadow-sm bg-[#fbf6ec]">
            <div className="font-sketch font-bold text-xs border-b border-stone-300 pb-0.5 mb-1.5 text-stone-900">
              SLOPSAKEN CONTROLS
            </div>
            <div><span className="font-mono font-bold">WASD</span>: Move Normal</div>
            <div><span className="font-mono font-bold">Shift</span>: Sprint Fast</div>
            <div><span className="font-mono font-bold">Ctrl</span>: Roblox Shiftlock</div>
            <div><span className="font-mono font-bold">V / Wheel</span>: 1st Person</div>
            <div><span className="font-mono font-bold">C</span>: Crouch / Hide</div>
            <div><span className="font-mono font-bold">Space</span>: Vault / Strike Dial</div>
            <div><span className="font-mono font-bold">E</span>: Hold to Repair</div>
            {isSurvivor ? (
              <>
                {playerSurvivor?.characterClass === 'caretaker' && (
                  <>
                    <div><span className="font-mono font-bold">[1] / [Q]</span>: Heal Splash</div>
                    <div><span className="font-mono font-bold">[2] / [R]</span>: Bottle Smash</div>
                  </>
                )}
                {playerSurvivor?.characterClass === 'builda_men' && (
                  <>
                    <div><span className="font-mono font-bold">[1] / [Q]</span>: Build Sentry</div>
                    <div><span className="font-mono font-bold">[2] / [R]</span>: Healing Machine</div>
                    <div><span className="font-mono font-bold">[3] / [F]</span>: Bonus Pad</div>
                  </>
                )}
                {playerSurvivor?.characterClass === 'gambling_guy' && (
                  <>
                    <div><span className="font-mono font-bold">[1] / [Q]</span>: Coin Flip</div>
                    <div><span className="font-mono font-bold">[2] / [R]</span>: Flintlock (1 Pt)</div>
                    <div><span className="font-mono font-bold">[3] / [F]</span>: Reroll Max HP</div>
                    <div><span className="font-mono font-bold">[4] / [C]</span>: Change Hat (3 Pts)</div>
                  </>
                )}
                {playerSurvivor?.characterClass === 'protector_guy' && (
                  <>
                    <div><span className="font-mono font-bold">[1] / [Q]</span>: Block Stance</div>
                    <div><span className="font-mono font-bold">[2] / [R]</span>: Counter Punch</div>
                    <div><span className="font-mono font-bold">[3] / [F]</span>: Rush Charge</div>
                  </>
                )}
                {playerSurvivor?.characterClass === 'newb' && (
                  <>
                    <div><span className="font-mono font-bold">[1] / [Q]</span>: Soda (+25% Spd)</div>
                    <div><span className="font-mono font-bold">[2] / [R]</span>: Invisibility 8s</div>
                  </>
                )}
                <div><span className="font-mono font-bold">L-Click</span>: Flashlight / Item</div>
              </>
            ) : (
              <>
                <div><span className="font-mono font-bold">[1] / Click</span>: Normal Slash (20 dmg)</div>
                <div><span className="font-mono font-bold">[2] / [E]</span>: Ink Charge & Throw</div>
                <div><span className="font-mono font-bold">[3] / [R]</span>: Gashing Combo</div>
                <div><span className="font-mono font-bold">[4] / [Q]</span>: Raging Ink (Boost 1 Move)</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center Action Prompt */}
      {actionPrompt && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="sketch-card px-6 py-2.5 text-base font-sketch font-bold tracking-wider text-amber-950 shadow-xl animate-doodle bg-[#fefae0]">
            {actionPrompt}
          </div>
        </div>
      )}

      {/* Unobtrusive Notifications & Event Banners (Top-Right, Never blocks crosshair/center screen) */}
      <div className="fixed top-20 right-6 pointer-events-none flex flex-col items-end gap-2 z-50 max-w-sm">
        {comicPops.map((pop) => (
          <div
            key={pop.id}
            className="text-base font-sketch font-black tracking-wider px-3.5 py-1.5 sketch-card animate-doodle shadow-lg transition-all"
            style={{
              color: pop.color,
              borderColor: pop.color,
              backgroundColor: '#fffdfa',
            }}
          >
            {pop.text}
          </div>
        ))}
      </div>

      {/* BOTTOM-LEFT CORNER: BIGGER HEALTH BAR, BIGGER STAMINA BAR, AND ACTIVE EFFECTS UI */}
      <div className="fixed bottom-5 left-6 pointer-events-auto flex flex-col gap-2 z-40">
        {/* ACTIVE EFFECTS UI (ABOVE HEALTH BAR) */}
        {isSurvivor && playerSurvivor && playerSurvivor.effects.length > 0 && (
          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[11px] font-sketch uppercase font-bold text-amber-300 tracking-wider">
              ACTIVE EFFECTS
            </span>
            <div className="flex flex-wrap gap-1.5 max-w-sm">
              {playerSurvivor.effects.map((eff) => (
                <div
                  key={eff.id}
                  className={`px-3 py-1 rounded-md sketch-border text-xs font-sketch font-bold flex items-center gap-1.5 shadow-md animate-doodle ${
                    eff.type === 'buff'
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-700'
                      : 'bg-red-100 text-red-950 border-red-700'
                  }`}
                >
                  {eff.id === 'speed_boost' && <Zap className="w-4 h-4 text-amber-600" />}
                  {eff.id === 'invisible' && <Eye className="w-4 h-4 text-emerald-700" />}
                  {eff.id === 'bleeding' && <Droplet className="w-4 h-4 text-red-600" />}
                  <span>{eff.name}</span>
                  <span className="font-mono text-[10px] bg-black/10 px-1 rounded">
                    {Math.ceil(eff.duration)}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hunter Active Effects (Raging Ink & Forcefield) */}
        {!isSurvivor && activeHunter && (activeHunter.isRagingInk || activeHunter.isStunImmune) && (
          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[11px] font-sketch uppercase font-bold text-amber-300 tracking-wider">
              HUNTER STATUS
            </span>
            <div className="flex flex-wrap gap-1.5 max-w-sm">
              {activeHunter.isRagingInk && (
                <div className="px-3 py-1 rounded-md sketch-border text-xs font-sketch font-bold flex items-center gap-1.5 shadow-md bg-red-100 text-red-950 border-red-700 animate-pulse">
                  <Flame className="w-4 h-4 text-red-600" />
                  <span>Raging Ink (Active on Next Move)</span>
                </div>
              )}
              {activeHunter.isStunImmune && (
                <div className="px-3 py-1 rounded-md sketch-border text-xs font-sketch font-bold flex items-center gap-1.5 shadow-md bg-cyan-100 text-cyan-950 border-cyan-700">
                  <Shield className="w-4 h-4 text-cyan-700" />
                  <span>Stun Shield Forcefield: {Math.ceil(activeHunter.stunImmunityTimer)}s</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BIGGER HEALTH BAR (BOTTOM LEFT) */}
        {isSurvivor && playerSurvivor && (
          <div className="sketch-card p-3.5 w-88 shadow-2xl bg-[#fcf8f0] border-2 border-stone-800">
            <div className="flex items-center justify-between text-sm font-sketch font-bold mb-1.5">
              <span className="flex items-center gap-1.5 text-red-700 text-base">
                <Heart className="w-5 h-5 fill-red-600 text-red-600" /> HEALTH
              </span>
              <span className="font-mono font-black text-base text-stone-900">
                {Math.floor(playerSurvivor.hp)} / {playerSurvivor.maxHp || 100} HP
              </span>
            </div>
            {/* Big Health Bar */}
            <div className="w-full bg-stone-300 h-5 rounded-md overflow-hidden border-2 border-stone-800 p-0.5">
              <div
                className={`h-full rounded transition-all duration-300 ${
                  playerSurvivor.hp > (playerSurvivor.maxHp || 100) * 0.5
                    ? 'bg-emerald-500'
                    : playerSurvivor.hp > (playerSurvivor.maxHp || 100) * 0.25
                    ? 'bg-amber-500'
                    : 'bg-red-600 animate-pulse'
                }`}
                style={{
                  width: `${(playerSurvivor.hp / (playerSurvivor.maxHp || 100)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* BIGGER HUNTER HEALTH BAR (1000 HP) */}
        {!isSurvivor && activeHunter && (
          <div className="sketch-card-dark p-3.5 w-88 shadow-2xl bg-[#1f1917] border-2 border-red-800">
            <div className="flex items-center justify-between text-sm font-sketch font-bold mb-1.5">
              <span className="flex items-center gap-1.5 text-red-400 text-base">
                <Skull className="w-5 h-5 text-red-500" /> BLACK SLASHER HEALTH
              </span>
              <span className="font-mono font-black text-base text-red-200">
                {Math.floor(activeHunter.hp)} / 1000 HP
              </span>
            </div>
            <div className="w-full bg-stone-900 h-5 rounded-md overflow-hidden border-2 border-red-900 p-0.5">
              <div
                className="h-full rounded bg-red-600 transition-all duration-300"
                style={{ width: `${(activeHunter.hp / 1000) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* BIGGER STAMINA BAR (BOTTOM LEFT) */}
        {isSurvivor && playerSurvivor && (
          <div className="sketch-card p-3 w-88 shadow-2xl bg-[#fcf8f0] border-2 border-stone-800">
            <div className="flex items-center justify-between text-sm font-sketch font-bold mb-1">
              <span className="flex items-center gap-1.5 text-stone-800">
                <Footprints className="w-4 h-4 text-amber-700" /> STAMINA
              </span>
              <span className="font-mono font-extrabold text-sm text-stone-900">
                {Math.floor(playerSurvivor.stamina)}%
              </span>
            </div>
            <div className="w-full bg-stone-300 h-4 rounded-md overflow-hidden border-2 border-stone-800 p-0.5">
              <div
                className={`h-full rounded transition-all duration-150 ${
                  playerSurvivor.stamina < 20 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
                }`}
                style={{ width: `${playerSurvivor.stamina}%` }}
              />
            </div>
          </div>
        )}

        {/* HUNTER STAMINA BAR (110 MAX) */}
        {!isSurvivor && activeHunter && (
          <div className="sketch-card-dark p-3 w-88 shadow-2xl bg-[#1f1917] border-2 border-red-900">
            <div className="flex items-center justify-between text-sm font-sketch font-bold mb-1">
              <span className="flex items-center gap-1.5 text-stone-300">
                <Footprints className="w-4 h-4 text-purple-400" /> HUNTER STAMINA
              </span>
              <span className="font-mono font-extrabold text-sm text-purple-200">
                {Math.floor(activeHunter.stamina)} / 110
              </span>
            </div>
            <div className="w-full bg-stone-900 h-4 rounded-md overflow-hidden border-2 border-stone-700 p-0.5">
              <div
                className="h-full rounded bg-purple-500 transition-all duration-150"
                style={{ width: `${(activeHunter.stamina / 110) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM-RIGHT CORNER: ABILITIES */}
      <footer className="fixed bottom-5 right-6 pointer-events-auto flex items-end gap-2.5 z-40">
        {/* DYNAMIC SURVIVOR ABILITIES */}
        {isSurvivor && playerSurvivor && (
          <div className="flex flex-col items-end gap-2">
            {/* GAMBLING GUY: TOP POINTS & WEAKNESS BADGE */}
            {playerSurvivor.characterClass === 'gambling_guy' && (
              <div className="flex items-center gap-2 mb-0.5">
                <div className="px-3 py-1 bg-amber-200 border-2 border-amber-800 rounded-md font-sketch font-black text-xs text-amber-950 flex items-center gap-1.5 shadow-md">
                  <Coins className="w-4 h-4 text-amber-700 animate-spin" />
                  <span>GAMBLING POINTS: {playerSurvivor.gamblingPoints || 0} / 3</span>
                </div>
                {(playerSurvivor.weaknessStage || 0) > 0 && (
                  <div className="px-3 py-1 bg-red-200 border-2 border-red-800 rounded-md font-sketch font-black text-xs text-red-950 flex items-center gap-1 shadow-md animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>
                      WEAKNESS {playerSurvivor.weaknessStage} (+{Math.round((Math.pow(1.05, playerSurvivor.weaknessStage) - 1) * 100)}% DMG)
                    </span>
                  </div>
                )}
                <div className="px-2.5 py-1 bg-stone-200 border border-stone-600 rounded font-mono text-[10px] font-bold text-stone-800 uppercase">
                  HAT: {playerSurvivor.currentHat || 'dimmadome'}
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* CARETAKER: 2 ABILITIES */}
              {playerSurvivor.characterClass === 'caretaker' && (
                <>
                  {/* Ability 1: Heal Splash (30s CD) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(1) : onTriggerSurvivorAbility1?.()}
                    disabled={playerSurvivor.ability1Cooldown > 0 || playerSurvivor.isSplashing || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[135px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#e8f5e9] cursor-pointer ${
                      playerSurvivor.ability1Cooldown > 0 || playerSurvivor.endlagTimer > 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-emerald-950 mb-0.5">
                      <Heart className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                      <span>[1] / [Q] HEAL</span>
                    </div>
                    <div className="text-[10px] text-stone-700">10 HP Splash + Regen (10s)</div>
                    <div className="text-[9px] text-emerald-800">5s Cloud (2 HP/s)</div>
                    {playerSurvivor.ability1Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability1Cooldown)}s CD
                      </div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY (30s)</div>
                    )}
                  </button>

                  {/* Ability 2: Smash Bottle (40s CD) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(2) : onTriggerSurvivorAbility2?.()}
                    disabled={playerSurvivor.ability2Cooldown > 0 || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[135px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#fefae0] cursor-pointer ${
                      playerSurvivor.ability2Cooldown > 0 || playerSurvivor.endlagTimer > 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-amber-950 mb-0.5">
                      <Hammer className="w-4 h-4 text-amber-700" />
                      <span>[2] / [R] SMASH</span>
                    </div>
                    <div className="text-[10px] text-stone-700">Stun Killer 3s + Cloud</div>
                    <div className="text-[9px] text-stone-500">Miss: 0.5s Endlag</div>
                    {playerSurvivor.ability2Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability2Cooldown)}s CD
                      </div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY (40s)</div>
                    )}
                  </button>
                </>
              )}

              {/* BUILDA MEN: 3 ABILITIES */}
              {playerSurvivor.characterClass === 'builda_men' && (
                <>
                  {/* Ability 1: Sentry (50s CD after 6s build) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(1) : onTriggerSurvivorAbility1?.()}
                    disabled={playerSurvivor.ability1Cooldown > 0 || playerSurvivor.isBuilding}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[125px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#fefae0] cursor-pointer ${
                      playerSurvivor.ability1Cooldown > 0 || playerSurvivor.isBuilding ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-amber-950 mb-0.5">
                      <Crosshair className="w-4 h-4 text-amber-700" />
                      <span>[1] / [Q] SENTRY</span>
                    </div>
                    <div className="text-[10px] text-stone-700">7s Build (10 dmg / 0.2s)</div>
                    <div className="text-[9px] text-stone-500">Slows Killer · 2 Hits</div>
                    {playerSurvivor.ability1Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability1Cooldown)}s CD
                      </div>
                    ) : playerSurvivor.isBuilding ? (
                      <div className="text-[9px] text-amber-700 font-bold mt-1 animate-pulse">BUILDING...</div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY (50s)</div>
                    )}
                  </button>

                  {/* Ability 2: Healing Machine (40s CD after 8s build) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(2) : onTriggerSurvivorAbility2?.()}
                    disabled={playerSurvivor.ability2Cooldown > 0 || playerSurvivor.isBuilding}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[125px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#e8f5e9] cursor-pointer ${
                      playerSurvivor.ability2Cooldown > 0 || playerSurvivor.isBuilding ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-emerald-950 mb-0.5">
                      <Heart className="w-4 h-4 text-emerald-600" />
                      <span>[2] / [R] HEALER</span>
                    </div>
                    <div className="text-[10px] text-stone-700">8s Build · Spins & Rises</div>
                    <div className="text-[9px] text-emerald-800">1 HP / 0.5s · 1 Hit</div>
                    {playerSurvivor.ability2Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability2Cooldown)}s CD
                      </div>
                    ) : playerSurvivor.isBuilding ? (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1 animate-pulse">BUILDING...</div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY (40s)</div>
                    )}
                  </button>

                  {/* Ability 3: Bonus Pad (45s CD after 4s build) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(3) : onTriggerSurvivorAbility3?.()}
                    disabled={playerSurvivor.ability3Cooldown > 0 || playerSurvivor.isBuilding}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[125px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#e0f7fa] cursor-pointer ${
                      playerSurvivor.ability3Cooldown > 0 || playerSurvivor.isBuilding ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-cyan-950 mb-0.5">
                      <Zap className="w-4 h-4 text-cyan-700" />
                      <span>[3] / [F] SPEED PAD</span>
                    </div>
                    <div className="text-[10px] text-stone-700">4s Build · +20% Speed 2s</div>
                    <div className="text-[9px] text-cyan-800">Stackable Uncapped · 1 Hit</div>
                    {playerSurvivor.ability3Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability3Cooldown)}s CD
                      </div>
                    ) : playerSurvivor.isBuilding ? (
                      <div className="text-[9px] text-cyan-700 font-bold mt-1 animate-pulse">BUILDING...</div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY (45s)</div>
                    )}
                  </button>
                </>
              )}

              {/* GAMBLING GUY: 4 ABILITIES */}
              {playerSurvivor.characterClass === 'gambling_guy' && (
                <>
                  {/* Ability 1: Coin Flip (4s CD) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(1) : onTriggerSurvivorAbility1?.()}
                    disabled={playerSurvivor.ability1Cooldown > 0 || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-2.5 flex flex-col items-center justify-center min-w-[115px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#fff3b0] cursor-pointer ${
                      playerSurvivor.ability1Cooldown > 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-amber-950 mb-0.5">
                      <Coins className="w-4 h-4 text-amber-700" />
                      <span>[1] / [Q] COIN FLIP</span>
                    </div>
                    <div className="text-[9px] text-stone-700">Heads: +1 Pt / Tails: Weakness</div>
                    {playerSurvivor.ability1Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-0.5">
                        {Math.ceil(playerSurvivor.ability1Cooldown)}s CD
                      </div>
                    ) : (
                      <div className="text-[9px] text-emerald-800 font-bold mt-0.5">READY (4s)</div>
                    )}
                  </button>

                  {/* Ability 2: Flintlock (Needs 1 Pt) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(2) : onTriggerSurvivorAbility2?.()}
                    disabled={(playerSurvivor.gamblingPoints || 0) < 1 || playerSurvivor.ability2Cooldown > 0 || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-2.5 flex flex-col items-center justify-center min-w-[115px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#ffe5d9] cursor-pointer ${
                      (playerSurvivor.gamblingPoints || 0) < 1 || playerSurvivor.ability2Cooldown > 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-stone-900 mb-0.5">
                      <Crosshair className="w-4 h-4 text-red-700" />
                      <span>[2] / [R] FLINTLOCK</span>
                    </div>
                    <div className="text-[9px] font-mono font-bold text-stone-800">
                      COST: 1 PT [{(playerSurvivor.gamblingPoints || 0)}/1]
                    </div>
                    <div className="text-[8px] text-stone-600">Shoot / Misfire / Explode</div>
                    {playerSurvivor.ability2Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-0.5">
                        {Math.ceil(playerSurvivor.ability2Cooldown)}s CD
                      </div>
                    ) : (playerSurvivor.gamblingPoints || 0) < 1 ? (
                      <div className="text-[8px] text-red-700 font-bold mt-0.5">NEED 1 POINT</div>
                    ) : (
                      <div className="text-[8px] text-emerald-800 font-bold mt-0.5">READY</div>
                    )}
                  </button>

                  {/* Ability 3: Reroll Max HP (Needs 1 Pt) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(3) : onTriggerSurvivorAbility3?.()}
                    disabled={(playerSurvivor.gamblingPoints || 0) < 1 || playerSurvivor.ability3Cooldown > 0 || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-2.5 flex flex-col items-center justify-center min-w-[115px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#e0fbfc] cursor-pointer ${
                      (playerSurvivor.gamblingPoints || 0) < 1 || playerSurvivor.ability3Cooldown > 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-cyan-950 mb-0.5">
                      <Heart className="w-4 h-4 text-cyan-700" />
                      <span>[3] / [F] REROLL HP</span>
                    </div>
                    <div className="text-[9px] font-mono font-bold text-stone-800">
                      COST: 1 PT [{(playerSurvivor.gamblingPoints || 0)}/1]
                    </div>
                    <div className="text-[8px] text-stone-600">Reroll 80-130 Max HP</div>
                    {playerSurvivor.ability3Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-0.5">
                        {Math.ceil(playerSurvivor.ability3Cooldown)}s CD
                      </div>
                    ) : (playerSurvivor.gamblingPoints || 0) < 1 ? (
                      <div className="text-[8px] text-red-700 font-bold mt-0.5">NEED 1 POINT</div>
                    ) : (
                      <div className="text-[8px] text-emerald-800 font-bold mt-0.5">READY</div>
                    )}
                  </button>

                  {/* Ability 4: Change Hat (Needs 3 Pts) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(4) : onTriggerSurvivorAbility4?.()}
                    disabled={(playerSurvivor.gamblingPoints || 0) < 3 || playerSurvivor.ability4Cooldown > 0 || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-2.5 flex flex-col items-center justify-center min-w-[115px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#f3e8ff] cursor-pointer ${
                      (playerSurvivor.gamblingPoints || 0) < 3 || playerSurvivor.ability4Cooldown > 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-purple-950 mb-0.5">
                      <Crown className="w-4 h-4 text-purple-700" />
                      <span>[4] / [C] HAT SWAP</span>
                    </div>
                    <div className="text-[9px] font-mono font-bold text-stone-800">
                      COST: 3 PTS [{(playerSurvivor.gamblingPoints || 0)}/3]
                    </div>
                    <div className="text-[8px] text-purple-800 font-bold">Purges Weakness to 0!</div>
                    {playerSurvivor.ability4Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-0.5">
                        {Math.ceil(playerSurvivor.ability4Cooldown)}s CD
                      </div>
                    ) : (playerSurvivor.gamblingPoints || 0) < 3 ? (
                      <div className="text-[8px] text-red-700 font-bold mt-0.5">NEED 3 PTS</div>
                    ) : (
                      <div className="text-[8px] text-emerald-800 font-bold mt-0.5">READY</div>
                    )}
                  </button>
                </>
              )}

              {/* PROTECTOR GUY: 3 ABILITIES */}
              {playerSurvivor.characterClass === 'protector_guy' && (
                <>
                  {/* Ability 1: Block (25s CD) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(1) : onTriggerSurvivorAbility1?.()}
                    disabled={playerSurvivor.ability1Cooldown > 0 || playerSurvivor.isBlocking || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[125px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#e0f7fa] cursor-pointer ${
                      playerSurvivor.ability1Cooldown > 0 || playerSurvivor.isBlocking ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-cyan-950 mb-0.5">
                      <Shield className="w-4 h-4 text-cyan-700" />
                      <span>[1] / [Q] BLOCK</span>
                    </div>
                    <div className="text-[10px] text-stone-700">1s Stance · Absorbs Hit</div>
                    <div className="text-[9px] text-cyan-800">Unlocks Punch (or 0.5s Endlag)</div>
                    {playerSurvivor.ability1Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability1Cooldown)}s CD
                      </div>
                    ) : playerSurvivor.isBlocking ? (
                      <div className="text-[9px] text-cyan-700 font-bold mt-1 animate-pulse">BLOCKING (1s)</div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY (25s)</div>
                    )}
                  </button>

                  {/* Ability 2: Punch (35s CD, unlocked after successful Block) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(2) : onTriggerSurvivorAbility2?.()}
                    disabled={!playerSurvivor.canPunch || playerSurvivor.ability2Cooldown > 0 || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[125px] shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer ${
                      playerSurvivor.canPunch
                        ? 'bg-emerald-100 ring-2 ring-emerald-600 animate-pulse'
                        : 'bg-stone-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-stone-900 mb-0.5">
                      <Hammer className="w-4 h-4 text-emerald-700" />
                      <span>[2] / [R] PUNCH</span>
                    </div>
                    <div className="text-[10px] text-stone-700">40 dmg & 3s Stun on Killer</div>
                    <div className="text-[9px] text-stone-600">0.3s Windup (0.3s Miss Endlag)</div>
                    {playerSurvivor.ability2Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability2Cooldown)}s CD
                      </div>
                    ) : playerSurvivor.canPunch ? (
                      <div className="text-[9px] text-emerald-700 font-black mt-1 animate-bounce">CHARGED! PUNCH!</div>
                    ) : (
                      <div className="text-[9px] text-stone-500 font-bold mt-1">LOCKED (BLOCK 1ST)</div>
                    )}
                  </button>

                  {/* Ability 3: Charge (30s CD) */}
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(3) : onTriggerSurvivorAbility3?.()}
                    disabled={playerSurvivor.ability3Cooldown > 0 || playerSurvivor.isChargingStab || playerSurvivor.endlagTimer > 0}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[125px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#fefae0] cursor-pointer ${
                      playerSurvivor.ability3Cooldown > 0 || playerSurvivor.isChargingStab ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-amber-950 mb-0.5">
                      <Zap className="w-4 h-4 text-amber-700" />
                      <span>[3] / [F] CHARGE</span>
                    </div>
                    <div className="text-[10px] text-stone-700">5s Rush (No Stamina Cost)</div>
                    <div className="text-[9px] text-amber-800">Push Killer & +15 Stamina</div>
                    {playerSurvivor.ability3Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability3Cooldown)}s CD
                      </div>
                    ) : playerSurvivor.isChargingStab ? (
                      <div className="text-[9px] text-amber-700 font-bold mt-1 animate-pulse">CHARGING...</div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY (30s)</div>
                    )}
                  </button>
                </>
              )}

              {/* NEWB: 2 POTION ABILITIES */}
              {playerSurvivor.characterClass === 'newb' && (
                <>
                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(1) : onTriggerSurvivorAbility1?.()}
                    disabled={playerSurvivor.ability1Cooldown > 0 || playerSurvivor.isDrinking}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[130px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#fefae0] cursor-pointer ${
                      playerSurvivor.ability1Cooldown > 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-amber-900 mb-0.5">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span>[1] / [Q] SODA DRINK</span>
                    </div>
                    <div className="text-[10px] text-stone-600">+25% Spd (5s)</div>
                    {playerSurvivor.ability1Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability1Cooldown)}s CD
                      </div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY</div>
                    )}
                  </button>

                  <button
                    onClick={() => onTriggerSurvivorAbility ? onTriggerSurvivorAbility(2) : onTriggerSurvivorAbility2?.()}
                    disabled={playerSurvivor.ability2Cooldown > 0 || playerSurvivor.isDrinking}
                    className={`sketch-card p-3 flex flex-col items-center justify-center min-w-[130px] shadow-xl hover:scale-105 active:scale-95 transition-transform bg-[#e8f5e9] cursor-pointer ${
                      playerSurvivor.ability2Cooldown > 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 font-sketch font-bold text-xs text-emerald-900 mb-0.5">
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <span>[2] / [R] INVISIBILITY</span>
                    </div>
                    <div className="text-[10px] text-stone-600">80% Invisibility (8s)</div>
                    {playerSurvivor.ability2Cooldown > 0 ? (
                      <div className="font-mono text-xs font-bold text-red-600 mt-1">
                        {Math.ceil(playerSurvivor.ability2Cooldown)}s CD
                      </div>
                    ) : (
                      <div className="text-[9px] text-emerald-700 font-bold mt-1">READY</div>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* HUNTER: BLACK SLASHER 4 ABILITIES */}
        {!isSurvivor && activeHunter && (
          <div className="flex items-end gap-2">
            {/* Ability 1: Slash (0.7s CD) */}
            <button
              onClick={() => onTriggerHunterAbility?.(1)}
              disabled={activeHunter.ability1Cooldown > 0}
              className="sketch-card-dark p-2.5 min-w-[105px] text-center shadow-xl cursor-pointer hover:border-red-500 bg-[#231a18]"
            >
              <div className="text-xs font-sketch font-bold text-red-400">[1] / CLICK</div>
              <div className="text-[10px] text-stone-300">Normal Slash</div>
              <div className="text-[9px] text-stone-400">20 dmg + Bleed</div>
              {activeHunter.ability1Cooldown > 0 && (
                <div className="text-xs font-mono text-red-400 font-bold">
                  {activeHunter.ability1Cooldown.toFixed(1)}s
                </div>
              )}
            </button>

            {/* Ability 2: Charge (30s CD) */}
            <button
              onClick={() => onTriggerHunterAbility?.(2)}
              disabled={activeHunter.ability2Cooldown > 0 || activeHunter.isCharging}
              className={`sketch-card-dark p-2.5 min-w-[110px] text-center shadow-xl cursor-pointer hover:border-red-500 bg-[#231a18] ${
                activeHunter.isCharging ? 'ring-2 ring-purple-500 animate-pulse' : ''
              }`}
            >
              <div className="text-xs font-sketch font-bold text-purple-400">[2] / [E] CHARGE</div>
              <div className="text-[10px] text-stone-300">Ink Trail & Slam</div>
              <div className="text-[9px] text-stone-400">30 dmg + Ragdoll</div>
              {activeHunter.ability2Cooldown > 0 ? (
                <div className="text-xs font-mono text-red-400 font-bold">
                  {Math.ceil(activeHunter.ability2Cooldown)}s
                </div>
              ) : (
                <div className="text-[9px] text-emerald-400">READY (30s)</div>
              )}
            </button>

            {/* Ability 3: Gashing Wound (25s CD) */}
            <button
              onClick={() => onTriggerHunterAbility?.(3)}
              disabled={activeHunter.ability3Cooldown > 0}
              className="sketch-card-dark p-2.5 min-w-[110px] text-center shadow-xl cursor-pointer hover:border-red-500 bg-[#231a18]"
            >
              <div className="text-xs font-sketch font-bold text-amber-400">[3] / [R] GASH</div>
              <div className="text-[10px] text-stone-300">Punch Combo</div>
              <div className="text-[9px] text-stone-400">40 dmg + Push</div>
              {activeHunter.ability3Cooldown > 0 ? (
                <div className="text-xs font-mono text-red-400 font-bold">
                  {Math.ceil(activeHunter.ability3Cooldown)}s
                </div>
              ) : (
                <div className="text-[9px] text-emerald-400">READY (25s)</div>
              )}
            </button>

            {/* Ability 4: Raging Ink (35s CD) */}
            <button
              onClick={() => onTriggerHunterAbility?.(4)}
              disabled={activeHunter.ability4Cooldown > 0 || activeHunter.isRagingInk}
              className={`sketch-card-dark p-2.5 min-w-[110px] text-center shadow-xl cursor-pointer hover:border-red-500 bg-[#231a18] ${
                activeHunter.isRagingInk ? 'ring-2 ring-red-600 bg-red-950/80 animate-pulse' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-xs font-sketch font-bold text-red-500">
                <Flame className="w-3.5 h-3.5" />
                <span>[4] / [Q] RAGE</span>
              </div>
              <div className="text-[10px] text-stone-300">Boosts Next Move</div>
              {activeHunter.isRagingInk ? (
                <div className="text-xs font-mono text-red-400 font-bold animate-pulse">
                  ACTIVE ON MOVE
                </div>
              ) : activeHunter.ability4Cooldown > 0 ? (
                <div className="text-xs font-mono text-red-400 font-bold">
                  {Math.ceil(activeHunter.ability4Cooldown)}s
                </div>
              ) : (
                <div className="text-[9px] text-emerald-400">READY (35s)</div>
              )}
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
