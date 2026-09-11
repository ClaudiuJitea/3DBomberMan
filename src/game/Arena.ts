import * as THREE from 'three';
import { TileType, PowerUpType, GAME_CONFIG, StageDefinition, StageTheme, STAGE_DEFINITIONS } from './constants';
import { Grid } from './Grid';
import { AssetLoader } from './AssetLoader';
import { PowerUp } from './PowerUp';

export interface BlockEntity {
  col: number;
  row: number;
  mesh: THREE.Group;
}

export interface DebrisParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Arena {
  public scene: THREE.Scene;
  public grid: Grid;
  public assets: AssetLoader;
  private currentStageDef: StageDefinition = STAGE_DEFINITIONS[0];

  private floorTiles: THREE.Group[] = [];
  private solidWalls: THREE.Group[] = [];
  private blocks: Map<string, BlockEntity> = new Map();
  private props: THREE.Group[] = [];
  private powerups: PowerUp[] = [];
  private debrisList: DebrisParticle[] = [];

  constructor(scene: THREE.Scene, grid: Grid, assets: AssetLoader) {
    this.scene = scene;
    this.grid = grid;
    this.assets = assets;
  }

  public generate(stageDef: StageDefinition = STAGE_DEFINITIONS[0]): void {
    this.clear();
    this.grid.reset();
    this.currentStageDef = stageDef;

    // 0. Grand Floating Arena Platform Base
    const arenaBaseMesh = this.assets.cloneModel('arena-base');
    arenaBaseMesh.position.set(0, 0, 0);
    this.scene.add(arenaBaseMesh);
    this.props.push(arenaBaseMesh);

    // 1. Generate Floor Tiles across whole arena using Stage Theme Model
    const floorKey = stageDef.floorModel || 'floor-tile';
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const floorMesh = this.assets.cloneModel(floorKey);
        const pos = this.grid.gridToWorld(c, r, 0);
        floorMesh.position.copy(pos);
        this.scene.add(floorMesh);
        this.floorTiles.push(floorMesh);
      }
    }

    // 2. Build Outer Perimeter Solid Walls and Fixed Inner Pillars using Stage Wall Model
    const wallKey = stageDef.wallModel || 'solid-wall';
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const isBorder = (c === 0 || c === this.grid.cols - 1 || r === 0 || r === this.grid.rows - 1);
        const isInnerPillar = (c % 2 === 0 && r % 2 === 0);

        if (isBorder || isInnerPillar) {
          this.grid.setTile(c, r, TileType.WALL);
          const wallMesh = this.assets.cloneModel(wallKey);
          const pos = this.grid.gridToWorld(c, r, 0);
          wallMesh.position.copy(pos);
          this.scene.add(wallMesh);
          this.solidWalls.push(wallMesh);
        }
      }
    }

    // 3. Populate Randomized Destructible Blocks using Stage Block Model
    const blockKey = stageDef.blockModel || 'breakable-block';
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        if (this.grid.getTile(c, r) !== TileType.EMPTY) continue;
        if (this.grid.isPlayerSpawnZone(c, r)) continue;
        if (this.grid.isEnemySpawnZone(c, r)) continue;

        // ~62% probability for breakable block
        if (Math.random() < 0.62) {
          this.grid.setTile(c, r, TileType.BLOCK);
          const blockMesh = this.assets.cloneModel(blockKey);
          const pos = this.grid.gridToWorld(c, r, 0);
          blockMesh.position.copy(pos);
          this.scene.add(blockMesh);
          this.blocks.set(`${c},${r}`, { col: c, row: r, mesh: blockMesh });
        }
      }
    }

    // 4. Place Decorative Props Outside the Arena Perimeter
    this.placePerimeterProps(stageDef);
  }

  private placePerimeterProps(stageDef: StageDefinition): void {
    const halfW = ((this.grid.cols - 1) / 2) * this.grid.cellSize;
    const halfH = ((this.grid.rows - 1) / 2) * this.grid.cellSize;

    const propList = stageDef.propModels.length > 0 ? stageDef.propModels : ['prop-pillar'];
    const primaryPropKey = propList[0];
    const secondaryPropKey = propList[1] || propList[0];

    // Corner perimeter features
    const cornerOffsets = [
      { x: -halfW - 2.8, z: -halfH - 2.8, rot: 0 },
      { x:  halfW + 2.8, z: -halfH - 2.8, rot: Math.PI / 2 },
      { x: -halfW - 2.8, z:  halfH + 2.8, rot: -Math.PI / 2 },
      { x:  halfW + 2.8, z:  halfH + 2.8, rot: Math.PI },
    ];
    for (const cp of cornerOffsets) {
      const p = this.assets.cloneModel(primaryPropKey);
      p.position.set(cp.x, 0, cp.z);
      p.rotation.y = cp.rot;
      this.scene.add(p);
      this.props.push(p);
    }

    // Decorative perimeter margin elements
    const crystalPositions = [
      { x: -halfW - 3.2, z: 0 },
      { x:  halfW + 3.2, z: 0 },
      { x: 0, z: -halfH - 3.2 },
      { x: 0, z:  halfH + 3.2 },
    ];
    for (const cp of crystalPositions) {
      const crystal = this.assets.cloneModel(secondaryPropKey);
      crystal.position.set(cp.x, 0, cp.z);
      crystal.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(crystal);
      this.props.push(crystal);
    }

    // Midpoint accent consoles
    const termPositions = [
      { x: -halfW - 2.6, z: 4, rot: Math.PI / 2 },
      { x:  halfW + 2.6, z: -4, rot: -Math.PI / 2 },
    ];
    const termKey = propList[2] || secondaryPropKey;
    for (const tp of termPositions) {
      const term = this.assets.cloneModel(termKey);
      term.position.set(tp.x, 0, tp.z);
      term.rotation.y = tp.rot;
      this.scene.add(term);
      this.props.push(term);
    }
  }

  public destroyBlock(col: number, row: number): void {
    const key = `${col},${row}`;
    const block = this.blocks.get(key);
    if (!block) return;

    // Remove block mesh
    this.scene.remove(block.mesh);
    this.blocks.delete(key);
    this.grid.setTile(col, row, TileType.EMPTY);

    // Spawn 3D debris burst
    this.spawnBlockDebris(col, row);

    // Roll for power-up spawn
    if (Math.random() < GAME_CONFIG.powerup.dropChance) {
      this.spawnPowerUp(col, row);
    }
  }

  private spawnBlockDebris(col: number, row: number): void {
    const origin = this.grid.gridToWorld(col, row, 0.8);
    const debrisGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);

    let debrisColor = 0xe07a10;
    let emissiveColor = 0x883300;
    if (this.currentStageDef.theme === StageTheme.MAGMA) {
      debrisColor = 0xff4500;
      emissiveColor = 0xaa2200;
    } else if (this.currentStageDef.theme === StageTheme.TOXIC) {
      debrisColor = 0x22c55e;
      emissiveColor = 0x15803d;
    } else if (this.currentStageDef.theme === StageTheme.CRYO) {
      debrisColor = 0x38bdf8;
      emissiveColor = 0x0284c7;
    }

    const debrisMat = new THREE.MeshStandardMaterial({
      color: debrisColor,
      roughness: 0.5,
      emissive: emissiveColor,
      emissiveIntensity: 1.0,
    });

    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(debrisGeo, debrisMat);
      mesh.position.copy(origin).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.6
      ));
      mesh.castShadow = true;
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6.0,
        3.5 + Math.random() * 4.0,
        (Math.random() - 0.5) * 6.0
      );
      const rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 15.0,
        (Math.random() - 0.5) * 15.0,
        (Math.random() - 0.5) * 15.0
      );

      this.debrisList.push({
        mesh,
        vel,
        rotVel,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.3,
      });
    }
  }

  private spawnPowerUp(col: number, row: number): void {
    const roll = Math.random();
    let type = PowerUpType.BOMB_COUNT;
    let modelKey = 'powerup-bomb';

    if (roll < 0.30) {
      type = PowerUpType.BOMB_COUNT;
      modelKey = 'powerup-bomb';
    } else if (roll < 0.60) {
      type = PowerUpType.BLAST_RANGE;
      modelKey = 'powerup-range';
    } else if (roll < 0.85) {
      type = PowerUpType.SPEED;
      modelKey = 'powerup-speed';
    } else {
      type = PowerUpType.SHIELD;
      modelKey = 'powerup-shield';
    }

    const mesh = this.assets.cloneModel(modelKey);
    this.scene.add(mesh);

    const p = new PowerUp(col, row, type, mesh, this.grid);
    this.powerups.push(p);
  }

  public update(
    delta: number,
    playerPos?: THREE.Vector3,
    onCollect?: (type: PowerUpType) => void,
    secondaryCollector?: { pos: THREE.Vector3; onCollect: (type: PowerUpType) => void }
  ): void {
    // 1. Update powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.update(delta);

      let collected = false;
      if (playerPos && onCollect && pu.checkCollection(playerPos)) {
        onCollect(pu.type);
        collected = true;
      } else if (secondaryCollector && pu.checkCollection(secondaryCollector.pos)) {
        secondaryCollector.onCollect(pu.type);
        collected = true;
      }

      if (collected) {
        pu.dispose(this.scene);
        this.powerups.splice(i, 1);
      }
    }

    // 2. Update debris physics
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.life += delta;
      d.vel.y -= 18.0 * delta; // Gravity

      d.mesh.position.addScaledVector(d.vel, delta);
      d.mesh.rotation.x += d.rotVel.x * delta;
      d.mesh.rotation.y += d.rotVel.y * delta;
      d.mesh.rotation.z += d.rotVel.z * delta;

      // Shrink towards end
      const remaining = Math.max(0, 1.0 - d.life / d.maxLife);
      d.mesh.scale.set(remaining, remaining, remaining);

      if (d.life >= d.maxLife) {
        this.scene.remove(d.mesh);
        this.debrisList.splice(i, 1);
      }
    }
  }

  public getPowerUps(): PowerUp[] {
    return this.powerups;
  }

  public clear(): void {
    for (const t of this.floorTiles) this.scene.remove(t);
    for (const w of this.solidWalls) this.scene.remove(w);
    for (const [, b] of this.blocks) this.scene.remove(b.mesh);
    for (const p of this.props) this.scene.remove(p);
    for (const pu of this.powerups) pu.dispose(this.scene);
    for (const d of this.debrisList) this.scene.remove(d.mesh);

    this.floorTiles = [];
    this.solidWalls = [];
    this.blocks.clear();
    this.props = [];
    this.powerups = [];
    this.debrisList = [];
  }
}
