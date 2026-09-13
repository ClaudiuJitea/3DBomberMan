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
  public health: number = 1;
  public maxHealth: number = 1;
  public static readonly DEATH_VARIANTS: Array<'cuckoo' | 'rocket' | 'balloon' | 'spring'> = [
    'cuckoo',
    'rocket',
    'balloon',
    'spring',
  ];
  public static spawnRotationIndex: number = 0;
  public static deathRotationIndex: number = 0;
  private damageFlashTimer: number = 0;
  private deathTimer: number = 0;
  private deathModel: THREE.Group | null = null;
  private deathRocketModel: THREE.Group | null = null;
  private deathBalloonModel: THREE.Group | null = null;
  private deathSpringModel: THREE.Group | null = null;
  public deathVariant: 'cuckoo' | 'rocket' | 'balloon' | 'spring' = 'cuckoo';
  private deathMixer: THREE.AnimationMixer | null = null;
  private deathAudioStage: number = 0;
  private livingModelChildren: THREE.Object3D[] = [];

  public onCrushBlock?: (col: number, row: number) => void;
  public onEatBomb?: (col: number, row: number) => void;
  public getBombAt?: (col: number, row: number) => boolean;
  public getNearestBomb?: (col: number, row: number) => GridCoord | null;

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
    deathRocketModel?: THREE.Group,
    deathBalloonModel?: THREE.Group,
    deathSpringModel?: THREE.Group,
    callbacks?: {
      onCrushBlock?: (col: number, row: number) => void;
      onEatBomb?: (col: number, row: number) => void;
      getBombAt?: (col: number, row: number) => boolean;
      getNearestBomb?: (col: number, row: number) => GridCoord | null;
    }
  ) {
    this.type = type;
    this.col = col;
    this.row = row;
    this.targetCol = col;
    this.targetRow = row;
    this.mesh = mesh;
    this.grid = grid;
    this.audio = audio;

    if (callbacks) {
      this.onCrushBlock = callbacks.onCrushBlock;
      this.onEatBomb = callbacks.onEatBomb;
      this.getBombAt = callbacks.getBombAt;
      this.getNearestBomb = callbacks.getNearestBomb;
    }

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

    if (deathBalloonModel) {
      this.deathBalloonModel = deathBalloonModel;
      this.deathBalloonModel.visible = false;
      this.mesh.add(this.deathBalloonModel);
    }

    if (deathSpringModel) {
      this.deathSpringModel = deathSpringModel;
      this.deathSpringModel.visible = false;
      this.mesh.add(this.deathSpringModel);
    }

    // Rotate death variant sequentially across spawns
    const availableVariants: ('cuckoo' | 'rocket' | 'balloon' | 'spring')[] = [];
    if (deathModel) availableVariants.push('cuckoo');
    if (deathRocketModel) availableVariants.push('rocket');
    if (deathBalloonModel) availableVariants.push('balloon');
    if (deathSpringModel) availableVariants.push('spring');

    if (availableVariants.length > 0) {
      this.deathVariant = availableVariants[Enemy.spawnRotationIndex % availableVariants.length];
      Enemy.spawnRotationIndex++;
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
    } else if (type === EnemyType.CRUSHER) {
      this.speed = GAME_CONFIG.enemies.crusherSpeed;
    } else if (type === EnemyType.CHOMPER) {
      this.speed = GAME_CONFIG.enemies.chomperSpeed;
    } else if (type === EnemyType.BOSS) {
      this.health = GAME_CONFIG.enemies.bossHealth;
      this.maxHealth = GAME_CONFIG.enemies.bossHealth;
      this.speed = GAME_CONFIG.enemies.bossSpeed;
      this.mesh.scale.set(1.45, 1.45, 1.45);
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

    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      if (this.damageFlashTimer <= 0) {
        this.mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) {
              const std = mat as THREE.MeshStandardMaterial;
              if (std && std.emissive) {
                std.emissive.setHex(0x000000);
                std.emissiveIntensity = 0;
              }
            }
          }
        });
      }
    }

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
    } else if (this.type === EnemyType.CRUSHER) {
      this.mesh.position.y = FLOOR_HEIGHT + 0.12 + Math.abs(Math.sin(this.animTimer * 6.0)) * 0.07;
      this.mesh.rotation.x = Math.sin(this.animTimer * 6.0) * 0.06;
      this.mesh.rotation.z = Math.sin(this.animTimer * 3.0) * 0.04;
    } else if (this.type === EnemyType.CHOMPER) {
      this.mesh.position.y = FLOOR_HEIGHT + 0.20 + Math.sin(this.animTimer * 5.5) * 0.06;
      this.mesh.rotation.x = 0.16 + Math.sin(this.animTimer * 7.0) * 0.08;
      this.mesh.rotation.z = Math.sin(this.animTimer * 4.0) * 0.06;
    } else if (this.type === EnemyType.BOSS) {
      this.mesh.position.y = FLOOR_HEIGHT + 0.22 + Math.sin(this.animTimer * 5.0) * 0.03;
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = Math.sin(this.animTimer * 2.5) * 0.05;
    }

    // Mid-step checks for Crusher block smashing and Chomper bomb eating
    if (this.type === EnemyType.CRUSHER && this.moveProgress >= 0.35) {
      if (this.grid.getTile(this.targetCol, this.targetRow) === TileType.BLOCK) {
        this.onCrushBlock?.(this.targetCol, this.targetRow);
      }
    }
    if (this.type === EnemyType.CHOMPER && this.moveProgress >= 0.30) {
      if (this.grid.getTile(this.targetCol, this.targetRow) === TileType.BOMB || (this.getBombAt && this.getBombAt(this.targetCol, this.targetRow))) {
        this.onEatBomb?.(this.targetCol, this.targetRow);
      }
    }

    // Bomb blocker check for all non-Chomper enemies:
    // If target tile currently has a bomb, enemy CANNOT enter it!
    const isTargetBomb = (this.type !== EnemyType.CHOMPER) && (
      this.grid.getTile(this.targetCol, this.targetRow) === TileType.BOMB ||
      (this.getBombAt ? this.getBombAt(this.targetCol, this.targetRow) : false)
    );

    if (isTargetBomb && (this.targetCol !== this.col || this.targetRow !== this.row)) {
      // Rebound/turn around immediately away from the bomb!
      const safeCol = this.col;
      const safeRow = this.row;
      const blockedCol = this.targetCol;
      const blockedRow = this.targetRow;

      this.col = blockedCol;
      this.row = blockedRow;
      this.targetCol = safeCol;
      this.targetRow = safeRow;

      this.startWorldPos.copy(this.grid.gridToWorld(blockedCol, blockedRow, FLOOR_HEIGHT));
      this.targetWorldPos.copy(this.grid.gridToWorld(safeCol, safeRow, FLOOR_HEIGHT));

      // Clamp progress to prevent penetrating into bomb tile (at most 0.30)
      const clampedProgress = Math.min(0.30, this.moveProgress);
      this.moveProgress = Math.max(0.70, 1.0 - clampedProgress);
      this.currentDir = { col: safeCol - blockedCol, row: safeRow - blockedRow };
      this.mesh.position.lerpVectors(this.startWorldPos, this.targetWorldPos, this.moveProgress);
    }

    // If enemy somehow ended up stationary on a bomb tile, push it off immediately
    if (this.type !== EnemyType.CHOMPER) {
      const isCurrentTileBomb = this.grid.getTile(this.col, this.row) === TileType.BOMB ||
        (this.getBombAt ? this.getBombAt(this.col, this.row) : false);

      if (isCurrentTileBomb && this.moveProgress >= 1.0) {
        const cardinal: GridCoord[] = [
          { col: -this.currentDir.col, row: -this.currentDir.row },
          { col: 1, row: 0 },
          { col: -1, row: 0 },
          { col: 0, row: 1 },
          { col: 0, row: -1 },
        ];
        for (const dir of cardinal) {
          const nc = this.col + dir.col;
          const nr = this.row + dir.row;
          if (this.grid.isWalkable(nc, nr)) {
            this.targetCol = nc;
            this.targetRow = nr;
            this.currentDir = dir;
            this.moveProgress = 0.5;
            this.startWorldPos.copy(this.grid.gridToWorld(this.col, this.row, FLOOR_HEIGHT));
            this.targetWorldPos.copy(this.grid.gridToWorld(nc, nr, FLOOR_HEIGHT));
            this.mesh.position.lerpVectors(this.startWorldPos, this.targetWorldPos, this.moveProgress);
            break;
          }
        }
      }
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

      if (this.type === EnemyType.CRUSHER && this.grid.getTile(this.col, this.row) === TileType.BLOCK) {
        this.onCrushBlock?.(this.col, this.row);
      }

      if (this.type === EnemyType.CHOMPER) {
        if (this.grid.getTile(this.col, this.row) === TileType.BOMB || (this.getBombAt && this.getBombAt(this.col, this.row))) {
          this.onEatBomb?.(this.col, this.row);
        }
      }

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
    const isCrusher = this.type === EnemyType.CRUSHER;
    const isChomper = this.type === EnemyType.CHOMPER;

    for (const dir of cardinal) {
      const nextC = this.col + dir.col;
      const nextR = this.row + dir.row;

      let canPass = false;
      if (isPhantom || isCrusher) {
        canPass = (this.grid.isWalkable(nextC, nextR) || this.grid.getTile(nextC, nextR) === TileType.BLOCK) &&
                  this.grid.getTile(nextC, nextR) !== TileType.BOMB;
      } else if (isChomper) {
        canPass = this.grid.isWalkable(nextC, nextR, true);
      } else {
        const isBomb = this.grid.getTile(nextC, nextR) === TileType.BOMB ||
          (this.getBombAt ? this.getBombAt(nextC, nextR) : false);
        canPass = this.grid.isWalkable(nextC, nextR) && !isBomb;
      }

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

    if (this.type === EnemyType.HUNTER || this.type === EnemyType.BOSS) {
      chosenDir = this.chooseHunterDirection(validMoves, playerCoord);
    } else if (this.type === EnemyType.BLITZ) {
      chosenDir = this.chooseBlitzDirection(validMoves);
    } else if (this.type === EnemyType.PHANTOM) {
      chosenDir = this.choosePhantomDirection(validMoves, playerCoord);
    } else if (this.type === EnemyType.CRUSHER) {
      chosenDir = this.chooseCrusherDirection(validMoves, playerCoord);
    } else if (this.type === EnemyType.CHOMPER) {
      chosenDir = this.chooseChomperDirection(validMoves, playerCoord);
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

  private chooseCrusherDirection(validMoves: GridCoord[], player: GridCoord): GridCoord {
    // Crusher loves to charge straight ahead (70% momentum) smashing anything in front of it
    const keepSame = validMoves.find(
      d => d.col === this.currentDir.col && d.row === this.currentDir.row
    );
    if (keepSame && Math.random() < 0.70) {
      return keepSame;
    }

    // Otherwise, it homes in on the player's position, carving a path through blocks
    if (Math.random() < 0.75) {
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

  private chooseChomperDirection(validMoves: GridCoord[], player: GridCoord): GridCoord {
    // 1. If any adjacent cell has a bomb, IMMEDIATELY CHOMP IT!
    for (const dir of validMoves) {
      const nextC = this.col + dir.col;
      const nextR = this.row + dir.row;
      if (this.grid.getTile(nextC, nextR) === TileType.BOMB || (this.getBombAt && this.getBombAt(nextC, nextR))) {
        return dir;
      }
    }

    // 2. Check if there's any active bomb on the map
    const nearestBomb = this.getNearestBomb ? this.getNearestBomb(this.col, this.row) : null;
    if (nearestBomb) {
      // 85% bias towards the nearest bomb
      if (Math.random() < 0.85) {
        let bestDir = validMoves[0];
        let minDist = Infinity;
        for (const dir of validMoves) {
          const nextC = this.col + dir.col;
          const nextR = this.row + dir.row;
          const dist = Math.abs(nextC - nearestBomb.col) + Math.abs(nextR - nearestBomb.row);
          if (dist < minDist) {
            minDist = dist;
            bestDir = dir;
          }
        }
        return bestDir;
      }
    }

    // 3. If no bombs, Chomper acts as an agile aggressive hunter
    return this.chooseHunterDirection(validMoves, player);
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

    if (this.type === EnemyType.BOSS && this.health > 1) {
      this.health--;
      this.audio.playBossHit();
      this.speed += 0.8;
      this.damageFlashTimer = 0.45;
      this.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            if (std && std.emissive) {
              std.emissive.setHex(0xff2222);
              std.emissiveIntensity = 5.0;
            }
          }
        }
      });
      return;
    }

    if (this.type === EnemyType.BOSS) {
      this.health = 0;
      this.audio.playBossRoar();
    }

    this.isDying = true;
    this.isAlive = false;
    this.deathTimer = 0;
    this.deathAudioStage = 0;

    // Advance death variant rotation so every robot death showcases the next hilarious animation in sequence
    const availableVariants: ('cuckoo' | 'rocket' | 'balloon' | 'spring')[] = [];
    if (this.deathModel) availableVariants.push('cuckoo');
    if (this.deathRocketModel) availableVariants.push('rocket');
    if (this.deathBalloonModel) availableVariants.push('balloon');
    if (this.deathSpringModel) availableVariants.push('spring');

    if (availableVariants.length > 0) {
      this.deathVariant = availableVariants[Enemy.deathRotationIndex % availableVariants.length];
      Enemy.deathRotationIndex++;
    }

    let chosenDeathModel: THREE.Group | null = null;
    if (this.deathVariant === 'spring' && this.deathSpringModel) {
      chosenDeathModel = this.deathSpringModel;
    } else if (this.deathVariant === 'balloon' && this.deathBalloonModel) {
      chosenDeathModel = this.deathBalloonModel;
    } else if (this.deathVariant === 'rocket' && this.deathRocketModel) {
      chosenDeathModel = this.deathRocketModel;
    } else {
      chosenDeathModel = this.deathModel || this.deathRocketModel || this.deathBalloonModel || this.deathSpringModel;
    }

    if (chosenDeathModel) {
      // Rotate dying enemy to face directly towards the camera so the comical death prop (sign, flag, balloon, rocket) is in full view
      this.mesh.rotation.set(0, 0, 0);

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

      if (this.deathVariant === 'spring') {
        this.audio.playEnemySpringDeath(0);
      } else if (this.deathVariant === 'balloon') {
        this.audio.playEnemyBalloonDeath(0);
      } else if (this.deathVariant === 'rocket') {
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

      if (this.deathVariant === 'spring') {
        // Stage 1: Whirring spinning rotor in air at ~0.70s
        if (this.deathTimer >= 0.70 && this.deathAudioStage === 0) {
          this.deathAudioStage = 1;
          this.audio.playEnemySpringDeath(1);
        }
        // Stage 2: Accordion squash metal recoil at ~1.60s
        else if (this.deathTimer >= 1.60 && this.deathAudioStage === 1) {
          this.deathAudioStage = 2;
          this.audio.playEnemySpringDeath(2);
        }
        // Stage 3: Slide whistle plunge + surrender flag honk at ~2.10s
        else if (this.deathTimer >= 2.10 && this.deathAudioStage === 2) {
          this.deathAudioStage = 3;
          this.audio.playEnemySpringDeath(3);
        }
      } else if (this.deathVariant === 'balloon') {
        // Stage 1: Comic slinky spring eye-pop (BOOOIIING!) at ~0.80s (Blender Frame 25)
        if (this.deathTimer >= 0.80 && this.deathAudioStage === 0) {
          this.deathAudioStage = 1;
          this.audio.playEnemyBalloonDeath(1);
        }
        // Stage 2: Heavy stiff-board faceplant impact (THWACK!) at ~1.65s (Blender Frame 56)
        else if (this.deathTimer >= 1.65 && this.deathAudioStage === 1) {
          this.deathAudioStage = 2;
          this.audio.playEnemyBalloonDeath(2);
        }
        // Stage 3: Dizzy stars chirping in circle at ~2.15s (Blender Frame 65)
        else if (this.deathTimer >= 2.15 && this.deathAudioStage === 2) {
          this.deathAudioStage = 3;
          this.audio.playEnemyBalloonDeath(3);
        }
      } else if (this.deathVariant === 'rocket') {
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
