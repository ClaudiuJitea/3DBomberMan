import { Player } from './Player';
import { Grid } from './Grid';
import { Bomb } from './Bomb';
import { Explosion } from './Explosion';
import { Enemy } from './Enemy';
import { TileType } from './constants';

interface GridPos {
  col: number;
  row: number;
}

export class RivalAI {
  private rival: Player;
  private player: Player;
  private grid: Grid;
  private getBombs: () => Bomb[];
  private getExplosions: () => Explosion[];
  private getEnemies: () => Enemy[];
  private getPowerUpPositions: () => GridPos[];
  private onPlaceBomb: () => void;

  private decisionTimer: number = 0;
  private decisionInterval: number = 0.07; // Fast 14Hz decision loop
  private bombCooldownTimer: number = 0;

  // Sheltering & Evacuation State
  private isSheltering: boolean = false;
  private shelterTile: GridPos | null = null;

  // Active waypoint navigation path
  private currentPath: GridPos[] = [];

  constructor(
    rival: Player,
    player: Player,
    grid: Grid,
    getBombs: () => Bomb[],
    getExplosions: () => Explosion[],
    getEnemies: () => Enemy[],
    getPowerUpPositions: () => GridPos[],
    onPlaceBomb: () => void
  ) {
    this.rival = rival;
    this.player = player;
    this.grid = grid;
    this.getBombs = getBombs;
    this.getExplosions = getExplosions;
    this.getEnemies = getEnemies;
    this.getPowerUpPositions = getPowerUpPositions;
    this.onPlaceBomb = onPlaceBomb;
  }

  public update(delta: number): { x: number; z: number } | null {
    if (!this.rival.isAlive || this.rival.isDying) return null;

    this.bombCooldownTimer = Math.max(0, this.bombCooldownTimer - delta);
    this.decisionTimer += delta;

    const lethalMap = this.computeLethalMap();
    const threatMap = this.computeThreatMap(lethalMap);
    const rivalCoords = this.rival.getGridCoords();

    // Recalculate tactics periodically, OR immediately whenever current path is exhausted
    if (this.decisionTimer >= this.decisionInterval || this.currentPath.length === 0) {
      this.decisionTimer = 0;
      this.evaluateTactics(rivalCoords, threatMap, lethalMap);
    }

    // Convert current path into smooth movement input
    return this.calculateMovementInput(lethalMap);
  }

  private evaluateTactics(rivalPos: GridPos, threatMap: boolean[][], lethalMap: boolean[][]): void {
    const isCurrentCellThreatened = threatMap[rivalPos.col]?.[rivalPos.row] ?? false;
    const isCurrentCellLethal = lethalMap[rivalPos.col]?.[rivalPos.row] ?? false;
    const hasNearbyActiveThreats = this.hasActiveThreatsNearby(rivalPos);

    // If sheltering, check if all active threats have cleared and our current cell is safe
    if (this.isSheltering && !hasNearbyActiveThreats && !isCurrentCellThreatened && !isCurrentCellLethal) {
      this.isSheltering = false;
      this.shelterTile = null;
      this.currentPath = [];
    }

    // -------------------------------------------------------------
    // 1. SURVIVAL & EVASION: Dodge bomb blasts, fire, and charging enemies
    // -------------------------------------------------------------
    if (isCurrentCellThreatened || isCurrentCellLethal || (this.isSheltering && hasNearbyActiveThreats)) {
      const isShelterStillSafe = this.shelterTile &&
        !threatMap[this.shelterTile.col]?.[this.shelterTile.row] &&
        !lethalMap[this.shelterTile.col]?.[this.shelterTile.row];

      // If rival is already at the safe shelter tile: wait safely until threats clear
      if (isShelterStillSafe && rivalPos.col === this.shelterTile!.col && rivalPos.row === this.shelterTile!.row) {
        this.currentPath = [];
        return;
      }

      // If existing path is still taking us to a safe shelter, keep running:
      if (this.currentPath.length > 0 && isShelterStillSafe) {
        return;
      }

      // Find an escape route to the nearest safe tile
      const escapePath = this.findEscapePath(rivalPos, threatMap, lethalMap);
      if (escapePath && escapePath.length > 0) {
        this.isSheltering = true;
        this.shelterTile = escapePath[escapePath.length - 1];
        this.currentPath = escapePath;
        return;
      } else if (escapePath && escapePath.length === 0) {
        // Current tile is safe refuge
        this.isSheltering = true;
        this.shelterTile = rivalPos;
        this.currentPath = [];
        return;
      }
    }

    // -------------------------------------------------------------
    // 2. COMBAT DEFENSE: Kill small robots with trap bombs & avoid collision
    // -------------------------------------------------------------
    const nearbyEnemy = this.findNearbyEnemyThreat(rivalPos);
    if (nearbyEnemy) {
      const enemyDist = Math.abs(nearbyEnemy.col - rivalPos.col) + Math.abs(nearbyEnemy.row - rivalPos.row);

      // If enemy is approaching down the same corridor within 2-3 tiles:
      const inSameLine = (nearbyEnemy.col === rivalPos.col || nearbyEnemy.row === rivalPos.row);
      if (inSameLine && enemyDist >= 2 && enemyDist <= 3 && this.canPlaceBomb(rivalPos, threatMap)) {
        const simThreat = this.computeSimulatedBombThreat(rivalPos, this.rival.blastRange, threatMap);
        const escapePath = this.findEscapePath(rivalPos, simThreat, lethalMap);
        if (escapePath && escapePath.length > 0) {
          // Drop a trap bomb right in the enemy's path and duck into cover!
          this.executeBombPlant(escapePath);
          return;
        }
      }

      // If enemy is dangerously close (<= 2 tiles) and we didn't bomb: EVADE!
      if (enemyDist <= 2) {
        const evadePath = this.findEvasionPathFromEnemy(rivalPos, nearbyEnemy, threatMap, lethalMap);
        if (evadePath && evadePath.length > 0) {
          this.currentPath = evadePath;
          return;
        }
      }
    }

    // -------------------------------------------------------------
    // 3. COMBAT OFFENSE: Attack Player 1 ("Reach me and kill me")
    // -------------------------------------------------------------
    const pPos = this.player.getGridCoords();
    const distToPlayer = Math.abs(pPos.col - rivalPos.col) + Math.abs(pPos.row - rivalPos.row);

    // If Player 1 is in direct blast corridor with clear line of sight:
    if (this.hasClearLineOfSight(rivalPos, pPos) && distToPlayer <= this.rival.blastRange + 1) {
      if (this.canPlaceBomb(rivalPos, threatMap)) {
        const simThreat = this.computeSimulatedBombThreat(rivalPos, this.rival.blastRange, threatMap);
        const escapePath = this.findEscapePath(rivalPos, simThreat, lethalMap);
        if (escapePath && escapePath.length > 0) {
          // Drop bomb to blast Player 1 and take cover!
          this.executeBombPlant(escapePath);
          return;
        }
      }
    }

    // -------------------------------------------------------------
    // 4. POWER-UP HARVESTING: Grab nearby powerups to upgrade stats
    // -------------------------------------------------------------
    const powerUps = this.getPowerUpPositions();
    let bestPowerUpPath: GridPos[] | null = null;
    let shortestPupDist = 7;

    for (const pup of powerUps) {
      if (!threatMap[pup.col]?.[pup.row] && !lethalMap[pup.col]?.[pup.row]) {
        const path = this.findClearPath(rivalPos, pup, threatMap, lethalMap);
        if (path && path.length > 0 && path.length < shortestPupDist) {
          shortestPupDist = path.length;
          bestPowerUpPath = path;
        }
      }
    }

    if (bestPowerUpPath) {
      this.currentPath = bestPowerUpPath;
      return;
    }

    // -------------------------------------------------------------
    // 5. MAIN DIRECTIVE: Breach & Tunnel towards Player 1!
    // -------------------------------------------------------------
    const breach = this.findBreachPathToPlayer(rivalPos, pPos, threatMap, lethalMap);
    if (breach) {
      // If we are at the target stand tile right in front of a blocking block:
      if (breach.standTile && rivalPos.col === breach.standTile.col && rivalPos.row === breach.standTile.row) {
        if (this.canPlaceBomb(rivalPos, threatMap)) {
          const simThreat = this.computeSimulatedBombThreat(rivalPos, this.rival.blastRange, threatMap);
          const escapePath = this.findEscapePath(rivalPos, simThreat, lethalMap);
          if (escapePath && escapePath.length > 0) {
            // Blow up this block to open the path to Player 1!
            this.executeBombPlant(escapePath);
            return;
          }
        }
      }

      // If we need to walk to the stand tile or directly towards Player:
      if (breach.path && breach.path.length > 0) {
        this.currentPath = breach.path;
        return;
      }
    }

    // -------------------------------------------------------------
    // 6. FALLBACK: Destroy any reachable breakable block nearby
    // -------------------------------------------------------------
    const blockHunt = this.findNearestBlockToClear(rivalPos, threatMap, lethalMap);
    if (blockHunt) {
      if (blockHunt.standTile && rivalPos.col === blockHunt.standTile.col && rivalPos.row === blockHunt.standTile.row) {
        if (this.canPlaceBomb(rivalPos, threatMap)) {
          const simThreat = this.computeSimulatedBombThreat(rivalPos, this.rival.blastRange, threatMap);
          const escapePath = this.findEscapePath(rivalPos, simThreat, lethalMap);
          if (escapePath && escapePath.length > 0) {
            this.executeBombPlant(escapePath);
            return;
          }
        }
      }
      if (blockHunt.path && blockHunt.path.length > 0) {
        this.currentPath = blockHunt.path;
        return;
      }
    }

    this.currentPath = [];
  }

  private canPlaceBomb(pos: GridPos, threatMap: boolean[][]): boolean {
    if (this.isSheltering) return false;
    if (this.bombCooldownTimer > 0) return false;

    // Ground-truth sync of active bombs
    const liveBombs = this.getBombs().filter(b => b.owner === this.rival && !b.isDetonated).length;
    this.rival.activeBombs = liveBombs;
    if (liveBombs >= this.rival.maxBombs) return false;

    if (threatMap[pos.col]?.[pos.row]) return false;
    if (this.grid.getTile(pos.col, pos.row) === TileType.BOMB) return false;
    return true;
  }

  private executeBombPlant(escapePath: GridPos[]): void {
    this.onPlaceBomb();
    this.bombCooldownTimer = 0.6;
    this.isSheltering = true;
    this.shelterTile = escapePath[escapePath.length - 1];
    this.currentPath = escapePath;
  }

  private findNearbyEnemyThreat(rivalPos: GridPos): Enemy | null {
    const enemies = this.getEnemies();
    let closestEnemy: Enemy | null = null;
    let closestDist = 999;

    for (const e of enemies) {
      if (!e.isAlive || e.isDying) continue;
      const dist = Math.abs(e.col - rivalPos.col) + Math.abs(e.row - rivalPos.row);
      if (dist <= 3 && dist < closestDist) {
        closestDist = dist;
        closestEnemy = e;
      }
    }

    return closestEnemy;
  }

  private findEvasionPathFromEnemy(
    start: GridPos,
    enemy: Enemy,
    threatMap: boolean[][],
    lethalMap: boolean[][]
  ): GridPos[] | null {
    const currentDist = Math.abs(enemy.col - start.col) + Math.abs(enemy.row - start.row);
    const dirs = [
      { col: 0, row: -1 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
      { col: 1, row: 0 },
    ];

    let bestStep: GridPos | null = null;
    let maxDist = currentDist;

    for (const d of dirs) {
      const next: GridPos = { col: start.col + d.col, row: start.row + d.row };
      if (!this.grid.isInBounds(next.col, next.row)) continue;

      const tile = this.grid.getTile(next.col, next.row);
      if (tile === TileType.EMPTY && !threatMap[next.col]?.[next.row] && !lethalMap[next.col]?.[next.row]) {
        const dist = Math.abs(enemy.col - next.col) + Math.abs(enemy.row - next.row);
        if (dist > maxDist) {
          maxDist = dist;
          bestStep = next;
        }
      }
    }

    return bestStep ? [bestStep] : null;
  }

  private hasClearLineOfSight(p1: GridPos, p2: GridPos): boolean {
    if (p1.col !== p2.col && p1.row !== p2.row) return false;

    const dirC = Math.sign(p2.col - p1.col);
    const dirR = Math.sign(p2.row - p1.row);
    const dist = Math.abs(p2.col - p1.col) + Math.abs(p2.row - p1.row);

    for (let s = 1; s < dist; s++) {
      const checkC = p1.col + dirC * s;
      const checkR = p1.row + dirR * s;
      const tile = this.grid.getTile(checkC, checkR);
      if (tile !== TileType.EMPTY) {
        return false;
      }
    }

    return true;
  }

  private hasActiveThreatsNearby(pos: GridPos): boolean {
    // 1. Check ticking bombs nearby (within 4 tiles Manhattan distance or in direct blast line)
    const bombs = this.getBombs();
    for (const b of bombs) {
      if (b.isDetonated) continue;
      const dist = Math.abs(b.col - pos.col) + Math.abs(b.row - pos.row);
      if (dist <= 4) return true;
      if (b.col === pos.col && Math.abs(b.row - pos.row) <= b.blastRange) return true;
      if (b.row === pos.row && Math.abs(b.col - pos.col) <= b.blastRange) return true;
    }

    // 2. Check active explosions
    const explosions = this.getExplosions();
    for (const ex of explosions) {
      if (ex.isFinished) continue;
      const dist = Math.abs(ex.centerCol - pos.col) + Math.abs(ex.centerRow - pos.row);
      if (dist <= 4) return true;
    }

    // 3. Check active fire in immediate vicinity (within 2 tiles)
    for (let dc = -2; dc <= 2; dc++) {
      for (let dr = -2; dr <= 2; dr++) {
        const c = pos.col + dc;
        const r = pos.row + dr;
        if (this.grid.isInBounds(c, r) && this.grid.hasFire(c, r)) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateMovementInput(lethalMap: boolean[][]): { x: number; z: number } | null {
    if (this.currentPath.length === 0) {
      return null;
    }

    const nextTarget = this.currentPath[0];
    const targetWorld = this.grid.gridToWorld(nextTarget.col, nextTarget.row, 0);

    const diffX = targetWorld.x - this.rival.position.x;
    const diffZ = targetWorld.z - this.rival.position.z;

    // Waypoint arrival tolerance (0.24 units = comfortably within cell center)
    const waypointRadius = 0.24;
    if (Math.abs(diffX) < waypointRadius && Math.abs(diffZ) < waypointRadius) {
      this.currentPath.shift();
      if (this.currentPath.length === 0) {
        return null;
      }
      return this.calculateMovementInput(lethalMap);
    }

    // Safety check against entering an immediately lethal cell
    if (lethalMap[nextTarget.col]?.[nextTarget.row]) {
      // Path blocked by lethal obstacle (fire/enemy/imminent blast); cancel and re-route
      this.currentPath = [];
      return null;
    }

    let dirX = 0;
    let dirZ = 0;

    // Follow dominant axis towards waypoint
    if (Math.abs(diffX) > Math.abs(diffZ)) {
      dirX = Math.sign(diffX);
    } else {
      dirZ = Math.sign(diffZ);
    }

    return { x: dirX, z: dirZ };
  }

  private computeLethalMap(): boolean[][] {
    const map: boolean[][] = [];
    for (let c = 0; c < this.grid.cols; c++) {
      map[c] = [];
      for (let r = 0; r < this.grid.rows; r++) {
        map[c][r] = this.grid.hasFire(c, r);
      }
    }

    // 1. Active explosions (all flame tiles, active or queued)
    const explosions = this.getExplosions();
    for (const ex of explosions) {
      if (ex.isFinished) continue;
      if (this.grid.isInBounds(ex.centerCol, ex.centerRow)) {
        map[ex.centerCol][ex.centerRow] = true;
      }
      for (const ft of ex.flameTiles) {
        if (this.grid.isInBounds(ft.col, ft.row)) {
          map[ft.col][ft.row] = true;
        }
      }
    }

    // 2. Active enemies
    const enemies = this.getEnemies();
    for (const e of enemies) {
      if (!e.isAlive || e.isDying) continue;
      if (this.grid.isInBounds(e.col, e.row)) {
        map[e.col][e.row] = true;
      }
      if (this.grid.isInBounds(e.targetCol, e.targetRow)) {
        map[e.targetCol][e.targetRow] = true;
      }
    }

    // 3. Bombs whose fuse has almost expired (<= 0.35s) — these rays are now lethal to enter
    const bombs = this.getBombs();
    for (const b of bombs) {
      if (b.isDetonated) continue;
      if (b.fuseTimer <= 0.35) {
        this.markBombDanger(b.col, b.row, b.blastRange, map);
      }
    }

    return map;
  }

  private computeThreatMap(lethalMap: boolean[][]): boolean[][] {
    const map: boolean[][] = [];
    for (let c = 0; c < this.grid.cols; c++) {
      map[c] = [];
      for (let r = 0; r < this.grid.rows; r++) {
        map[c][r] = lethalMap[c]?.[r] ?? false;
      }
    }

    // Mark projected blast corridors of all active ticking bombs
    const bombs = this.getBombs();
    for (const b of bombs) {
      if (b.isDetonated) continue;
      this.markBombDanger(b.col, b.row, b.blastRange, map);
    }

    return map;
  }

  private computeSimulatedBombThreat(bombPos: GridPos, range: number, baseThreat: boolean[][]): boolean[][] {
    const map: boolean[][] = [];
    for (let c = 0; c < this.grid.cols; c++) {
      map[c] = [];
      for (let r = 0; r < this.grid.rows; r++) {
        map[c][r] = baseThreat[c]?.[r] ?? false;
      }
    }
    this.markBombDanger(bombPos.col, bombPos.row, range, map);
    return map;
  }

  private markBombDanger(col: number, row: number, range: number, map: boolean[][]): void {
    if (this.grid.isInBounds(col, row)) {
      map[col][row] = true;
    }

    const dirs = [
      { col: 1, row: 0 },
      { col: -1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
    ];

    for (const d of dirs) {
      for (let step = 1; step <= range; step++) {
        const c = col + d.col * step;
        const r = row + d.row * step;
        if (!this.grid.isInBounds(c, r)) break;

        const tile = this.grid.getTile(c, r);
        if (tile === TileType.WALL) break;

        map[c][r] = true;
        if (tile === TileType.BLOCK) break;
      }
    }
  }

  private findEscapePath(start: GridPos, threatMap: boolean[][], lethalMap: boolean[][]): GridPos[] | null {
    // If start position is already safe, no steps required
    if (!threatMap[start.col]?.[start.row] && !lethalMap[start.col]?.[start.row]) {
      return [];
    }

    const visited = new Set<string>();
    const queue: { pos: GridPos; path: GridPos[] }[] = [
      { pos: start, path: [] },
    ];
    visited.add(`${start.col},${start.row}`);

    const dirs = [
      { col: 0, row: -1 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
      { col: 1, row: 0 },
    ];

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;

      // Found safe refuge tile!
      if (pos !== start && !threatMap[pos.col]?.[pos.row] && !lethalMap[pos.col]?.[pos.row]) {
        return path;
      }

      for (const d of dirs) {
        const next: GridPos = { col: pos.col + d.col, row: pos.row + d.row };
        const key = `${next.col},${next.row}`;

        if (this.grid.isInBounds(next.col, next.row) && !visited.has(key)) {
          visited.add(key);
          const tile = this.grid.getTile(next.col, next.row);

          // Tile is walkable if EMPTY or the starting bomb tile that rival is stepping off
          const isPassable = (tile === TileType.EMPTY) || (next.col === start.col && next.row === start.row);
          const isLethal = lethalMap[next.col]?.[next.row] ?? false;

          // Rival can traverse corridor tiles during evacuation as long as they are not immediately lethal
          if (isPassable && !isLethal) {
            queue.push({
              pos: next,
              path: [...path, next],
            });
          }
        }
      }
    }

    return null;
  }

  private findBreachPathToPlayer(
    start: GridPos,
    playerPos: GridPos,
    threatMap: boolean[][],
    lethalMap: boolean[][]
  ): { path: GridPos[]; standTile: GridPos | null } | null {
    // Dijkstra / BFS prioritizing shortest corridor to Player 1
    // Traverses empty corridors until reaching Player 1 or finding the first breakable block along the assault route
    const visited = new Set<string>();
    const queue: { pos: GridPos; path: GridPos[] }[] = [
      { pos: start, path: [] },
    ];
    visited.add(`${start.col},${start.row}`);

    const dirs = [
      { col: 0, row: -1 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
      { col: 1, row: 0 },
    ];

    let bestBlockBreach: { path: GridPos[]; standTile: GridPos; distToPlayer: number } | null = null;

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;

      // Clear open corridor directly to Player 1 reached!
      if (pos.col === playerPos.col && pos.row === playerPos.row) {
        return { path, standTile: null };
      }

      for (const d of dirs) {
        const next: GridPos = { col: pos.col + d.col, row: pos.row + d.row };
        const key = `${next.col},${next.row}`;

        if (!this.grid.isInBounds(next.col, next.row) || visited.has(key)) {
          continue;
        }

        const tile = this.grid.getTile(next.col, next.row);

        // Breakable BLOCK in our way: standing at 'pos' allows us to plant a bomb to breach 'next'!
        if (tile === TileType.BLOCK) {
          const dist = Math.abs(next.col - playerPos.col) + Math.abs(next.row - playerPos.row);
          if (!bestBlockBreach || dist < bestBlockBreach.distToPlayer) {
            bestBlockBreach = {
              path: path.length > 0 ? path : [pos],
              standTile: pos,
              distToPlayer: dist,
            };
          }
          continue;
        }

        // Empty passable corridor
        if (tile === TileType.EMPTY && !threatMap[next.col]?.[next.row] && !lethalMap[next.col]?.[next.row]) {
          visited.add(key);
          queue.push({
            pos: next,
            path: [...path, next],
          });
        }
      }
    }

    if (bestBlockBreach) {
      if (start.col === bestBlockBreach.standTile.col && start.row === bestBlockBreach.standTile.row) {
        return { path: [], standTile: bestBlockBreach.standTile };
      }
      return { path: bestBlockBreach.path, standTile: bestBlockBreach.standTile };
    }

    return null;
  }

  private findNearestBlockToClear(
    start: GridPos,
    threatMap: boolean[][],
    lethalMap: boolean[][]
  ): { path: GridPos[]; standTile: GridPos } | null {
    const visited = new Set<string>();
    const queue: { pos: GridPos; path: GridPos[] }[] = [
      { pos: start, path: [] },
    ];
    visited.add(`${start.col},${start.row}`);

    const dirs = [
      { col: 0, row: -1 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
      { col: 1, row: 0 },
    ];

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;

      for (const d of dirs) {
        const adj = { col: pos.col + d.col, row: pos.row + d.row };
        if (this.grid.isInBounds(adj.col, adj.row) && this.grid.getTile(adj.col, adj.row) === TileType.BLOCK) {
          if (!threatMap[pos.col]?.[pos.row] && !lethalMap[pos.col]?.[pos.row]) {
            return {
              path: path.length > 0 ? path : [],
              standTile: pos,
            };
          }
        }
      }

      for (const d of dirs) {
        const next = { col: pos.col + d.col, row: pos.row + d.row };
        const key = `${next.col},${next.row}`;
        if (this.grid.isInBounds(next.col, next.row) && !visited.has(key)) {
          visited.add(key);
          const tile = this.grid.getTile(next.col, next.row);
          if (tile === TileType.EMPTY && !threatMap[next.col]?.[next.row] && !lethalMap[next.col]?.[next.row]) {
            queue.push({ pos: next, path: [...path, next] });
          }
        }
      }
    }

    return null;
  }

  private findClearPath(start: GridPos, target: GridPos, threatMap: boolean[][], lethalMap: boolean[][]): GridPos[] | null {
    if (threatMap[target.col]?.[target.row] || lethalMap[target.col]?.[target.row]) {
      return null;
    }

    const queue: { pos: GridPos; path: GridPos[] }[] = [{ pos: start, path: [] }];
    const visited = new Set<string>();
    visited.add(`${start.col},${start.row}`);

    const dirs = [
      { col: 0, row: -1 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
      { col: 1, row: 0 },
    ];

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;

      if (pos.col === target.col && pos.row === target.row) {
        return path;
      }

      for (const d of dirs) {
        const next = { col: pos.col + d.col, row: pos.row + d.row };
        const key = `${next.col},${next.row}`;

        if (this.grid.isInBounds(next.col, next.row) && !visited.has(key)) {
          visited.add(key);
          const tile = this.grid.getTile(next.col, next.row);
          const isSafe = !threatMap[next.col]?.[next.row] && !lethalMap[next.col]?.[next.row];
          if (tile === TileType.EMPTY && isSafe) {
            queue.push({ pos: next, path: [...path, next] });
          }
        }
      }
    }

    return null;
  }
}
