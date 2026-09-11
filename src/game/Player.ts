import * as THREE from 'three';
import { GAME_CONFIG, CELL_SIZE, FLOOR_HEIGHT, PowerUpType, DeathType } from './constants';
import { Grid } from './Grid';
import { AudioManager } from './AudioManager';
import { AssetLoader } from './AssetLoader';

interface TrailParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  vel: THREE.Vector3;
}

interface SmokePuff {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface MatBackup {
  mat: THREE.MeshStandardMaterial;
  color: THREE.Color;
  emissive: THREE.Color;
  emissiveIntensity: number;
}

export class Player {
  public mesh: THREE.Group;
  public grid: Grid;
  public audio: AudioManager;
  public scene: THREE.Scene;
  private assets: AssetLoader;

  // Blender 3D Animated Death Models & AnimationMixers
  private deathFireModel: THREE.Group | null = null;
  private deathEnemyModel: THREE.Group | null = null;
  private deathFireMixer: THREE.AnimationMixer | null = null;
  private deathEnemyMixer: THREE.AnimationMixer | null = null;

  // Stats
  public speed: number;
  public maxBombs: number;
  public activeBombs: number = 0;
  public blastRange: number;

  // State
  public isAlive: boolean = true;
  public isDying: boolean = false;
  public deathType: DeathType = DeathType.FIRE;
  private deathTimer: number = 0;
  private fireDeathSubStage: number = 0;
  private enemyDeathSubStage: number = 0;

  // Position & Direction
  public position: THREE.Vector3;
  private targetRotationY: number = 0;

  // Creative Animation State
  private visualWrapper: THREE.Group;
  private innerModel: THREE.Object3D;
  private animTime: number = 0;
  private currentPitch: number = 0;
  private currentRoll: number = 0;
  private plantImpactTime: number = 0;
  private footstepTimer: number = 0;

  // Cyber Ground Halo & Lighting
  private haloMesh: THREE.Mesh;
  private haloMat: THREE.MeshBasicMaterial;
  private heroLight: THREE.PointLight;

  // Articulated Body Limbs
  private legL: THREE.Object3D | null = null;
  private legR: THREE.Object3D | null = null;
  private armL: THREE.Object3D | null = null;
  private armR: THREE.Object3D | null = null;
  private torso: THREE.Object3D | null = null;
  private head: THREE.Object3D | null = null;
  private scarf: THREE.Object3D | null = null;

  // Materials backup for char/restore
  private materialBackups: MatBackup[] = [];

  // Holographic Dizzy Stars (Enemy knockout)
  private dizzyGroup: THREE.Group;

  // Smoke Puffs (Fire death)
  private smokeGeo: THREE.BufferGeometry;
  private smokeMat: THREE.MeshBasicMaterial;
  private smokePuffs: SmokePuff[] = [];

  // Neon Jet Slipstream Particles
  private trailParticles: TrailParticle[] = [];
  private particleGeo: THREE.BufferGeometry;
  private cyanParticleMat: THREE.MeshBasicMaterial;
  private pinkParticleMat: THREE.MeshBasicMaterial;
  private trailSpawnTimer: number = 0;

  // Allow walking away from a bomb just placed on player's current tile
  public activeBombTile: { col: number; row: number } | null = null;
  public isRival: boolean = false;

  constructor(
    col: number,
    row: number,
    mesh: THREE.Group,
    grid: Grid,
    audio: AudioManager,
    scene: THREE.Scene,
    assets: AssetLoader,
    isRival: boolean = false
  ) {
    this.grid = grid;
    this.audio = audio;
    this.scene = scene;
    this.assets = assets;
    this.isRival = isRival;

    this.speed = GAME_CONFIG.player.initialSpeed;
    this.maxBombs = GAME_CONFIG.player.initialBombs;
    this.blastRange = GAME_CONFIG.player.initialRange;

    // Outer root mesh handles world position and yaw (facing angle)
    this.mesh = new THREE.Group();
    this.innerModel = mesh;
    this.innerModel.scale.set(1.28, 1.28, 1.28);

    // Enhance character PBR materials for vibrant glow and readability
    this.innerModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const std = mat as THREE.MeshStandardMaterial;
          if (this.isRival) {
            if (std.name.includes('RivalVisor') || std.name.includes('Visor')) {
              std.emissive = new THREE.Color(0xff0044);
              std.emissiveIntensity = 4.5;
            } else if (std.name.includes('RivalRuby') || std.name.includes('Cape')) {
              std.emissive = new THREE.Color(0xff2a55);
              std.emissiveIntensity = 2.2;
            } else if (std.name.includes('RivalGold')) {
              std.emissive = new THREE.Color(0xffaa00);
              std.emissiveIntensity = 2.5;
            } else if (std.name.includes('RivalDark')) {
              std.roughness = 0.25;
              std.metalness = 0.85;
            }
          } else {
            if (std.name.includes('HeroCyan')) {
              std.emissive = new THREE.Color(0x00f5d4);
              std.emissiveIntensity = 3.5;
            } else if (std.name.includes('HeroPink')) {
              std.emissive = new THREE.Color(0xff007f);
              std.emissiveIntensity = 2.4;
            } else if (std.name.includes('HeroGold')) {
              std.emissive = new THREE.Color(0xffaa00);
              std.emissiveIntensity = 3.0;
            } else if (std.name.includes('HeroWhite')) {
              std.roughness = 0.25;
              std.metalness = 0.15;
            }
          }
          this.materialBackups.push({
            mat: std,
            color: std.color.clone(),
            emissive: std.emissive.clone(),
            emissiveIntensity: std.emissiveIntensity,
          });
        }
      }
    });

    // Visual wrapper handles dynamic pitch lean, banking roll, and squash-stretch
    this.visualWrapper = new THREE.Group();
    this.visualWrapper.add(this.innerModel);
    this.mesh.add(this.visualWrapper);

    // Blender 3D Animated Death Models
    this.deathFireModel = this.assets.cloneModel('player-death-fire');
    this.deathFireModel.scale.set(1.22, 1.22, 1.22);
    this.deathFireModel.visible = false;
    this.visualWrapper.add(this.deathFireModel);

    this.deathEnemyModel = this.assets.cloneModel('player-death-enemy');
    this.deathEnemyModel.scale.set(1.22, 1.22, 1.22);
    this.deathEnemyModel.visible = false;
    this.visualWrapper.add(this.deathEnemyModel);

    // Holographic Dizzy Stars (Enemy knockout)
    this.dizzyGroup = new THREE.Group();
    this.dizzyGroup.visible = false;
    this.visualWrapper.add(this.dizzyGroup);

    const starMat = new THREE.MeshBasicMaterial({ color: 0xffd60a });
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const starGeo = new THREE.OctahedronGeometry(0.12, 0);
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(Math.cos(angle) * 0.46, 1.62, Math.sin(angle) * 0.46);
      this.dizzyGroup.add(star);
    }

    // Smoke Puffs for fire death
    this.smokeGeo = new THREE.SphereGeometry(0.13, 6, 6);
    this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.85 });

    // Dynamic glowing cybernetic ground halo/reticle beneath hover-skates
    const primaryColor = this.isRival ? 0xff2a55 : 0x00f5d4;
    const secondaryColor = this.isRival ? 0xff9900 : 0xff007f;

    const haloGeo = new THREE.RingGeometry(0.38, 0.54, 32);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.70,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
    this.haloMesh.rotation.x = -Math.PI / 2;
    this.haloMesh.position.y = 0.04;
    this.mesh.add(this.haloMesh);

    // Dynamic hero/rival spotlight illuminating corridors
    this.heroLight = new THREE.PointLight(primaryColor, 2.2, 5.5, 2.0);
    this.heroLight.position.set(0, 1.1, 0);
    this.mesh.add(this.heroLight);

    this.position = this.grid.gridToWorld(col, row, FLOOR_HEIGHT);
    this.mesh.position.copy(this.position);

    // Add player root to the scene
    this.scene.add(this.mesh);

    // Query articulated limbs for procedural dynamic animation
    this.legL = this.innerModel.getObjectByName('Leg_L') || null;
    this.legR = this.innerModel.getObjectByName('Leg_R') || null;
    this.armL = this.innerModel.getObjectByName('Arm_L') || null;
    this.armR = this.innerModel.getObjectByName('Arm_R') || null;
    this.torso = this.innerModel.getObjectByName('Torso') || null;
    this.head = this.innerModel.getObjectByName('Head') || null;
    this.scarf = this.innerModel.getObjectByName('Scarf') || null;

    // Particle materials for hover-skate slipstream
    this.particleGeo = new THREE.SphereGeometry(0.06, 6, 6);
    this.cyanParticleMat = new THREE.MeshBasicMaterial({ color: primaryColor, transparent: true, opacity: 0.9 });
    this.pinkParticleMat = new THREE.MeshBasicMaterial({ color: secondaryColor, transparent: true, opacity: 0.9 });
  }

  public dispose(): void {
    this.cleanupDeathEffects();
    this.cleanupParticles();
    if (this.deathFireMixer) {
      this.deathFireMixer.stopAllAction();
      this.deathFireMixer = null;
    }
    if (this.deathEnemyMixer) {
      this.deathEnemyMixer.stopAllAction();
      this.deathEnemyMixer = null;
    }
    this.scene.remove(this.mesh);
  }

  public getGridCoords(): { col: number; row: number } {
    return this.grid.worldToGrid(this.position);
  }

  public triggerBombPlant(): void {
    // Tactile slam-plant spring animation
    this.plantImpactTime = 0.28;
  }

  public update(delta: number, inputDir: { x: number; z: number } | null): void {
    // 1. Update trail particles
    this.updateTrailParticles(delta);

    // 2. Handle death
    if (this.isDying) {
      this.updateDeathAnimation(delta);
      return;
    }
    if (!this.isAlive) return;

    this.animTime += delta;

    // 0. Dynamic Ground Halo Animation
    if (this.haloMesh && this.haloMat) {
      this.haloMesh.rotation.z += delta * 1.8;
      const pulse = 0.65 + Math.sin(this.animTime * 3.8) * 0.18;
      this.haloMat.opacity = pulse;
    }

    let targetPitch = 0;
    let targetRoll = 0;

    if (inputDir) {
      this.move(delta, inputDir);

      // Hero leans forward into the hover sprint (18 degrees = 0.31 rad)
      targetPitch = 0.30;

      // Stride Cadence: dynamic frequency scaled with speed
      const glidePhase = this.animTime * (this.speed * 1.5);
      const legCycle = Math.sin(glidePhase);
      const armCycle = Math.sin(glidePhase);

      // Articulated Leg strides: dynamic alternating forward/backward swing + outward skate push!
      if (this.legL) {
        this.legL.rotation.x = THREE.MathUtils.damp(this.legL.rotation.x, legCycle * 0.65, 20.0, delta);
        this.legL.rotation.z = THREE.MathUtils.damp(this.legL.rotation.z, Math.max(0, -legCycle) * 0.22 - 0.04, 20.0, delta);
      }
      if (this.legR) {
        this.legR.rotation.x = THREE.MathUtils.damp(this.legR.rotation.x, -legCycle * 0.65, 20.0, delta);
        this.legR.rotation.z = THREE.MathUtils.damp(this.legR.rotation.z, -Math.max(0, legCycle) * 0.22 + 0.04, 20.0, delta);
      }

      // Athletic arm pumping (counter to leg swing!)
      if (this.armL) {
        this.armL.rotation.x = THREE.MathUtils.damp(this.armL.rotation.x, -armCycle * 0.55, 20.0, delta);
        this.armL.rotation.z = THREE.MathUtils.damp(this.armL.rotation.z, -0.14 - Math.abs(armCycle) * 0.10, 20.0, delta);
      }
      if (this.armR) {
        this.armR.rotation.x = THREE.MathUtils.damp(this.armR.rotation.x, armCycle * 0.55, 20.0, delta);
        this.armR.rotation.z = THREE.MathUtils.damp(this.armR.rotation.z, 0.14 + Math.abs(armCycle) * 0.10, 20.0, delta);
      }

      // Torso dynamic counter-twist
      if (this.torso) {
        this.torso.rotation.y = THREE.MathUtils.damp(this.torso.rotation.y, legCycle * 0.10, 20.0, delta);
      }

      // Trailing cyber scarf flutter
      if (this.scarf) {
        this.scarf.rotation.x = -0.32 + Math.sin(this.animTime * 18.0) * 0.20;
        this.scarf.rotation.y = Math.cos(this.animTime * 14.0) * 0.15;
      }

      // Floating bob and bank roll
      const bob = Math.abs(Math.sin(glidePhase)) * 0.06;
      this.visualWrapper.position.y = 0.08 + bob;
      targetRoll = Math.sin(glidePhase) * 0.09;
      if (this.head) {
        this.head.rotation.z = -targetRoll * 0.5; // Natural head horizon stabilization
      }

      // Footstep audio at natural cadence
      this.footstepTimer += delta;
      if (this.footstepTimer >= 0.26) {
        this.footstepTimer = 0;
        this.audio.playMove();
      }

      // Spawn glowing hover-skate jet trail particles
      this.trailSpawnTimer += delta;
      if (this.trailSpawnTimer >= 0.035) {
        this.trailSpawnTimer = 0;
        this.spawnJetParticles();
      }
    } else {
      // Idle Hover Suspension: graceful floating breathing
      const idleFloat = Math.sin(this.animTime * 2.4) * 0.04;
      this.visualWrapper.position.y = 0.08 + idleFloat;
      targetPitch = 0;
      targetRoll = Math.sin(this.animTime * 1.8) * 0.03;

      // Smoothly return limbs to idle rest pose
      if (this.head) {
        this.head.rotation.z = THREE.MathUtils.damp(this.head.rotation.z, 0, 10.0, delta);
      }
      if (this.legL) {
        this.legL.rotation.x = THREE.MathUtils.damp(this.legL.rotation.x, 0, 12.0, delta);
        this.legL.rotation.z = THREE.MathUtils.damp(this.legL.rotation.z, -0.05, 12.0, delta);
      }
      if (this.legR) {
        this.legR.rotation.x = THREE.MathUtils.damp(this.legR.rotation.x, 0, 12.0, delta);
        this.legR.rotation.z = THREE.MathUtils.damp(this.legR.rotation.z, 0.05, 12.0, delta);
      }
      if (this.armL) {
        this.armL.rotation.x = THREE.MathUtils.damp(this.armL.rotation.x, 0, 12.0, delta);
        this.armL.rotation.z = THREE.MathUtils.damp(this.armL.rotation.z, -0.10, 12.0, delta);
      }
      if (this.armR) {
        this.armR.rotation.x = THREE.MathUtils.damp(this.armR.rotation.x, 0, 12.0, delta);
        this.armR.rotation.z = THREE.MathUtils.damp(this.armR.rotation.z, 0.10, 12.0, delta);
      }
      if (this.torso) {
        this.torso.rotation.y = THREE.MathUtils.damp(this.torso.rotation.y, 0, 12.0, delta);
      }
      if (this.scarf) {
        this.scarf.rotation.x = THREE.MathUtils.damp(this.scarf.rotation.x, Math.sin(this.animTime * 2.4) * 0.08, 8.0, delta);
        this.scarf.rotation.y = THREE.MathUtils.damp(this.scarf.rotation.y, 0, 8.0, delta);
      }
    }

    // 3. Smooth Damped Animation Smoothing (Eliminates all jitter!)
    this.currentPitch = THREE.MathUtils.damp(this.currentPitch, targetPitch, 14.0, delta);
    this.currentRoll = THREE.MathUtils.damp(this.currentRoll, targetRoll, 14.0, delta);
    this.visualWrapper.rotation.x = this.currentPitch;
    this.visualWrapper.rotation.z = this.currentRoll;

    // 4. Bomb Plant Squash & Stretch Impact Bounce
    if (this.plantImpactTime > 0) {
      this.plantImpactTime = Math.max(0, this.plantImpactTime - delta);
      const impactProgress = this.plantImpactTime / 0.28;
      const squash = 1.0 + Math.sin(impactProgress * Math.PI) * 0.25;
      const stretch = 1.0 - Math.sin(impactProgress * Math.PI) * 0.20;
      this.visualWrapper.scale.set(squash, stretch, squash);
      this.visualWrapper.position.y = Math.max(0, this.visualWrapper.position.y - 0.12 * Math.sin(impactProgress * Math.PI));

      // Legs tuck upward during explosive plant slam!
      const tuck = 0.35 * Math.sin(impactProgress * Math.PI);
      if (this.legL) this.legL.rotation.x = tuck;
      if (this.legR) this.legR.rotation.x = tuck;
    } else {
      this.visualWrapper.scale.set(1, 1, 1);
    }

    // 5. Smooth Yaw (Heading) Rotation
    let diff = this.targetRotationY - this.mesh.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1.0, delta * 20.0);

    // Update internal reference
    this.position.x = this.mesh.position.x;
    this.position.z = this.mesh.position.z;

    // Check if player has cleared the tile where they placed a bomb
    if (this.activeBombTile) {
      const currentGrid = this.getGridCoords();
      if (currentGrid.col !== this.activeBombTile.col || currentGrid.row !== this.activeBombTile.row) {
        this.activeBombTile = null;
      }
    }
  }

  private move(delta: number, input: { x: number; z: number }): void {
    const moveDist = this.speed * delta;
    const { col, row } = this.getGridCoords();
    const cellCenter = this.grid.gridToWorld(col, row, 0);

    const collisionRadius = 0.54; // Half-width for obstacle clearance

    if (input.x !== 0) {
      // Moving along X axis
      this.targetRotationY = input.x > 0 ? Math.PI / 2 : -Math.PI / 2;

      // Silky smooth, critically damped corridor centering on Z (Zero oscillation jitter!)
      this.mesh.position.z = THREE.MathUtils.damp(this.mesh.position.z, cellCenter.z, 20.0, delta);

      // Forward collision detection
      const targetCol = col + (input.x > 0 ? 1 : -1);
      const isTargetWalkable = this.grid.isWalkable(targetCol, row, this.activeBombTile || undefined);

      const nextX = this.mesh.position.x + input.x * moveDist;
      const barrierX = cellCenter.x + (input.x > 0 ? (CELL_SIZE / 2 - collisionRadius) : (-CELL_SIZE / 2 + collisionRadius));

      if (!isTargetWalkable) {
        this.mesh.position.x = input.x > 0 ? Math.min(nextX, barrierX) : Math.max(nextX, barrierX);
      } else {
        this.mesh.position.x = nextX;
      }
    } else if (input.z !== 0) {
      // Moving along Z axis
      this.targetRotationY = input.z > 0 ? 0 : Math.PI;

      // Silky smooth, critically damped corridor centering on X (Zero oscillation jitter!)
      this.mesh.position.x = THREE.MathUtils.damp(this.mesh.position.x, cellCenter.x, 20.0, delta);

      // Forward collision detection
      const targetRow = row + (input.z > 0 ? 1 : -1);
      const isTargetWalkable = this.grid.isWalkable(col, targetRow, this.activeBombTile || undefined);

      const nextZ = this.mesh.position.z + input.z * moveDist;
      const barrierZ = cellCenter.z + (input.z > 0 ? (CELL_SIZE / 2 - collisionRadius) : (-CELL_SIZE / 2 + collisionRadius));

      if (!isTargetWalkable) {
        this.mesh.position.z = input.z > 0 ? Math.min(nextZ, barrierZ) : Math.max(nextZ, barrierZ);
      } else {
        this.mesh.position.z = nextZ;
      }
    }
  }

  private spawnJetParticles(): void {
    // Left & right skate boot jet emitters
    const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);

    for (const side of [-1, 1]) {
      const mat = Math.random() < 0.6 ? this.cyanParticleMat : this.pinkParticleMat;
      const pMesh = new THREE.Mesh(this.particleGeo, mat);

      // Position behind left/right skate
      const spawnPos = this.mesh.position.clone()
        .addScaledVector(rightVec, side * 0.16)
        .addScaledVector(forwardVec, -0.22);
      spawnPos.y = this.mesh.position.y + 0.05 + Math.random() * 0.08;

      pMesh.position.copy(spawnPos);
      this.scene.add(pMesh);

      const vel = forwardVec.clone().negate().multiplyScalar(1.2 + Math.random() * 1.5);
      vel.y = 0.5 + Math.random() * 0.8;
      vel.add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4));

      this.trailParticles.push({
        mesh: pMesh,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.14,
        vel,
      });
    }
  }

  private updateTrailParticles(delta: number): void {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life += delta;

      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y -= 4.0 * delta; // Light gravity

      const progress = p.life / p.maxLife;
      const scale = Math.max(0.01, 1.0 - progress);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.trailParticles.splice(i, 1);
      }
    }
  }

  public applyPowerUp(type: PowerUpType): void {
    switch (type) {
      case PowerUpType.BOMB_COUNT:
        if (this.maxBombs < GAME_CONFIG.player.maxBombs) {
          this.maxBombs++;
        }
        break;
      case PowerUpType.BLAST_RANGE:
        if (this.blastRange < GAME_CONFIG.player.maxRange) {
          this.blastRange++;
        }
        break;
      case PowerUpType.SPEED:
        if (this.speed < GAME_CONFIG.player.maxSpeed) {
          this.speed = Math.min(this.speed + GAME_CONFIG.player.speedStep, GAME_CONFIG.player.maxSpeed);
        }
        break;
    }
  }

  public kill(type: DeathType = DeathType.FIRE): void {
    if (this.isDying || !this.isAlive) return;
    this.isDying = true;
    this.deathType = type;
    this.deathTimer = 0;
    this.fireDeathSubStage = 0;
    this.enemyDeathSubStage = 0;

    // Hide normal player model & halo
    this.innerModel.visible = false;
    if (this.haloMesh) this.haloMesh.visible = false;

    if (type === DeathType.FIRE) {
      this.audio.playFireDeath(0);
      if (this.deathEnemyModel) this.deathEnemyModel.visible = false;

      if (this.deathFireModel) {
        this.deathFireModel.visible = true;
        this.deathFireModel.position.set(0, 0, 0);
        this.deathFireModel.rotation.set(0, 0, 0);

        if (this.deathFireMixer) {
          this.deathFireMixer.stopAllAction();
        }
        this.deathFireMixer = new THREE.AnimationMixer(this.deathFireModel);
        if (this.deathFireModel.animations && this.deathFireModel.animations.length > 0) {
          for (const clip of this.deathFireModel.animations) {
            const action = this.deathFireMixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
          }
        }
      }
    } else {
      this.audio.playEnemyDeathBoing(0);
      if (this.deathFireModel) this.deathFireModel.visible = false;

      if (this.deathEnemyModel) {
        this.deathEnemyModel.visible = true;
        this.deathEnemyModel.position.set(0, 0, 0);
        this.deathEnemyModel.rotation.set(0, 0, 0);

        if (this.deathEnemyMixer) {
          this.deathEnemyMixer.stopAllAction();
        }
        this.deathEnemyMixer = new THREE.AnimationMixer(this.deathEnemyModel);
        if (this.deathEnemyModel.animations && this.deathEnemyModel.animations.length > 0) {
          for (const clip of this.deathEnemyModel.animations) {
            const action = this.deathEnemyMixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
          }
        }
      }
    }
  }

  private updateDeathAnimation(delta: number): void {
    this.deathTimer += delta;
    this.updateSmokePuffs(delta);

    if (this.deathType === DeathType.FIRE) {
      if (this.deathFireMixer) {
        this.deathFireMixer.update(delta);
      }
      this.updateFireDeathSounds();
    } else {
      if (this.deathEnemyMixer) {
        this.deathEnemyMixer.update(delta);
      }
      this.updateEnemyDeathSounds();
    }
  }

  private spawnSmokePuff(pos: THREE.Vector3, vel: THREE.Vector3): void {
    const pMesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
    pMesh.position.copy(pos);
    this.scene.add(pMesh);
    this.smokePuffs.push({
      mesh: pMesh,
      vel,
      life: 0,
      maxLife: 0.45 + Math.random() * 0.25,
    });
  }

  private updateSmokePuffs(delta: number): void {
    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const p = this.smokePuffs[i];
      p.life += delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y += 0.8 * delta;

      const progress = p.life / p.maxLife;
      const scale = 1.0 + progress * 2.2;
      p.mesh.scale.set(scale, scale, scale);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, 0.85 * (1.0 - progress));
      }

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.smokePuffs.splice(i, 1);
      }
    }
  }

  private updateFireDeathSounds(): void {
    const t = this.deathTimer;

    // Stage 1: Ash crumble poof sound at ~0.67s (Blender Frame 20)
    if (t >= 0.67 && this.fireDeathSubStage === 0) {
      this.fireDeathSubStage = 1;
      this.audio.playFireDeath(2);
      // Puff of smoke when body crumbles into ash mound
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const vel = new THREE.Vector3(Math.cos(a) * 1.8, 0.5, Math.sin(a) * 1.8);
        this.spawnSmokePuff(this.mesh.position.clone(), vel);
      }
    }
    // Stage 2: First eyelid blink chirp at ~1.23s (Blender Frame 37)
    else if (t >= 1.23 && this.fireDeathSubStage === 1) {
      this.fireDeathSubStage = 2;
      this.audio.playFireDeath(3);
    }
    // Stage 3: Second eyelid blink chirp at ~1.57s (Blender Frame 47)
    else if (t >= 1.57 && this.fireDeathSubStage === 2) {
      this.fireDeathSubStage = 3;
      this.audio.playFireDeath(3);
    }
    // Stage 4: Eyeball marble bounce sound at ~2.13s (Blender Frame 64)
    else if (t >= 2.13 && this.fireDeathSubStage === 3) {
      this.fireDeathSubStage = 4;
      this.audio.playFireDeath(4);
    }

    if (t >= 3.0) {
      this.isDying = false;
      this.isAlive = false;
      this.cleanupParticles();
      this.cleanupDeathEffects();
    }
  }

  private updateEnemyDeathSounds(): void {
    const t = this.deathTimer;

    // Stage 1: Explosive Blood & Remains POP at ~1.03s (Blender Frame 31)
    if (t >= 1.03 && this.enemyDeathSubStage === 0) {
      this.enemyDeathSubStage = 1;
      this.audio.playEnemyDeathBoing(1);
    }
    // Stage 2: Celestial Angelic Harp Arpeggio as Soul ascends to heaven at ~1.25s (Blender Frame 38)
    else if (t >= 1.25 && this.enemyDeathSubStage === 1) {
      this.enemyDeathSubStage = 2;
      this.audio.playEnemyDeathBoing(2);
    }

    if (t >= 3.0) {
      this.isDying = false;
      this.isAlive = false;
      this.cleanupParticles();
      this.cleanupDeathEffects();
    }
  }

  private cleanupDeathEffects(): void {
    for (const p of this.smokePuffs) {
      this.scene.remove(p.mesh);
    }
    this.smokePuffs = [];

    if (this.deathFireMixer) {
      this.deathFireMixer.stopAllAction();
    }
    if (this.deathEnemyMixer) {
      this.deathEnemyMixer.stopAllAction();
    }
    if (this.deathFireModel) {
      this.deathFireModel.visible = false;
    }
    if (this.deathEnemyModel) {
      this.deathEnemyModel.visible = false;
    }
    if (this.haloMat) {
      this.haloMat.color.setHex(0x00f5d4);
      this.haloMat.opacity = 0.70;
    }
  }

  private cleanupParticles(): void {
    for (const p of this.trailParticles) {
      this.scene.remove(p.mesh);
    }
    this.trailParticles = [];
  }

  public reset(col: number, row: number): void {
    this.cleanupParticles();
    this.cleanupDeathEffects();

    this.speed = GAME_CONFIG.player.initialSpeed;
    this.maxBombs = GAME_CONFIG.player.initialBombs;
    this.activeBombs = 0;
    this.blastRange = GAME_CONFIG.player.initialRange;
    this.isAlive = true;
    this.isDying = false;
    this.deathTimer = 0;
    this.fireDeathSubStage = 0;
    this.enemyDeathSubStage = 0;
    this.activeBombTile = null;

    this.currentPitch = 0;
    this.currentRoll = 0;
    this.plantImpactTime = 0;

    // Reset limbs to neutral rest pose
    if (this.head) this.head.rotation.set(0, 0, 0);
    if (this.legL) this.legL.rotation.set(0, 0, 0);
    if (this.legR) this.legR.rotation.set(0, 0, 0);
    if (this.armL) this.armL.rotation.set(0, 0, 0);
    if (this.armR) this.armR.rotation.set(0, 0, 0);
    if (this.torso) this.torso.rotation.set(0, 0, 0);
    if (this.scarf) this.scarf.rotation.set(0, 0, 0);

    this.position = this.grid.gridToWorld(col, row, FLOOR_HEIGHT);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, 0, 0);
    this.visualWrapper.rotation.set(0, 0, 0);
    this.visualWrapper.scale.set(1, 1, 1);
    this.visualWrapper.position.set(0, 0.08, 0);
    this.innerModel.visible = true;
    if (this.haloMesh) this.haloMesh.visible = true;
    this.mesh.visible = true;
  }
}
