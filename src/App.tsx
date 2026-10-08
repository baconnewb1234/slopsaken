/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  GameRole,
  SurvivorClass,
  HunterClass,
  MapId,
  SurvivorData,
  HunterData,
  GeneratorEntity,
  EscapeGateEntity,
  ComicPop,
  MatchStats,
  PlayerProfile,
  AchievementItem,
  OnlineRoomData,
  GameSettings,
} from './types/game';
import { GameEngine } from './game3d/GameEngine';
import { LobbyView } from './components/LobbyView';
import { GameHUD } from './components/GameHUD';
import { SkillCheckOverlay } from './components/SkillCheckOverlay';
import { EndGameSummary } from './components/EndGameSummary';
import { HandbookModal } from './components/HandbookModal';
import { CustomizationModal } from './components/CustomizationModal';
import { AchievementsModal } from './components/AchievementsModal';
import { SettingsModal } from './components/SettingsModal';
import { soundEngine } from './audio/soundEngine';

const STORAGE_KEY = 'slopsaken_profile_v1';
const SETTINGS_KEY = 'slopsaken_settings_v1';

const DEFAULT_SETTINGS: GameSettings = {
  invertHorizontalLook: false,
  invertVerticalLook: false,
  invertStrafe: false,
  mouseSensitivity: 1.0,
  showHitboxes: false,
  fov: 65,
  volume: 80,
};

const INITIAL_PROFILE: PlayerProfile = {
  level: 1,
  xp: 0,
  xpToNextLevel: 2500,
  inkDroplets: 150,
  unlockedOutfits: ['classic_pencil', 'black_slasher_classic'],
  unlockedWeapons: ['quill_scythe'],
  equippedSurvivorSkin: 'classic_pencil',
  equippedHunterSkin: 'black_slasher_classic',
  equippedWeaponSkin: 'quill_scythe',
  equippedSurvivorPerks: [],
  equippedHunterPerks: [],
  achievements: {},
  settings: DEFAULT_SETTINGS,
};

const DEFAULT_ACHIEVEMENTS: AchievementItem[] = [
  { id: 'first_escape', title: 'First Page Survived', description: 'Escape from your first trial.', rewardDroplets: 100, unlocked: false, icon: 'book' },
  { id: 'grease_monkey', title: 'Grease Monkey', description: 'Repair 5 generators across matches.', rewardDroplets: 80, unlocked: false, icon: 'wrench' },
  { id: 'splinter_strike', title: 'Splinter Strike', description: 'Stun the Hunter with a wood pallet.', rewardDroplets: 60, unlocked: false, icon: 'shield' },
  { id: 'ink_angel', title: 'Ink Angel', description: 'Rescue 3 teammates from Scribble Cages.', rewardDroplets: 120, unlocked: false, icon: 'heart' },
  { id: 'master_craftsman', title: 'Master Craftsman', description: 'Hit a Great Skill Check on an engine.', rewardDroplets: 75, unlocked: false, icon: 'zap' },
  { id: 'apex_eraser', title: 'Apex Eraser', description: 'Sacrifice all 4 survivors in one match as Hunter.', rewardDroplets: 150, unlocked: false, icon: 'skull' },
];

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const [achievements, setAchievements] = useState<AchievementItem[]>(() => {
    return DEFAULT_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: !!profile.achievements?.[a.id],
    }));
  });

  // Game setup
  const [gameState, setGameState] = useState<'lobby' | 'loading' | 'playing' | 'gameover'>('lobby');
  const [selectedRole, setSelectedRole] = useState<GameRole>('survivor');
  const [selectedSurvivorClass, setSelectedSurvivorClass] = useState<SurvivorClass>('newb');
  const [selectedHunterClass, setSelectedHunterClass] = useState<HunterClass>('black_slasher');
  const [selectedMap, setSelectedMap] = useState<MapId>('school');

  // Online Multiplayer State
  const [playerName, setPlayerName] = useState('DoodleMaster');
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomData | null>(null);
  const [onlinePlayerId, setOnlinePlayerId] = useState<string | null>(null);
  const [lobbyMaxPlayers, setLobbyMaxPlayers] = useState<number>(8);
  const [killerRoulette, setKillerRoulette] = useState<{ active: boolean; chosenKillerName: string; isMeKiller: boolean } | null>(null);

  // First Person & Roblox Shiftlock state
  const [isShiftLock, setIsShiftLock] = useState(false);
  const [isFirstPerson, setIsFirstPerson] = useState(false);

  // Settings & Last Man Standing
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLastManStanding, setIsLastManStanding] = useState(false);

  // Modals
  const [isHandbookOpen, setIsHandbookOpen] = useState(false);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);

  // In-Game Live State
  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [survivors, setSurvivors] = useState<SurvivorData[]>([]);
  const [hunter, setHunter] = useState<HunterData | null>(null);
  const [generators, setGenerators] = useState<GeneratorEntity[]>([]);
  const [escapeGates, setEscapeGates] = useState<EscapeGateEntity[]>([]);
  const [actionPrompt, setActionPrompt] = useState<string | null>(null);
  const [comicPops, setComicPops] = useState<ComicPop[]>([]);
  const [matchTimerSec, setMatchTimerSec] = useState(180);
  const [terrorDist, setTerrorDist] = useState(50);

  // Skill check active state
  const [isSkillCheckVisible, setIsSkillCheckVisible] = useState(false);
  const [successZone, setSuccessZone] = useState<[number, number]>([50, 75]);
  const [greatZone, setGreatZone] = useState<[number, number]>([68, 75]);

  // Match Over stats
  const [matchVictory, setMatchVictory] = useState(false);
  const [finalStats, setFinalStats] = useState<MatchStats | null>(null);

  // Persist Profile
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
    engineRef.current?.updateSettings(newSettings);
  };

  // Unlock achievement helper
  const unlockAchievement = (id: string) => {
    const ach = achievements.find((a) => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      setAchievements([...achievements]);
      setProfile((prev) => ({
        ...prev,
        inkDroplets: prev.inkDroplets + ach.rewardDroplets,
        achievements: { ...prev.achievements, [id]: true },
      }));
    }
  };

  // Clean popups
  useEffect(() => {
    if (comicPops.length === 0) return;
    const timer = setTimeout(() => {
      setComicPops((prev) => prev.slice(1));
    }, 1600);
    return () => clearTimeout(timer);
  }, [comicPops]);

  // Multi-tab BroadcastChannel sync for instant same-browser room updates
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('slopsaken_multiplayer_channel');
      channel.onmessage = (e) => {
        const data = e.data;
        if (!data) return;

        if (data.type === 'room_update' && data.room) {
          if (onlineRoom && (data.room.code === onlineRoom.code || data.code === onlineRoom.code)) {
            setOnlineRoom(data.room);
          }
        } else if (data.type === 'match_start' && data.room) {
          if (onlineRoom && (data.room.code === onlineRoom.code || data.code === onlineRoom.code)) {
            handleStartMatchFromEvent(data.room, data.killerId, data.killerName);
          }
        }
      };
    } catch {}

    return () => {
      try {
        channel?.close();
      } catch {}
    };
  }, [onlineRoom?.code, onlinePlayerId]);

  // Live Lobby Polling (1 second interval) ensures host sees joiners and clients see match start!
  useEffect(() => {
    if (!onlineRoom || gameState !== 'lobby') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${onlineRoom.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            setOnlineRoom(data.room);
            if (data.room.status === 'playing' && gameState === 'lobby') {
              handleStartMatchFromEvent(data.room, data.room.killerId, data.room.killerName);
            }
          }
        }
      } catch {
        // ignore polling error
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onlineRoom?.code, gameState, onlinePlayerId]);

  // Online Room Hosting
  const handleHostLobby = async () => {
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: playerName,
          role: 'survivor',
          survivorClass: selectedSurvivorClass,
          hunterClass: selectedHunterClass,
          mapId: selectedMap,
          maxPlayers: lobbyMaxPlayers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOnlineRoom(data.room);
        setOnlinePlayerId(data.playerId);
        soundEngine.ensureAudio();
        soundEngine.playPencilScratch();

        try {
          const ch = new BroadcastChannel('slopsaken_multiplayer_channel');
          ch.postMessage({ type: 'room_update', code: data.room.code, room: data.room });
          ch.close();
        } catch {}
      }
    } catch {
      // Offline fallback
      const mockCode = `SLOP-${Math.floor(100 + Math.random() * 899)}`;
      const fallbackRoom: OnlineRoomData = {
        code: mockCode,
        hostId: 'host_local',
        mapId: selectedMap,
        maxPlayers: lobbyMaxPlayers,
        status: 'lobby',
        players: {
          host_local: {
            id: 'host_local',
            name: playerName,
            role: 'survivor',
            survivorClass: selectedSurvivorClass,
            hunterClass: selectedHunterClass,
            isHost: true,
            isReady: true,
          },
        },
      };
      setOnlineRoom(fallbackRoom);
      setOnlinePlayerId('host_local');

      try {
        const ch = new BroadcastChannel('slopsaken_multiplayer_channel');
        ch.postMessage({ type: 'room_update', code: mockCode, room: fallbackRoom });
        ch.close();
      } catch {}
    }
  };

  // Online Room Joining (tolerant room code search)
  const handleJoinLobby = async (code: string) => {
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          playerName,
          survivorClass: selectedSurvivorClass,
          hunterClass: selectedHunterClass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOnlineRoom(data.room);
        setOnlinePlayerId(data.playerId);
        soundEngine.ensureAudio();
        soundEngine.playPencilScratch();

        try {
          const ch = new BroadcastChannel('slopsaken_multiplayer_channel');
          ch.postMessage({ type: 'room_update', code: data.room.code, room: data.room });
          ch.close();
        } catch {}
      } else {
        alert(data.message || 'Could not find that room code! Please double-check.');
      }
    } catch {
      alert('Could not connect to online lobby.');
    }
  };

  const handleSelectSurvivorClass = (sClass: SurvivorClass) => {
    setSelectedSurvivorClass(sClass);
    if (onlineRoom && onlinePlayerId) {
      fetch(`/api/rooms/${onlineRoom.code}/update_player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: onlinePlayerId,
          survivorClass: sClass,
        }),
      }).catch(() => {});
    }
  };

  const handleLeaveLobby = () => {
    if (onlineRoom && onlinePlayerId) {
      fetch(`/api/rooms/${onlineRoom.code}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: onlinePlayerId }),
      }).catch(() => {});
    }
    setOnlineRoom(null);
    setOnlinePlayerId(null);
  };

  // Trigger match start from Roulette event
  const handleStartMatchFromEvent = (room: OnlineRoomData, killerId?: string | null, killerName?: string | null) => {
    const isMeKiller = !!(killerId && onlinePlayerId && killerId === onlinePlayerId);
    const finalKillerName = killerName || (killerId && room.players[killerId]?.name) || 'The Killer';

    setKillerRoulette({
      active: true,
      chosenKillerName: finalKillerName,
      isMeKiller,
    });
    soundEngine.playAbilityActivate();

    setTimeout(() => {
      setKillerRoulette(null);
      if (isMeKiller) {
        setSelectedRole('hunter');
      } else {
        setSelectedRole('survivor');
      }
      setGameState('loading');
      setTimeout(() => {
        setGameState('playing');
        setMatchTimerSec(180);
        setIsLastManStanding(false);
      }, 1200);
    }, 2400);
  };

  // Host launches match: Randomly picks 1 player as Killer, others are survivors
  const handleStartMatch = async () => {
    soundEngine.ensureAudio();

    if (onlineRoom) {
      try {
        const res = await fetch(`/api/rooms/${onlineRoom.code}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.success && data.room) {
          try {
            const ch = new BroadcastChannel('slopsaken_multiplayer_channel');
            ch.postMessage({
              type: 'match_start',
              code: onlineRoom.code,
              room: data.room,
              killerId: data.killerId,
              killerName: data.killerName,
            });
            ch.close();
          } catch {}

          handleStartMatchFromEvent(data.room, data.killerId, data.killerName);
          return;
        }
      } catch {
        // Fallback: pick random player from local lobby list
        const playerList = Object.values(onlineRoom.players);
        const randomPlayer = playerList[Math.floor(Math.random() * playerList.length)];
        handleStartMatchFromEvent(onlineRoom, randomPlayer?.id, randomPlayer?.name);
        return;
      }
    }

    // Solo Match
    setGameState('loading');
    setTimeout(() => {
      setGameState('playing');
      setMatchTimerSec(180);
      setIsLastManStanding(false);
    }, 1400);
  };

  // Mount 3D GameEngine when entering 'playing' state
  useEffect(() => {
    if (gameState !== 'playing' || !gameContainerRef.current) return;

    const engine = new GameEngine(
      gameContainerRef.current,
      selectedRole,
      selectedSurvivorClass,
      selectedHunterClass,
      selectedMap,
      {
        onUpdateSurvivors: (sList) => setSurvivors(sList),
        onUpdateHunter: (hData) => setHunter(hData),
        onUpdateGenerators: (gList) => setGenerators(gList),
        onUpdateGates: (gates) => setEscapeGates(gates),
        onSkillCheckTrigger: (succ, grt) => {
          setSuccessZone(succ);
          setGreatZone(grt);
          setIsSkillCheckVisible(true);
        },
        onSkillCheckClose: () => {
          setIsSkillCheckVisible(false);
        },
        onActionPrompt: (prompt) => setActionPrompt(prompt),
        onComicPop: (pop) => setComicPops((prev) => [...prev, pop]),
        onMatchEnd: (victory, stats) => {
          setMatchVictory(victory);
          setFinalStats(stats);
          setGameState('gameover');

          // Process achievements
          if (victory && selectedRole === 'survivor') unlockAchievement('first_escape');
          if (stats.palletsStunned > 0) unlockAchievement('splinter_strike');
          if (stats.rescuesMade > 0) unlockAchievement('ink_angel');
          if (stats.generatorsCompleted >= 4) unlockAchievement('grease_monkey');
          if (selectedRole === 'hunter' && stats.survivorsSacrificed >= 4) unlockAchievement('apex_eraser');

          setProfile((prev) => {
            const nextXp = prev.xp + stats.xpEarned;
            let level = prev.level;
            let xpToNext = prev.xpToNextLevel;
            let remXp = nextXp;

            while (remXp >= xpToNext) {
              remXp -= xpToNext;
              level += 1;
              xpToNext = Math.floor(xpToNext * 1.35);
            }

            return {
              ...prev,
              level,
              xp: remXp,
              xpToNextLevel: xpToNext,
              inkDroplets: prev.inkDroplets + stats.inkDropletsEarned,
            };
          });
        },
        onTerrorDistance: (dist) => setTerrorDist(dist),
        onTimerTick: (remainingSec, isLastMan) => {
          setMatchTimerSec(remainingSec);
          setIsLastManStanding(isLastMan);
        },
      },
      onlineRoom?.code,
      onlinePlayerId,
      settings
    );

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [gameState, selectedRole, selectedSurvivorClass, selectedHunterClass, selectedMap, onlineRoom, onlinePlayerId]);

  const handleQuitMatch = () => {
    if (engineRef.current) engineRef.current.destroy();
    setGameState('lobby');
  };

  const handleSkillCheckHit = (needleProgress: number) => {
    setIsSkillCheckVisible(false);
    if (engineRef.current) {
      engineRef.current.submitSkillCheck(needleProgress);
    }
  };

  const handleSkillCheckMiss = () => {
    setIsSkillCheckVisible(false);
    if (engineRef.current) {
      engineRef.current.submitSkillCheck(-1);
    }
  };

  return (
    <div className={`w-full min-h-screen ${gameState === 'playing' ? 'h-screen overflow-hidden' : 'overflow-y-auto'} bg-[#14110f] text-stone-200 select-none`}>
      {/* 1. LOBBY STATE */}
      {gameState === 'lobby' && (
        <LobbyView
          profile={profile}
          selectedRole={selectedRole}
          selectedSurvivorClass={selectedSurvivorClass}
          selectedHunterClass={selectedHunterClass}
          selectedMap={selectedMap}
          playerName={playerName}
          onlineRoom={onlineRoom}
          onlinePlayerId={onlinePlayerId}
          lobbyMaxPlayers={lobbyMaxPlayers}
          onSetLobbyMaxPlayers={setLobbyMaxPlayers}
          killerRoulette={killerRoulette}
          onSetPlayerName={setPlayerName}
          onSelectRole={setSelectedRole}
          onSelectSurvivorClass={handleSelectSurvivorClass}
          onSelectHunterClass={setSelectedHunterClass}
          onSelectMap={setSelectedMap}
          onStartMatch={handleStartMatch}
          onHostLobby={handleHostLobby}
          onJoinLobby={handleJoinLobby}
          onLeaveLobby={handleLeaveLobby}
          onOpenHandbook={() => setIsHandbookOpen(true)}
          onOpenCustomization={() => setIsCustomizationOpen(true)}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* 2. LOADING STATE */}
      {gameState === 'loading' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#151210] p-6 text-center font-sketch">
          <div className="w-16 h-16 border-4 border-amber-300 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-3xl font-bold text-amber-200 tracking-wider animate-pulse">
            DRAWING THE TRIAL...
          </h2>
          <p className="text-stone-400 text-sm mt-2 font-doodle max-w-sm">
            Sketching walls, placing scribble engines, and awakening the Black Slasher in the dark...
          </p>
        </div>
      )}

      {/* 3. IN-GAME 3D CANVAS & HUD */}
      {gameState === 'playing' && (
        <div className="relative w-full h-full">
          <div ref={gameContainerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

          {hunter && (
            <GameHUD
              userRole={selectedRole}
              survivors={survivors}
              hunter={hunter}
              generators={generators}
              gates={escapeGates}
              actionPrompt={actionPrompt}
              comicPops={comicPops}
              matchTimerSec={matchTimerSec}
              isLastManStanding={isLastManStanding}
              terrorDist={terrorDist}
              onQuitMatch={handleQuitMatch}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onTriggerSurvivorAbility1={() => engineRef.current?.triggerSurvivorAbility(1)}
              onTriggerSurvivorAbility2={() => engineRef.current?.triggerSurvivorAbility(2)}
              onTriggerSurvivorAbility3={() => engineRef.current?.triggerSurvivorAbility(3)}
              onTriggerSurvivorAbility4={() => engineRef.current?.triggerSurvivorAbility(4)}
              onTriggerSurvivorAbility={(idx) => engineRef.current?.triggerSurvivorAbility(idx)}
              onTriggerHunterAbility={(idx) => {
                if (idx === 1) engineRef.current?.hunterNormalSlash();
                else if (idx === 2) engineRef.current?.hunterCharge();
                else if (idx === 3) engineRef.current?.hunterGashingWound();
                else if (idx === 4) engineRef.current?.hunterRagingInk();
              }}
            />
          )}

          {isSkillCheckVisible && (
            <SkillCheckOverlay
              successZone={successZone}
              greatZone={greatZone}
              onHit={handleSkillCheckHit}
              onMiss={handleSkillCheckMiss}
            />
          )}
        </div>
      )}

      {/* 4. POST-MATCH SUMMARY */}
      {gameState === 'gameover' && finalStats && (
        <EndGameSummary
          victory={matchVictory}
          role={selectedRole}
          stats={finalStats}
          profile={profile}
          onPlayAgain={handleStartMatch}
          onReturnToLobby={() => setGameState('lobby')}
        />
      )}

      {/* Modals */}
      <HandbookModal isOpen={isHandbookOpen} onClose={() => setIsHandbookOpen(false)} />
      <CustomizationModal
        isOpen={isCustomizationOpen}
        onClose={() => setIsCustomizationOpen(false)}
        profile={profile}
        onUpdateProfile={setProfile}
      />
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        achievements={achievements}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
