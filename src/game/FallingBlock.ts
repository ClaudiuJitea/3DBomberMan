import * as THREE from 'three';
import { FLOOR_HEIGHT } from './constants';
import { Grid } from './Grid';
import { AudioManager } from './AudioManager';

export class FallingBlock {
  public col: number;
  public row: number;
  public mesh: THREE.Group;
  public isLanded: boolean = false;
  private currentY: number = 15;
  private targetY: number = FLOOR_HEIGHT + 0.5;
  private fallSpeed: number = 32;
  private grid: Grid;
  private audio: AudioManager;

  constructor(col: number, row: number, mesh: THREE.Group, grid: Grid, audio: AudioManager) {
    this.col = col;
    this.row = row;
    this.mesh = mesh;
    this.grid = grid;
    this.audio = audio;

    const basePos = this.grid.gridToWorld(col, row, this.currentY);
    this.mesh.position.copy(basePos);
  }

  public update(delta: number, onLand: (col: number, row: number) => void): boolean {
    if (this.isLanded) return true;

    this.currentY -= this.fallSpeed * delta;
    if (this.currentY <= this.targetY) {
      this.currentY = this.targetY;
      this.isLanded = true;
      this.mesh.position.y = this.targetY;
      this.audio.playBlockFall();
      onLand(this.col, this.row);
      return true;
    }

    this.mesh.position.y = this.currentY;
    return false;
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}
