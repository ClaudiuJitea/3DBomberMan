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
    backgroundColor: 0x0a0d14,
    fogColor: 0x0a0d14,
    ambientColor: 0x2d3748,
    hemiSkyColor: 0x38bdf8,
    hemiGroundColor: 0x1e1035,
    dirLightColor: 0xfff2d4,
    rimLight1Color: 0x00f5d4,
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
      { type: EnemyType.SCOUT, count: 1 },
      { type: EnemyType.HUNTER, count: 1 },
      { type: EnemyType.BLITZ, count: 1 },
      { type: EnemyType.PHANTOM, count: 1 },
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
  },
  bomb: {
    fuseDuration: 2.4,     // seconds
    pulsingFrequency: 4.0, // base flash speed
  },
  explosion: {
    duration: 0.70,        // seconds
  },
  powerup: {
    dropChance: 0.20,      // Balanced 20% drop rate (reduced from 0.38)
    weights: {
      [PowerUpType.BOMB_COUNT]: 0.30,
      [PowerUpType.BLAST_RANGE]: 0.30,
      [PowerUpType.SPEED]: 0.25,
      [PowerUpType.SHIELD]: 0.15,
    },
  },
  enemies: {
    scoutSpeed: 2.8,
    hunterSpeed: 3.4,
    blitzSpeed: 4.4,
    phantomSpeed: 2.3,
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
  'enemy-death': '/assets/models/enemy-death.glb',
  'enemy-death-rocket': '/assets/models/enemy-death-rocket.glb',
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
  'prop-pillar': '/assets/models/props/prop-pillar.glb',
  'prop-crystal': '/assets/models/props/prop-crystal.glb',
  'prop-terminal': '/assets/models/props/prop-terminal.glb',
  'prop-magma-vent': '/assets/models/props/prop-magma-vent.glb',
  'prop-toxic-vat': '/assets/models/props/prop-toxic-vat.glb',
  'prop-cryo-crystal': '/assets/models/props/prop-cryo-crystal.glb',
  'arena-base': '/assets/models/arena-base.glb',
};
