import * as THREE from 'three';
import {
  GameRole,
  SurvivorClass,
  HunterClass,
  MapId,
  SurvivorData,
  HunterData,
  GeneratorEntity,
  PalletEntity,
  WindowEntity,
  ChestEntity,
  CageEntity,
  EscapeGateEntity,
  ScratchMark,
  ComicPop,
  MatchStats,
  ActiveStatusEffect,
  InkTrailNode,
  BloodTrailNode,
  GameSettings,
  GamblerHat,
} from '../types/game';
import {
  createSurvivorModel,
  createHunterModel,
  createGeneratorModel,
  createPalletModel,
  createVaultWindowModel,
  createChestModel,
  createCageModel,
  createEscapeGateModel,
  createMapEnvironment,
  createSentryModel,
  createHealingMachineModel,
  createBonusPadModel,
  createHealingCloudModel,
  AnimatedCharacterRig,
} from './sketchModels';
import { createScratchMarkTexture, createComicActionSprite } from './textures';
import { soundEngine } from '../audio/soundEngine';

export interface GameEngineCallbacks {
  onUpdateSurvivors: (survivors: SurvivorData[]) => void;
  onUpdateHunter: (hunter: HunterData) => void;
  onUpdateGenerators: (gens: GeneratorEntity[]) => void;
  onUpdateGates: (gates: EscapeGateEntity[]) => void;
  onSkillCheckTrigger: (successZone: [number, number], greatZone: [number, number]) => void;
  onSkillCheckClose: () => void;
  onActionPrompt: (prompt: string | null) => void;
  onComicPop: (pop: ComicPop) => void;
  onMatchEnd: (victory: boolean, stats: MatchStats) => void;
  onTerrorDistance: (distance: number) => void;
  onTimerTick?: (remainingSec: number, isLastManStanding: boolean) => void;
  onShiftLockChange?: (active: boolean) => void;
  onFirstPersonChange?: (active: boolean) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  // Match State
  public userRole: GameRole = 'survivor';
  public userSurvivorClass: SurvivorClass = 'newb';
  public userHunterClass: HunterClass = 'black_slasher';
  public mapId: MapId = 'school';

  // Online Multiplayer State
  public onlineRoomCode: string | null = null;
  public onlinePlayerId: string | null = null;
  private ws: WebSocket | null = null;
  private syncTimer: number | null = null;

  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private matchTimerSec: number = 0;
  private isMatchOver: boolean = false;

  // Camera Orbit & Controls
  public cameraDistance: number = 5.2;
  public cameraYaw: number = 0;
  public cameraPitch: number = 0.35;
  public isShiftLock: boolean = false;
  public isFirstPerson: boolean = false;
  private isMouseDown: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;

  // Settings & Last Man Standing state
  public settings: GameSettings = {
    invertHorizontalLook: false,
    invertVerticalLook: false,
    invertStrafe: false,
    mouseSensitivity: 1.0,
    showHitboxes: false,
    fov: 65,
    volume: 80,
  };
  public matchDurationRemaining: number = 180; // 3 minutes start!
  public isLastManStanding: boolean = false;
  public lastManGatesOpened: boolean = false;

  // Keyboard Inputs
  private keys: Record<string, boolean> = {};

  // Entities Data
  public survivors: SurvivorData[] = [];
  public hunter!: HunterData;
  public generators: GeneratorEntity[] = [];
  public pallets: PalletEntity[] = [];
  public windows: WindowEntity[] = [];
  public chests: ChestEntity[] = [];
  public cages: CageEntity[] = [];
  public escapeGates: EscapeGateEntity[] = [];
  public scratchMarks: ScratchMark[] = [];
  public inkTrails: InkTrailNode[] = [];
  public bloodTrails: BloodTrailNode[] = [];

  // Custom Survivor Entities & Structures
  public healingClouds: { id: string; x: number; z: number; timeRemaining: number; model: ReturnType<typeof createHealingCloudModel> }[] = [];
  public sentries: { id: string; x: number; z: number; hp: number; maxHp: number; shootTimer: number; model: ReturnType<typeof createSentryModel> }[] = [];
  public healingMachines: { id: string; x: number; z: number; hp: number; riseTimer: number; healTimer: number; model: ReturnType<typeof createHealingMachineModel> }[] = [];
  public bonusPads: { id: string; x: number; z: number; hp: number; lastBoostTimes: Map<string, number>; model: ReturnType<typeof createBonusPadModel> }[] = [];
  public weaknessTimeRemaining: number = 0;

  // 3D Rigs and Meshes
  private survivorRigs: Map<string, AnimatedCharacterRig> = new Map();
  private hunterRig!: AnimatedCharacterRig;
  private generatorModels: Map<string, ReturnType<typeof createGeneratorModel>> = new Map();
  private palletModels: Map<string, ReturnType<typeof createPalletModel>> = new Map();
  private chestModels: Map<string, ReturnType<typeof createChestModel>> = new Map();
  private gateModels: Map<string, ReturnType<typeof createEscapeGateModel>> = new Map();
  private wallColliders: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  private scratchMeshGroup = new THREE.Group();
  private trailMeshGroup = new THREE.Group();

  // Positions (x, z)
  private survivorPositions: Map<string, { x: number; z: number; rotY: number }> = new Map();
  private hunterPosition: { x: number; z: number; rotY: number } = { x: 0, z: 0, rotY: 0 };

  // Skill Check System
  public isSkillCheckActive: boolean = false;
  private skillCheckNextTime: number = 0;
  private currentSkillCheckGenId: string | null = null;
  private skillCheckSuccessRange: [number, number] = [60, 85];
  private skillCheckGreatRange: [number, number] = [75, 85];

  // Match Tracking Stats
  private stats: MatchStats = {
    generatorsCompleted: 0,
    survivorsEscaped: 0,
    survivorsSacrificed: 0,
    palletsDropped: 0,
    palletsStunned: 0,
    rescuesMade: 0,
    hitsDealt: 0,
    matchDurationSec: 0,
    xpEarned: 0,
    inkDropletsEarned: 0,
  };

  constructor(
    container: HTMLElement,
    userRole: GameRole,
    survivorClass: SurvivorClass,
    hunterClass: HunterClass,
    mapId: MapId,
    callbacks: GameEngineCallbacks,
    onlineRoomCode?: string | null,
    onlinePlayerId?: string | null,
    settings?: GameSettings
  ) {
    this.container = container;
    this.userRole = userRole;
    this.userSurvivorClass = survivorClass;
    this.userHunterClass = hunterClass;
    this.mapId = mapId;
    this.callbacks = callbacks;
    this.onlineRoomCode = onlineRoomCode || null;
    this.onlinePlayerId = onlinePlayerId || null;
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }

    this.initScene();
    this.setupInputs();
    this.spawnEntities();
    this.initOnlineSync();
    this.startLoop();
  }

  public updateSettings(settings: GameSettings) {
    this.settings = { ...this.settings, ...settings };
    if (this.camera) {
      this.camera.fov = this.settings.fov || 65;
      this.camera.updateProjectionMatrix();
    }
    this.updateHitboxVisibility();
  }

  public updateHitboxVisibility() {
    const visible = !!this.settings.showHitboxes;
    if (this.hunterRig && this.hunterRig.setHitboxVisible) {
      this.hunterRig.setHitboxVisible(visible);
    }
    this.survivorRigs.forEach((rig) => {
      if (rig.setHitboxVisible) rig.setHitboxVisible(visible);
    });
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1613, 0.022);
    this.scene.background = new THREE.Color(0x151210);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(this.settings.fov || 65, width / height, 0.1, 200);
    this.camera.position.set(0, 6, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xd9c5b2, 0.95);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight.position.set(25, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    const mapEnv = createMapEnvironment(this.mapId);
    this.scene.add(mapEnv.groundMesh);
    this.scene.add(mapEnv.propsGroup);
    this.wallColliders = mapEnv.wallColliders;

    this.scene.add(this.scratchMeshGroup);
    this.scene.add(this.trailMeshGroup);

    window.addEventListener('resize', this.onResize);
  }

  private spawnEntities() {
    // 1. Spawning Survivors: 'newb', 'caretaker', 'builda_men', 'gambling_guy'
    const classes: SurvivorClass[] = ['newb', 'caretaker', 'builda_men', 'gambling_guy'];
    const names = ['Newb', 'Caretaker', 'Builda Men', 'Gambling Guy'];

    this.survivors = [];
    for (let i = 0; i < 4; i++) {
      const isUser = this.userRole === 'survivor' && i === 0;
      const sClass = isUser ? this.userSurvivorClass : classes[i];
      let sName = isUser ? `You (${sClass.toUpperCase()})` : names[i];
      if (sClass === 'protector_guy') {
        sName = isUser ? 'You (PROTECTOR)' : 'Guy That Will Protect You';
      }

      let initialHp = 100;
      let cd1Max = 20;
      let cd2Max = 25;
      let cd3Max = 0;
      let cd4Max = 0;

      if (sClass === 'caretaker') {
        initialHp = 90;
        cd1Max = 30; // Heal Splash (30s)
        cd2Max = 40; // Smash Bottle (40s)
      } else if (sClass === 'builda_men') {
        initialHp = 90;
        cd1Max = 50; // Sentry (50s)
        cd2Max = 40; // Healing Machine (40s)
        cd3Max = 45; // Bonus Pad (45s)
      } else if (sClass === 'gambling_guy') {
        // Random 80-130 Max HP on round spawn!
        initialHp = Math.floor(80 + Math.random() * 51);
        cd1Max = 4;  // Coin Flip (4s)
        cd2Max = 12; // Flintlock (12s)
        cd3Max = 10; // Reroll HP (10s)
        cd4Max = 15; // Change Hat (15s)
      } else if (sClass === 'protector_guy') {
        initialHp = 110; // 110 Max HP
        cd1Max = 25; // Block (25s)
        cd2Max = 35; // Punch (35s)
        cd3Max = 30; // Charge (30s)
      } else {
        // newb
        initialHp = 100;
        cd1Max = 20; // Soda Drink (20s)
        cd2Max = 25; // Invisibility Potion (25s)
      }

      const sData: SurvivorData = {
        id: `survivor_${i}`,
        name: sName,
        characterClass: sClass,
        isBot: !isUser,
        health: 'healthy',
        hp: initialHp,
        maxHp: initialHp,
        cageTimeRemaining: 60,
        stamina: 100,
        maxStamina: 100,
        item: isUser ? 'flashlight' : i === 1 ? 'medkit' : i === 2 ? 'toolbox' : 'smoke_bomb',
        itemCharges: 100,

        ability1Cooldown: 0,
        ability1MaxCooldown: cd1Max,
        ability2Cooldown: 0,
        ability2MaxCooldown: cd2Max,
        ability3Cooldown: 0,
        ability3MaxCooldown: cd3Max,
        ability4Cooldown: 0,
        ability4MaxCooldown: cd4Max,

        effects: [],
        isInvisible: false,
        invisibilityTimeRemaining: 0,
        isDrinking: false,
        drinkingTimer: 0,
        gamblingPoints: 0,
        weaknessStage: 0,
        currentHat: 'dimmadome',
        isBlocking: false,
        blockTimer: 0,
        canPunch: false,
        isPunching: false,
        isChargingStab: false,
        chargeStabTimer: 0,
        isBuilding: false,
        buildingTimer: 0,
        buildingType: null,
        isSplashing: false,
        endlagTimer: 0,
        isRagdolled: false,
        ragdollTimer: 0,

        speed: 4.8,
        isCrouching: false,
        isSprinting: false,
        isVaulting: false,
        currentAction: null,
        score: 0,
      };
      this.survivors.push(sData);

      const rig = createSurvivorModel(sClass);
      const angle = (i / 4) * Math.PI * 2 + 0.4;
      const spawnX = Math.cos(angle) * 22;
      const spawnZ = Math.sin(angle) * 22;

      rig.root.position.set(spawnX, 0, spawnZ);
      this.scene.add(rig.root);
      this.survivorRigs.set(sData.id, rig);
      this.survivorPositions.set(sData.id, { x: spawnX, z: spawnZ, rotY: 0 });
    }

    // 2. Spawning Hunter: 'black_slasher' (1000 HP, 110 Stamina)
    const isUserHunter = this.userRole === 'hunter';
    const hClass = isUserHunter ? this.userHunterClass : 'black_slasher';
    this.hunter = {
      id: 'hunter_0',
      name: isUserHunter ? `You (${hClass.toUpperCase()})` : 'Black Slasher',
      characterClass: hClass,
      isBot: !isUserHunter,
      weapon: 'Giant Quill Scythe',
      hp: 1000,
      maxHp: 1000,
      stamina: 110,
      maxStamina: 110,

      ability1Cooldown: 0,
      ability1MaxCooldown: 0.7, // Normal Slash (0.7s)
      ability2Cooldown: 0,
      ability2MaxCooldown: 30,  // Ink Charge (30s cooldown)
      ability3Cooldown: 0,
      ability3MaxCooldown: 25,  // Gashing Wound (25s cooldown)
      ability4Cooldown: 0,
      ability4MaxCooldown: 35,  // Raging Ink (35s cooldown)

      isAttacking: false,
      isCharging: false,
      chargeTimeRemaining: 0,
      isGashing: false,
      gashingTimeRemaining: 0,
      isRagingInk: false,
      ragingInkTimeRemaining: 0,

      isStunImmune: false,
      stunImmunityTimer: 0,
      stunTimer: 0,

      isCarrying: false,
      speed: 5.6,
      score: 0,
    };

    this.hunterRig = createHunterModel(hClass);
    this.hunterPosition = { x: 0, z: -8, rotY: 0 };
    this.hunterRig.root.position.set(0, 0, -8);
    this.scene.add(this.hunterRig.root);

    this.updateHitboxVisibility();

    // 3. Spawning 5 Generators
    const genCoords = [
      { x: -24, z: -20 },
      { x: 24, z: -20 },
      { x: -22, z: 22 },
      { x: 22, z: 22 },
      { x: 0, z: 26 },
    ];
    this.generators = genCoords.map((coord, idx) => ({
      id: `gen_${idx}`,
      x: coord.x,
      z: coord.z,
      progress: 0,
      isRepaired: false,
      isBeingRepaired: false,
      sparks: false,
      sparkCooldown: 0,
    }));
    this.generators.forEach((gen) => {
      const gModel = createGeneratorModel();
      gModel.root.position.set(gen.x, 0, gen.z);
      this.scene.add(gModel.root);
      this.generatorModels.set(gen.id, gModel);
      this.wallColliders.push({
        minX: gen.x - 1.2,
        maxX: gen.x + 1.2,
        minZ: gen.z - 1.2,
        maxZ: gen.z + 1.2,
      });
    });

    // 4. Pallets
    const palletCoords = [
      { x: -12, z: -8, rot: 0 },
      { x: 12, z: -8, rot: 0 },
      { x: -10, z: 12, rot: Math.PI / 2 },
      { x: 10, z: 12, rot: Math.PI / 2 },
      { x: -18, z: 0, rot: 0 },
      { x: 18, z: 0, rot: 0 },
    ];
    this.pallets = palletCoords.map((c, idx) => ({
      id: `pallet_${idx}`,
      x: c.x,
      z: c.z,
      rotation: c.rot,
      isDropped: false,
      isBroken: false,
    }));
    this.pallets.forEach((p) => {
      const pModel = createPalletModel();
      pModel.root.position.set(p.x, 0, p.z);
      pModel.root.rotation.y = p.rotation;
      this.scene.add(pModel.root);
      this.palletModels.set(p.id, pModel);
    });

    // 5. Windows
    const windowCoords = [
      { x: -15, z: 6, rot: 0 },
      { x: 15, z: 6, rot: 0 },
      { x: 0, z: -15, rot: Math.PI / 2 },
      { x: 0, z: 15, rot: Math.PI / 2 },
    ];
    this.windows = windowCoords.map((w, idx) => ({
      id: `win_${idx}`,
      x: w.x,
      z: w.z,
      rotation: w.rot,
    }));
    this.windows.forEach((w) => {
      const wModel = createVaultWindowModel();
      wModel.position.set(w.x, 0, w.z);
      wModel.rotation.y = w.rotation;
      this.scene.add(wModel);
    });

    // 6. Chests
    const chestCoords = [
      { x: -28, z: 0, loot: 'medkit' as const },
      { x: 28, z: 0, loot: 'flashlight' as const },
      { x: 0, z: -28, loot: 'toolbox' as const },
      { x: 0, z: 28, loot: 'smoke_bomb' as const },
    ];
    this.chests = chestCoords.map((c, idx) => ({
      id: `chest_${idx}`,
      x: c.x,
      z: c.z,
      isOpened: false,
      searchProgress: 0,
      loot: c.loot,
    }));
    this.chests.forEach((c) => {
      const cModel = createChestModel();
      cModel.root.position.set(c.x, 0, c.z);
      this.scene.add(cModel.root);
      this.chestModels.set(c.id, cModel);
    });

    // 7. Cages
    const cageCoords = [
      { x: -16, z: -24 },
      { x: 16, z: -24 },
      { x: -16, z: 24 },
      { x: 16, z: 24 },
    ];
    this.cages = cageCoords.map((c, idx) => ({
      id: `cage_${idx}`,
      x: c.x,
      z: c.z,
      occupantId: null,
    }));
    this.cages.forEach((c) => {
      const cageMesh = createCageModel();
      cageMesh.position.set(c.x, 0, c.z);
      this.scene.add(cageMesh);
    });

    // 8. Escape Gates
    this.escapeGates = [
      { id: 'gate_north', x: 0, z: 42, leverProgress: 0, isOpened: false, rotation: 0 },
      { id: 'gate_south', x: 0, z: -42, leverProgress: 0, isOpened: false, rotation: Math.PI },
    ];
    this.escapeGates.forEach((g) => {
      const gModel = createEscapeGateModel();
      gModel.root.position.set(g.x, 0, g.z);
      gModel.root.rotation.y = g.rotation;
      this.scene.add(gModel.root);
      this.gateModels.set(g.id, gModel);
    });
  }

  // --- Online Multiplayer Sync Setup ---
  private initOnlineSync() {
    if (!this.onlineRoomCode) return;

    // Connect WebSocket
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'join_room', code: this.onlineRoomCode }));
        }
      };

      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'player_moved' && msg.playerId !== this.onlinePlayerId) {
            this.handleRemotePlayerUpdate(msg.playerId, msg.playerState);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    // Periodic HTTP sync fallback
    this.syncTimer = window.setInterval(() => {
      this.syncWithServer();
    }, 120);
  }

  private handleRemotePlayerUpdate(remoteId: string, state: Record<string, unknown>) {
    // If remote player is in this room, sync their position and action
    const sPos = this.survivorPositions.get(remoteId);
    if (sPos && state.x !== undefined && state.z !== undefined) {
      sPos.x = state.x as number;
      sPos.z = state.z as number;
      sPos.rotY = (state.rotY as number) || 0;
    }
  }

  private syncWithServer() {
    if (!this.onlineRoomCode || !this.onlinePlayerId) return;
    const myPos = this.userRole === 'survivor' ? this.survivorPositions.get(this.survivors[0].id) : this.hunterPosition;
    if (!myPos) return;

    fetch(`/api/rooms/${this.onlineRoomCode}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: this.onlinePlayerId,
        playerState: {
          x: myPos.x,
          z: myPos.z,
          rotY: myPos.rotY,
          hp: this.userRole === 'survivor' ? this.survivors[0].hp : 100,
        },
      }),
    }).catch(() => {});
  }

  // --- Input Setup (Fixed Non-Inverted Standard Roblox/FPS Controls) ---
  private setupInputs() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('click', this.onCanvasClick);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('wheel', this.onWheel);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onPointerLockChange = () => {
    const isLocked = document.pointerLockElement === this.renderer.domElement;
    if (!isLocked && (this.isShiftLock || this.isFirstPerson)) {
      // User pressed ESC or clicked away; keep internal state active so next canvas click relocks
    }
  };

  private onCanvasClick = () => {
    if (this.isShiftLock || this.isFirstPerson) {
      if (document.pointerLockElement !== this.renderer.domElement) {
        try {
          this.renderer.domElement.requestPointerLock?.();
        } catch {
          // ignore
        }
      }
    }
  };

  public toggleShiftLock() {
    this.isShiftLock = !this.isShiftLock;
    if (this.isShiftLock) {
      this.isFirstPerson = false;
      this.cameraDistance = 3.4;
      try {
        this.renderer.domElement.requestPointerLock?.();
      } catch {}
      this.spawnComicPop('🔒 SHIFTLOCK (LOCKED)', '#f39c12');
      soundEngine.playPencilScratch();
    } else {
      if (document.pointerLockElement === this.renderer.domElement) {
        try {
          document.exitPointerLock?.();
        } catch {}
      }
      this.cameraDistance = 5.2;
      this.spawnComicPop('🔓 SHIFTLOCK OFF', '#95a5a6');
      soundEngine.playPencilScratch();
    }
    this.callbacks.onShiftLockChange?.(this.isShiftLock);
    this.callbacks.onFirstPersonChange?.(this.isFirstPerson);
  }

  public toggleFirstPerson() {
    this.isFirstPerson = !this.isFirstPerson;
    if (this.isFirstPerson) {
      this.isShiftLock = false;
      this.cameraDistance = 0.1;
      try {
        this.renderer.domElement.requestPointerLock?.();
      } catch {}
      this.spawnComicPop('👁️ FIRST PERSON', '#3498db');
      soundEngine.playPencilScratch();
    } else {
      this.cameraDistance = 5.2;
      if (document.pointerLockElement === this.renderer.domElement) {
        try {
          document.exitPointerLock?.();
        } catch {}
      }
      this.spawnComicPop('📷 THIRD PERSON', '#95a5a6');
      soundEngine.playPencilScratch();
    }
    this.callbacks.onFirstPersonChange?.(this.isFirstPerson);
    this.callbacks.onShiftLockChange?.(this.isShiftLock);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    soundEngine.ensureAudio();

    // [Ctrl] = Toggle Roblox Shiftlock Screen Lock
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
      e.preventDefault();
      this.toggleShiftLock();
      return;
    }

    // [V] = Toggle First Person
    if (e.code === 'KeyV') {
      e.preventDefault();
      this.toggleFirstPerson();
      return;
    }

    if (e.code === 'Space') {
      if (this.isSkillCheckActive) {
        this.submitSkillCheck();
        e.preventDefault();
      } else {
        this.attemptVault();
      }
    }

    // Number keys / letter keys for abilities
    if (this.userRole === 'survivor') {
      if (e.code === 'KeyQ' || e.code === 'Digit1') {
        this.triggerSurvivorAbility(1);
      } else if (e.code === 'KeyR' || e.code === 'Digit2') {
        this.triggerSurvivorAbility(2);
      } else if (e.code === 'KeyF' || e.code === 'Digit3') {
        this.triggerSurvivorAbility(3);
      } else if (e.code === 'Digit4') {
        this.triggerSurvivorAbility(4);
      }
    } else {
      // Hunter abilities: [1] or Click = Slash, [2] or E = Charge, [3] or R = Gashing, [4] or Q = Raging Ink
      if (e.code === 'Digit1') {
        this.hunterNormalSlash();
      } else if (e.code === 'Digit2' || e.code === 'KeyE') {
        this.hunterCharge();
      } else if (e.code === 'Digit3' || e.code === 'KeyR') {
        this.hunterGashingWound();
      } else if (e.code === 'Digit4' || e.code === 'KeyQ') {
        this.hunterRagingInk();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    soundEngine.ensureAudio();
    if (e.button === 0) {
      if (this.userRole === 'hunter') {
        this.hunterNormalSlash();
      } else {
        this.useSurvivorItem();
      }
    }
    this.isMouseDown = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    if (this.isShiftLock || this.isFirstPerson) {
      if (document.pointerLockElement !== this.renderer.domElement) {
        try {
          this.renderer.domElement.requestPointerLock?.();
        } catch {}
      }
    }
  };

  private onMouseUp = () => {
    this.isMouseDown = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    const isLocked = document.pointerLockElement === this.renderer.domElement;
    if (isLocked || this.isMouseDown || this.isShiftLock || this.isFirstPerson) {
      let dx = 0;
      let dy = 0;

      if (isLocked) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (this.isMouseDown) {
        dx = e.clientX - this.prevMouseX;
        dy = e.clientY - this.prevMouseY;
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
      }

      if (dx === 0 && dy === 0) return;

      const sens = this.settings.mouseSensitivity || 1.0;
      // Standard non-inverted turning: Moving mouse left (dx < 0) turns left, right (dx > 0) turns right!
      const horizMult = this.settings.invertHorizontalLook ? -0.0035 : 0.0035;
      const vertMult = this.settings.invertVerticalLook ? -0.003 : 0.003;

      this.cameraYaw += dx * horizMult * sens;
      const maxPitch = this.isFirstPerson ? 1.4 : 1.25;
      const minPitch = this.isFirstPerson ? -1.3 : 0.05;
      this.cameraPitch = Math.max(minPitch, Math.min(maxPitch, this.cameraPitch + dy * vertMult * sens));
    }
  };

  private onWheel = (e: WheelEvent) => {
    this.cameraDistance = Math.max(0.1, Math.min(10.0, this.cameraDistance + e.deltaY * 0.005));
    if (this.cameraDistance <= 0.6 && !this.isFirstPerson) {
      this.isFirstPerson = true;
      this.isShiftLock = false;
      this.callbacks.onFirstPersonChange?.(true);
      this.callbacks.onShiftLockChange?.(false);
      this.spawnComicPop('👁️ FIRST PERSON', '#3498db');
      try {
        this.renderer.domElement.requestPointerLock?.();
      } catch {}
    } else if (this.cameraDistance > 0.6 && this.isFirstPerson) {
      this.isFirstPerson = false;
      this.callbacks.onFirstPersonChange?.(false);
      this.spawnComicPop('📷 THIRD PERSON', '#95a5a6');
    }
  };

  private onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // --- Skill Check Submission & Cancellation ---
  public submitSkillCheck(needleAngle?: number) {
    if (!this.isSkillCheckActive) return;
    this.isSkillCheckActive = false;
    this.callbacks.onSkillCheckClose();

    const angle = needleAngle ?? 75;
    const [succMin, succMax] = this.skillCheckSuccessRange;
    const [grtMin, grtMax] = this.skillCheckGreatRange;

    const currentGen = this.generators.find((g) => g.id === this.currentSkillCheckGenId);

    if (angle >= grtMin && angle <= grtMax) {
      soundEngine.playSkillCheckSuccess(true);
      this.spawnComicPop('GREAT! +5%', '#2ecc71');
      if (currentGen) currentGen.progress = Math.min(100, currentGen.progress + 5);
      this.survivors[0].score += 150;
    } else if (angle >= succMin && angle <= succMax) {
      soundEngine.playSkillCheckSuccess(false);
      this.spawnComicPop('GOOD!', '#f7d070');
      this.survivors[0].score += 50;
    } else {
      soundEngine.playSkillCheckFail();
      this.spawnComicPop('BOOM! MISSED', '#ef233c');
      if (currentGen) {
        currentGen.progress = Math.max(0, currentGen.progress - 8);
        currentGen.sparks = true;
        currentGen.sparkCooldown = 3;
      }
      this.alertHunterNoise(this.survivorPositions.get(this.survivors[0].id)!);
    }

    this.currentSkillCheckGenId = null;
  }

  public cancelSkillCheck() {
    if (!this.isSkillCheckActive) return;
    this.isSkillCheckActive = false;
    this.currentSkillCheckGenId = null;
    this.callbacks.onSkillCheckClose();
  }

  // --- NEWB SURVIVOR ABILITY 1: Drink Speed Potion ---
  public triggerSurvivorDrinkSpeed() {
    const player = this.survivors[0];
    if (player.ability1Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.isDrinking) return;

    player.ability1Cooldown = player.ability1MaxCooldown;
    player.isDrinking = true;
    player.drinkingTimer = 0.8; // 0.8s drinking animation
    soundEngine.playAbilityActivate();

    setTimeout(() => {
      player.isDrinking = false;
      // Add speed boost effect (+25% speed for 5 seconds)
      this.addSurvivorEffect(player, {
        id: 'speed_boost',
        name: '+25% Speed Boost',
        type: 'buff',
        duration: 5.0,
        maxDuration: 5.0,
        iconDoodle: 'zap',
      });
      this.spawnComicPop('POTION DRUNK! +25% SPEED', '#2ecc71');
    }, 800);
  }

  // --- NEWB SURVIVOR ABILITY 2: Invisibility Potion ---
  public triggerSurvivorDrinkInvisibility() {
    const player = this.survivors[0];
    if (player.ability2Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.isDrinking) return;

    player.ability2Cooldown = player.ability2MaxCooldown;
    player.isDrinking = true;
    player.drinkingTimer = 0.8; // 0.8s drinking animation
    soundEngine.playAbilityActivate();

    setTimeout(() => {
      player.isDrinking = false;
      player.isInvisible = true;
      player.invisibilityTimeRemaining = 8.0;

      // Set rig 80% transparent (0.2 opacity)
      const rig = this.survivorRigs.get(player.id);
      if (rig && rig.setTransparency) rig.setTransparency(0.2);

      this.addSurvivorEffect(player, {
        id: 'invisible',
        name: 'Invisibility (80% Undetectable)',
        type: 'buff',
        duration: 8.0,
        maxDuration: 8.0,
        iconDoodle: 'eye',
      });
      this.spawnComicPop('GHOST FORM! 80% INVISIBLE', '#06d6a0');
    }, 800);
  }

  // --- CARETAKER ABILITY 1: Heal (30s CD) ---
  // Takes out bottle and splashes it in front:
  // Instant heal 10 HP to anyone in splash + 20 HP regen over 10s (2 HP/s)
  // Lingering healing cloud for 5s healing 2 HP/s
  public triggerCaretakerHeal() {
    const player = this.survivors[0];
    if (player.ability1Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) return;

    player.ability1Cooldown = player.ability1MaxCooldown; // 30s
    player.currentAction = 'splashing';
    player.isSplashing = true;
    soundEngine.playHealSplash();

    setTimeout(() => {
      player.isSplashing = false;
      player.currentAction = null;
    }, 450);

    const pos = this.survivorPositions.get(player.id)!;
    const targetX = pos.x + Math.sin(pos.rotY) * 2.2;
    const targetZ = pos.z + Math.cos(pos.rotY) * 2.2;

    // Splash healing
    this.survivors.forEach((s) => {
      if (s.health === 'caged' || s.health === 'sacrificed') return;
      const sPos = this.survivorPositions.get(s.id)!;
      if (Math.hypot(sPos.x - targetX, sPos.z - targetZ) <= 3.2) {
        s.hp = Math.min(s.maxHp, s.hp + 10);
        this.addSurvivorEffect(s, {
          id: 'caretaker_regen',
          name: 'Caretaker Regen (+2 HP/s)',
          type: 'buff',
          duration: 10.0,
          maxDuration: 10.0,
          iconDoodle: 'heart',
        });
      }
    });

    // Spawn 5s healing cloud on ground
    const cloudModel = createHealingCloudModel();
    cloudModel.root.position.set(targetX, 0, targetZ);
    this.scene.add(cloudModel.root);
    this.healingClouds.push({
      id: `cloud_${Date.now()}_${Math.random()}`,
      x: targetX,
      z: targetZ,
      timeRemaining: 5.0,
      model: cloudModel,
    });

    this.spawnComicPop('HEAL SPLASH! +10 HP & REGEN', '#2ecc71');
  }

  // --- CARETAKER ABILITY 2: Smash (40s CD) ---
  // Swings bottle in front: if hits killer -> stuns killer 3s + spawns healing cloud. Else -> 0.5s endlag.
  public triggerCaretakerSmash() {
    const player = this.survivors[0];
    if (player.ability2Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) return;

    player.ability2Cooldown = player.ability2MaxCooldown; // 40s
    player.currentAction = 'smashing';

    const pos = this.survivorPositions.get(player.id)!;
    const hPos = this.hunterPosition;
    const distToHunter = Math.hypot(hPos.x - pos.x, hPos.z - pos.z);

    const angleToHunter = Math.atan2(hPos.x - pos.x, hPos.z - pos.z);
    let diff = Math.abs(angleToHunter - pos.rotY);
    while (diff > Math.PI) diff -= Math.PI * 2;

    setTimeout(() => {
      player.currentAction = null;

      if (distToHunter <= 3.0 && Math.abs(diff) < 1.3) {
        // HIT KILLER!
        this.stunHunter(3.0);
        soundEngine.playHitSplat();
        soundEngine.playHealSplash();

        // Spawn healing cloud at impact
        const cloudModel = createHealingCloudModel();
        cloudModel.root.position.set(hPos.x, 0, hPos.z);
        this.scene.add(cloudModel.root);
        this.healingClouds.push({
          id: `cloud_${Date.now()}_${Math.random()}`,
          x: hPos.x,
          z: hPos.z,
          timeRemaining: 5.0,
          model: cloudModel,
        });

        this.spawnComicPop('BOTTLE SMASH! KILLER STUNNED 3s!', '#2ecc71');
      } else {
        // MISSED KILLER -> 0.5s endlag
        player.endlagTimer = 0.5;
        soundEngine.playFlintlockMisfire();
        this.spawnComicPop('SMASH MISSED! (0.5s ENDLAG)', '#f4a261');
      }
    }, 250);
  }

  // Check building spacing (cannot stack builds)
  private canPlaceBuild(x: number, z: number, minDistance = 2.5): boolean {
    for (const s of this.sentries) {
      if (Math.hypot(s.x - x, s.z - z) < minDistance) return false;
    }
    for (const h of this.healingMachines) {
      if (Math.hypot(h.x - x, h.z - z) < minDistance) return false;
    }
    for (const p of this.bonusPads) {
      if (Math.hypot(p.x - x, p.z - z) < minDistance) return false;
    }
    for (const g of this.generators) {
      if (Math.hypot(g.x - x, g.z - z) < minDistance) return false;
    }
    return true;
  }

  // --- BUILDA MEN ABILITY 1: Sentry (50s CD after 7s build) ---
  public triggerBuildaSentry() {
    const player = this.survivors[0];
    if (player.ability1Cooldown > 0 || player.isBuilding || player.health === 'caged' || player.health === 'sacrificed') return;

    const pos = this.survivorPositions.get(player.id)!;
    if (!this.canPlaceBuild(pos.x, pos.z)) {
      this.spawnComicPop('CANNOT STACK BUILDS HERE!', '#ef233c');
      soundEngine.playFlintlockMisfire();
      return;
    }

    player.isBuilding = true;
    player.buildingTimer = 7.0; // 6-8s build time
    player.buildingType = 'sentry';
    player.currentAction = 'building';
    soundEngine.playAbilityActivate();
    this.spawnComicPop('BUILDING SENTRY... (7s)', '#f5a623');
  }

  // --- BUILDA MEN ABILITY 2: Healing Machine (40s CD after 8s build) ---
  public triggerBuildaHealingMachine() {
    const player = this.survivors[0];
    if (player.ability2Cooldown > 0 || player.isBuilding || player.health === 'caged' || player.health === 'sacrificed') return;

    const pos = this.survivorPositions.get(player.id)!;
    if (!this.canPlaceBuild(pos.x, pos.z)) {
      this.spawnComicPop('CANNOT STACK BUILDS HERE!', '#ef233c');
      soundEngine.playFlintlockMisfire();
      return;
    }

    player.isBuilding = true;
    player.buildingTimer = 8.0;
    player.buildingType = 'healing_machine';
    player.currentAction = 'building';
    soundEngine.playAbilityActivate();
    this.spawnComicPop('CONSTRUCTING DISPENSER... (8s)', '#2ecc71');
  }

  // --- BUILDA MEN ABILITY 3: Bonus Pad (45s CD after 4s build) ---
  public triggerBuildaBonusPad() {
    const player = this.survivors[0];
    if (player.ability3Cooldown > 0 || player.isBuilding || player.health === 'caged' || player.health === 'sacrificed') return;

    const pos = this.survivorPositions.get(player.id)!;
    if (!this.canPlaceBuild(pos.x, pos.z)) {
      this.spawnComicPop('CANNOT STACK BUILDS HERE!', '#ef233c');
      soundEngine.playFlintlockMisfire();
      return;
    }

    player.isBuilding = true;
    player.buildingTimer = 4.0; // speed pad from 10s down to 4s!
    player.buildingType = 'bonus_pad';
    player.currentAction = 'building';
    soundEngine.playAbilityActivate();
    this.spawnComicPop('LAYING SPEED PAD... (4s)', '#00f5d4');
  }

  // --- GAMBLING GUY ABILITY 1: Coin Flip (4s CD) ---
  // 50/50: Heads -> +1 Point (max 3), Ding!
  // Tails -> +1 Weakness stage (dmg * 1.05 per stage for 8s), Buzzer!
  public triggerGamblingCoinFlip() {
    const player = this.survivors[0];
    if (player.ability1Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) return;

    player.ability1Cooldown = player.ability1MaxCooldown; // 4s
    player.currentAction = 'coin_flip';

    setTimeout(() => {
      if (player.currentAction === 'coin_flip') player.currentAction = null;
    }, 400);

    const isHeads = Math.random() < 0.5;
    if (isHeads) {
      soundEngine.playCoinDing();
      player.gamblingPoints = Math.min(3, (player.gamblingPoints || 0) + 1);
      this.spawnComicPop(`HEADS! +1 POINT [${player.gamblingPoints}/3]`, '#ffd166');
    } else {
      soundEngine.playErrorBuzzer();
      player.weaknessStage = (player.weaknessStage || 0) + 1;
      this.weaknessTimeRemaining = 8.0;

      const bonusPct = Math.round((Math.pow(1.05, player.weaknessStage) - 1) * 100);
      this.spawnComicPop(`TAILS! WEAKNESS STAGE ${player.weaknessStage} (+${bonusPct}% DMG)`, '#ef233c');
    }
  }

  // --- GAMBLING GUY ABILITY 2: Flintlock (Consumes 1 Pt) ---
  // 1 pt: 40% shoot, 30% misfire, 30% explode (20 self-dmg, stuns killer near)
  // 2 pt: 50% shoot, 25% misfire, 25% explode
  // 3 pt: 65% shoot, 15% misfire, 20% explode
  public triggerGamblingFlintlock() {
    const player = this.survivors[0];
    if (player.ability2Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) return;

    if ((player.gamblingPoints || 0) < 1) {
      this.spawnComicPop('NEED AT LEAST 1 POINT!', '#e76f51');
      soundEngine.playFlintlockMisfire();
      return;
    }

    const pointsUsed = player.gamblingPoints;
    player.gamblingPoints -= 1;
    player.ability2Cooldown = player.ability2MaxCooldown; // 12s
    player.currentAction = 'shooting';

    setTimeout(() => {
      player.currentAction = null;
      const roll = Math.random() * 100;
      let shootChance = 40;
      let misfireChance = 30;

      if (pointsUsed === 2) {
        shootChance = 50;
        misfireChance = 25;
      } else if (pointsUsed >= 3) {
        shootChance = 65;
        misfireChance = 15;
      }

      const pos = this.survivorPositions.get(player.id)!;
      const hPos = this.hunterPosition;
      const distToHunter = Math.hypot(hPos.x - pos.x, hPos.z - pos.z);

      if (roll < shootChance) {
        // SHOOTS NORMALLY!
        soundEngine.playFlintlockBang();
        const angleToHunter = Math.atan2(hPos.x - pos.x, hPos.z - pos.z);
        let diff = Math.abs(angleToHunter - pos.rotY);
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (distToHunter <= 16 && Math.abs(diff) < 0.75) {
          this.hunter.hp = Math.max(0, this.hunter.hp - 35);
          this.stunHunter(2.0);
          soundEngine.playHitSplat();
          this.spawnComicPop('FLINTLOCK HIT! 35 DMG & 2s STUN', '#2ecc71');
        } else {
          this.spawnComicPop('BANG! SHOT FIRED', '#ffd166');
        }
      } else if (roll < shootChance + misfireChance) {
        // DOES NOT SHOOT (MISFIRE)
        soundEngine.playFlintlockMisfire();
        this.spawnComicPop('*CLICK* MISFIRE!', '#9e9e9e');
      } else {
        // EXPLODES! Deals 20 dmg to player, stuns killer if in small explosion radius (3.5m)
        soundEngine.playFlintlockBang();
        this.damageSurvivor(player, 20);
        if (distToHunter <= 3.5) {
          this.stunHunter(2.5);
          this.spawnComicPop('GUN EXPLODED! STUNNED KILLER!', '#e63946');
        } else {
          this.spawnComicPop('GUN EXPLODED! -20 HP', '#ef233c');
        }
      }
    }, 300);
  }

  // --- GAMBLING GUY ABILITY 3: Reroll Max HP (Consumes 1 Pt) ---
  public triggerGamblingReroll() {
    const player = this.survivors[0];
    if (player.ability3Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) return;

    if ((player.gamblingPoints || 0) < 1) {
      this.spawnComicPop('NEED AT LEAST 1 POINT!', '#e76f51');
      soundEngine.playFlintlockMisfire();
      return;
    }

    const points = player.gamblingPoints;
    player.gamblingPoints -= 1;
    player.ability3Cooldown = player.ability3MaxCooldown; // 10s

    let newMax = 80;
    if (points === 1) {
      newMax = Math.floor(80 + Math.random() * 51); // 80..130
    } else if (points === 2) {
      newMax = Math.floor(100 + Math.random() * 31); // 100..130
    } else {
      newMax = Math.floor(115 + Math.random() * 16); // 115..130
    }

    const oldMax = player.maxHp || 100;
    player.hp = Math.max(1, Math.round((player.hp / oldMax) * newMax));
    player.maxHp = newMax;

    soundEngine.playCoinDing();
    this.spawnComicPop(`MAX HP REROLLED: ${player.maxHp} HP!`, '#ffd166');
  }

  // --- GAMBLING GUY ABILITY 4: Change Hat (Needs 3 Pts) ---
  public triggerGamblingChangeHat() {
    const player = this.survivors[0];
    if (player.ability4Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) return;

    if ((player.gamblingPoints || 0) < 3) {
      this.spawnComicPop('NEEDS 3 POINTS TO ACTIVATE!', '#e76f51');
      soundEngine.playFlintlockMisfire();
      return;
    }

    player.gamblingPoints -= 3;
    player.ability4Cooldown = player.ability4MaxCooldown; // 15s

    const hats: GamblerHat[] = ['dimmadome', 'top_hat', 'fedora', 'beanie'];
    const currentIdx = hats.indexOf(player.currentHat || 'dimmadome');
    const nextHat = hats[(currentIdx + 1) % hats.length];
    player.currentHat = nextHat;

    const rig = this.survivorRigs.get(player.id);
    if (rig && rig.setGamblerHat) {
      rig.setGamblerHat(nextHat);
    }

    // Resets player's weakness back to 0!
    player.weaknessStage = 0;
    this.weaknessTimeRemaining = 0;

    soundEngine.playAbilityActivate();
    this.spawnComicPop(`NEW HAT: ${nextHat.toUpperCase()}! WEAKNESS PURGED TO 0!`, '#06d6a0');
  }

  // --- PROTECTOR GUY ABILITY 1: Block (25s CD) ---
  public triggerProtectorBlock() {
    const player = this.survivors[0];
    if (player.ability1Cooldown > 0 || player.isBlocking || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) return;

    player.ability1Cooldown = player.ability1MaxCooldown; // 25s
    player.isBlocking = true;
    player.blockTimer = 1.0; // 1 second stance (parries killer hit!)
    player.currentAction = 'blocking';
    soundEngine.playAbilityActivate();
    this.spawnComicPop('BLOCKING STANCE! (1s)', '#48cae4');
  }

  // --- PROTECTOR GUY ABILITY 2: Punch (35s CD, unlocked via Block) ---
  public triggerProtectorPunch() {
    const player = this.survivors[0];
    if (!player.canPunch || player.ability2Cooldown > 0 || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) {
      if (!player.canPunch) {
        this.spawnComicPop('MUST BLOCK AN ATTACK FIRST!', '#ef233c');
        soundEngine.playFlintlockMisfire();
      }
      return;
    }

    player.canPunch = false;
    player.ability2Cooldown = player.ability2MaxCooldown; // 35s
    player.currentAction = 'punching';
    soundEngine.playPunchSwing();

    const pos = this.survivorPositions.get(player.id)!;
    const hPos = this.hunterPosition;
    const distToHunter = Math.hypot(hPos.x - pos.x, hPos.z - pos.z);

    const angleToHunter = Math.atan2(hPos.x - pos.x, hPos.z - pos.z);
    let diff = Math.abs(angleToHunter - pos.rotY);
    while (diff > Math.PI) diff -= Math.PI * 2;

    setTimeout(() => {
      player.currentAction = null;
      if (distToHunter <= 2.8 && Math.abs(diff) < 1.2) {
        this.hunter.hp = Math.max(0, this.hunter.hp - 40);
        this.stunHunter(3.0);
        soundEngine.playHitSplat();
        this.spawnComicPop('HAYMAKER! 40 DMG & 3s STUN!', '#2ecc71');
      } else {
        player.endlagTimer = 0.3;
        this.spawnComicPop('PUNCH MISSED! (0.3s ENDLAG)', '#f4a261');
      }
    }, 300);
  }

  // --- PROTECTOR GUY ABILITY 3: Charge (30s CD) ---
  public triggerProtectorCharge() {
    const player = this.survivors[0];
    if (player.ability3Cooldown > 0 || player.isChargingStab || player.health === 'caged' || player.health === 'sacrificed' || player.endlagTimer > 0) return;

    player.ability3Cooldown = player.ability3MaxCooldown; // 30s
    player.isChargingStab = true;
    player.chargeStabTimer = 5.0; // 5s charge
    player.currentAction = 'charging';
    soundEngine.playAbilityActivate();
    this.spawnComicPop('CHARGING SLAM! (5s)', '#00f5d4');
  }

  // Universal dynamic survivor ability router
  public triggerSurvivorAbility(index: number) {
    const player = this.survivors[0];
    if (!player || player.health === 'caged' || player.health === 'sacrificed' || player.isRagdolled || player.endlagTimer > 0) return;

    if (player.characterClass === 'newb') {
      if (index === 1) this.triggerSurvivorDrinkSpeed();
      else if (index === 2) this.triggerSurvivorDrinkInvisibility();
    } else if (player.characterClass === 'caretaker') {
      if (index === 1) this.triggerCaretakerHeal();
      else if (index === 2) this.triggerCaretakerSmash();
    } else if (player.characterClass === 'builda_men') {
      if (index === 1) this.triggerBuildaSentry();
      else if (index === 2) this.triggerBuildaHealingMachine();
      else if (index === 3) this.triggerBuildaBonusPad();
    } else if (player.characterClass === 'gambling_guy') {
      if (index === 1) this.triggerGamblingCoinFlip();
      else if (index === 2) this.triggerGamblingFlintlock();
      else if (index === 3) this.triggerGamblingReroll();
      else if (index === 4) this.triggerGamblingChangeHat();
    } else if (player.characterClass === 'protector_guy') {
      if (index === 1) this.triggerProtectorBlock();
      else if (index === 2) this.triggerProtectorPunch();
      else if (index === 3) this.triggerProtectorCharge();
    }
  }

  private addSurvivorEffect(survivor: SurvivorData, effect: ActiveStatusEffect) {
    const existing = survivor.effects.find((e) => e.id === effect.id);
    if (existing) {
      existing.duration = effect.duration;
    } else {
      survivor.effects.push(effect);
    }
  }

  // --- BLACK SLASHER ABILITY 1: Normal Slash ---
  // 0.7s cd, deals 20 dmg, inflicts bleeding 2 dmg/s for 3s (stops at 1 HP). Raging Ink: lunges 3m, 30 dmg, 5s bleeding!
  public hunterNormalSlash() {
    // Killer CANNOT attack while stunned!
    if (this.hunter.stunTimer > 0 || this.hunter.ability1Cooldown > 0 || this.hunter.isAttacking || this.hunter.isCharging) return;
    this.hunter.ability1Cooldown = this.hunter.ability1MaxCooldown; // 0.7s
    this.hunter.isAttacking = true;
    soundEngine.playAttackSwing();

    const isRaging = this.hunter.isRagingInk;
    const damage = isRaging ? 30 : 20;
    const bleedDuration = isRaging ? 5.0 : 3.0;

    // If raging, consume Raging Ink immediately after this move!
    if (isRaging) {
      this.hunter.isRagingInk = false;
      this.hunter.ragingInkTimeRemaining = 0;
      if (this.hunterRig.setRagingEyes) this.hunterRig.setRagingEyes(false);

      const fwdX = Math.sin(this.hunterPosition.rotY) * 3.0;
      const fwdZ = Math.cos(this.hunterPosition.rotY) * 3.0;
      this.hunterPosition.x += fwdX;
      this.hunterPosition.z += fwdZ;
      this.resolveWallCollisions(this.hunterPosition, 0.7);
    }

    const hPos = this.hunterPosition;
    const hitRadius = isRaging ? 3.6 : 2.8;

    setTimeout(() => {
      // Abort if killer became stunned during windup
      if (this.hunter.stunTimer > 0) {
        this.hunter.isAttacking = false;
        return;
      }

      this.survivors.forEach((s) => {
        if (s.health === 'caged' || s.health === 'escaped' || s.health === 'sacrificed') return;
        const sPos = this.survivorPositions.get(s.id)!;
        const dist = Math.hypot(sPos.x - hPos.x, sPos.z - hPos.z);

        if (dist <= hitRadius) {
          const angleToS = Math.atan2(sPos.x - hPos.x, sPos.z - hPos.z);
          let diff = Math.abs(angleToS - hPos.rotY);
          while (diff > Math.PI) diff -= Math.PI * 2;

          if (Math.abs(diff) < 1.2) {
            // HIT! Deal damage (removed annoying screen-blocking popup)
            soundEngine.playHitSplat();
            this.stats.hitsDealt++;
            this.hunter.score += 200;

            this.damageSurvivor(s, damage);

            // Inflict Bleeding (deals 2 dmg/s for 3 or 5s, stops at 1 HP)
            this.addSurvivorEffect(s, {
              id: 'bleeding',
              name: 'Bleeding (-2 HP/s)',
              type: 'debuff',
              duration: bleedDuration,
              maxDuration: bleedDuration,
              iconDoodle: 'droplet',
            });
          }
        }
      });

      // Damage any nearby player structures (Sentries, Dispensers, Bonus Pads)
      this.damageNearbyStructures(hPos.x, hPos.z, hitRadius);
      this.hunter.isAttacking = false;
    }, 200);
  }

  // --- BLACK SLASHER ABILITY 2: Charge (30s CD) ---
  public hunterCharge() {
    // Killer CANNOT attack or charge while stunned!
    if (this.hunter.stunTimer > 0 || this.hunter.ability2Cooldown > 0 || this.hunter.isCharging) return;
    this.hunter.ability2Cooldown = this.hunter.ability2MaxCooldown; // 30s
    this.hunter.isCharging = true;
    soundEngine.playAbilityActivate();

    // If raging, consume Raging Ink immediately after this move!
    if (this.hunter.isRagingInk) {
      this.hunter.chargeTimeRemaining = 8.0;
      this.hunter.isRagingInk = false;
      this.hunter.ragingInkTimeRemaining = 0;
      if (this.hunterRig.setRagingEyes) this.hunterRig.setRagingEyes(false);
    } else {
      this.hunter.chargeTimeRemaining = 5.0;
    }
  }

  // --- BLACK SLASHER ABILITY 3: Gashing Wound (25s CD) ---
  public hunterGashingWound() {
    // Killer CANNOT attack while stunned!
    if (this.hunter.stunTimer > 0 || this.hunter.ability3Cooldown > 0 || this.hunter.isGashing) return;
    this.hunter.ability3Cooldown = this.hunter.ability3MaxCooldown; // 25s
    this.hunter.isGashing = true;
    this.hunter.gashingTimeRemaining = 1.2;
    soundEngine.playHitSplat();

    const isRaging = this.hunter.isRagingInk;
    if (isRaging) {
      // Consume Raging Ink immediately after this move!
      this.hunter.isRagingInk = false;
      this.hunter.ragingInkTimeRemaining = 0;
      if (this.hunterRig.setRagingEyes) this.hunterRig.setRagingEyes(false);
    }

    const damage = isRaging ? 50 : 40;
    const pushDist = isRaging ? 8.0 : 5.0;

    const hPos = this.hunterPosition;
    setTimeout(() => {
      // Abort if killer became stunned during windup
      if (this.hunter.stunTimer > 0) {
        this.hunter.isGashing = false;
        return;
      }

      this.survivors.forEach((s) => {
        if (s.health === 'caged' || s.health === 'escaped' || s.health === 'sacrificed') return;
        const sPos = this.survivorPositions.get(s.id)!;
        const dist = Math.hypot(sPos.x - hPos.x, sPos.z - hPos.z);

        if (dist <= 2.8) {
          // Punch combo hit! (removed annoying screen-blocking popup)
          soundEngine.playHitSplat();
          this.damageSurvivor(s, damage);

          // Push survivor away
          const pushAngle = Math.atan2(sPos.x - hPos.x, sPos.z - hPos.z);
          sPos.x += Math.sin(pushAngle) * pushDist;
          sPos.z += Math.cos(pushAngle) * pushDist;
          this.resolveWallCollisions(sPos);
        }
      });
      this.hunter.isGashing = false;
    }, 450);
  }

  // --- BLACK SLASHER ABILITY 4: Raging Ink (35s CD) ---
  public hunterRagingInk() {
    // Killer CANNOT activate while stunned!
    if (this.hunter.stunTimer > 0 || this.hunter.ability4Cooldown > 0 || this.hunter.isRagingInk) return;
    this.hunter.ability4Cooldown = this.hunter.ability4MaxCooldown; // 35s
    this.hunter.isRagingInk = true;
    this.hunter.ragingInkTimeRemaining = 35.0;
    soundEngine.playAbilityActivate();

    if (this.hunterRig.setRagingEyes) {
      this.hunterRig.setRagingEyes(true);
    }
  }

  // --- KILLER STUN & 8-SECOND FORCEFIELD IMMUNITY ---
  public stunHunter(duration: number = 1.8): boolean {
    if (this.hunter.isStunImmune) {
      soundEngine.playBlockClang();
      this.spawnComicPop('FORCEFIELD BLOCKED STUN!', '#48cae4');
      return false;
    }

    soundEngine.playHunterStunned();
    this.spawnComicPop('HUNTER STUNNED!', '#e63946');

    // Immediately cancel any active attacks, charge, or gashing!
    this.hunter.isAttacking = false;
    this.hunter.isCharging = false;
    this.hunter.isGashing = false;
    this.hunter.speed = 0;
    this.hunter.stunTimer = duration;

    // Forcefield for 8 seconds - immune to stuns!
    this.hunter.isStunImmune = true;
    this.hunter.stunImmunityTimer = 8.0;
    if (this.hunterRig.setForcefieldActive) {
      this.hunterRig.setForcefieldActive(true);
    }

    setTimeout(() => {
      if (this.hunter && this.hunter.stunTimer <= 0) {
        this.hunter.speed = 5.6;
      }
    }, duration * 1000);

    return true;
  }

  // Damage Survivor Helper (handles Protector Block stance parry & Gambling Guy Weakness multiplier)
  private damageSurvivor(survivor: SurvivorData, dmg: number) {
    // 1. Protector Guy: Block stance parries killer attack!
    if (survivor.isBlocking) {
      survivor.isBlocking = false;
      survivor.blockTimer = 0;
      survivor.canPunch = true; // Unlocks Punch!
      soundEngine.playBlockClang();
      this.spawnComicPop('PERFECT BLOCK! PUNCH ACTIVATED!', '#48cae4');
      return;
    }

    // 2. Gambling Guy: Weakness multiplier (dmg * 1.05^weaknessStage)
    let effectiveDmg = dmg;
    if (survivor.characterClass === 'gambling_guy' && (survivor.weaknessStage || 0) > 0 && this.weaknessTimeRemaining > 0) {
      effectiveDmg = Math.round(dmg * Math.pow(1.05, survivor.weaknessStage));
    }

    survivor.hp = Math.max(0, survivor.hp - effectiveDmg);

    if (survivor.hp <= 50 && survivor.health === 'healthy') {
      survivor.health = 'injured';
    }

    if (survivor.hp <= 0) {
      survivor.health = 'caged';
      this.sendSurvivorToNearestCage(survivor);
      this.spawnComicPop('SURVIVOR CAGED!', '#7209b7');
    }
  }

  // Hunter attacks destroying player structures: Sentry (2 hits), Dispenser (1 hit), Bonus Pad (1 hit)
  private damageNearbyStructures(x: number, z: number, reach = 2.8) {
    // 1. Sentries: takes 2 hits to be destroyed
    for (let i = this.sentries.length - 1; i >= 0; i--) {
      const s = this.sentries[i];
      if (Math.hypot(s.x - x, s.z - z) <= reach) {
        const remainingHits = s.model.takeHit();
        soundEngine.playHitSplat();
        if (remainingHits <= 0) {
          s.model.destroy();
          this.scene.remove(s.model.root);
          this.sentries.splice(i, 1);
          this.spawnComicPop('SENTRY DESTROYED!', '#ef233c');
        } else {
          this.spawnComicPop('SENTRY DAMAGED! (1 HIT LEFT)', '#f5a623');
        }
      }
    }

    // 2. Healing machines: takes 1 hit to be destroyed
    for (let i = this.healingMachines.length - 1; i >= 0; i--) {
      const h = this.healingMachines[i];
      if (Math.hypot(h.x - x, h.z - z) <= reach) {
        h.model.destroy();
        this.scene.remove(h.model.root);
        this.healingMachines.splice(i, 1);
        soundEngine.playHitSplat();
        this.spawnComicPop('HEALING MACHINE DESTROYED!', '#ef233c');
      }
    }

    // 3. Bonus pads: takes 1 hit to be destroyed
    for (let i = this.bonusPads.length - 1; i >= 0; i--) {
      const p = this.bonusPads[i];
      if (Math.hypot(p.x - x, p.z - z) <= reach) {
        p.model.destroy();
        this.scene.remove(p.model.root);
        this.bonusPads.splice(i, 1);
        soundEngine.playHitSplat();
        this.spawnComicPop('BONUS PAD DESTROYED!', '#ef233c');
      }
    }
  }

  private sacrificeSurvivor(survivor: SurvivorData) {
    if (survivor.health === 'sacrificed') return;
    survivor.health = 'sacrificed';
    this.stats.survivorsSacrificed++;
    soundEngine.playHitSplat();
    // Prompt: "everytime a survivor dies the timer adds 15 more seconds"
    this.matchDurationRemaining += 15;
    this.spawnComicPop('SURVIVOR SACRIFICED! +15s MATCH TIME', '#f4a261');
  }

  // --- Survivor Vault / Pallet ---
  private attemptVault() {
    const player = this.survivors[0];
    if (player.isVaulting || player.health === 'caged' || player.isRagdolled) return;
    const pPos = this.survivorPositions.get(player.id)!;

    for (const w of this.windows) {
      if (Math.hypot(w.x - pPos.x, w.z - pPos.z) < 2.4) {
        player.isVaulting = true;
        soundEngine.playVault();
        this.spawnComicPop('VAULT!', '#48cae4');

        const fwdX = Math.sin(pPos.rotY) * 3.0;
        const fwdZ = Math.cos(pPos.rotY) * 3.0;
        pPos.x += fwdX;
        pPos.z += fwdZ;

        setTimeout(() => {
          player.isVaulting = false;
        }, 600);
        return;
      }
    }

    for (const p of this.pallets) {
      if (!p.isBroken && Math.hypot(p.x - pPos.x, p.z - pPos.z) < 2.5) {
        if (!p.isDropped) {
          p.isDropped = true;
          this.stats.palletsDropped++;
          soundEngine.playPalletDrop();
          const pModel = this.palletModels.get(p.id);
          if (pModel) pModel.drop();
          this.spawnComicPop('PALLET SLAM!', '#f77f00');

          const hDist = Math.hypot(this.hunterPosition.x - p.x, this.hunterPosition.z - p.z);
          if (hDist < 2.6) {
            this.stunHunter(1.8);
          }
        } else {
          player.isVaulting = true;
          soundEngine.playVault();
          this.spawnComicPop('PALLET VAULT!', '#48cae4');
          const fwdX = Math.sin(pPos.rotY) * 2.8;
          const fwdZ = Math.cos(pPos.rotY) * 2.8;
          pPos.x += fwdX;
          pPos.z += fwdZ;
          setTimeout(() => {
            player.isVaulting = false;
          }, 650);
        }
        return;
      }
    }
  }

  // --- Survivor Item Usage ---
  private useSurvivorItem() {
    const player = this.survivors[0];
    if (player.health === 'caged' || player.health === 'sacrificed' || player.isRagdolled) return;

    if (player.item === 'flashlight' && player.itemCharges > 0) {
      player.itemCharges = Math.max(0, player.itemCharges - 20);
      const rig = this.survivorRigs.get(player.id);
      if (rig && rig.flashlightBeam) {
        rig.flashlightBeam.intensity = 8;
        setTimeout(() => {
          if (rig.flashlightBeam) rig.flashlightBeam.intensity = 4.0;
        }, 1200);
      }

      const pPos = this.survivorPositions.get(player.id)!;
      const hDist = Math.hypot(this.hunterPosition.x - pPos.x, this.hunterPosition.z - pPos.z);
      if (hDist < 8.0) {
        this.stunHunter(1.8);
        this.spawnComicPop('BLINDED! +400', '#ffd166');
      }
    } else if (player.item === 'medkit' && player.hp < 100 && player.itemCharges > 0) {
      player.itemCharges = Math.max(0, player.itemCharges - 50);
      player.hp = Math.min(100, player.hp + 50);
      if (player.hp > 50) player.health = 'healthy';
      soundEngine.playTeammateRescued();
      this.spawnComicPop('HEALED +50 HP!', '#2ecc71');
    }
  }

  private sendSurvivorToNearestCage(survivor: SurvivorData) {
    const sPos = this.survivorPositions.get(survivor.id)!;
    let closestCage = this.cages[0];
    let minDist = 999;

    this.cages.forEach((c) => {
      const d = Math.hypot(c.x - sPos.x, c.z - sPos.z);
      if (d < minDist && (!c.occupantId || c.occupantId === survivor.id)) {
        minDist = d;
        closestCage = c;
      }
    });

    closestCage.occupantId = survivor.id;
    sPos.x = closestCage.x;
    sPos.z = closestCage.z;
    survivor.cageTimeRemaining = 60;
  }

  private alertHunterNoise(pos: { x: number; z: number }) {
    if (this.userRole === 'hunter') {
      this.spawnComicPop('NOISE ALERT!', '#ef233c');
    }
  }

  public spawnComicPop(text: string, color = '#ef233c') {
    const targetPos = this.userRole === 'hunter' ? this.hunterPosition : this.survivorPositions.get(this.survivors[0].id)!;

    const sprite = createComicActionSprite(text, color);
    sprite.position.set(targetPos.x, 2.8, targetPos.z);
    this.scene.add(sprite);

    const popData: ComicPop = {
      id: Math.random().toString(),
      text,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 80,
      color,
      scale: 1,
      opacity: 1,
    };
    this.callbacks.onComicPop(popData);

    let progress = 0;
    const animInterval = setInterval(() => {
      progress += 0.05;
      sprite.position.y += 0.03;
      sprite.scale.multiplyScalar(1.02);
      if (progress >= 1.0) {
        clearInterval(animInterval);
        this.scene.remove(sprite);
      }
    }, 40);
  }

  private resolveWallCollisions(pos: { x: number; z: number }, radius = 0.5) {
    for (const b of this.wallColliders) {
      if (
        pos.x + radius > b.minX &&
        pos.x - radius < b.maxX &&
        pos.z + radius > b.minZ &&
        pos.z - radius < b.maxZ
      ) {
        const dLeft = Math.abs(pos.x + radius - b.minX);
        const dRight = Math.abs(b.maxX - (pos.x - radius));
        const dTop = Math.abs(pos.z + radius - b.minZ);
        const dBottom = Math.abs(b.maxZ - (pos.z - radius));

        const minOverlap = Math.min(dLeft, dRight, dTop, dBottom);
        if (minOverlap === dLeft) pos.x = b.minX - radius;
        else if (minOverlap === dRight) pos.x = b.maxX + radius;
        else if (minOverlap === dTop) pos.z = b.minZ - radius;
        else pos.z = b.maxZ + radius;
      }
    }
  }

  // --- Main Loop ---
  private startLoop() {
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (now: number) => {
      if (!this.isRunning) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      this.update(dt, now / 1000);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number, timeSec: number) {
    if (this.isMatchOver) return;
    this.matchTimerSec += dt;
    this.stats.matchDurationSec = Math.floor(this.matchTimerSec);

    // Countdown match timer (starts at 180s)
    this.matchDurationRemaining -= dt;

    // Check for Last Man Standing
    const aliveSurvivors = this.survivors.filter(
      (s) => s.health !== 'sacrificed' && s.health !== 'escaped'
    );

    if (aliveSurvivors.length === 1 && !this.isLastManStanding) {
      this.isLastManStanding = true;
      this.matchDurationRemaining = 60; // Set timer to 60 seconds!
      soundEngine.playLastManStanding();
      this.spawnComicPop('LAST MAN STANDING! 60s TO SURVIVE!', '#e63946');
    }

    // After half the time (<= 30s remaining), open the emergency escape gates!
    if (this.isLastManStanding && this.matchDurationRemaining <= 30 && !this.lastManGatesOpened) {
      this.lastManGatesOpened = true;
      this.escapeGates.forEach((gate) => {
        gate.isOpened = true;
        const gModel = this.gateModels.get(gate.id);
        if (gModel) {
          gModel.setPowered(true);
          gModel.openGate();
        }
      });
      soundEngine.playGateSiren();
      this.spawnComicPop('EMERGENCY GATES OPENED! ESCAPE NOW!', '#2ecc71');
    }

    // Check if match timer expired -> Killer wins
    if (this.matchDurationRemaining <= 0) {
      this.matchDurationRemaining = 0;
      this.spawnComicPop('TIME EXPIRED! KILLER DOMINATES!', '#ef233c');
      this.endMatch(this.userRole === 'survivor' ? false : true);
      return;
    }

    this.callbacks.onTimerTick?.(this.matchDurationRemaining, this.isLastManStanding);

    // 1. Update cooldowns and status effects
    this.updateStatusEffectsAndCooldowns(dt);

    // 2. Update Player & AI
    if (this.userRole === 'survivor') {
      this.updateUserSurvivor(dt);
      this.updateAIHunter(dt);
      this.updateAISurvivors(dt, 1);
    } else {
      this.updateUserHunter(dt);
      this.updateAISurvivors(dt, 0);
    }

    // 3. Objectives & Gates
    this.updateWorldObjectives(dt, timeSec);
    this.updateCustomStructures(dt);

    // 4. Scratch Marks & Trails
    this.updateScratchMarks(dt);
    this.updateTrails(dt);

    // 5. Terror Radius
    const playerPos = this.userRole === 'survivor' ? this.survivorPositions.get(this.survivors[0].id)! : this.hunterPosition;
    const terrorDist = Math.hypot(playerPos.x - this.hunterPosition.x, playerPos.z - this.hunterPosition.z);

    // If player is invisible, terror radius is silent!
    if (this.userRole === 'survivor' && this.survivors[0].isInvisible) {
      soundEngine.updateTerrorRadius(999);
      this.callbacks.onTerrorDistance(999);
    } else {
      soundEngine.updateTerrorRadius(terrorDist);
      this.callbacks.onTerrorDistance(terrorDist);
    }

    // 6. Check Win/Loss
    this.checkMatchConditions();

    // 7. Sync callbacks
    this.callbacks.onUpdateSurvivors([...this.survivors]);
    this.callbacks.onUpdateHunter({ ...this.hunter });
    this.callbacks.onUpdateGenerators([...this.generators]);
    this.callbacks.onUpdateGates([...this.escapeGates]);

    // 8. Camera follow
    this.updateCamera();
  }

  // Update Custom Survivor Deployables (Sentries, Healing Machines, Bonus Pads, Healing Clouds)
  private updateCustomStructures(dt: number) {
    const hPos = this.hunterPosition;

    // 1. Sentries: shoots every 0.2s, deals 10 dmg and slows killer. Range: 14m
    for (let i = this.sentries.length - 1; i >= 0; i--) {
      const s = this.sentries[i];
      const distToHunter = Math.hypot(hPos.x - s.x, hPos.z - s.z);
      const inRange = distToHunter <= 14;
      let targetAngle = 0;
      let isFiring = false;

      if (inRange) {
        targetAngle = Math.atan2(hPos.x - s.x, hPos.z - s.z);
        s.shootTimer += dt;
        if (s.shootTimer >= 0.2) {
          s.shootTimer = 0;
          isFiring = true;
          this.hunter.hp = Math.max(0, this.hunter.hp - 10);
          soundEngine.playPencilScratch();
          this.hunter.speed = Math.max(2.5, this.hunter.speed * 0.88);
          if (Math.random() < 0.2) {
            this.spawnComicPop('SENTRY HIT! -10 HP [SLOW]', '#f5a623');
          }
        }
      } else {
        s.shootTimer = 0;
      }
      s.model.update(dt, isFiring, targetAngle);
    }

    // 2. Healing Machines: spins around and heals everyone near 1 HP every 0.5s. Range: 4.5m
    for (let i = this.healingMachines.length - 1; i >= 0; i--) {
      const h = this.healingMachines[i];
      h.riseTimer = Math.min(1.0, h.riseTimer + dt * 0.6);
      h.model.update(dt, h.riseTimer);

      h.healTimer += dt;
      if (h.healTimer >= 0.5) {
        h.healTimer = 0;
        this.survivors.forEach((surv) => {
          if (surv.health === 'caged' || surv.health === 'sacrificed') return;
          const sPos = this.survivorPositions.get(surv.id)!;
          if (Math.hypot(sPos.x - h.x, sPos.z - h.z) <= 4.5) {
            surv.hp = Math.min(surv.maxHp, surv.hp + 1);
          }
        });
      }
    }

    // 3. Bonus Pads: boosts anyone who touches it (+20% speed for 2s, stackable uncapped)
    const now = this.matchTimerSec;
    for (let i = this.bonusPads.length - 1; i >= 0; i--) {
      const pad = this.bonusPads[i];
      pad.model.update(dt);

      this.survivors.forEach((surv) => {
        if (surv.health === 'caged' || surv.health === 'sacrificed') return;
        const sPos = this.survivorPositions.get(surv.id)!;
        if (Math.hypot(sPos.x - pad.x, sPos.z - pad.z) <= 1.4) {
          const lastBoost = pad.lastBoostTimes.get(surv.id) || -999;
          if (now - lastBoost >= 2.0) {
            pad.lastBoostTimes.set(surv.id, now);
            this.addSurvivorEffect(surv, {
              id: `pad_boost_${pad.id}_${Math.random()}`,
              name: '+20% Speed Boost',
              type: 'buff',
              duration: 2.0,
              maxDuration: 2.0,
              iconDoodle: 'zap',
              intensity: 0.20,
            });
            soundEngine.playAbilityActivate();
            if (surv.id === this.survivors[0].id) {
              this.spawnComicPop('BONUS PAD! +20% SPEED (2s)', '#00f5d4');
            }
          }
        }
      });
    }

    // 4. Healing Clouds: linger 5s, heal 2 hp/s to anyone inside
    for (let i = this.healingClouds.length - 1; i >= 0; i--) {
      const cloud = this.healingClouds[i];
      cloud.timeRemaining -= dt;
      cloud.model.update(dt, cloud.timeRemaining);

      this.survivors.forEach((surv) => {
        if (surv.health === 'caged' || surv.health === 'sacrificed') return;
        const sPos = this.survivorPositions.get(surv.id)!;
        if (Math.hypot(sPos.x - cloud.x, sPos.z - cloud.z) <= 3.2) {
          surv.hp = Math.min(surv.maxHp, surv.hp + 2 * dt);
        }
      });

      if (cloud.timeRemaining <= 0) {
        cloud.model.destroy();
        this.scene.remove(cloud.model.root);
        this.healingClouds.splice(i, 1);
      }
    }
  }

  private updateStatusEffectsAndCooldowns(dt: number) {
    if (this.weaknessTimeRemaining > 0) {
      this.weaknessTimeRemaining = Math.max(0, this.weaknessTimeRemaining - dt);
    }

    // Survivor effects & cooldowns
    this.survivors.forEach((s) => {
      if (s.ability1Cooldown > 0) s.ability1Cooldown = Math.max(0, s.ability1Cooldown - dt);
      if (s.ability2Cooldown > 0) s.ability2Cooldown = Math.max(0, s.ability2Cooldown - dt);
      if (s.ability3Cooldown > 0) s.ability3Cooldown = Math.max(0, s.ability3Cooldown - dt);
      if (s.ability4Cooldown > 0) s.ability4Cooldown = Math.max(0, s.ability4Cooldown - dt);

      if (s.isInvisible) {
        s.invisibilityTimeRemaining -= dt;
        if (s.invisibilityTimeRemaining <= 0) {
          s.isInvisible = false;
          const rig = this.survivorRigs.get(s.id);
          if (rig && rig.setTransparency) rig.setTransparency(1.0);
        }
      }

      if (s.isRagdolled) {
        s.ragdollTimer -= dt;
        if (s.ragdollTimer <= 0) s.isRagdolled = false;
      }

      // Bleeding effect tick: deals 2 dmg every 1s, stops at 1 HP! Amplified by weakness if Gambling Guy
      const bleeding = s.effects.find((e) => e.id === 'bleeding');
      if (bleeding) {
        let bleedDmg = dt * 2;
        if (s.characterClass === 'gambling_guy' && (s.weaknessStage || 0) > 0 && this.weaknessTimeRemaining > 0) {
          bleedDmg *= Math.pow(1.05, s.weaknessStage);
        }
        if (s.hp > 1) {
          s.hp = Math.max(1, s.hp - bleedDmg);
        }
        // Spawn blood trail on ground
        const pos = this.survivorPositions.get(s.id)!;
        if (Math.random() < 0.15) {
          this.bloodTrails.push({ x: pos.x, z: pos.z, timeRemaining: 6.0 });
        }
      }

      // Decrement effects
      s.effects.forEach((eff) => {
        eff.duration -= dt;
      });
      s.effects = s.effects.filter((eff) => eff.duration > 0);
    });

    // Hunter cooldowns & powers
    if (this.hunter.ability1Cooldown > 0) this.hunter.ability1Cooldown = Math.max(0, this.hunter.ability1Cooldown - dt);
    if (this.hunter.ability2Cooldown > 0) this.hunter.ability2Cooldown = Math.max(0, this.hunter.ability2Cooldown - dt);
    if (this.hunter.ability3Cooldown > 0) this.hunter.ability3Cooldown = Math.max(0, this.hunter.ability3Cooldown - dt);
    if (this.hunter.ability4Cooldown > 0) this.hunter.ability4Cooldown = Math.max(0, this.hunter.ability4Cooldown - dt);

    if (this.hunter.isCharging) {
      this.hunter.chargeTimeRemaining -= dt;
      // Leave ink trail while charging
      const trailDecay = this.hunter.isRagingInk ? 12.0 : 8.0;
      this.inkTrails.push({
        x: this.hunterPosition.x,
        z: this.hunterPosition.z,
        timeRemaining: trailDecay,
        maxTime: trailDecay,
      });

      // Catch survivor during charge: grab, scream, throw!
      this.survivors.forEach((s) => {
        if (s.health === 'caged' || s.health === 'escaped' || s.health === 'sacrificed' || s.isRagdolled) return;
        const sPos = this.survivorPositions.get(s.id)!;
        if (Math.hypot(sPos.x - this.hunterPosition.x, sPos.z - this.hunterPosition.z) < 2.5) {
          this.executeChargeGrab(s);
        }
      });

      if (this.hunter.chargeTimeRemaining <= 0) {
        this.hunter.isCharging = false;
      }
    }

    if (this.hunter.isRagingInk) {
      this.hunter.ragingInkTimeRemaining -= dt;
      if (this.hunter.ragingInkTimeRemaining <= 0) {
        this.hunter.isRagingInk = false;
        if (this.hunterRig.setRagingEyes) this.hunterRig.setRagingEyes(false);
      }
    }

    if (this.hunter.isStunImmune) {
      this.hunter.stunImmunityTimer -= dt;
      if (this.hunterRig.updateForcefield) {
        this.hunterRig.updateForcefield(this.matchTimerSec);
      }
      if (this.hunter.stunImmunityTimer <= 0) {
        this.hunter.isStunImmune = false;
        if (this.hunterRig.setForcefieldActive) {
          this.hunterRig.setForcefieldActive(false);
        }
      }
    }
  }

  // Charge Grab and Throw execution
  private executeChargeGrab(victim: SurvivorData) {
    this.hunter.isCharging = false;
    soundEngine.playHitSplat();

    const isRaging = this.hunter.isRagingInk;
    const damage = isRaging ? 35 : 30;
    this.damageSurvivor(victim, damage);

    victim.isRagdolled = true;
    victim.ragdollTimer = 1.5;

    // Throw victim forward
    const vPos = this.survivorPositions.get(victim.id)!;
    const throwAngle = this.hunterPosition.rotY;
    vPos.x += Math.sin(throwAngle) * 9.0;
    vPos.z += Math.cos(throwAngle) * 9.0;
    this.resolveWallCollisions(vPos);

    // If thrown victim hits other survivors, ragdoll for 0.5s & deal 10 hp!
    this.survivors.forEach((other) => {
      if (other.id !== victim.id && other.health !== 'caged' && other.health !== 'sacrificed') {
        const oPos = this.survivorPositions.get(other.id)!;
        if (Math.hypot(oPos.x - vPos.x, oPos.z - vPos.z) < 3.0) {
          this.damageSurvivor(other, 10);
          other.isRagdolled = true;
          other.ragdollTimer = 0.5;
        }
      }
    });
  }

  private updateUserSurvivor(dt: number) {
    const player = this.survivors[0];
    const pos = this.survivorPositions.get(player.id)!;
    const rig = this.survivorRigs.get(player.id)!;

    if (player.health === 'caged' || player.health === 'sacrificed') {
      player.cageTimeRemaining -= dt;
      if (player.cageTimeRemaining <= 0 && player.health !== 'sacrificed') {
        this.sacrificeSurvivor(player);
      }
      player.currentAction = 'Trapped in Cage';
      rig.root.position.set(pos.x, 1.2, pos.z);
      rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'caged');
      return;
    }

    if (player.isRagdolled) {
      rig.root.position.set(pos.x, 0, pos.z);
      rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'ragdoll');
      return;
    }

    if (player.isDrinking) {
      rig.root.position.set(pos.x, 0, pos.z);
      rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'drinking');
      return;
    }

    if (player.isVaulting) {
      rig.root.position.set(pos.x, 0, pos.z);
      rig.updateAnimation(this.matchTimerSec, false, false, false, true);
      return;
    }

    // 1. Endlag (e.g. from missed smash, missed punch, or expired block)
    if (player.endlagTimer > 0) {
      player.endlagTimer = Math.max(0, player.endlagTimer - dt);
      rig.root.position.set(pos.x, 0, pos.z);
      rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'idle');
      return;
    }

    // 2. Protector Guy: Blocking stance (3s stance; if unhit -> 0.5s endlag)
    if (player.isBlocking) {
      player.blockTimer -= dt;
      rig.root.position.set(pos.x, 0, pos.z);
      rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'block');
      if (player.blockTimer <= 0) {
        player.isBlocking = false;
        player.endlagTimer = 0.5; // Endlag 0.5s if killer didn't hit
        soundEngine.playFlintlockMisfire();
        this.spawnComicPop('BLOCK EXPIRED! (0.5s ENDLAG)', '#f4a261');
      }
      return;
    }

    // 3. Builda Men: Building animation (6s sentry, 8s healing machine, 10s bonus pad)
    if (player.isBuilding) {
      player.buildingTimer -= dt;
      rig.root.position.set(pos.x, 0, pos.z);
      rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'repair');
      if (player.buildingTimer <= 0) {
        player.isBuilding = false;
        const bType = player.buildingType;
        player.buildingType = null;
        player.currentAction = null;

        if (bType === 'sentry') {
          const sModel = createSentryModel();
          sModel.root.position.set(pos.x, 0, pos.z);
          this.scene.add(sModel.root);
          this.sentries.push({
            id: `sentry_${Date.now()}_${Math.random()}`,
            x: pos.x,
            z: pos.z,
            hp: 2,
            maxHp: 2,
            shootTimer: 0,
            model: sModel,
          });
          player.ability1Cooldown = 50; // 50s cooldown starts after building!
          soundEngine.playAbilityActivate();
          this.spawnComicPop('SENTRY OPERATIONAL! (50s CD)', '#f5a623');
        } else if (bType === 'healing_machine') {
          const hModel = createHealingMachineModel();
          hModel.root.position.set(pos.x, 0, pos.z);
          this.scene.add(hModel.root);
          this.healingMachines.push({
            id: `dispenser_${Date.now()}_${Math.random()}`,
            x: pos.x,
            z: pos.z,
            hp: 1,
            riseTimer: 0,
            healTimer: 0,
            model: hModel,
          });
          player.ability2Cooldown = 40; // 40s cooldown starts after building!
          soundEngine.playAbilityActivate();
          this.spawnComicPop('HEALING MACHINE ACTIVE! (40s CD)', '#2ecc71');
        } else if (bType === 'bonus_pad') {
          const pModel = createBonusPadModel();
          pModel.root.position.set(pos.x, 0, pos.z);
          this.scene.add(pModel.root);
          this.bonusPads.push({
            id: `bonuspad_${Date.now()}_${Math.random()}`,
            x: pos.x,
            z: pos.z,
            hp: 1,
            lastBoostTimes: new Map(),
            model: pModel,
          });
          player.ability3Cooldown = 45; // 45s cooldown starts after building!
          soundEngine.playAbilityActivate();
          this.spawnComicPop('BONUS PAD READY! (45s CD)', '#00f5d4');
        }
      }
      return;
    }

    // 4. Protector Guy: Charging rush (5s rush, no stamina drain/regen; hits killer to push +15 stamina, else Slowness II 5s)
    if (player.isChargingStab) {
      player.chargeStabTimer -= dt;
      const fwdX = Math.sin(pos.rotY);
      const fwdZ = Math.cos(pos.rotY);
      const chargeSpeed = player.speed * 1.85;
      pos.x += fwdX * chargeSpeed * dt;
      pos.z += fwdZ * chargeSpeed * dt;
      this.resolveWallCollisions(pos);

      // Check collision with killer
      const hDist = Math.hypot(this.hunterPosition.x - pos.x, this.hunterPosition.z - pos.z);
      if (hDist < 2.5) {
        // Hit killer! Push killer away, stun, grant +15 stamina
        this.hunterPosition.x += fwdX * 7.0;
        this.hunterPosition.z += fwdZ * 7.0;
        this.resolveWallCollisions(this.hunterPosition, 0.7);
        this.stunHunter(2.0);
        player.stamina = Math.min(100, player.stamina + 15);
        player.isChargingStab = false;
        player.chargeStabTimer = 0;
        player.currentAction = null;
        soundEngine.playHitSplat();
        this.spawnComicPop('TACKLE HIT! KILLER PUSHED! +15 STAMINA', '#00f5d4');
      } else if (player.chargeStabTimer <= 0) {
        // Expired after 5s without hitting killer -> Slowness II for 5 seconds
        player.isChargingStab = false;
        player.chargeStabTimer = 0;
        player.currentAction = null;
        this.addSurvivorEffect(player, {
          id: 'slowness_2',
          name: 'Slowness II (-40% Spd)',
          type: 'debuff',
          duration: 5.0,
          maxDuration: 5.0,
          iconDoodle: 'snail',
        });
        soundEngine.playFlintlockMisfire();
        this.spawnComicPop('CHARGE ENDED! SLOWNESS II (5s)', '#ef233c');
      }

      rig.root.position.set(pos.x, 0, pos.z);
      rig.root.rotation.y = pos.rotY;
      rig.updateAnimation(this.matchTimerSec, true, true, false, false, 'sprint');
      return;
    }

    // Directional vectors from camera (A = Left, D = Right, W = Forward, S = Backward)
    const fwdX = -Math.sin(this.cameraYaw);
    const fwdZ = Math.cos(this.cameraYaw);
    const rightX = -Math.cos(this.cameraYaw);
    const rightZ = -Math.sin(this.cameraYaw);

    let moveX = 0;
    let moveZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      moveX += fwdX;
      moveZ += fwdZ;
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      moveX -= fwdX;
      moveZ -= fwdZ;
    }

    const strafeSign = this.settings.invertStrafe ? -1 : 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      moveX -= rightX * strafeSign;
      moveZ -= rightZ * strafeSign;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      moveX += rightX * strafeSign;
      moveZ += rightZ * strafeSign;
    }

    const isMoving = moveX !== 0 || moveZ !== 0;
    player.isCrouching = !!this.keys['KeyC'];
    const wantsSprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && isMoving && !player.isCrouching;

    if (wantsSprint && player.stamina > 0) {
      player.isSprinting = true;
      player.stamina = Math.max(0, player.stamina - dt * 11); // Stamina drops much slower!
    } else {
      player.isSprinting = false;
      player.stamina = Math.min(100, player.stamina + dt * 18);
    }

    let speed = player.speed;
    // Apply speed buffs and debuffs (including uncapped stacking bonus pads)
    player.effects.forEach((eff) => {
      if (eff.id === 'speed_boost') speed *= 1.25;
      if (eff.id.startsWith('pad_boost_')) speed *= 1.20; // Uncapped stacking from Bonus Pads!
      if (eff.id === 'ink_slow') speed *= 0.65;
      if (eff.id === 'slowness_2') speed *= 0.60; // Slowness II from failed charge (-40%)
    });
    if (player.isSprinting) speed *= 1.45;
    if (player.isCrouching) speed *= 0.55;
    if (player.hp <= 50) speed *= 0.88;

    if (isMoving) {
      const mag = Math.hypot(moveX, moveZ);
      const normX = moveX / mag;
      const normZ = moveZ / mag;

      pos.x += normX * speed * dt;
      pos.z += normZ * speed * dt;
      if (!this.isShiftLock && !this.isFirstPerson) {
        pos.rotY = Math.atan2(normX, normZ);
      }

      this.resolveWallCollisions(pos);

      // Check if stepping on Ink Trail
      this.inkTrails.forEach((trail) => {
        if (Math.hypot(trail.x - pos.x, trail.z - pos.z) < 1.8) {
          this.addSurvivorEffect(player, {
            id: 'ink_slow',
            name: 'Slowed by Ink (-35%)',
            type: 'debuff',
            duration: 1.5,
            maxDuration: 1.5,
            iconDoodle: 'snail',
          });
        }
      });

      if (player.isSprinting && Math.random() < 0.2) {
        this.addScratchMark(pos.x, pos.z, pos.rotY);
      }
    }

    // Interaction checks (E key)
    player.currentAction = null;
    let actionPromptText: string | null = null;
    let isRepairingNow = false;

    for (const g of this.generators) {
      if (Math.hypot(g.x - pos.x, g.z - pos.z) < 2.5 && !g.isRepaired) {
        actionPromptText = '[E] REPAIR SKETCH ENGINE';
        if (this.keys['KeyE']) {
          isRepairingNow = true;
          player.currentAction = 'repairing';
          const repairSpeed = player.characterClass === 'engineer' ? 1.4 : 1.0;
          g.progress = Math.min(100, g.progress + dt * 8.5 * repairSpeed);
          g.isBeingRepaired = true;
          soundEngine.playPencilScratch();

          if (!this.isSkillCheckActive && performance.now() > this.skillCheckNextTime) {
            this.triggerRandomSkillCheck(g.id);
          }
        }
      }
    }

    // If player stopped repairing (let go of E or walked away), dismiss skill check immediately
    if (!isRepairingNow && this.isSkillCheckActive) {
      this.cancelSkillCheck();
    }

    for (const cage of this.cages) {
      if (cage.occupantId && cage.occupantId !== player.id) {
        if (Math.hypot(cage.x - pos.x, cage.z - pos.z) < 2.5) {
          actionPromptText = '[E] RESCUE TEAMMATE';
          if (this.keys['KeyE']) {
            const trapped = this.survivors.find((s) => s.id === cage.occupantId);
            if (trapped) {
              trapped.health = 'injured';
              trapped.hp = Math.max(35, trapped.hp);
              cage.occupantId = null;
              this.stats.rescuesMade++;
              player.score += 500;
              soundEngine.playTeammateRescued();
              this.spawnComicPop('SAVED TEAMMATE! +500', '#2ecc71');
            }
          }
        }
      }
    }

    const repGens = this.generators.filter((g) => g.isRepaired).length;
    if (repGens >= 4) {
      for (const gate of this.escapeGates) {
        if (Math.hypot(gate.x - pos.x, gate.z - pos.z) < 3.2 && !gate.isOpened) {
          actionPromptText = '[E] OPEN ESCAPE SWITCH';
          if (this.keys['KeyE']) {
            gate.leverProgress = Math.min(100, gate.leverProgress + dt * 14);
            soundEngine.playPencilScratch();
            if (gate.leverProgress >= 100) {
              gate.isOpened = true;
              const gModel = this.gateModels.get(gate.id);
              if (gModel) gModel.openGate();
              soundEngine.playGateSiren();
              this.spawnComicPop('EXIT GATE OPENED!', '#2ecc71');
            }
          }
        }

        if (gate.isOpened && Math.hypot(gate.x - pos.x, gate.z - pos.z) < 3.5) {
          player.health = 'escaped';
          this.stats.survivorsEscaped++;
          this.spawnComicPop('YOU ESCAPED!', '#2ecc71');
        }
      }
    }

    this.callbacks.onActionPrompt(actionPromptText);

    if (this.isShiftLock || this.isFirstPerson) {
      pos.rotY = -this.cameraYaw;
    }

    rig.root.position.set(pos.x, 0, pos.z);
    rig.root.rotation.y = pos.rotY;
    rig.updateAnimation(this.matchTimerSec, isMoving, player.isSprinting, player.isCrouching, false, player.currentAction);
  }

  private triggerRandomSkillCheck(genId: string) {
    this.isSkillCheckActive = true;
    this.currentSkillCheckGenId = genId;
    soundEngine.playSkillCheckWarning();

    const succStart = 45 + Math.random() * 25;
    this.skillCheckSuccessRange = [succStart, succStart + 22];
    this.skillCheckGreatRange = [succStart + 16, succStart + 22];

    this.callbacks.onSkillCheckTrigger(this.skillCheckSuccessRange, this.skillCheckGreatRange);
    this.skillCheckNextTime = performance.now() + 5000 + Math.random() * 6000;
  }

  // --- Hunter User Update ---
  private updateUserHunter(dt: number) {
    const pos = this.hunterPosition;
    const rig = this.hunterRig;

    // Fixed forward / right vectors from camera (A = Left, D = Right, W = Forward, S = Backward)
    const fwdX = -Math.sin(this.cameraYaw);
    const fwdZ = Math.cos(this.cameraYaw);
    const rightX = -Math.cos(this.cameraYaw);
    const rightZ = -Math.sin(this.cameraYaw);

    let moveX = 0;
    let moveZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      moveX += fwdX;
      moveZ += fwdZ;
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      moveX -= fwdX;
      moveZ -= fwdZ;
    }

    const strafeSign = this.settings.invertStrafe ? -1 : 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      moveX -= rightX * strafeSign;
      moveZ -= rightZ * strafeSign;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      moveX += rightX * strafeSign;
      moveZ += rightZ * strafeSign;
    }

    const isMoving = moveX !== 0 || moveZ !== 0;
    let speed = this.hunter.speed;
    if (this.hunter.isCharging) speed = 9.5; // High speed charge!
    if (this.hunter.isRagingInk) speed = 4.2; // Slowed to walking in Raging Ink!
    if (this.hunter.isGashing) speed = 0;

    if (isMoving && speed > 0) {
      const mag = Math.hypot(moveX, moveZ);
      const normX = moveX / mag;
      const normZ = moveZ / mag;

      pos.x += normX * speed * dt;
      pos.z += normZ * speed * dt;
      if (!this.isShiftLock && !this.isFirstPerson) {
        pos.rotY = Math.atan2(normX, normZ);
      }

      this.resolveWallCollisions(pos, 0.7);
    }

    let actionPromptText: string | null = null;
    for (const p of this.pallets) {
      if (p.isDropped && !p.isBroken && Math.hypot(p.x - pos.x, p.z - pos.z) < 2.6) {
        actionPromptText = '[SPACE] DESTROY PALLET';
        if (this.keys['Space']) {
          p.isBroken = true;
          const pModel = this.palletModels.get(p.id);
          if (pModel) pModel.breakPallet();
          soundEngine.playHitSplat();
          this.spawnComicPop('PALLET DESTROYED!', '#d90429');
        }
      }
    }

    this.callbacks.onActionPrompt(actionPromptText);

    // Stun handling for Hunter User: cannot move or attack while stunned!
    if (this.hunter.stunTimer > 0) {
      this.hunter.stunTimer = Math.max(0, this.hunter.stunTimer - dt);
      if (this.hunter.stunTimer === 0) {
        this.hunter.speed = 5.6;
      }
      rig.root.position.set(pos.x, 0, pos.z);
      rig.root.rotation.y = pos.rotY;
      rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'stunned');
      return;
    }

    if (this.isShiftLock || this.isFirstPerson) {
      pos.rotY = -this.cameraYaw;
    }

    rig.root.position.set(pos.x, 0, pos.z);
    rig.root.rotation.y = pos.rotY;

    let animAction: string | null = null;
    if (this.hunter.isCharging) animAction = 'charging';
    else if (this.hunter.isGashing) animAction = 'gashing';
    else if (this.hunter.isAttacking) animAction = 'attacking';

    rig.updateAnimation(this.matchTimerSec, isMoving, this.hunter.isCharging, false, false, animAction);
  }

  // --- Smart Pathfinding & Obstacle Steering for AI ---
  private isLineBlockedByWall(x1: number, z1: number, x2: number, z2: number, clearance = 0.7): boolean {
    const minX = Math.min(x1, x2) - clearance;
    const maxX = Math.max(x1, x2) + clearance;
    const minZ = Math.min(z1, z2) - clearance;
    const maxZ = Math.max(z1, z2) + clearance;

    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) return false;

    for (const b of this.wallColliders) {
      if (b.maxX < minX || b.minX > maxX || b.maxZ < minZ || b.minZ > maxZ) continue;

      const boxMinX = b.minX - clearance;
      const boxMaxX = b.maxX + clearance;
      const boxMinZ = b.minZ - clearance;
      const boxMaxZ = b.maxZ + clearance;

      let tmin = 0;
      let tmax = 1;

      if (Math.abs(dx) > 0.0001) {
        let t1 = (boxMinX - x1) / dx;
        let t2 = (boxMaxX - x1) / dx;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      } else {
        if (x1 < boxMinX || x1 > boxMaxX) continue;
      }

      if (Math.abs(dz) > 0.0001) {
        let t1 = (boxMinZ - z1) / dz;
        let t2 = (boxMaxZ - z1) / dz;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      } else {
        if (z1 < boxMinZ || z1 > boxMaxZ) continue;
      }

      return true;
    }
    return false;
  }

  // Returns optimal (dirX, dirZ) to steer towards target while clearing obstacles
  private getPathfindingDirection(
    fromX: number,
    fromZ: number,
    targetX: number,
    targetZ: number,
    clearance = 0.7
  ): { dirX: number; dirZ: number; angle: number } {
    const directDx = targetX - fromX;
    const directDz = targetZ - fromZ;
    const directDist = Math.hypot(directDx, directDz);
    if (directDist < 0.001) return { dirX: 0, dirZ: 0, angle: 0 };

    const directAngle = Math.atan2(directDx, directDz);
    const lookAheadDist = Math.min(directDist, 7.5);
    const probeX = fromX + Math.sin(directAngle) * lookAheadDist;
    const probeZ = fromZ + Math.cos(directAngle) * lookAheadDist;

    if (!this.isLineBlockedByWall(fromX, fromZ, probeX, probeZ, clearance)) {
      return {
        dirX: Math.sin(directAngle),
        dirZ: Math.cos(directAngle),
        angle: directAngle,
      };
    }

    // Direct line is obstructed -> test sensor angles radiating outward
    const candidateOffsets = [
      0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, 2.2, -2.2
    ];

    for (const offset of candidateOffsets) {
      const testAngle = directAngle + offset;
      const testDist = 4.0;
      const tx = fromX + Math.sin(testAngle) * testDist;
      const tz = fromZ + Math.cos(testAngle) * testDist;

      if (!this.isLineBlockedByWall(fromX, fromZ, tx, tz, clearance)) {
        return {
          dirX: Math.sin(testAngle),
          dirZ: Math.cos(testAngle),
          angle: testAngle,
        };
      }
    }

    return {
      dirX: Math.sin(directAngle),
      dirZ: Math.cos(directAngle),
      angle: directAngle,
    };
  }

  // --- AI Hunter Simulation (With Intelligent Pathfinding & Stun Immunity) ---
  private updateAIHunter(dt: number) {
    const hPos = this.hunterPosition;
    const rig = this.hunterRig;

    // AI Hunter Stunned Check: cannot attack, cannot move while stunned!
    if (this.hunter.stunTimer > 0) {
      this.hunter.stunTimer = Math.max(0, this.hunter.stunTimer - dt);
      if (this.hunter.stunTimer === 0) {
        this.hunter.speed = 5.6;
      }
      rig.root.position.set(hPos.x, 0, hPos.z);
      rig.root.rotation.y = hPos.rotY;
      rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'stunned');
      return;
    }

    // Find nearest visible survivor (ignore invisible survivors!)
    let targetSurvivor: SurvivorData | null = null;
    let minSurvivorDist = 999;

    this.survivors.forEach((s) => {
      if (s.health === 'caged' || s.health === 'escaped' || s.health === 'sacrificed' || s.isInvisible) return;
      const sPos = this.survivorPositions.get(s.id)!;
      const d = Math.hypot(sPos.x - hPos.x, sPos.z - hPos.z);
      if (d < minSurvivorDist) {
        minSurvivorDist = d;
        targetSurvivor = s;
      }
    });

    let targetX = 0;
    let targetZ = 0;

    if (targetSurvivor && minSurvivorDist < 26) {
      const sPos = this.survivorPositions.get((targetSurvivor as SurvivorData).id)!;
      targetX = sPos.x;
      targetZ = sPos.z;

      // Use Charge if distant and available (only if not stunned)
      if (minSurvivorDist > 8 && minSurvivorDist < 20 && this.hunter.ability2Cooldown <= 0 && this.hunter.stunTimer <= 0) {
        this.hunterCharge();
      }

      // Attack if in range (only if not stunned!)
      if (minSurvivorDist < 2.4 && this.hunter.ability1Cooldown <= 0 && this.hunter.stunTimer <= 0) {
        this.hunterNormalSlash();
      }
    } else {
      const activeGens = this.generators.filter((g) => !g.isRepaired);
      if (activeGens.length > 0) {
        const patrolGen = activeGens[Math.floor(this.matchTimerSec / 14) % activeGens.length];
        targetX = patrolGen.x;
        targetZ = patrolGen.z;
      }
    }

    const dist = Math.hypot(targetX - hPos.x, targetZ - hPos.z);
    let speed = this.hunter.speed;
    if (this.hunter.isCharging) speed = 9.5;

    if (dist > 1.2 && !this.hunter.isGashing && this.hunter.stunTimer <= 0) {
      // Intelligent Pathfinding navigation around obstacles
      const nav = this.getPathfindingDirection(hPos.x, hPos.z, targetX, targetZ, 0.7);
      const step = Math.min(dist, speed * dt);
      hPos.x += nav.dirX * step;
      hPos.z += nav.dirZ * step;
      hPos.rotY = nav.angle;
      this.resolveWallCollisions(hPos, 0.7);
    }

    rig.root.position.set(hPos.x, 0, hPos.z);
    rig.root.rotation.y = hPos.rotY;

    let animAction: string | null = null;
    if (this.hunter.isCharging) animAction = 'charging';
    else if (this.hunter.isGashing) animAction = 'gashing';
    else if (this.hunter.isAttacking) animAction = 'attacking';

    rig.updateAnimation(this.matchTimerSec, dist > 1.2 && this.hunter.stunTimer <= 0, this.hunter.isCharging, false, false, animAction);
  }

  // --- AI Survivors Simulation (With Intelligent Pathfinding) ---
  private updateAISurvivors(dt: number, startIndex: number) {
    const hPos = this.hunterPosition;

    for (let i = startIndex; i < this.survivors.length; i++) {
      const bot = this.survivors[i];
      const pos = this.survivorPositions.get(bot.id)!;
      const rig = this.survivorRigs.get(bot.id)!;

      if (bot.health === 'caged') {
        bot.cageTimeRemaining -= dt;
        if (bot.cageTimeRemaining <= 0) {
          this.sacrificeSurvivor(bot);
        }
        rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'caged');
        continue;
      }

      if (bot.health === 'escaped' || bot.health === 'sacrificed') {
        rig.root.position.set(999, 0, 999);
        continue;
      }

      if (bot.isRagdolled) {
        rig.updateAnimation(this.matchTimerSec, false, false, false, false, 'ragdoll');
        continue;
      }

      const distToHunter = Math.hypot(hPos.x - pos.x, hPos.z - pos.z);
      let targetX = pos.x;
      let targetZ = pos.z;
      let isRunningAway = false;

      if (distToHunter < 18) {
        isRunningAway = true;
        const fleeAngle = Math.atan2(pos.x - hPos.x, pos.z - hPos.z);
        targetX = pos.x + Math.sin(fleeAngle) * 12;
        targetZ = pos.z + Math.cos(fleeAngle) * 12;

        // Use invisibility if Newb
        if (bot.characterClass === 'newb' && bot.ability2Cooldown <= 0 && !bot.isInvisible) {
          bot.ability2Cooldown = 22;
          bot.isInvisible = true;
          bot.invisibilityTimeRemaining = 8.0;
          if (rig.setTransparency) rig.setTransparency(0.2);
        }
      } else {
        const cagedTeammate = this.survivors.find((s) => s.health === 'caged' && s.id !== bot.id);
        if (cagedTeammate) {
          const cPos = this.survivorPositions.get(cagedTeammate.id)!;
          targetX = cPos.x;
          targetZ = cPos.z;

          if (Math.hypot(targetX - pos.x, targetZ - pos.z) < 2.5) {
            cagedTeammate.health = 'injured';
            cagedTeammate.hp = Math.max(35, cagedTeammate.hp);
            const cage = this.cages.find((c) => c.occupantId === cagedTeammate.id);
            if (cage) cage.occupantId = null;
            this.stats.rescuesMade++;
          }
        } else {
          const repGens = this.generators.filter((g) => g.isRepaired).length;
          if (repGens >= 4) {
            const gate = this.escapeGates[0];
            targetX = gate.x;
            targetZ = gate.z;
            if (gate.isOpened && Math.hypot(gate.x - pos.x, gate.z - pos.z) < 3.2) {
              bot.health = 'escaped';
              this.stats.survivorsEscaped++;
            }
          } else {
            const myGen = this.generators[i % this.generators.length];
            if (!myGen.isRepaired) {
              targetX = myGen.x;
              targetZ = myGen.z;

              if (Math.hypot(myGen.x - pos.x, myGen.z - pos.z) < 2.4) {
                myGen.progress = Math.min(100, myGen.progress + dt * 6.5);
                myGen.isBeingRepaired = true;
                bot.currentAction = 'repairing';
              }
            }
          }
        }
      }

      const d = Math.hypot(targetX - pos.x, targetZ - pos.z);
      const isMoving = d > 1.2;

      if (isMoving) {
        // Intelligent Pathfinding navigation around obstacles
        const nav = this.getPathfindingDirection(pos.x, pos.z, targetX, targetZ, 0.6);
        const speed = isRunningAway ? bot.speed * 1.3 : bot.speed;
        const step = Math.min(d, speed * dt);
        pos.x += nav.dirX * step;
        pos.z += nav.dirZ * step;
        pos.rotY = nav.angle;
        this.resolveWallCollisions(pos);

        if (isRunningAway && Math.random() < 0.25) {
          this.addScratchMark(pos.x, pos.z, pos.rotY);
        }
      }

      rig.root.position.set(pos.x, 0, pos.z);
      rig.root.rotation.y = pos.rotY;
      rig.updateAnimation(this.matchTimerSec, isMoving, isRunningAway, false, false, bot.currentAction);
    }
  }

  // --- World Objectives ---
  private updateWorldObjectives(dt: number, timeSec: number) {
    let completedCount = 0;

    this.generators.forEach((g) => {
      const model = this.generatorModels.get(g.id);
      if (model) model.update(g.progress, timeSec);

      if (g.progress >= 100 && !g.isRepaired) {
        g.isRepaired = true;
        this.stats.generatorsCompleted++;
        soundEngine.playGeneratorDone();
        this.spawnComicPop('ENGINE ONLINE!', '#2ecc71');
      }

      if (g.isRepaired) completedCount++;
    });

    if (completedCount >= 4) {
      this.escapeGates.forEach((gate) => {
        const gModel = this.gateModels.get(gate.id);
        if (gModel) gModel.setPowered(true);
      });
    }
  }

  // --- Scratch Marks & Ink Trails Rendering ---
  private addScratchMark(x: number, z: number, angle: number) {
    this.scratchMarks.push({
      x,
      z,
      angle,
      opacity: 0.9,
      timeRemaining: 6.5,
    });
  }

  private updateScratchMarks(dt: number) {
    this.scratchMarks = this.scratchMarks.filter((sm) => {
      sm.timeRemaining -= dt;
      sm.opacity = Math.max(0, sm.timeRemaining / 6.5);
      return sm.timeRemaining > 0;
    });

    while (this.scratchMeshGroup.children.length > 0) {
      this.scratchMeshGroup.remove(this.scratchMeshGroup.children[0]);
    }

    const tex = createScratchMarkTexture();
    const planeGeo = new THREE.PlaneGeometry(1.6, 1.6);
    planeGeo.rotateX(-Math.PI / 2);

    this.scratchMarks.forEach((sm) => {
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: sm.opacity,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.position.set(sm.x, 0.05, sm.z);
      mesh.rotation.y = sm.angle;
      this.scratchMeshGroup.add(mesh);
    });
  }

  private updateTrails(dt: number) {
    // Update Ink Trails
    this.inkTrails = this.inkTrails.filter((t) => {
      t.timeRemaining -= dt;
      return t.timeRemaining > 0;
    });

    // Update Blood Trails
    this.bloodTrails = this.bloodTrails.filter((b) => {
      b.timeRemaining -= dt;
      return b.timeRemaining > 0;
    });

    while (this.trailMeshGroup.children.length > 0) {
      this.trailMeshGroup.remove(this.trailMeshGroup.children[0]);
    }

    // Render Ink Trails (black puddle decals)
    const inkGeo = new THREE.CircleGeometry(0.8, 8);
    inkGeo.rotateX(-Math.PI / 2);
    this.inkTrails.forEach((t) => {
      const alpha = Math.min(1.0, t.timeRemaining / t.maxTime);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x0a0908,
        transparent: true,
        opacity: alpha * 0.75,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(inkGeo, mat);
      mesh.position.set(t.x, 0.03, t.z);
      this.trailMeshGroup.add(mesh);
    });

    // Render Blood Trails
    const bloodGeo = new THREE.CircleGeometry(0.35, 6);
    bloodGeo.rotateX(-Math.PI / 2);
    this.bloodTrails.forEach((b) => {
      const alpha = Math.min(1.0, b.timeRemaining / 6.0);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x9e1212,
        transparent: true,
        opacity: alpha * 0.65,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(bloodGeo, mat);
      mesh.position.set(b.x, 0.04, b.z);
      this.trailMeshGroup.add(mesh);
    });
  }

  // --- Camera Update (Supports First Person & Roblox Shiftlock) ---
  private updateCamera() {
    const targetPos = this.userRole === 'survivor' ? this.survivorPositions.get(this.survivors[0].id)! : this.hunterPosition;

    // 1. First Person Camera Mode
    if (this.isFirstPerson) {
      const isCrouching = this.userRole === 'survivor' && this.survivors[0]?.isCrouching;
      const eyeHeight = isCrouching ? 0.95 : 1.55;

      this.camera.position.set(targetPos.x, eyeHeight, targetPos.z);

      const lookDist = 12.0;
      const lx = targetPos.x - Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * lookDist;
      const ly = eyeHeight - Math.sin(this.cameraPitch) * lookDist;
      const lz = targetPos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * lookDist;
      this.camera.lookAt(lx, ly, lz);

      // Hide local character's head so it doesn't clip into camera view
      if (this.userRole === 'survivor') {
        const myRig = this.survivorRigs.get(this.survivors[0].id);
        if (myRig?.head) myRig.head.visible = false;
      } else if (this.hunterRig?.head) {
        this.hunterRig.head.visible = false;
      }
      return;
    }

    // Restore head visibility if leaving First Person
    if (this.userRole === 'survivor') {
      const myRig = this.survivorRigs.get(this.survivors[0].id);
      if (myRig?.head && !myRig.head.visible) myRig.head.visible = true;
    } else if (this.hunterRig?.head && !this.hunterRig.head.visible) {
      this.hunterRig.head.visible = true;
    }

    // 2. Roblox Shiftlock Shoulder Camera
    if (this.isShiftLock) {
      const shoulderOffset = 0.65;
      const shoulderRightX = -Math.cos(this.cameraYaw) * shoulderOffset;
      const shoulderRightZ = -Math.sin(this.cameraYaw) * shoulderOffset;

      const targetX = targetPos.x + shoulderRightX;
      const targetY = 1.45;
      const targetZ = targetPos.z + shoulderRightZ;

      const cx = targetX + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * 3.4;
      const cy = targetY + Math.sin(this.cameraPitch) * 3.4;
      const cz = targetZ - Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * 3.4;

      this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.35);

      const lookDist = 15.0;
      const lx = targetX - Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * lookDist;
      const ly = targetY - Math.sin(this.cameraPitch) * lookDist;
      const lz = targetZ + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * lookDist;
      this.camera.lookAt(lx, ly, lz);
      return;
    }

    // 3. Standard Third-Person Orbit Camera
    const cx = targetPos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const cy = 1.6 + Math.sin(this.cameraPitch) * this.cameraDistance;
    const cz = targetPos.z - Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.25);
    this.camera.lookAt(targetPos.x, 1.6, targetPos.z);
  }

  private checkMatchConditions() {
    const escapedCount = this.survivors.filter((s) => s.health === 'escaped').length;
    const sacrificedCount = this.survivors.filter((s) => s.health === 'sacrificed').length;

    if (escapedCount + sacrificedCount === 4 || this.survivors[0].health === 'escaped' || this.survivors[0].health === 'sacrificed') {
      this.endMatch(this.userRole === 'survivor' ? escapedCount > 0 : sacrificedCount >= 3);
    }
  }

  private endMatch(victory: boolean) {
    if (this.isMatchOver) return;
    this.isMatchOver = true;
    soundEngine.resetMatchAudio();

    this.stats.xpEarned = victory ? 2400 : 1100;
    this.stats.inkDropletsEarned = victory ? 120 : 45;

    this.callbacks.onMatchEnd(victory, this.stats);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.isRunning = false;
    soundEngine.resetMatchAudio();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.ws) this.ws.close();

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
