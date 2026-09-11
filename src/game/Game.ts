import * as THREE from 'three';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, GameState, GameMode, EnemyType, TileType, PowerUpType, DeathType, StageDefinition, STAGE_DEFINITIONS } from './constants';
import { Grid } from './Grid';
import { AssetLoader } from './AssetLoader';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { UIManager } from './UIManager';
import { Arena } from './Arena';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Bomb } from './Bomb';
import { Explosion } from './Explosion';
import { RivalAI } from './RivalAI';

export class Game {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Game Systems
  private grid: Grid;
  private assets: AssetLoader;
  private audio: AudioManager;
  private input: InputManager;
  private ui: UIManager;
  private arena: Arena;

  // Lighting
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private dirLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private rimLightMagenta: THREE.DirectionalLight;
  private explosionLight: THREE.PointLight;

  // Entities
  private player: Player | null = null;
  private player2: Player | null = null;
  private rivalAI: RivalAI | null = null;
  private enemies: Enemy[] = [];
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];

  // State
  private state: GameState = GameState.LOADING;
  private currentMode: GameMode = GameMode.CLASSIC;
  private cameraBasePos: THREE.Vector3 = new THREE.Vector3(0, 23.5, 15.2);
  private cameraLookTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0.8);
  private cameraShakeIntensity: number = 0;
  private isLoopRunning: boolean = false;
  private hasShownLossModal: boolean = false;

  private currentStageIndex: number = 0;
  private savedPlayerStats = {
    maxBombs: 1,
    blastRange: 1,
    speed: 4.8,
  };

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Core Three.js Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0d14);
    this.scene.fog = new THREE.FogExp2(0x0a0d14, 0.015);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 200);
    this.camera.position.copy(this.cameraBasePos);
    this.camera.lookAt(this.cameraLookTarget);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    // 2. Initialize Lighting (Warm, stylized arcade palette to prevent cold metallic 'inox' look)
    this.ambientLight = new THREE.AmbientLight(0x2d3748, 0.75);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1035, 0.85);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff2d4, 2.2);
    this.dirLight.position.set(14, 30, 18);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 5;
    this.dirLight.shadow.camera.far = 70;
    const d = 19;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0004;
    this.scene.add(this.dirLight);

    // Primary Cyan Rim Light (back-left angle for crisp edge definition)
    this.rimLight = new THREE.DirectionalLight(0x00f5d4, 1.4);
    this.rimLight.position.set(-18, 22, -18);
    this.scene.add(this.rimLight);

    // Complementary Magenta Rim Light (back-right angle for rich neon depth)
    this.rimLightMagenta = new THREE.DirectionalLight(0xff007f, 1.1);
    this.rimLightMagenta.position.set(18, 20, -18);
    this.scene.add(this.rimLightMagenta);

    // Dynamic explosion point light
    this.explosionLight = new THREE.PointLight(0xff6600, 0, 18);
    this.scene.add(this.explosionLight);

    // 3. Initialize Game Architecture
    this.grid = new Grid(GRID_COLS, GRID_ROWS, CELL_SIZE);
    this.assets = new AssetLoader();
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.ui = new UIManager(this.input);
    this.arena = new Arena(this.scene, this.grid, this.assets);

    this.ui.setOnStartMode((mode: GameMode) => this.startMode(mode));
    this.ui.setOnOpenModeMenu(() => this.openModeSelect());

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  public async init(): Promise<void> {
    this.assets.setProgressCallback((progress, assetKey) => {
      this.ui.updateLoading(progress, assetKey);
    });

    await this.assets.loadAll();
    this.ui.hideLoading();

    // Prepare ambient arena and open AAA start screen / mode selector
    this.openModeSelect();

    if (!this.isLoopRunning) {
      this.isLoopRunning = true;
      this.clock.start();
      this.animate();
    }
  }

  public openModeSelect(): void {
    this.cleanupGameObjects();
    this.state = GameState.MENU;
    const stageDef = STAGE_DEFINITIONS[0];
    this.applyStageAtmosphere(stageDef);
    this.arena.generate(stageDef);
    this.resetCamera();
    this.ui.showModeSelector();
  }

  public startMode(mode: GameMode): void {
    this.currentMode = mode;
    this.ui.hideModeSelector();

    if (mode === GameMode.CLASSIC) {
      this.startStage(0, false);
    } else if (mode === GameMode.VS_CPU) {
      this.startVsCpu();
    } else if (mode === GameMode.LOCAL_2P) {
      this.startLocal2P();
    }
  }

  private startVsCpu(): void {
    this.cleanupGameObjects();
    const stageDef = STAGE_DEFINITIONS[0];
    this.applyStageAtmosphere(stageDef);
    this.arena.generate(stageDef);

    // 1. Spawn Player 1 (Cyan) at (1, 1)
    const p1Mesh = this.assets.cloneModel('player');
    this.player = new Player(1, 1, p1Mesh, this.grid, this.audio, this.scene, this.assets, false);

    // 2. Spawn Rival Bot (Crimson Obsidian) at (cols - 2, rows - 2)
    const rivalMesh = this.assets.cloneModel('player-rival');
    this.player2 = new Player(
      this.grid.cols - 2,
      this.grid.rows - 2,
      rivalMesh,
      this.grid,
      this.audio,
      this.scene,
      this.assets,
      true
    );

    // 3. Spawn Small Robot Enemies
    this.spawnEnemiesForVsCpu(stageDef);

    // 4. Initialize Tactical Rival AI
    this.rivalAI = new RivalAI(
      this.player2,
      this.player,
      this.grid,
      () => this.bombs,
      () => this.explosions,
      () => this.enemies,
      () => this.arena.getPowerUps().map(p => ({ col: p.col, row: p.row })),
      () => {
        if (this.player2) {
          this.tryPlaceBombForPlayer(this.player2);
        }
      }
    );

    this.cameraShakeIntensity = 0;
    this.resetCamera();
    this.hasShownLossModal = false;
    this.state = GameState.PLAYING;
    this.ui.updateStageDisplay(1, 'VS COMPUTER', 'cyber');
    this.ui.showStateModal(GameState.PLAYING);
  }

  private startLocal2P(): void {
    this.cleanupGameObjects();
    const stageDef = STAGE_DEFINITIONS[0];
    this.applyStageAtmosphere(stageDef);
    this.arena.generate(stageDef);

    // 1. Spawn Player 1 (Cyan) at (1, 1)
    const p1Mesh = this.assets.cloneModel('player');
    this.player = new Player(1, 1, p1Mesh, this.grid, this.audio, this.scene, this.assets, false);

    // 2. Spawn Player 2 (Crimson) at (cols - 2, rows - 2)
    const p2Mesh = this.assets.cloneModel('player-rival');
    this.player2 = new Player(
      this.grid.cols - 2,
      this.grid.rows - 2,
      p2Mesh,
      this.grid,
      this.audio,
      this.scene,
      this.assets,
      true
    );

    this.rivalAI = null;
    this.cameraShakeIntensity = 0;
    this.resetCamera();
    this.hasShownLossModal = false;
    this.state = GameState.PLAYING;
    this.ui.updateStageDisplay(1, 'LOCAL SHOWDOWN', 'cyber');
    this.ui.showStateModal(GameState.PLAYING);
  }

  private resetCamera(): void {
    this.camera.position.copy(this.cameraBasePos);
    this.camera.lookAt(this.cameraLookTarget);
  }

  private applyStageAtmosphere(stageDef: StageDefinition): void {
    this.scene.background = new THREE.Color(stageDef.backgroundColor);
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.setHex(stageDef.fogColor);
    }
    this.ambientLight.color.setHex(stageDef.ambientColor);
    this.hemiLight.color.setHex(stageDef.hemiSkyColor);
    this.hemiLight.groundColor.setHex(stageDef.hemiGroundColor);
    this.dirLight.color.setHex(stageDef.dirLightColor);
    this.rimLight.color.setHex(stageDef.rimLight1Color);
    this.rimLightMagenta.color.setHex(stageDef.rimLight2Color);
  }

  private startStage(stageIndex: number, carryOverStats: boolean = false): void {
    this.currentStageIndex = Math.max(0, Math.min(STAGE_DEFINITIONS.length - 1, stageIndex));
    const stageDef = STAGE_DEFINITIONS[this.currentStageIndex];

    // 1. Clean existing entities
    this.cleanupGameObjects();

    // 2. Set atmosphere & lighting
    this.applyStageAtmosphere(stageDef);

    // 3. Build arena layout with stage theme
    this.arena.generate(stageDef);

    // 4. Spawn Player at (1, 1)
    const playerMesh = this.assets.cloneModel('player');
    this.player = new Player(1, 1, playerMesh, this.grid, this.audio, this.scene, this.assets);

    if (carryOverStats) {
      this.player.maxBombs = this.savedPlayerStats.maxBombs;
      this.player.blastRange = this.savedPlayerStats.blastRange;
      this.player.speed = this.savedPlayerStats.speed;
    } else {
      this.savedPlayerStats = {
        maxBombs: 1,
        blastRange: 1,
        speed: 4.8,
      };
    }

    // 5. Spawn Enemies according to stage definition
    this.spawnEnemies(stageDef);

    // 6. Reset camera & UI
    this.cameraShakeIntensity = 0;
    this.resetCamera();
    this.hasShownLossModal = false;
    this.state = GameState.PLAYING;
    this.ui.updateStageDisplay(stageDef.id, stageDef.name, stageDef.theme);
    this.ui.showStateModal(GameState.PLAYING);
  }

  private nextStage(): void {
    if (this.player) {
      this.savedPlayerStats = {
        maxBombs: this.player.maxBombs,
        blastRange: this.player.blastRange,
        speed: this.player.speed,
      };
    }
    this.startStage(this.currentStageIndex + 1, true);
  }

  private retryStage(): void {
    this.startStage(this.currentStageIndex, true);
  }

  private restartCampaign(): void {
    this.startStage(0, false);
  }

  private spawnEnemies(stageDef: StageDefinition): void {
    const spawnPositions = [
      { col: this.grid.cols - 2, row: 1 },                  // top-right
      { col: 1, row: this.grid.rows - 2 },                  // bottom-left
      { col: this.grid.cols - 2, row: this.grid.rows - 2 }, // bottom-right
      { col: 7, row: 1 },                                   // top-middle
      { col: this.grid.cols - 2, row: 5 },                  // right-middle
      { col: 5, row: this.grid.rows - 2 },                  // bottom-middle
    ];

    let posIdx = 0;
    for (const spec of stageDef.enemies) {
      for (let count = 0; count < spec.count; count++) {
        const pos = spawnPositions[posIdx % spawnPositions.length];
        posIdx++;

        let modelKey = 'enemy-scout';
        if (spec.type === EnemyType.HUNTER) modelKey = 'enemy-hunter';
        else if (spec.type === EnemyType.BLITZ) modelKey = 'enemy-blitz';
        else if (spec.type === EnemyType.PHANTOM) modelKey = 'enemy-phantom';

        const enemyMesh = this.assets.cloneModel(modelKey);
        const cuckooDeath = this.assets.cloneModel('enemy-death');
        const rocketDeath = this.assets.cloneModel('enemy-death-rocket');

        this.scene.add(enemyMesh);
        const enemy = new Enemy(
          spec.type,
          pos.col,
          pos.row,
          enemyMesh,
          this.grid,
          this.audio,
          cuckooDeath,
          rocketDeath
        );
        this.enemies.push(enemy);
      }
    }
  }

  private spawnEnemiesForVsCpu(stageDef: StageDefinition): void {
    const spawnPositions = [
      { col: this.grid.cols - 2, row: 1 },                  // top-right
      { col: 1, row: this.grid.rows - 2 },                  // bottom-left
      { col: 7, row: 1 },                                   // top-middle
      { col: this.grid.cols - 2, row: 5 },                  // right-middle
      { col: 5, row: this.grid.rows - 2 },                  // bottom-middle
    ];

    let posIdx = 0;
    for (const spec of stageDef.enemies) {
      for (let count = 0; count < spec.count; count++) {
        const pos = spawnPositions[posIdx % spawnPositions.length];
        posIdx++;

        let modelKey = 'enemy-scout';
        if (spec.type === EnemyType.HUNTER) modelKey = 'enemy-hunter';
        else if (spec.type === EnemyType.BLITZ) modelKey = 'enemy-blitz';
        else if (spec.type === EnemyType.PHANTOM) modelKey = 'enemy-phantom';

        const enemyMesh = this.assets.cloneModel(modelKey);
        const cuckooDeath = this.assets.cloneModel('enemy-death');
        const rocketDeath = this.assets.cloneModel('enemy-death-rocket');

        this.scene.add(enemyMesh);
        const enemy = new Enemy(
          spec.type,
          pos.col,
          pos.row,
          enemyMesh,
          this.grid,
          this.audio,
          cuckooDeath,
          rocketDeath
        );
        this.enemies.push(enemy);
      }
    }
  }

  private cleanupGameObjects(): void {
    // Clear arena & powerups
    this.arena.clear();

    // Clear Player 1
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }

    // Clear Player 2 / Rival
    if (this.player2) {
      this.player2.dispose();
      this.player2 = null;
    }
    this.rivalAI = null;

    // Clear enemies
    for (const e of this.enemies) {
      e.dispose(this.scene);
    }
    this.enemies = [];

    // Clear bombs
    for (const b of this.bombs) {
      b.dispose(this.scene);
    }
    this.bombs = [];

    // Clear explosions
    for (const ex of this.explosions) {
      ex.cleanup();
    }
    this.explosions = [];
  }

  private handleInput(): void {
    // Menu navigation when Mode Selector is open
    if (this.state === GameState.MENU) {
      if (this.input.consumeMenuUp()) {
        this.ui.navigateMode(-1);
      }
      if (this.input.consumeMenuDown()) {
        this.ui.navigateMode(1);
      }
      if (this.input.consumeMenuSelect()) {
        this.ui.confirmStart();
      }
      return;
    }

    // Return to Mode Selection menu anytime with 'M'
    if (this.input.consumeModeMenu()) {
      this.openModeSelect();
      return;
    }

    // Mute toggle
    if (this.input.consumeMute()) {
      const isMuted = this.audio.toggleMute();
      this.ui.setMuteIcon(isMuted);
    }

    // Restart / Progression toggle
    if (this.input.consumeRestart()) {
      if (this.currentMode === GameMode.CLASSIC) {
        if (this.state === GameState.WON) {
          if (this.currentStageIndex < STAGE_DEFINITIONS.length - 1) {
            this.nextStage();
          } else {
            this.restartCampaign();
          }
        } else {
          this.retryStage();
        }
      } else if (this.currentMode === GameMode.VS_CPU) {
        this.startVsCpu();
      } else if (this.currentMode === GameMode.LOCAL_2P) {
        this.startLocal2P();
      }
      return;
    }

    // Pause toggle
    if (this.input.consumePause()) {
      if (this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
        this.ui.showStateModal(GameState.PAUSED);
      } else if (this.state === GameState.PAUSED) {
        this.state = GameState.PLAYING;
        this.ui.showStateModal(GameState.PLAYING);
      }
    }

    // Bomb placement for Player 1
    if (this.state === GameState.PLAYING && this.player && this.player.isAlive) {
      if (this.input.consumeBomb()) {
        this.tryPlaceBombForPlayer(this.player);
      }
    }

    // Bomb placement for Player 2 (Local Showdown)
    if (this.state === GameState.PLAYING && this.currentMode === GameMode.LOCAL_2P && this.player2 && this.player2.isAlive) {
      if (this.input.consumeP2Bomb()) {
        this.tryPlaceBombForPlayer(this.player2);
      }
    }
  }

  private tryPlaceBombForPlayer(p: Player): void {
    if (!p || !p.isAlive) return;

    // Ground truth live bomb count
    const liveBombs = this.bombs.filter(b => b.owner === p && !b.isDetonated).length;
    p.activeBombs = liveBombs;
    if (liveBombs >= p.maxBombs) return;

    const { col, row } = p.getGridCoords();
    if (this.grid.getTile(col, row) === TileType.BOMB) return;

    // Place Bomb
    this.grid.setTile(col, row, TileType.BOMB);
    p.activeBombs = liveBombs + 1;
    p.activeBombTile = { col, row };
    p.triggerBombPlant();

    const bombMesh = this.assets.cloneModel('bomb');
    this.scene.add(bombMesh);

    const bomb = new Bomb(col, row, p.blastRange, bombMesh, this.grid, this.audio, p);
    this.bombs.push(bomb);
  }

  private detonateBomb(bomb: Bomb): void {
    const col = bomb.col;
    const row = bomb.row;
    const range = bomb.blastRange;

    // Remove bomb
    bomb.dispose(this.scene);
    this.grid.setTile(col, row, TileType.EMPTY);
    if (bomb.owner) {
      bomb.owner.activeBombs = Math.max(0, bomb.owner.activeBombs - 1);
    } else if (this.player) {
      this.player.activeBombs = Math.max(0, this.player.activeBombs - 1);
    }

    // Visceral camera shake punch
    this.cameraShakeIntensity = Math.min(0.9, this.cameraShakeIntensity + 0.55);

    // Light flash
    const burstPos = this.grid.gridToWorld(col, row, 1.2);
    this.explosionLight.position.copy(burstPos);
    this.explosionLight.intensity = 12.0;

    // Create Explosion
    const explosion = new Explosion(
      col,
      row,
      range,
      this.scene,
      this.grid,
      this.assets,
      this.audio,
      (blockCol, blockRow) => {
        this.arena.destroyBlock(blockCol, blockRow);
      },
      (chainedCol, chainedRow) => {
        // Find chained bomb
        const chainedBomb = this.bombs.find(b => b.col === chainedCol && b.row === chainedRow && !b.isDetonated);
        if (chainedBomb) {
          chainedBomb.forceDetonate();
        }
      }
    );

    this.explosions.push(explosion);
  }

  private update(delta: number): void {
    this.handleInput();

    if (this.state === GameState.MENU) {
      this.resetCamera();
      return;
    }

    if (this.state !== GameState.PLAYING && this.state !== GameState.WON && this.state !== GameState.LOST) {
      return;
    }

    // 1. Update Camera Shake
    if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - delta * 1.6);
      const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity * 1.2;
      const shakeZ = (Math.random() - 0.5) * this.cameraShakeIntensity * 1.2;
      this.camera.position.set(
        this.cameraBasePos.x + shakeX,
        this.cameraBasePos.y,
        this.cameraBasePos.z + shakeZ
      );
      this.camera.lookAt(this.cameraLookTarget);
    } else {
      this.camera.position.copy(this.cameraBasePos);
      this.camera.lookAt(this.cameraLookTarget);
    }

    // Dim explosion dynamic light
    if (this.explosionLight.intensity > 0) {
      this.explosionLight.intensity = Math.max(0, this.explosionLight.intensity - delta * 14.0);
    }

    // 2. Update Player 1
    if (this.player) {
      const isStrict = this.currentMode === GameMode.LOCAL_2P;
      const moveInput = (this.state === GameState.PLAYING) ? this.input.getMovement(isStrict) : null;
      this.player.update(delta, moveInput);

      // Check if player touched active fire
      if (this.player.isAlive) {
        const pGrid = this.player.getGridCoords();
        if (this.grid.hasFire(pGrid.col, pGrid.row)) {
          this.player.kill(DeathType.FIRE);
          if (this.currentMode === GameMode.CLASSIC) {
            this.state = GameState.LOST;
          }
        }
      }
    }

    // 3. Update Player 2 / Rival Bot
    if (this.player2) {
      let p2Move: { x: number; z: number } | null = null;
      if (this.state === GameState.PLAYING) {
        if (this.currentMode === GameMode.VS_CPU && this.rivalAI) {
          p2Move = this.rivalAI.update(delta);
        } else if (this.currentMode === GameMode.LOCAL_2P) {
          p2Move = this.input.getP2Movement();
        }
      }
      this.player2.update(delta, p2Move);

      // Check if player 2 / rival touched active fire
      if (this.player2.isAlive) {
        const p2Grid = this.player2.getGridCoords();
        if (this.grid.hasFire(p2Grid.col, p2Grid.row)) {
          this.player2.kill(DeathType.FIRE);
        }
      }
    }

    // 4. Update Bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      const exploded = bomb.update(delta, this.scene);
      if (exploded) {
        this.bombs.splice(i, 1);
        this.detonateBomb(bomb);
      }
    }

    // 5. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      const finished = ex.update(delta);
      if (finished) {
        this.explosions.splice(i, 1);
      }
    }

    // 6. Update Arena (Debris & Powerups for both players)
    const secondaryCollector = (this.player2 && this.player2.isAlive) ? {
      pos: this.player2.position,
      onCollect: (type: PowerUpType) => {
        if (this.player2) {
          this.player2.applyPowerUp(type);
          this.audio.playPowerUp();
        }
      }
    } : undefined;

    this.arena.update(
      delta,
      this.player?.position,
      (type: PowerUpType) => {
        if (this.player) {
          this.player.applyPowerUp(type);
          this.audio.playPowerUp();
          const maxVal = (type === PowerUpType.BLAST_RANGE) ? 7 : (type === PowerUpType.BOMB_COUNT ? 6 : 6);
          const curVal = (type === PowerUpType.BLAST_RANGE) ? this.player.blastRange : (type === PowerUpType.BOMB_COUNT ? this.player.maxBombs : Math.round((this.player.speed - 4.8) / 0.8) + 1);
          this.ui.triggerPowerUpFeedback(type, curVal, maxVal);
        }
      },
      secondaryCollector
    );

    // 7. Update Enemies (Classic Mode and Vs CPU)
    let activeEnemiesCount = 0;
    if (this.currentMode === GameMode.CLASSIC || this.currentMode === GameMode.VS_CPU) {
      const p1Alive = this.player && this.player.isAlive;
      const p2Alive = this.player2 && this.player2.isAlive;

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];

        // Target closest living combatant between Player 1 and Rival
        let targetCoords = { col: 1, row: 1 };
        if (p1Alive && p2Alive) {
          const p1Coords = this.player!.getGridCoords();
          const p2Coords = this.player2!.getGridCoords();
          const dist1 = Math.abs(enemy.col - p1Coords.col) + Math.abs(enemy.row - p1Coords.row);
          const dist2 = Math.abs(enemy.col - p2Coords.col) + Math.abs(enemy.row - p2Coords.row);
          targetCoords = dist1 <= dist2 ? p1Coords : p2Coords;
        } else if (p1Alive) {
          targetCoords = this.player!.getGridCoords();
        } else if (p2Alive) {
          targetCoords = this.player2!.getGridCoords();
        }

        enemy.update(delta, targetCoords);

        if (enemy.isAlive) {
          activeEnemiesCount++;

          // Collision check with Player 1
          if (p1Alive && this.state === GameState.PLAYING) {
            const dx1 = this.player!.position.x - enemy.mesh.position.x;
            const dz1 = this.player!.position.z - enemy.mesh.position.z;
            if (dx1 * dx1 + dz1 * dz1 < 0.95) {
              this.player!.kill(DeathType.ENEMY);
              if (this.currentMode === GameMode.CLASSIC) {
                this.state = GameState.LOST;
              }
            }
          }

          // Collision check with Rival Bot / Player 2
          if (p2Alive && this.state === GameState.PLAYING) {
            const dx2 = this.player2!.position.x - enemy.mesh.position.x;
            const dz2 = this.player2!.position.z - enemy.mesh.position.z;
            if (dx2 * dx2 + dz2 * dz2 < 0.95) {
              this.player2!.kill(DeathType.ENEMY);
            }
          }
        } else if (!enemy.isDying) {
          enemy.dispose(this.scene);
          this.enemies.splice(i, 1);
        }
      }
    }

    // 8. Victory / Defeat Check per Mode
    if (this.currentMode === GameMode.CLASSIC) {
      // Classic Mode Win
      if (this.state === GameState.PLAYING && activeEnemiesCount === 0 && this.enemies.length === 0) {
        this.state = GameState.WON;
        this.audio.playVictory();
        const isCampaignComplete = this.currentStageIndex >= STAGE_DEFINITIONS.length - 1;
        const nextStageName = isCampaignComplete ? undefined : STAGE_DEFINITIONS[this.currentStageIndex + 1].name;
        this.ui.configureVictoryModal(isCampaignComplete, this.currentStageIndex + 1, nextStageName);
        this.ui.showStateModal(GameState.WON);
      }

      // Classic Mode Loss
      if (this.state === GameState.LOST && !this.hasShownLossModal) {
        if (this.player && !this.player.isDying) {
          this.hasShownLossModal = true;
          this.ui.showStateModal(GameState.LOST);
        }
      }
    } else if (this.currentMode === GameMode.VS_CPU) {
      // Vs Computer Loss: Player 1 defeated
      if (this.state === GameState.PLAYING && this.player && !this.player.isAlive) {
        this.state = GameState.LOST;
      }
      // Vs Computer Win: Rival Bot destroyed! Ends the round immediately
      if (
        this.state === GameState.PLAYING &&
        this.player &&
        this.player.isAlive &&
        this.player2 &&
        !this.player2.isAlive
      ) {
        this.state = GameState.WON;
      }

      if (this.state === GameState.WON && !this.hasShownLossModal) {
        const rivalDone = !this.player2 || !this.player2.isDying;
        if (rivalDone) {
          this.hasShownLossModal = true;
          this.audio.playVictory();
          this.ui.configureVersusVictory('p1');
          this.ui.showStateModal(GameState.WON);
        }
      } else if (this.state === GameState.LOST && !this.hasShownLossModal) {
        if (!this.player?.isDying) {
          this.hasShownLossModal = true;
          this.ui.configureVersusDefeat(true);
          this.ui.showStateModal(GameState.LOST);
        }
      }
    } else if (this.currentMode === GameMode.LOCAL_2P) {
      const p1Alive = this.player?.isAlive ?? false;
      const p2Alive = this.player2?.isAlive ?? false;

      if (this.state === GameState.PLAYING && (!p1Alive || !p2Alive)) {
        this.state = GameState.WON;
      }

      if (this.state === GameState.WON && !this.hasShownLossModal) {
        const p1Done = !this.player || !this.player.isDying;
        const p2Done = !this.player2 || !this.player2.isDying;
        if (p1Done && p2Done) {
          this.hasShownLossModal = true;
          this.audio.playVictory();
          if (!p1Alive && !p2Alive) {
            this.ui.configureVersusVictory('draw');
          } else if (p1Alive) {
            this.ui.configureVersusVictory('p1');
          } else {
            this.ui.configureVersusVictory('p2');
          }
          this.ui.showStateModal(GameState.WON);
        }
      }
    }

    // 9. Update HUD Stats
    if (this.player) {
      const bombsAvail = this.player.maxBombs - this.player.activeBombs;
      const enemyCountDisplay = (this.currentMode === GameMode.CLASSIC)
        ? activeEnemiesCount
        : ((this.player2 && this.player2.isAlive) ? 1 : 0);
      this.ui.updateStats(
        bombsAvail,
        this.player.maxBombs,
        this.player.blastRange,
        this.player.speed,
        enemyCountDisplay
      );
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}
