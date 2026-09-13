export const GRID_COLS = 13;
export const GRID_ROWS = 11;
export const CELL_SIZE = 2.0;
export const FLOOR_HEIGHT = 0.22;

export enum TileType {
  EMPTY = 0,
  WALL = 1,
  BLOCK = 2,
  BOMB = 3,
  FIRE = 4,
}

export enum PowerUpType {
  BOMB_COUNT = 'BOMB_COUNT',
  BLAST_RANGE = 'BLAST_RANGE',
  SPEED = 'SPEED',
  SHIELD = 'SHIELD',
  EXTRA_LIFE = 'EXTRA_LIFE',
  BOMB_KICK = 'BOMB_KICK',
  REMOTE_CONTROL = 'REMOTE_CONTROL',
  BOMB_PASS = 'BOMB_PASS',
  PIERCE_BOMB = 'PIERCE_BOMB',
  FULL_FIRE = 'FULL_FIRE',
}

export enum GameState {
  LOADING = 'LOADING',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  WON = 'WON',
  LOST = 'LOST',
}

export enum GameMode {
  CLASSIC = 'CLASSIC',     // 01 Classic adventure [Solo]
  VS_CPU = 'VS_CPU',       // 02 Vs computer [Solo]
  LOCAL_2P = 'LOCAL_2P',   // 03 Local showdown [2P]
}

export enum EnemyType {
  SCOUT = 'SCOUT',
  HUNTER = 'HUNTER',
  BLITZ = 'BLITZ',
  PHANTOM = 'PHANTOM',
  CRUSHER = 'CRUSHER',
  CHOMPER = 'CHOMPER',
  BOSS = 'BOSS',
}

export enum DeathType {
  FIRE = 'FIRE',
  ENEMY = 'ENEMY',
}

export enum StageTheme {
  CYBER = 'CYBER',
  MAGMA = 'MAGMA',
  TOXIC = 'TOXIC',
  CRYO = 'CRYO',
}

export interface StageDefinition {
  id: number;
  theme: StageTheme;
  name: string;
  badge: string;
  subtitle: string;
  backgroundColor: number;
  fogColor: number;
  ambientColor: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  dirLightColor: number;
  rimLight1Color: number;
  rimLight2Color: number;
  floorModel: string;
  wallModel: string;
  blockModel: string;
  propModels: string[];
  enemies: { type: EnemyType; count: number }[];
}

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    id: 1,
    theme: StageTheme.CYBER,
    name: 'CYBER GRID',
    badge: 'CYBERPUNK NEON CORE',
    subtitle: 'Rogue patrol drones have hijacked the grid matrix.',
    backgroundColor: 0x070b14,
    fogColor: 0x070b14,
    ambientColor: 0x1b2842,
    hemiSkyColor: 0x00d8ff,
    hemiGroundColor: 0x09101f,
    dirLightColor: 0xf4f8ff,
    rimLight1Color: 0x00ffff,
    rimLight2Color: 0xff007f,
    floorModel: 'floor-tile',
    wallModel: 'solid-wall',
    blockModel: 'breakable-block',
    propModels: ['prop-pillar', 'prop-crystal', 'prop-terminal'],
    enemies: [
      { type: EnemyType.SCOUT, count: 2 },
      { type: EnemyType.HUNTER, count: 1 },
    ],
  },
  {
    id: 2,
    theme: StageTheme.MAGMA,
    name: 'MAGMA CORE',
    badge: 'VOLCANIC FOUNDRY',
    subtitle: 'Superheated basalt corridors with high-velocity Blitz Drones.',
    backgroundColor: 0x140702,
    fogColor: 0x140702,
    ambientColor: 0x4a1e0c,
    hemiSkyColor: 0xff6b35,
    hemiGroundColor: 0x2b0e04,
    dirLightColor: 0xffe4b5,
    rimLight1Color: 0xff3b00,
    rimLight2Color: 0xffaa00,
    floorModel: 'floor-tile-magma',
    wallModel: 'solid-wall-magma',
    blockModel: 'breakable-block-magma',
    propModels: ['prop-magma-vent', 'prop-pillar'],
    enemies: [
      { type: EnemyType.SCOUT, count: 1 },
      { type: EnemyType.HUNTER, count: 1 },
      { type: EnemyType.BLITZ, count: 1 },
      { type: EnemyType.CRUSHER, count: 1 },
    ],
  },
  {
    id: 3,
    theme: StageTheme.TOXIC,
    name: 'TOXIC FOUNDRY',
    badge: 'ACID BIO-RESERVE',
    subtitle: 'Corrosive chemical barrels and phase-shifting Phantom Specters.',
    backgroundColor: 0x041108,
    fogColor: 0x041108,
    ambientColor: 0x13381e,
    hemiSkyColor: 0x10b981,
    hemiGroundColor: 0x062810,
    dirLightColor: 0xfef08a,
    rimLight1Color: 0x10b981,
    rimLight2Color: 0x84cc16,
    floorModel: 'floor-tile-toxic',
    wallModel: 'solid-wall-toxic',
    blockModel: 'breakable-block-toxic',
    propModels: ['prop-toxic-vat', 'prop-terminal'],
    enemies: [
      { type: EnemyType.SCOUT, count: 1 },
      { type: EnemyType.HUNTER, count: 1 },
      { type: EnemyType.PHANTOM, count: 1 },
      { type: EnemyType.CHOMPER, count: 1 },
    ],
  },
  {
    id: 4,
    theme: StageTheme.CRYO,
    name: 'CRYO FROST',
    badge: 'GLACIAL ZERO ZONE',
    subtitle: 'Permafrost arena facing the combined rogue mech fleet.',
    backgroundColor: 0x030d1a,
    fogColor: 0x030d1a,
    ambientColor: 0x1e293b,
    hemiSkyColor: 0x38bdf8,
    hemiGroundColor: 0x0f172a,
    dirLightColor: 0xe0f2fe,
    rimLight1Color: 0x38bdf8,
    rimLight2Color: 0xc084fc,
    floorModel: 'floor-tile-ice',
    wallModel: 'solid-wall-ice',
    blockModel: 'breakable-block-ice',
    propModels: ['prop-cryo-crystal', 'prop-pillar'],
    enemies: [
      { type: EnemyType.HUNTER, count: 1 },
      { type: EnemyType.CRUSHER, count: 1 },
      { type: EnemyType.CHOMPER, count: 1 },
      { type: EnemyType.BOSS, count: 1 },
    ],
  },
];

export const GAME_CONFIG = {
  player: {
    initialSpeed: 4.8,     // world units per second
    speedStep: 0.8,
    maxSpeed: 8.8,
    initialBombs: 1,
    maxBombs: 6,
    initialRange: 1,
    maxRange: 7,
    initialLives: 3,
    maxLives: 5,
  },
  bomb: {
    fuseDuration: 2.4,     // seconds
    pulsingFrequency: 4.0, // base flash speed
  },
  explosion: {
    duration: 0.70,        // seconds
  },
  powerup: {
    dropChance: 0.18,      // Balanced, moderate drop rate (~18% of breakable blocks)
    weights: {
      [PowerUpType.BOMB_COUNT]: 0.17,
      [PowerUpType.BLAST_RANGE]: 0.17,
      [PowerUpType.SPEED]: 0.14,
      [PowerUpType.BOMB_KICK]: 0.10,
      [PowerUpType.REMOTE_CONTROL]: 0.09,
      [PowerUpType.BOMB_PASS]: 0.09,
      [PowerUpType.PIERCE_BOMB]: 0.08,
      [PowerUpType.FULL_FIRE]: 0.05,
      [PowerUpType.SHIELD]: 0.06,
      [PowerUpType.EXTRA_LIFE]: 0.05,
    },
  },
  enemies: {
    scoutSpeed: 2.8,
    hunterSpeed: 3.4,
    blitzSpeed: 4.4,
    phantomSpeed: 2.3,
    crusherSpeed: 2.2,
    chomperSpeed: 3.2,
    bossSpeed: 2.5,
    bossHealth: 3,
  },
  camera: {
    fov: 42,
    pitch: 58,             // degrees from ground
    distance: 28,
  },
};

export const ASSET_PATHS: Record<string, string> = {
  'player': '/assets/models/player.glb',
  'player-rival': '/assets/models/player-rival.glb',
  'enemy-scout': '/assets/models/enemy-scout.glb',
  'enemy-hunter': '/assets/models/enemy-hunter.glb',
  'enemy-blitz': '/assets/models/enemy-blitz.glb',
  'enemy-phantom': '/assets/models/enemy-phantom.glb',
  'enemy-crusher': '/assets/models/enemy-crusher.glb',
  'enemy-chomper': '/assets/models/enemy-chomper.glb',
  'enemy-boss': '/assets/models/enemy-boss.glb',
  'enemy-death': '/assets/models/enemy-death.glb',
  'enemy-death-rocket': '/assets/models/enemy-death-rocket.glb',
  'enemy-death-balloon': '/assets/models/enemy-death-balloon.glb',
  'enemy-death-spring': '/assets/models/enemy-death-spring.glb',
  'floor-tile': '/assets/models/floor-tile.glb',
  'solid-wall': '/assets/models/solid-wall.glb',
  'breakable-block': '/assets/models/breakable-block.glb',
  'floor-tile-magma': '/assets/models/floor-tile-magma.glb',
  'solid-wall-magma': '/assets/models/solid-wall-magma.glb',
  'breakable-block-magma': '/assets/models/breakable-block-magma.glb',
  'floor-tile-toxic': '/assets/models/floor-tile-toxic.glb',
  'solid-wall-toxic': '/assets/models/solid-wall-toxic.glb',
  'breakable-block-toxic': '/assets/models/breakable-block-toxic.glb',
  'floor-tile-ice': '/assets/models/floor-tile-ice.glb',
  'solid-wall-ice': '/assets/models/solid-wall-ice.glb',
  'breakable-block-ice': '/assets/models/breakable-block-ice.glb',
  'bomb': '/assets/models/bomb.glb',
  'explosion-center': '/assets/models/explosion-center.glb',
  'explosion-beam': '/assets/models/explosion-beam.glb',
  'explosion-tip': '/assets/models/explosion-tip.glb',
  'explosion-horizontal': '/assets/models/explosion-horizontal.glb',
  'explosion-vertical': '/assets/models/explosion-vertical.glb',
  'player-charred': '/assets/models/player-charred.glb',
  'player-death-fire': '/assets/models/player-death-fire.glb',
  'player-death-enemy': '/assets/models/player-death-enemy.glb',
  'player-ash': '/assets/models/player-ash.glb',
  'player-eyes': '/assets/models/player-eyes.glb',
  'player-squashed': '/assets/models/player-squashed.glb',
  'dizzy-stars': '/assets/models/dizzy-stars.glb',
  'player-ghost': '/assets/models/player-ghost.glb',
  'powerup-bomb': '/assets/models/powerup-bomb.glb',
  'powerup-range': '/assets/models/powerup-range.glb',
  'powerup-speed': '/assets/models/powerup-speed.glb',
  'powerup-shield': '/assets/models/powerup-shield.glb',
  'powerup-life': '/assets/models/powerup-life.glb',
  'powerup-kick': '/assets/models/powerup-kick.glb',
  'powerup-remote': '/assets/models/powerup-remote.glb',
  'powerup-bombpass': '/assets/models/powerup-bombpass.glb',
  'powerup-pierce': '/assets/models/powerup-pierce.glb',
  'powerup-fullfire': '/assets/models/powerup-fullfire.glb',
  'exit-portal': '/assets/models/exit-portal.glb',
  'falling-block': '/assets/models/falling-block.glb',
  'prop-pillar': '/assets/models/props/prop-pillar.glb',
  'prop-crystal': '/assets/models/props/prop-crystal.glb',
  'prop-terminal': '/assets/models/props/prop-terminal.glb',
  'prop-magma-vent': '/assets/models/props/prop-magma-vent.glb',
  'prop-toxic-vat': '/assets/models/props/prop-toxic-vat.glb',
  'prop-cryo-crystal': '/assets/models/props/prop-cryo-crystal.glb',
  'arena-base': '/assets/models/arena-base.glb',
};

export const POWERUP_COLORS: Record<PowerUpType, { main: number; glow: number; name: string }> = {
  [PowerUpType.BOMB_COUNT]:     { main: 0x00f5ff, glow: 0x00d2ff, name: 'BOMB COUNT' },      // Neon Cyan
  [PowerUpType.BLAST_RANGE]:    { main: 0xff5500, glow: 0xff3b00, name: 'BLAST RANGE' },     // Fiery Orange
  [PowerUpType.SPEED]:          { main: 0xffee00, glow: 0xffd700, name: 'SPEED' },           // Electric Yellow
  [PowerUpType.BOMB_KICK]:      { main: 0xd946ef, glow: 0xc026d3, name: 'BOMB KICK' },       // Magenta
  [PowerUpType.REMOTE_CONTROL]: { main: 0xef4444, glow: 0xdc2626, name: 'REMOTE CONTROL' },  // Laser Red
  [PowerUpType.BOMB_PASS]:      { main: 0x38bdf8, glow: 0x0ea5e9, name: 'BOMB PASS' },       // Ghost Blue
  [PowerUpType.PIERCE_BOMB]:    { main: 0xa855f7, glow: 0x9333ea, name: 'PIERCE BOMB' },     // Plasma Purple
  [PowerUpType.FULL_FIRE]:      { main: 0xf59e0b, glow: 0xd97706, name: 'FULL FIRE' },       // Solar Gold
  [PowerUpType.SHIELD]:         { main: 0x10b981, glow: 0x059669, name: 'SHIELD' },          // Emerald Barrier
  [PowerUpType.EXTRA_LIFE]:     { main: 0xf43f5e, glow: 0xe11d48, name: 'EXTRA LIFE' },      // Ruby Pink
};

