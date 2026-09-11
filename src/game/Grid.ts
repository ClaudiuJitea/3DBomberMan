import * as THREE from 'three';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, TileType } from './constants';

export class Grid {
  public cols: number;
  public rows: number;
  public cellSize: number;
  private tiles: TileType[][];
  private fireIntensity: number[][]; // > 0 means active fire

  constructor(cols = GRID_COLS, rows = GRID_ROWS, cellSize = CELL_SIZE) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.tiles = [];
    this.fireIntensity = [];
    this.reset();
  }

  public reset(): void {
    this.tiles = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => TileType.EMPTY)
    );
    this.fireIntensity = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => 0)
    );
  }

  public isInBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  public getTile(col: number, row: number): TileType {
    if (!this.isInBounds(col, row)) return TileType.WALL;
    return this.tiles[row][col];
  }

  public setTile(col: number, row: number, type: TileType): void {
    if (this.isInBounds(col, row)) {
      this.tiles[row][col] = type;
    }
  }

  public setFire(col: number, row: number, active: boolean): void {
    if (this.isInBounds(col, row)) {
      if (active) {
        this.fireIntensity[row][col]++;
      } else {
        this.fireIntensity[row][col] = Math.max(0, this.fireIntensity[row][col] - 1);
      }
    }
  }

  public hasFire(col: number, row: number): boolean {
    if (!this.isInBounds(col, row)) return false;
    return this.fireIntensity[row][col] > 0;
  }

  public isWalkable(col: number, row: number, allowBombAt?: { col: number; row: number }): boolean {
    if (!this.isInBounds(col, row)) return false;
    const tile = this.tiles[row][col];
    if (tile === TileType.EMPTY) return true;
    if (tile === TileType.BOMB && allowBombAt && allowBombAt.col === col && allowBombAt.row === row) {
      return true;
    }
    return false;
  }

  public isSolidWall(col: number, row: number): boolean {
    if (!this.isInBounds(col, row)) return true;
    return this.tiles[row][col] === TileType.WALL;
  }

  public isBreakableBlock(col: number, row: number): boolean {
    if (!this.isInBounds(col, row)) return false;
    return this.tiles[row][col] === TileType.BLOCK;
  }

  public gridToWorld(col: number, row: number, y = 0): THREE.Vector3 {
    const x = (col - (this.cols - 1) / 2) * this.cellSize;
    const z = (row - (this.rows - 1) / 2) * this.cellSize;
    return new THREE.Vector3(x, y, z);
  }

  public worldToGrid(pos: THREE.Vector3): { col: number; row: number } {
    const col = Math.round(pos.x / this.cellSize + (this.cols - 1) / 2);
    const row = Math.round(pos.z / this.cellSize + (this.rows - 1) / 2);
    return { col, row };
  }

  public isPlayerSpawnZone(col: number, row: number): boolean {
    // Keep (1,1), (1,2), (2,1) clear for player spawn
    if (col === 1 && row === 1) return true;
    if (col === 1 && row === 2) return true;
    if (col === 2 && row === 1) return true;
    return false;
  }

  public isEnemySpawnZone(col: number, row: number): boolean {
    // Keep opposite corners clear for enemies
    // Top-Right corner: (cols-2, 1)
    if (col >= this.cols - 3 && row <= 2) return true;
    // Bottom-Left corner: (1, rows-2)
    if (col <= 2 && row >= this.rows - 3) return true;
    // Bottom-Right corner: (cols-2, rows-2)
    if (col >= this.cols - 3 && row >= this.rows - 3) return true;
    // Top-Middle: (7, 1)
    if (col === 7 && row === 1) return true;
    // Right-Middle: (cols - 2, 5)
    if (col === this.cols - 2 && row === 5) return true;
    return false;
  }
}
