import * as THREE from 'three';
import { GAME_CONFIG, FLOOR_HEIGHT } from './constants';
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

  public update(delta: number, _scene?: THREE.Scene): boolean {
    if (this.isDetonated) return true;

    if (this.mixer) {
      this.mixer.update(delta);
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

  public dispose(scene: THREE.Scene): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    scene.remove(this.mesh);
  }
}
