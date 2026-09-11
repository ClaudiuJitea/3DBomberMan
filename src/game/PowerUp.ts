import * as THREE from 'three';
import { PowerUpType, FLOOR_HEIGHT } from './constants';
import { Grid } from './Grid';

export class PowerUp {
  public col: number;
  public row: number;
  public type: PowerUpType;
  public mesh: THREE.Group;
  public isCollected: boolean = false;
  
  private timeOffset: number;
  private baseY: number = FLOOR_HEIGHT + 0.55;

  constructor(col: number, row: number, type: PowerUpType, mesh: THREE.Group, grid: Grid) {
    this.col = col;
    this.row = row;
    this.type = type;
    this.mesh = mesh;
    this.timeOffset = Math.random() * Math.PI * 2;

    const worldPos = grid.gridToWorld(col, row, this.baseY);
    this.mesh.position.copy(worldPos);
  }

  public update(delta: number): void {
    if (this.isCollected) return;

    // Continuous spin
    this.mesh.rotation.y += delta * 2.4;

    // Gentle float bobbing
    const elapsed = Date.now() * 0.001 + this.timeOffset;
    this.mesh.position.y = this.baseY + Math.sin(elapsed * 3.5) * 0.12;
  }

  public checkCollection(playerPos: THREE.Vector3): boolean {
    if (this.isCollected) return false;

    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    const distSq = dx * dx + dz * dz;

    // Threshold ~ 0.95 units
    if (distSq < 0.9) {
      this.isCollected = true;
      return true;
    }
    return false;
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}
