import * as THREE from 'three';
import { GAME_CONFIG, FLOOR_HEIGHT, TileType } from './constants';
import { Grid } from './Grid';
import { AudioManager } from './AudioManager';

export class Bomb {
  public col: number;
  public row: number;
  public blastRange: number;
  public fuseTimer: number;
  public isDetonated: boolean = false;
  public mesh: THREE.Group;
  public owner: any = null;

  public isMoving: boolean = false;
  public moveDir: { x: number; z: number } = { x: 0, z: 0 };
  public moveSpeed: number = 9.2; // Smooth arcade sliding velocity

  private initialFuse: number;
  private audio: AudioManager;
  private baseWorldPos: THREE.Vector3;
  private mixer: THREE.AnimationMixer | null = null;
  private lastTickSec: number = 0;

  constructor(
    col: number,
    row: number,
    blastRange: number,
    mesh: THREE.Group,
    grid: Grid,
    audio: AudioManager,
    owner: any = null
  ) {
    this.col = col;
    this.row = row;
    this.blastRange = blastRange;
    this.fuseTimer = GAME_CONFIG.bomb.fuseDuration;
    this.initialFuse = this.fuseTimer;
    this.mesh = mesh;
    this.audio = audio;
    this.owner = owner;

    if (this.mesh.animations && this.mesh.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.mesh);
      for (const clip of this.mesh.animations) {
        const action = this.mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
      }
    }

    this.baseWorldPos = grid.gridToWorld(col, row, FLOOR_HEIGHT);
    this.mesh.position.copy(this.baseWorldPos);

    // Subtle scale modifier based on blast power
    const powerScale = 1.05 + Math.min(0.25, (blastRange - 1) * 0.04);
    this.mesh.scale.set(powerScale, powerScale, powerScale);

    this.audio.playPlaceBomb();
  }

  public kick(dirX: number, dirZ: number, grid: Grid): boolean {
    if (this.isDetonated || this.isMoving) return false;
    const nextCol = this.col + dirX;
    const nextRow = this.row + dirZ;
    if (!grid.isInBounds(nextCol, nextRow) || !grid.isWalkable(nextCol, nextRow)) {
      return false;
    }
    this.isMoving = true;
    this.moveDir = { x: dirX, z: dirZ };
    this.audio.playBombKick();
    return true;
  }

  public update(
    delta: number,
    _scene?: THREE.Scene,
    grid?: Grid,
    isBlockedAt?: (c: number, r: number) => boolean
  ): boolean {
    if (this.isDetonated) return true;

    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Sliding bomb physics when kicked
    if (this.isMoving && grid) {
      const step = this.moveSpeed * delta;
      this.mesh.position.x += this.moveDir.x * step;
      this.mesh.position.z += this.moveDir.z * step;

      // Dynamic 3D roll as it slides
      this.mesh.rotation.x += this.moveDir.z * step * 2.8;
      this.mesh.rotation.z -= this.moveDir.x * step * 2.8;

      const currentCell = grid.worldToGrid(this.mesh.position);

      // On crossing into a new cell, update grid tile occupancy
      if (currentCell.col !== this.col || currentCell.row !== this.row) {
        if (grid.isInBounds(this.col, this.row) && grid.getTile(this.col, this.row) === TileType.BOMB) {
          grid.setTile(this.col, this.row, TileType.EMPTY);
        }
        this.col = currentCell.col;
        this.row = currentCell.row;
        if (grid.isInBounds(this.col, this.row)) {
          grid.setTile(this.col, this.row, TileType.BOMB);
        }
      }

      // Check whether next tile along slide direction is blocked
      const nextCol = this.col + this.moveDir.x;
      const nextRow = this.row + this.moveDir.z;
      const cellCenter = grid.gridToWorld(this.col, this.row, FLOOR_HEIGHT);

      const nextBlocked = !grid.isInBounds(nextCol, nextRow) ||
                          !grid.isWalkable(nextCol, nextRow, { col: this.col, row: this.row }) ||
                          (isBlockedAt ? isBlockedAt(nextCol, nextRow) : false);

      if (nextBlocked) {
        // Stop once bomb has reached or passed current cell center in direction of motion
        const pastX = (this.mesh.position.x - cellCenter.x) * this.moveDir.x;
        const pastZ = (this.mesh.position.z - cellCenter.z) * this.moveDir.z;
        if (pastX >= 0 && pastZ >= 0) {
          this.mesh.position.x = cellCenter.x;
          this.mesh.position.z = cellCenter.z;
          this.isMoving = false;
          this.moveDir = { x: 0, z: 0 };
          if (grid.isInBounds(this.col, this.row)) {
            grid.setTile(this.col, this.row, TileType.BOMB);
          }
          this.audio.playBombBounce();
        }
      }
    }

    this.fuseTimer -= delta;
    const progress = Math.min(1.0, 1.0 - Math.max(0, this.fuseTimer / this.initialFuse));

    // Classic ticking sound cadence accelerating naturally from 0.48s down to 0.12s
    const tickInterval = Math.max(0.12, 0.48 - progress * 0.36);
    const elapsed = this.initialFuse - this.fuseTimer;
    if (elapsed - this.lastTickSec >= tickInterval) {
      this.lastTickSec = elapsed;
      this.audio.playFuseTick();
    }

    if (this.fuseTimer <= 0) {
      this.isDetonated = true;
      return true;
    }

    return false;
  }

  public forceDetonate(): void {
    this.isDetonated = true;
  }

  public dispose(scene: THREE.Scene, grid?: Grid): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    if (grid && grid.isInBounds(this.col, this.row) && grid.getTile(this.col, this.row) === TileType.BOMB) {
      grid.setTile(this.col, this.row, TileType.EMPTY);
    }
    scene.remove(this.mesh);
  }
}
