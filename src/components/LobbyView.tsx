import React, { useState } from 'react';
import {
  GameRole,
  SurvivorClass,
  HunterClass,
  MapId,
  PlayerProfile,
  OnlineRoomData,
} from '../types/game';
import {
  GAME_COVER_PATH,
} from '../game3d/textures';
import {
  Play,
  BookOpen,
  Award,
  Palette,
  Volume2,
  VolumeX,
  Sparkles,
  MapPin,
  Skull,
  User,
  Zap,
  Eye,
  Users,
  Copy,
  Check,
  Flame,
  Radio,
  Settings,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface LobbyViewProps {
  profile: PlayerProfile;
  selectedRole: GameRole;
  selectedSurvivorClass: SurvivorClass;
  selectedHunterClass: HunterClass;
  selectedMap: MapId;
  playerName: string;
  onlineRoom: OnlineRoomData | null;
  onSetPlayerName: (name: string) => void;
  onSelectRole: (role: GameRole) => void;
  onSelectSurvivorClass: (sClass: SurvivorClass) => void;
  onSelectHunterClass: (hClass: HunterClass) => void;
  onSelectMap: (mapId: MapId) => void;
  onStartMatch: () => void;
  onHostLobby: () => void;
  onJoinLobby: (code: string) => void;
  onLeaveLobby: () => void;
  onlinePlayerId?: string | null;
  lobbyMaxPlayers?: number;
  onSetLobbyMaxPlayers?: (count: number) => void;
  killerRoulette?: { active: boolean; chosenKillerName: string; isMeKiller: boolean } | null;
  onOpenHandbook: () => void;
  onOpenCustomization: () => void;
  onOpenAchievements: () => void;
  onOpenSettings?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  profile,
  selectedRole,
  selectedSurvivorClass,
  selectedHunterClass,
  selectedMap,
  playerName,
  onlineRoom,
  onlinePlayerId,
  lobbyMaxPlayers = 8,
  onSetLobbyMaxPlayers,
  killerRoulette,
  onSetPlayerName,
  onSelectRole,
  onSelectSurvivorClass,
  onSelectHunterClass,
  onSelectMap,
  onStartMatch,
  onHostLobby,
  onJoinLobby,
  onLeaveLobby,
  onOpenHandbook,
  onOpenCustomization,
  onOpenAchievements,
  onOpenSettings,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  const handleCopyCode = () => {
    if (onlineRoom?.code) {
      navigator.clipboard.writeText(onlineRoom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const mapsList: { id: MapId; name: string; desc: string }[] = [
    {
      id: 'school',
      name: 'Abandoned School',
      desc: 'Desks, chalkboards, and tight classroom corridors.',
    },
    {
      id: 'forest',
      name: 'Doodle Forest',
      desc: 'Gnarled ink trees, twisted roots, and fog clearings.',
    },
    {
      id: 'lab',
      name: 'Old Laboratory',
      desc: 'Containment pods, chalk formulas, and humming coils.',
    },
    {
      id: 'subway',
      name: 'Underground Subway',
      desc: 'Railway tracks, platform pillars, and dark tunnels.',
    },
  ];

  // Survivors: 'newb', 'caretaker', 'builda_men', 'gambling_guy', 'protector_guy'
  const survivorClasses: {
    id: SurvivorClass;
    name: string;
    roleDesc: string;
    ability1: string;
    ability2: string;
    ability3?: string;
    ability4?: string;
  }[] = [
    {
      id: 'newb',
      name: 'Newb',
      roleDesc: 'Iconic noob survivor with powerful potion abilities! 100 HP, 100 Stamina.',
      ability1: '[1] / [Q] Speed Soda (20s cd): +25% speed for 5s',
      ability2: '[2] / [R] Invisibility Potion (25s cd): 80% invisible & undetectable for 8s',
    },
    {
      id: 'caretaker',
      name: 'Caretaker',
      roleDesc: 'Die of Death medic with authentic Caretaker outfit! 90 Max HP. Splash healing and killer smashing.',
      ability1: '[1] / [Q] Heal (30s cd): Splash 10 HP + 20 HP regen (10s) & 5s lingering healing cloud (2 HP/s)',
      ability2: '[2] / [R] Smash (40s cd): Swings healing bottle to stun killer 3s + spawn healing cloud (0.5s endlag on miss)',
    },
    {
      id: 'builda_men',
      name: 'Builda Men',
      roleDesc: 'Roblox Builderman master engineer! 90 Max HP. Deploys sentries, dispensers, and speed pads (builds cannot stack).',
      ability1: '[1] / [Q] Sentry (50s cd after build): 7s build (6-8s) -> shoots 10 dmg every 0.2s + slows killer (2 hits to destroy)',
      ability2: '[2] / [R] Healing Machine (40s cd after build): 8s build -> spins and heals 1 HP every 0.5s (1 hit to destroy)',
      ability3: '[3] / [F] Bonus Pad (45s cd after build): 4s build (quick speed pad!) -> +20% speed for 2s (stackable uncapped, 1 hit to destroy)',
    },
    {
      id: 'gambling_guy',
      name: 'Gambling Guy',
      roleDesc: 'Spawns with random 80-130 Max HP! High-risk, high-reward gambler who flips coins for power.',
      ability1: '[1] / [Q] Coin Flip (4s cd): 50/50 Heads (+1 pt to abilities, max 3) or Tails (+1 Weakness +5% dmg for 8s)',
      ability2: '[2] / [R] Flintlock (12s cd, 1 Pt): 0.3s delay -> Normal shot, misfire, or explode (20 self-dmg & stun killer)',
      ability3: '[3] / [F] Reroll Max HP (10s cd, 1 Pt): Reroll 80-130 Max HP without healing (more points = higher HP chance)',
      ability4: '[4] / [C] Change Hat (15s cd, 3 Pts): Swaps hat (Dimmadome, Top Hat, Fedora, Beanie) & purges weakness to 0!',
    },
    {
      id: 'protector_guy',
      name: 'guy that will protect you from killers not killing you',
      roleDesc: 'Brawny defender with 110 Max HP! Blocks attacks, delivers counter-punches, and charges killers.',
      ability1: '[1] / [Q] Block (25s cd): 1s stance; absorbs killer hit to unlock Punch (0.5s endlag if unhit)',
      ability2: '[2] / [R] Punch (35s cd): Unlocked on block! 0.3s punch deals 40 dmg & stuns killer 3s (0.3s endlag on miss)',
      ability3: '[3] / [F] Charge (30s cd): 5s charge with no stamina drain; hits killer to push away & +15 stamina (else Slowness II 5s)',
    },
  ];

  // Hunter: 'black_slasher' (1000 HP, 110 Stamina)
  const hunterClasses: {
    id: HunterClass;
    name: string;
    weapon: string;
    ability1: string;
    ability2: string;
    ability3: string;
    ability4: string;
  }[] = [
    {
      id: 'black_slasher',
      name: 'Black Slasher',
      weapon: 'Giant Quill Scythe',
      ability1: '1. Slash: 0.7s cd, deals 20 dmg + Bleeding (2 dmg/s for 3s, stops at 1 HP)',
      ability2: '2. Ink Charge (30s cd): 5s high-speed dash with slowing ink trail. Catches survivor -> Grab & Slam (30 dmg + Ragdoll)!',
      ability3: '3. Gashing Wound (25s cd): Combo punch pushing survivor away for 40 dmg!',
      ability4: '4. Raging Ink (35s cd): Eyes burn red, supercharges your next move and immediately consumes the rage buff upon use!',
    },
    {
      id: 'scribbler',
      name: 'The Scribbler',
      weapon: 'Heavy Eraser Club',
      ability1: '1. Heavy Smash: 35 damage bludgeon',
      ability2: '2. Eraser Slam: Obliterates dropped pallets & slow shockwaves',
      ability3: '3. Charcoal Spikes: Traps dropped on ground',
      ability4: '4. Ground Quake: Stuns nearby runners',
    },
    {
      id: 'marionette',
      name: 'The Marionette',
      weapon: 'Drafting Compass',
      ability1: '1. Compass Strike: Piercing sharp jab',
      ability2: '2. Ink Strings: Tethers survivors with slowing puppet cords',
      ability3: '3. Puppet Master: Teleports to nearest cage',
      ability4: '4. Thread Bind: Silences survivor abilities',
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#161311] bg-sketch-grid-dark text-stone-200 select-none overflow-y-auto font-doodle pb-16">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b-2 border-stone-800 bg-[#1e1b18]/95 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-sketch font-black tracking-wider text-amber-300 animate-doodle">
            SLOPSAKEN
          </span>
          <span className="text-xs text-stone-400 font-mono hidden sm:inline">
            · 3D ASYMMETRICAL DOODLE HORROR
          </span>
        </div>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-4 text-xs font-sketch font-bold text-stone-300">
          <button
            onClick={onOpenHandbook}
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Handbook</span>
          </button>
          <button
            onClick={onOpenCustomization}
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Palette className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Closet & Perks</span>
          </button>
          <button
            onClick={onOpenAchievements}
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Achievements</span>
          </button>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </nav>

        {/* Profile & Volume */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-mono text-amber-300 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LVL {profile.level}</span>
            <span className="text-stone-500">·</span>
            <span>{profile.inkDroplets} DROPLETS</span>
          </div>

          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-md hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Hero Banner */}
        <div className="relative rounded-lg overflow-hidden sketch-card-dark p-6 border-stone-800 min-h-[200px] flex flex-col justify-end shadow-2xl">
          <img
            src={GAME_COVER_PATH}
            alt="Slopsaken Cover"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161311] via-[#161311]/70 to-transparent" />

          <div className="relative z-10">
            <div className="inline-block px-3 py-0.5 mb-1.5 bg-red-950/80 border border-red-700/60 rounded text-red-300 font-sketch text-xs font-bold tracking-widest uppercase">
              1 KILLER VS 4 SURVIVORS · ONLINE LOBBIES ENABLED
            </div>
            <h1 className="text-4xl md:text-5xl font-sketch font-black text-amber-200 tracking-tight leading-tight">
              SLOPSAKEN: THE SKETCHBOOK TRIALS
            </h1>
            <p className="text-stone-300 text-sm md:text-base max-w-xl font-body mt-1">
              Survive the living doodle realm! Repair 4 sketch engines to power the exit gates, or hunt as
              the terrifying Black Slasher.
            </p>
          </div>
        </div>

        {/* ONLINE MULTIPLAYER IRL LOBBY SECTION */}
        <div className="sketch-card p-5 bg-[#fbf6ec]">
          <div className="flex items-center justify-between border-b-2 border-stone-300 pb-2.5 mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-800 animate-pulse" />
              <h2 className="text-xl font-sketch font-bold text-stone-900 uppercase">
                ONLINE MULTIPLAYER LOBBY (JOIN IRL FRIENDS)
              </h2>
            </div>

            {onlineRoom ? (
              <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                CONNECTED TO LOBBY
              </span>
            ) : (
              <span className="text-xs font-mono text-stone-600">
                Host a room or enter a friend's code
              </span>
            )}
          </div>

          {!onlineRoom ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Host Room Box */}
              <div className="p-4 rounded-lg sketch-card bg-[#fdfbf7] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4 text-amber-700" />
                    <h3 className="font-sketch font-bold text-base text-stone-900">
                      HOST A NEW LOBBY
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mb-3">
                    Creates an online room with a unique code you can share with friends IRL so they can join!
                  </p>
                  <div className="mb-3">
                    <label className="text-xs font-sketch font-bold text-stone-700 block mb-1">
                      YOUR DISPLAY NAME:
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => onSetPlayerName(e.target.value)}
                      placeholder="e.g. DoodleMaster"
                      className="w-full px-3 py-1.5 sketch-border bg-white text-stone-900 text-sm font-sketch font-bold"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-sketch font-bold text-stone-700 block mb-1">
                      MAX PLAYERS (2 - 8):
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => onSetLobbyMaxPlayers?.(num)}
                          className={`px-3 py-1 text-xs font-mono font-bold rounded sketch-card transition-all cursor-pointer ${
                            lobbyMaxPlayers === num
                              ? 'bg-amber-400 text-stone-900 ring-2 ring-stone-900 shadow-sm'
                              : 'bg-white text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {num}P
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onHostLobby}
                  className="w-full py-2.5 sketch-card text-stone-900 font-sketch font-bold text-sm bg-amber-300 hover:bg-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <Radio className="w-4 h-4" /> HOST LOBBY & GET CODE ({lobbyMaxPlayers}P)
                </button>
              </div>

              {/* Join Room Box */}
              <div className="p-4 rounded-lg sketch-card bg-[#fdfbf7] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-sketch font-bold text-base text-stone-900">
                      JOIN WITH LOBBY CODE
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mb-3">
                    Got a room code from a friend? Enter it below to join their lobby.
                  </p>
                  <div className="mb-3">
                    <label className="text-xs font-sketch font-bold text-stone-700 block mb-1">
                      ENTER CODE (WITH OR WITHOUT SLOP-):
                    </label>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SLOP-A49 or A49"
                      maxLength={12}
                      className="w-full px-3 py-1.5 sketch-border bg-white text-stone-900 text-sm font-mono font-bold tracking-wider uppercase"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (joinCodeInput.trim()) {
                      setIsJoining(true);
                      onJoinLobby(joinCodeInput.trim());
                    }
                  }}
                  disabled={!joinCodeInput.trim() || isJoining}
                  className="w-full py-2.5 sketch-card text-white font-sketch font-bold text-sm bg-stone-900 hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  JOIN LOBBY
                </button>
              </div>
            </div>
          ) : (
            /* Active Online Room Card */
            <div className="p-4 rounded-lg sketch-card bg-[#fefae0] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-sketch font-bold text-stone-800">LOBBY CODE:</span>
                  <div className="px-4 py-1.5 sketch-border-thick bg-white text-2xl font-mono font-black text-amber-900 tracking-widest">
                    {onlineRoom.code}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded sketch-card bg-amber-100 hover:bg-amber-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-sketch font-bold"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'COPIED!' : 'COPY CODE'}</span>
                  </button>
                </div>

                <button
                  onClick={onLeaveLobby}
                  className="px-3 py-1 text-xs font-sketch text-red-700 hover:bg-red-50 rounded border border-red-300 transition-colors cursor-pointer"
                >
                  LEAVE ROOM
                </button>
              </div>

              {/* Online Rules Notice */}
              <div className="p-3 rounded-lg bg-amber-100/90 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-sketch font-bold">ONLINE TRIAL RULES:</span> When the match starts, 1 player will be <strong>randomly chosen to be the Killer</strong>! The other players will play as their chosen Survivor Class below. Pick your survivor role now!
                </div>
              </div>

              {/* Joined Players List */}
              <div>
                <span className="text-xs font-sketch font-bold text-stone-700 block mb-2">
                  PLAYERS IN LOBBY ({Object.keys(onlineRoom.players).length} / {onlineRoom.maxPlayers || 8}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.values(onlineRoom.players).map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 sketch-card bg-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            p.isHost ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white'
                          }`}
                        >
                          {p.isHost ? '★' : 'P'}
                        </div>
                        <div className="truncate">
                          <div className="font-sketch font-bold text-stone-900 truncate">
                            {p.name} {p.isHost && '(Host)'}
                          </div>
                          <div className="text-[10px] font-mono text-stone-500 uppercase">
                            {p.survivorClass?.replace('_', ' ') || 'Newb'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Match Setup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Role & Character Select (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Step 1: Choose Role */}
            <div className="sketch-card p-4 bg-[#fbf6ec]">
              <div className="flex items-center justify-between mb-3 border-b-2 border-stone-300 pb-2">
                <span className="font-sketch font-bold text-base text-stone-900 uppercase">
                  1. CHOOSE YOUR TRIAL ROLE
                </span>
                <span className="text-xs font-mono text-stone-600">
                  {selectedRole === 'survivor' ? 'Survivor Squad' : 'The Killer'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onSelectRole('survivor')}
                  className={`p-3.5 rounded-lg sketch-card flex items-center gap-3 transition-all cursor-pointer text-left ${
                    selectedRole === 'survivor' || onlineRoom
                      ? 'ring-2 ring-emerald-600 bg-emerald-50/90 shadow-md'
                      : 'hover:bg-stone-100 opacity-80 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-sketch text-lg shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-sketch font-bold text-base text-stone-900 flex items-center gap-1.5">
                      <span>PLAY AS SURVIVOR</span>
                      {onlineRoom && <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">DEFAULT</span>}
                    </h3>
                    <p className="text-xs text-stone-600">
                      {onlineRoom ? 'Choose your survivor class below! You play this if not chosen as Killer.' : 'Team up, drink potions, repair engines & escape.'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (!onlineRoom) onSelectRole('hunter');
                  }}
                  className={`p-3.5 rounded-lg sketch-card flex items-center gap-3 transition-all text-left ${
                    onlineRoom
                      ? 'opacity-80 bg-stone-100 cursor-not-allowed border-dashed'
                      : selectedRole === 'hunter'
                      ? 'ring-2 ring-red-600 bg-red-50/90 shadow-md cursor-pointer'
                      : 'hover:bg-stone-100 opacity-80 bg-white cursor-pointer'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-sketch text-lg shrink-0 ${onlineRoom ? 'bg-stone-600 text-stone-300' : 'bg-red-800 text-white'}`}>
                    <Skull className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-sketch font-bold text-base text-stone-900 flex items-center gap-1.5">
                      <span>THE KILLER</span>
                      {onlineRoom && <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">1 RANDOMLY CHOSEN</span>}
                    </h3>
                    <p className="text-xs text-stone-600">
                      {onlineRoom ? 'A player in this lobby will be randomly picked as Killer on launch!' : 'Slash, ink charge, grab & throw survivors into ragdolls!'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Choose Class / Monster */}
            <div className="sketch-card p-4 bg-[#fbf6ec]">
              <div className="flex items-center justify-between mb-3 border-b-2 border-stone-300 pb-2">
                <span className="font-sketch font-bold text-base text-stone-900 uppercase">
                  2. SELECT {selectedRole === 'survivor' ? 'SURVIVOR CLASS' : 'HUNTER MONSTER'}
                </span>
                <span className="text-xs font-mono text-stone-600">SPECIFIC ABILITIES</span>
              </div>

              {selectedRole === 'survivor' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {survivorClasses.map((sc) => {
                    const isSelected = selectedSurvivorClass === sc.id;
                    return (
                      <button
                        key={sc.id}
                        onClick={() => onSelectSurvivorClass(sc.id)}
                        className={`p-3 rounded-lg sketch-card text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-stone-900 bg-amber-50 shadow-md'
                            : 'hover:bg-stone-100 opacity-85 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-sketch font-bold text-base text-stone-900">{sc.name}</h4>
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold bg-stone-900 text-white px-2 py-0.5 rounded">
                              CHOSEN
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 mb-2">{sc.roleDesc}</p>
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{sc.ability1}</span>
                          </div>
                          <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{sc.ability2}</span>
                          </div>
                          {sc.ability3 && (
                            <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{sc.ability3}</span>
                            </div>
                          )}
                          {sc.ability4 && (
                            <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>{sc.ability4}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {hunterClasses.map((hc) => {
                    const isSelected = selectedHunterClass === hc.id;
                    return (
                      <button
                        key={hc.id}
                        onClick={() => onSelectHunterClass(hc.id)}
                        className={`p-3.5 rounded-lg sketch-card text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-red-700 bg-red-50/90 shadow-md'
                            : 'hover:bg-stone-100 opacity-85 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-sketch font-bold text-base text-stone-900 flex items-center gap-2">
                            <span>{hc.name}</span>
                            {hc.id === 'black_slasher' && (
                              <span className="text-[10px] bg-red-700 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                                4 ABILITIES
                              </span>
                            )}
                          </h4>
                          <span className="text-xs text-stone-600 font-mono">
                            Weapon: {hc.weapon}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2 text-xs font-sketch text-stone-800">
                          <div className="p-1 bg-red-100/70 rounded">{hc.ability1}</div>
                          <div className="p-1 bg-purple-100/70 rounded">{hc.ability2}</div>
                          <div className="p-1 bg-amber-100/70 rounded">{hc.ability3}</div>
                          <div className="p-1 bg-red-200/80 rounded flex items-center gap-1 font-bold text-red-950">
                            <Flame className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>{hc.ability4}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Map Select & Start Match (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Map Selection */}
            <div className="sketch-card p-4 bg-[#fbf6ec]">
              <div className="flex items-center justify-between mb-3 border-b-2 border-stone-300 pb-2">
                <span className="font-sketch font-bold text-base text-stone-900 uppercase">
                  3. ARENA MAP
                </span>
                <MapPin className="w-4 h-4 text-stone-600" />
              </div>

              <div className="space-y-2">
                {mapsList.map((map) => {
                  const isSelected = selectedMap === map.id;
                  return (
                    <button
                      key={map.id}
                      onClick={() => onSelectMap(map.id)}
                      className={`w-full p-2.5 rounded-lg sketch-card text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-stone-900 bg-amber-100/80 shadow-sm'
                          : 'hover:bg-stone-100 opacity-80 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-sketch font-bold text-xs text-stone-900">
                          {map.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-mono bg-stone-800 text-white px-1.5 py-0.5 rounded font-bold">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600 truncate mt-0.5">{map.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Match Button */}
            <div className="sketch-card-dark p-4 flex flex-col gap-3 bg-[#1e1917]">
              <div className="text-xs text-stone-300 leading-relaxed font-body">
                {onlineRoom
                  ? 'All joined players in this lobby will load into the match together with 1 random Killer.'
                  : 'Enter the match! Any empty slots will be controlled by smart AI bots.'}
              </div>

              {onlineRoom && onlinePlayerId && onlineRoom.players[onlinePlayerId] && !onlineRoom.players[onlinePlayerId].isHost ? (
                <div className="p-3.5 bg-stone-900 rounded-lg text-center font-sketch text-amber-300 text-sm animate-pulse border border-amber-500/40 shadow-inner">
                  WAITING FOR HOST TO LAUNCH TRIAL... ({Object.keys(onlineRoom.players).length} / {onlineRoom.maxPlayers || 8} Players)
                </div>
              ) : (
                <button
                  onClick={() => {
                    soundEngine.ensureAudio();
                    soundEngine.playPencilScratch();
                    onStartMatch();
                  }}
                  className="w-full py-4 rounded-lg sketch-card text-stone-900 font-sketch font-black text-xl tracking-wider hover:scale-[1.02] active:scale-95 transition-transform bg-[#f7d070] hover:bg-[#f6c855] flex items-center justify-center gap-2 cursor-pointer shadow-xl animate-doodle"
                >
                  <Play className="w-6 h-6 fill-stone-900" />
                  {onlineRoom ? '🎲 START TRIAL (ROLL KILLER)' : 'ENTER TRIAL'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Killer Roulette Overlay */}
      {killerRoulette?.active && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md select-none">
          <div className="sketch-card p-8 bg-[#1e1b18] border-4 border-amber-500 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="text-amber-400 font-mono text-xs uppercase tracking-widest animate-pulse flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>RANDOM KILLER SELECTION</span>
            </div>
            <h2 className="text-2xl font-sketch font-black text-white tracking-wider">
              WHO IS THE TRIAL KILLER?
            </h2>
            <div className="py-4 px-6 bg-stone-900 rounded-lg border-2 border-dashed border-amber-400/60 my-2">
              <div className="text-3xl font-sketch font-extrabold text-amber-300">
                {killerRoulette.chosenKillerName}
              </div>
            </div>
            <div className={`text-sm font-sketch font-bold ${killerRoulette.isMeKiller ? 'text-red-400 animate-pulse text-base' : 'text-emerald-400'}`}>
              {killerRoulette.isMeKiller
                ? '💀 YOU ARE THE KILLER! Hunt down all survivors!'
                : '🏃 YOU ARE A SURVIVOR! Cooperate with your squad to escape!'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
