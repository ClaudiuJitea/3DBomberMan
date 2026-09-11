import * as THREE from 'three';
import { EnemyType, GAME_CONFIG, CELL_SIZE, FLOOR_HEIGHT, TileType } from './constants';
import { Grid } from './Grid';
import { AudioManager } from './AudioManager';

export interface GridCoord {
  col: number;
  row: number;
}

export class Enemy {
  public type: EnemyType;
  public mesh: THREE.Group;
  public grid: Grid;
  public audio: AudioManager;

  public col: number;
  public row: number;
  public targetCol: number;
  public targetRow: number;
  public speed: number;

  public isAlive: boolean = true;
  public isDying: boolean = false;
  private deathTimer: number = 0;
  private deathModel: THREE.Group | null = null;
  private deathRocketModel: THREE.Group | null = null;
  public deathVariant: 'cuckoo' | 'rocket' = 'cuckoo';
  private deathMixer: THREE.AnimationMixer | null = null;
  private deathAudioStage: number = 0;
  private livingModelChildren: THREE.Object3D[] = [];

  private currentDir: GridCoord = { col: 0, row: 1 };
  private moveProgress: number = 0; // 0 to 1 between current cell and target cell
  private startWorldPos: THREE.Vector3 = new THREE.Vector3();
  private targetWorldPos: THREE.Vector3 = new THREE.Vector3();
  private animTimer: number = Math.random() * 10;

  constructor(
    type: EnemyType,
    col: number,
    row: number,
    mesh: THREE.Group,
    grid: Grid,
    audio: AudioManager,
    deathModel?: THREE.Group,
    deathRocketModel?: THREE.Group
  ) {
    this.type = type;
    this.col = col;
    this.row = row;
    this.targetCol = col;
    this.targetRow = row;
    this.mesh = mesh;
    this.grid = grid;
    this.audio = audio;

    // Track living mesh children so we can hide them when death model activates
    this.livingModelChildren = [...this.mesh.children];

    // Enhance robotic PBR materials and glowing sensors
    this.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const std = mat as THREE.MeshStandardMaterial;
          if (std.name) {
            if (std.name.includes('Eye') || std.name.includes('Visor') || std.name.includes('Glow') || std.name.includes('Exhaust') || std.name.includes('HeatCore')) {
              std.emissiveIntensity = Math.max(std.emissiveIntensity, 4.0);
            }
          }
        }
      }
    });

    if (deathModel) {
      this.deathModel = deathModel;
      this.deathModel.visible = false;
      this.mesh.add(this.deathModel);
    }

    if (deathRocketModel) {
      this.deathRocketModel = deathRocketModel;
      this.deathRocketModel.visible = false;
      this.mesh.add(this.deathRocketModel);
    }

    // Randomly select between the hilarious death animations
    if (deathModel && deathRocketModel) {
      this.deathVariant = Math.random() < 0.5 ? 'cuckoo' : 'rocket';
    } else if (deathRocketModel) {
      this.deathVariant = 'rocket';
    } else {
      this.deathVariant = 'cuckoo';
    }

    if (type === EnemyType.SCOUT) {
      this.speed = GAME_CONFIG.enemies.scoutSpeed;
    } else if (type === EnemyType.HUNTER) {
      this.speed = GAME_CONFIG.enemies.hunterSpeed;
    } else if (type === EnemyType.BLITZ) {
      this.speed = GAME_CONFIG.enemies.blitzSpeed;
    } else if (type === EnemyType.PHANTOM) {
      this.speed = GAME_CONFIG.enemies.phantomSpeed;
    } else {
      this.speed = GAME_CONFIG.enemies.scoutSpeed;
    }

    const initialPos = this.grid.gridToWorld(col, row, FLOOR_HEIGHT);
    this.mesh.position.copy(initialPos);
    this.startWorldPos.copy(initialPos);
    this.targetWorldPos.copy(initialPos);

    // Initial direction
    this.pickNextTarget({ col: 1, row: 1 });
  }

  public update(delta: number, playerCoord: GridCoord): void {
    if (this.isDying) {
      this.updateDeathAnimation(delta);
      return;
    }
    if (!this.isAlive) return;

    // Check if stepped into active fire
    if (this.grid.hasFire(this.col, this.row) || this.grid.hasFire(this.targetCol, this.targetRow)) {
      this.kill();
      return;
    }

    this.animTimer += delta;

    // Smooth organic hover floating according to enemy archetype
    if (this.type === EnemyType.SCOUT) {
      this.mesh.position.y = FLOOR_HEIGHT + 0.16 + Math.sin(this.animTimer * 3.2) * 0.06;
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = 0;
    } else if (this.type === EnemyType.HUNTER) {
      this.mesh.position.y = FLOOR_HEIGHT + 0.18 + Math.sin(this.animTimer * 4.2) * 0.05;
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = 0;
    } else if (this.type === EnemyType.BLITZ) {
      this.mesh.position.y = FLOOR_HEIGHT + 0.17 + Math.sin(this.animTimer * 7.0) * 0.04;
      this.mesh.rotation.x = 0.12 + Math.sin(this.animTimer * 4.5) * 0.05;
      this.mesh.rotation.z = Math.sin(this.animTimer * 3.0) * 0.04;
    } else if (this.type === EnemyType.PHANTOM) {
      this.mesh.position.y = FLOOR_HEIGHT + 0.24 + Math.sin(this.animTimer * 2.2) * 0.10;
      this.mesh.rotation.x = Math.sin(this.animTimer * 1.8) * 0.06;
      this.mesh.rotation.z = Math.sin(this.animTimer * 2.6) * 0.08;
    }

    // Grid step progression
    if (this.moveProgress < 1.0) {
      const step = (this.speed * delta) / CELL_SIZE;
      this.moveProgress = Math.min(1.0, this.moveProgress + step);
      this.mesh.position.lerpVectors(this.startWorldPos, this.targetWorldPos, this.moveProgress);

      // Smooth yaw rotation towards target direction
      if (this.currentDir.col !== 0 || this.currentDir.row !== 0) {
        let targetYaw = 0;
        if (this.currentDir.col > 0) targetYaw = Math.PI / 2;
        else if (this.currentDir.col < 0) targetYaw = -Math.PI / 2;
        else if (this.currentDir.row > 0) targetYaw = 0;
        else if (this.currentDir.row < 0) targetYaw = Math.PI;

        let diff = targetYaw - this.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.mesh.rotation.y += diff * Math.min(1.0, delta * 12.0);
      }
    }

    // Reached destination cell
    if (this.moveProgress >= 1.0) {
      this.col = this.targetCol;
      this.row = this.targetRow;
      this.pickNextTarget(playerCoord);
    }
  }

  private pickNextTarget(playerCoord: GridCoord): void {
    const validMoves: GridCoord[] = [];
    const cardinal: GridCoord[] = [
      { col: 1, row: 0 },
      { col: -1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
    ];

    const isPhantom = this.type === EnemyType.PHANTOM;

    for (const dir of cardinal) {
      const nextC = this.col + dir.col;
      const nextR = this.row + dir.row;
      const canPass = isPhantom
        ? (this.grid.isWalkable(nextC, nextR) || this.grid.getTile(nextC, nextR) === TileType.BLOCK)
        : this.grid.isWalkable(nextC, nextR);

      if (canPass && !this.grid.hasFire(nextC, nextR)) {
        validMoves.push(dir);
      }
    }

    if (validMoves.length === 0) {
      // Trapped! Stay in place
      this.moveProgress = 1.0;
      return;
    }

    let chosenDir: GridCoord;

    if (this.type === EnemyType.HUNTER) {
      chosenDir = this.chooseHunterDirection(validMoves, playerCoord);
    } else if (this.type === EnemyType.BLITZ) {
      chosenDir = this.chooseBlitzDirection(validMoves);
    } else if (this.type === EnemyType.PHANTOM) {
      chosenDir = this.choosePhantomDirection(validMoves, playerCoord);
    } else {
      chosenDir = this.chooseScoutDirection(validMoves);
    }

    this.currentDir = chosenDir;
    this.targetCol = this.col + chosenDir.col;
    this.targetRow = this.row + chosenDir.row;
    this.moveProgress = 0;
    this.startWorldPos.copy(this.grid.gridToWorld(this.col, this.row, 0));
    this.targetWorldPos.copy(this.grid.gridToWorld(this.targetCol, this.targetRow, 0));
  }

  private chooseScoutDirection(validMoves: GridCoord[]): GridCoord {
    const keepSame = validMoves.find(
      d => d.col === this.currentDir.col && d.row === this.currentDir.row
    );
    if (keepSame && Math.random() < 0.70) {
      return keepSame;
    }

    const nonReverse = validMoves.filter(
      d => !(d.col === -this.currentDir.col && d.row === -this.currentDir.row)
    );

    const candidates = nonReverse.length > 0 ? nonReverse : validMoves;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private chooseBlitzDirection(validMoves: GridCoord[]): GridCoord {
    // Blitz Drone aggressively stays on the straight line (92% probability)
    const keepSame = validMoves.find(
      d => d.col === this.currentDir.col && d.row === this.currentDir.row
    );
    if (keepSame && Math.random() < 0.92) {
      return keepSame;
    }

    // When hitting an obstacle, turn perpendicular (non-reverse)
    const nonReverse = validMoves.filter(
      d => !(d.col === -this.currentDir.col && d.row === -this.currentDir.row)
    );

    const candidates = nonReverse.length > 0 ? nonReverse : validMoves;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private choosePhantomDirection(validMoves: GridCoord[], player: GridCoord): GridCoord {
    // Phantom Specter phases toward the player with 80% heuristic bias
    if (Math.random() < 0.80) {
      let bestDir = validMoves[0];
      let minDistance = Infinity;

      for (const dir of validMoves) {
        const nextC = this.col + dir.col;
        const nextR = this.row + dir.row;
        const dist = Math.abs(nextC - player.col) + Math.abs(nextR - player.row);
        if (dist < minDistance) {
          minDistance = dist;
          bestDir = dir;
        }
      }
      return bestDir;
    }

    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  private chooseHunterDirection(validMoves: GridCoord[], player: GridCoord): GridCoord {
    // 1. Check Line-of-sight in straight cardinal line
    if (this.col === player.col) {
      const stepR = Math.sign(player.row - this.row);
      let clear = true;
      for (let r = this.row + stepR; r !== player.row; r += stepR) {
        if (!this.grid.isWalkable(this.col, r)) {
          clear = false;
          break;
        }
      }
      if (clear) {
        const losDir = validMoves.find(d => d.col === 0 && d.row === stepR);
        if (losDir) return losDir;
      }
    } else if (this.row === player.row) {
      const stepC = Math.sign(player.col - this.col);
      let clear = true;
      for (let c = this.col + stepC; c !== player.col; c += stepC) {
        if (!this.grid.isWalkable(c, this.row)) {
          clear = false;
          break;
        }
      }
      if (clear) {
        const losDir = validMoves.find(d => d.col === stepC && d.row === 0);
        if (losDir) return losDir;
      }
    }

    // 2. Minimize Manhattan distance with 85% heuristic
    if (Math.random() < 0.85) {
      let bestDir = validMoves[0];
      let minDistance = Infinity;

      for (const dir of validMoves) {
        const nextC = this.col + dir.col;
        const nextR = this.row + dir.row;
        const dist = Math.abs(nextC - player.col) + Math.abs(nextR - player.row);
        if (dist < minDistance) {
          minDistance = dist;
          bestDir = dir;
        }
      }
      return bestDir;
    }

    // Random fallback
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  public kill(): void {
    if (this.isDying || !this.isAlive) return;
    this.isDying = true;
    this.isAlive = false;
    this.deathTimer = 0;
    this.deathAudioStage = 0;

    const chosenDeathModel = (this.deathVariant === 'rocket' && this.deathRocketModel)
      ? this.deathRocketModel
      : (this.deathModel || this.deathRocketModel);

    if (chosenDeathModel) {
      // Hide living model meshes
      for (const child of this.livingModelChildren) {
        child.visible = false;
      }
      chosenDeathModel.visible = true;
      chosenDeathModel.position.set(0, 0, 0);
      chosenDeathModel.rotation.set(0, 0, 0);

      if (this.deathMixer) {
        this.deathMixer.stopAllAction();
      }
      this.deathMixer = new THREE.AnimationMixer(chosenDeathModel);
      if (chosenDeathModel.animations && chosenDeathModel.animations.length > 0) {
        for (const clip of chosenDeathModel.animations) {
          const action = this.deathMixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
        }
      }

      if (this.deathVariant === 'rocket') {
        this.audio.playEnemyRocketDeath(0);
      } else {
        this.audio.playEnemyRobotDeath(0);
      }
    } else {
      this.audio.playEnemyDeath();
    }
  }

  private updateDeathAnimation(delta: number): void {
    this.deathTimer += delta;

    if (this.deathMixer) {
      this.deathMixer.update(delta);

      if (this.deathVariant === 'rocket') {
        // Rocket Death Stages:
        // Stage 1: Screaming bottle rocket pinwheel whirl at ~0.70s
        if (this.deathTimer >= 0.70 && this.deathAudioStage === 0) {
          this.deathAudioStage = 1;
          this.audio.playEnemyRocketDeath(1);
        }
        // Stage 2: Sputtering engine pop at ~1.70s
        else if (this.deathTimer >= 1.70 && this.deathAudioStage === 1) {
          this.deathAudioStage = 2;
          this.audio.playEnemyRocketDeath(2);
        }
        // Stage 3: Slide whistle plunge & comic metal crash thud at ~2.25s
        else if (this.deathTimer >= 2.25 && this.deathAudioStage === 2) {
          this.deathAudioStage = 3;
          this.audio.playEnemyRocketDeath(3);
        }
      } else {
        // Cuckoo Death Stages:
        // Stage 1: Gear ratchet chug sound at ~0.80s
        if (this.deathTimer >= 0.80 && this.deathAudioStage === 0) {
          this.deathAudioStage = 1;
          this.audio.playEnemyRobotDeath(1);
        }
        // Stage 2: Spring-loaded sign unfurl at ~1.85s
        else if (this.deathTimer >= 1.85 && this.deathAudioStage === 1) {
          this.deathAudioStage = 2;
          this.audio.playEnemyRobotDeath(2);
        }
        // Stage 3: Sad metal bird cuckoo chirp at ~2.15s
        else if (this.deathTimer >= 2.15 && this.deathAudioStage === 2) {
          this.deathAudioStage = 3;
          this.audio.playEnemyRobotDeath(3);
        }
      }

      if (this.deathTimer >= 3.0) {
        this.isDying = false;
        this.isAlive = false;
        this.mesh.visible = false;
      }
    } else {
      // Fallback procedural animation
      this.mesh.rotation.y += delta * 18.0;
      this.mesh.rotation.x += delta * 12.0;

      const progress = Math.min(1.0, this.deathTimer / 0.7);
      const scale = Math.max(0.01, 1.0 - progress);
      this.mesh.scale.set(scale, scale, scale);
      this.mesh.position.y = Math.max(0, 0.4 - progress * 0.4);

      if (this.deathTimer >= 0.7) {
        this.isDying = false;
        this.isAlive = false;
        this.mesh.visible = false;
      }
    }
  }

  public dispose(scene: THREE.Scene): void {
    if (this.deathMixer) {
      this.deathMixer.stopAllAction();
      this.deathMixer = null;
    }
    scene.remove(this.mesh);
  }
}
