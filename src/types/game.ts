export type GameRole = 'survivor' | 'hunter';

// Survivors: newb, caretaker, builda_men, gambling_guy, protector_guy, engineer, runner
export type SurvivorClass =
  | 'newb'
  | 'caretaker'
  | 'builda_men'
  | 'gambling_guy'
  | 'protector_guy'
  | 'engineer'
  | 'runner';

// Hunters
export type HunterClass = 'black_slasher' | 'scribbler' | 'marionette';

export type HealthState = 'healthy' | 'injured' | 'downed' | 'caged' | 'escaped' | 'sacrificed';

export type MapId = 'school' | 'forest' | 'lab' | 'subway';

export type ItemType = 'flashlight' | 'medkit' | 'toolbox' | 'smoke_bomb' | null;

export interface ActiveStatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  duration: number; // seconds remaining
  maxDuration: number;
  iconDoodle: string;
  intensity?: number;
}

export type GamblerHat = 'dimmadome' | 'top_hat' | 'fedora' | 'beanie';

export interface SurvivorData {
  id: string;
  name: string;
  characterClass: SurvivorClass;
  isBot: boolean;
  health: HealthState;
  hp: number;
  maxHp: number;
  cageTimeRemaining: number;
  stamina: number;
  maxStamina: number;
  item: ItemType;
  itemCharges: number;

  // Abilities (up to 4)
  ability1Cooldown: number;
  ability1MaxCooldown: number;
  ability2Cooldown: number;
  ability2MaxCooldown: number;
  ability3Cooldown: number;
  ability3MaxCooldown: number;
  ability4Cooldown: number;
  ability4MaxCooldown: number;

  // Active status effects
  effects: ActiveStatusEffect[];

  // Class-specific custom state
  // Newb:
  isInvisible: boolean;
  invisibilityTimeRemaining: number;
  isDrinking: boolean;
  drinkingTimer: number;

  // Gambling Guy:
  gamblingPoints: number; // 0..3 points gained from Heads
  weaknessStage: number;  // Tails weakness count (each adds * 1.05 dmg)
  currentHat: GamblerHat;

  // Protector Guy:
  isBlocking: boolean;
  blockTimer: number;
  canPunch: boolean;
  isPunching: boolean;
  isChargingStab: boolean;
  chargeStabTimer: number;

  // Builda Men builds in progress:
  isBuilding: boolean;
  buildingTimer: number;
  buildingType: 'sentry' | 'healing_machine' | 'bonus_pad' | null;

  // Caretaker:
  isSplashing: boolean;

  // Shared state:
  endlagTimer: number;
  isRagdolled: boolean;
  ragdollTimer: number;
  speed: number;
  isCrouching: boolean;
  isSprinting: boolean;
  isVaulting: boolean;
  currentAction: string | null;
  score: number;
}

export interface HunterData {
  id: string;
  name: string;
  characterClass: HunterClass;
  isBot: boolean;
  weapon: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;

  // Black Slasher Cooldowns:
  // 1: Slash (0.7s)
  // 2: Charge (30s)
  // 3: Gashing Wound (25s)
  // 4: Raging Ink (35s)
  ability1Cooldown: number;
  ability1MaxCooldown: number;
  ability2Cooldown: number;
  ability2MaxCooldown: number;
  ability3Cooldown: number;
  ability3MaxCooldown: number;
  ability4Cooldown: number;
  ability4MaxCooldown: number;

  // State flags
  isAttacking: boolean;
  isCharging: boolean;
  chargeTimeRemaining: number;
  isGashing: boolean;
  gashingTimeRemaining: number;
  isRagingInk: boolean;
  ragingInkTimeRemaining: number;

  // Stun immunity forcefield (8 seconds after being stunned)
  isStunImmune: boolean;
  stunImmunityTimer: number;
  stunTimer: number;

  isCarrying: boolean;
  speed: number;
  score: number;
}

export interface SentryEntity {
  id: string;
  x: number;
  z: number;
  health: number; // 2 hits
  lastShotTime: number;
  rotY: number;
}

export interface HealingMachineEntity {
  id: string;
  x: number;
  z: number;
  health: number; // 1 hit
  rotAngle: number;
}

export interface BonusPadEntity {
  id: string;
  x: number;
  z: number;
  health: number; // 1 hit
}

export interface HealingCloudEntity {
  id: string;
  x: number;
  z: number;
  radius: number;
  timeRemaining: number; // 5s
}

export interface InkTrailNode {
  x: number;
  z: number;
  timeRemaining: number;
  maxTime: number;
}

export interface BloodTrailNode {
  x: number;
  z: number;
  timeRemaining: number;
}

export interface GeneratorEntity {
  id: string;
  x: number;
  z: number;
  progress: number;
  isRepaired: boolean;
  isBeingRepaired: boolean;
  sparks: boolean;
  sparkCooldown: number;
}

export interface PalletEntity {
  id: string;
  x: number;
  z: number;
  rotation: number;
  isDropped: boolean;
  isBroken: boolean;
}

export interface WindowEntity {
  id: string;
  x: number;
  z: number;
  rotation: number;
}

export interface ChestEntity {
  id: string;
  x: number;
  z: number;
  isOpened: boolean;
  searchProgress: number;
  loot: ItemType;
}

export interface CageEntity {
  id: string;
  x: number;
  z: number;
  occupantId: string | null;
}

export interface EscapeGateEntity {
  id: string;
  x: number;
  z: number;
  leverProgress: number;
  isOpened: boolean;
  rotation: number;
}

export interface ScratchMark {
  x: number;
  z: number;
  opacity: number;
  timeRemaining: number;
  angle: number;
}

export interface ComicPop {
  id: string;
  text: string;
  x: number;
  y: number;
  z?: number;
  color: string;
  scale: number;
  opacity: number;
}

export interface MatchStats {
  generatorsCompleted: number;
  survivorsEscaped: number;
  survivorsSacrificed: number;
  palletsDropped: number;
  palletsStunned: number;
  rescuesMade: number;
  hitsDealt: number;
  matchDurationSec: number;
  xpEarned: number;
  inkDropletsEarned: number;
}

export interface GameSettings {
  invertHorizontalLook: boolean;
  invertVerticalLook: boolean;
  invertStrafe: boolean;
  mouseSensitivity: number; // 0.2 .. 3.0
  showHitboxes: boolean;
  fov: number; // 50 .. 85
  volume: number; // 0 .. 100
}

export interface PlayerProfile {
  level: number;
  xp: number;
  xpToNextLevel: number;
  inkDroplets: number;
  unlockedOutfits: string[];
  unlockedWeapons: string[];
  equippedSurvivorSkin: string;
  equippedHunterSkin: string;
  equippedWeaponSkin: string;
  equippedSurvivorPerks: string[];
  equippedHunterPerks: string[];
  achievements: Record<string, boolean>;
  settings: GameSettings;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  rewardDroplets: number;
  unlocked: boolean;
  icon: string;
}

export interface OnlineRoomData {
  code: string;
  hostId: string;
  mapId: MapId;
  status: 'lobby' | 'playing' | 'ended';
  maxPlayers?: number;
  killerId?: string | null;
  killerName?: string | null;
  players: Record<string, {
    id: string;
    name: string;
    role: GameRole;
    survivorClass?: SurvivorClass;
    hunterClass?: HunterClass;
    isHost: boolean;
    isReady: boolean;
    hp?: number;
    x?: number;
    z?: number;
    rotY?: number;
    action?: string | null;
  }>;
}
