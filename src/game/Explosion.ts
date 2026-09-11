import * as THREE from 'three';
import { GAME_CONFIG, TileType, FLOOR_HEIGHT } from './constants';
import { Grid } from './Grid';
import { AssetLoader } from './AssetLoader';
import { AudioManager } from './AudioManager';

export interface FlameTile {
  col: number;
  row: number;
  dist: number;
  delay: number;
  active: boolean;
  mesh: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  mixer?: THREE.AnimationMixer;
  onReach?: () => void;
}

export class Explosion {
  public centerCol: number;
  public centerRow: number;
  public duration: number;
  public timer: number = 0;
  public isFinished: boolean = false;
  public flameTiles: FlameTile[] = [];
  
  private scene: THREE.Scene;
  private grid: Grid;
  private audio: AudioManager;

  constructor(
    centerCol: number,
    centerRow: number,
    blastRange: number,
    scene: THREE.Scene,
    grid: Grid,
    assets: AssetLoader,
    audio: AudioManager,
    onDestroyBlock: (col: number, row: number) => void,
    onDetonateBomb: (col: number, row: number) => void
  ) {
    this.centerCol = centerCol;
    this.centerRow = centerRow;
    this.duration = GAME_CONFIG.explosion.duration;
    this.scene = scene;
    this.grid = grid;
    this.audio = audio;

    this.audio.playExplosion();

    // 1. Center flame - high-energy comic starburst core
    this.queueFlameTile(centerCol, centerRow, 0, 0, assets.cloneModel('explosion-center'), 0);

    // 2. Cardinal directions: [dx, dz, rotationY]
    // explosion-beam and explosion-tip are authored along local +Z axis
    const directions: [number, number, number][] = [
      [1, 0, Math.PI / 2],    // Right (+X)
      [-1, 0, -Math.PI / 2],  // Left (-X)
      [0, 1, 0],              // Down (+Z)
      [0, -1, Math.PI],       // Up (-Z)
    ];

    // Ultra-snappy instant burst (crisp 8ms micro-snap for visceral arcade punch)
    const stepDelay = 0.008;

    for (const [dx, dz, rotY] of directions) {
      for (let dist = 1; dist <= blastRange; dist++) {
        const c = centerCol + dx * dist;
        const r = centerRow + dz * dist;

        if (!grid.isInBounds(c, r)) break;

        const tile = grid.getTile(c, r);

        // Solid indestructible wall stops flame cold
        if (tile === TileType.WALL) {
          break;
        }

        const delay = dist * stepDelay;

        // Breakable block gets destroyed and stops flame propagation
        if (tile === TileType.BLOCK) {
          this.queueFlameTile(c, r, dist, delay, assets.cloneModel('explosion-tip'), rotY, () => {
            onDestroyBlock(c, r);
          });
          break;
        }

        // Another bomb triggered by chain reaction
        if (tile === TileType.BOMB) {
          const nextC = c + dx;
          const nextR = r + dz;
          const isTip = (dist === blastRange) || !grid.isInBounds(nextC, nextR) || grid.getTile(nextC, nextR) === TileType.WALL;
          const modelKey = isTip ? 'explosion-tip' : 'explosion-beam';
          this.queueFlameTile(c, r, dist, delay, assets.cloneModel(modelKey), rotY, () => {
            onDetonateBomb(c, r);
          });
          continue;
        }

        // Check if next tile terminates the ray
        const nextC = c + dx;
        const nextR = r + dz;
        const isEndCap = (dist === blastRange) || !grid.isInBounds(nextC, nextR) || grid.getTile(nextC, nextR) === TileType.WALL;
        const modelKey = isEndCap ? 'explosion-tip' : 'explosion-beam';

        this.queueFlameTile(c, r, dist, delay, assets.cloneModel(modelKey), rotY);
      }
    }
  }

  private queueFlameTile(
    col: number,
    row: number,
    dist: number,
    delay: number,
    mesh: THREE.Group,
    rotY: number = 0,
    onReach?: () => void
  ): void {
    const worldPos = this.grid.gridToWorld(col, row, FLOOR_HEIGHT);
    mesh.position.copy(worldPos);
    mesh.rotation.y = rotY;
    mesh.scale.set(0.01, 0.01, 0.01);
    mesh.visible = delay === 0;

    const materials: THREE.MeshStandardMaterial[] = [];
    mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = (child as THREE.Mesh).material;
        if (m) {
          if (Array.isArray(m)) {
            m.forEach(mat => materials.push(mat as THREE.MeshStandardMaterial));
          } else {
            materials.push(m as THREE.MeshStandardMaterial);
          }
        }
      }
    });

    this.scene.add(mesh);

    const active = delay === 0;
    const tile: FlameTile = { col, row, dist, delay, active: false, mesh, materials, onReach };
    this.flameTiles.push(tile);

    if (active) {
      this.activateTile(tile);
    }
  }

  private activateTile(tile: FlameTile): void {
    tile.active = true;
    tile.mesh.visible = true;
    this.grid.setFire(tile.col, tile.row, true);

    if (tile.mesh.animations && tile.mesh.animations.length > 0) {
      tile.mixer = new THREE.AnimationMixer(tile.mesh);
      for (const clip of tile.mesh.animations) {
        const action = tile.mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
      }
    }

    if (tile.onReach) {
      tile.onReach();
    }
  }

  public update(delta: number): boolean {
    this.timer += delta;

    for (const tile of this.flameTiles) {
      // Outward progressive activation
      if (!tile.active && this.timer >= tile.delay) {
        this.activateTile(tile);
      }

      if (tile.active) {
        if (tile.mixer) {
          tile.mixer.update(delta);
        }

        const localDuration = Math.max(0.25, this.duration - tile.delay);
        const progress = Math.min(1.0, (this.timer - tile.delay) / localDuration);

        let scale = 1.0;
        let emissiveFactor = 1.0;

        if (progress < 0.16) {
          // Instant explosive supersonic detonation snap!
          const t = progress / 0.16;
          // Sudden expansion to 1.32x then settles
          scale = 0.35 + 0.97 * Math.sin(t * Math.PI * 0.5);
          emissiveFactor = 1.0 + Math.sin(t * Math.PI * 0.5) * 1.5;
        } else if (progress < 0.68) {
          // Roaring flame column sustained pulsation
          const flutter = Math.sin((progress - 0.16) * 32.0) * 0.09;
          scale = 1.08 + flutter;
          emissiveFactor = 1.8 + flutter * 2.0;
        } else {
          // Dissipation and upward burn-off
          const t = (progress - 0.68) / 0.32;
          scale = Math.max(0.01, (1.0 - t * t) * 1.08);
          emissiveFactor = Math.max(0.05, 1.8 * (1.0 - t));
          // Dissipate slightly upward
          tile.mesh.position.y += delta * 0.8;
        }

        tile.mesh.scale.set(scale, scale, scale);
        for (const mat of tile.materials) {
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = 4.5 * emissiveFactor;
          }
        }
      }
    }

    if (this.timer >= this.duration) {
      this.isFinished = true;
      this.cleanup();
      return true;
    }

    return false;
  }

  public containsCell(col: number, row: number): boolean {
    return this.flameTiles.some(t => t.active && t.col === col && t.row === row);
  }

  public cleanup(): void {
    for (const tile of this.flameTiles) {
      if (tile.mixer) {
        tile.mixer.stopAllAction();
        tile.mixer = undefined;
      }
      if (tile.active) {
        this.grid.setFire(tile.col, tile.row, false);
      }
      this.scene.remove(tile.mesh);
    }
    this.flameTiles = [];
  }
}
