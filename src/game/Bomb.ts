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
  public isRemote: boolean = false;
  public isPierce: boolean = false;

  private initialFuse: number;
  private audio: AudioManager;
  private baseWorldPos: THREE.Vector3;
  private mixer: THREE.AnimationMixer | null = null;
  private lastTickSec: number = 0;
  private beaconMesh: THREE.Mesh | null = null;
  private groundRing: THREE.Mesh | null = null;
  private bodyMaterial: THREE.MeshStandardMaterial | null = null;
  private sparkMeshes: THREE.Mesh[] = [];
  private baseScale: number = 1.0;
  private impactBounce: number = 0;
  private animTime: number = 0;

  constructor(
    col: number,
    row: number,
    blastRange: number,
    mesh: THREE.Group,
    grid: Grid,
    audio: AudioManager,
    owner: any = null,
    isRemote: boolean = false,
    isPierce: boolean = false
  ) {
    this.col = col;
    this.row = row;
    this.blastRange = blastRange;
    this.fuseTimer = GAME_CONFIG.bomb.fuseDuration;
    this.initialFuse = this.fuseTimer;
    this.mesh = mesh;
    this.audio = audio;
    this.owner = owner;
    this.isRemote = isRemote;
    this.isPierce = isPierce;

    // Traverse and enhance materials for razor-sharp visual clarity
    this.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;

        if (m.name.includes('Spark')) {
          this.sparkMeshes.push(m);
        }

        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            const isBombBody = std?.name === 'NormalBomb_Iron' || m.name === 'Bomb_Body';
            if (std?.isMeshStandardMaterial && isBombBody) {
              this.bodyMaterial = std;
              // Keep the shell charcoal-metallic. The previous hot emissive values
              // overwhelmed this base color and made the entire bomb look salmon pink.
              std.color.setHex(0x293447);
              std.roughness = 0.28;
              std.metalness = 0.62;
              std.emissive.setHex(0x000000);
              std.emissiveIntensity = 0;
            } else if (std?.isMeshStandardMaterial && std.name === 'NormalBomb_Collar') {
              std.roughness = 0.20;
              std.metalness = 0.65;
            } else if (std?.isMeshStandardMaterial && std.name.includes('Spark')) {
              std.emissiveIntensity = 4.0;
            }
          }
        }
      }
    });

    if (this.mesh.animations && this.mesh.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.mesh);
      for (const clip of this.mesh.animations) {
        const action = this.mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
      }
    }

    // Crisp glowing ground danger ring under the bomb (guarantees 100% visibility even in dark wall shadows!)
    const ringGeo = new THREE.RingGeometry(0.38, 0.52, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.isRemote ? 0xef4444 : (this.isPierce ? 0xa855f7 : 0xff3b00),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.groundRing = new THREE.Mesh(ringGeo, ringMat);
    this.groundRing.rotation.x = -Math.PI / 2;
    this.groundRing.position.set(0, 0.03, 0);
    this.mesh.add(this.groundRing);

    if (this.isRemote) {
      // Red pulsing remote detonator antenna beacon, matching the remote pickup and HUD action
      const beaconGeo = new THREE.SphereGeometry(0.12, 10, 10);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xff1525,
        roughness: 0.1,
        emissive: 0xff1525,
        emissiveIntensity: 4.5,
      });
      this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      this.beaconMesh.position.set(0, 0.72, 0);
      this.mesh.add(this.beaconMesh);
    }

    if (this.isPierce) {
      // Plasma purple tint for pierce bombs
      this.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.material) {
            const mat = Array.isArray(m.material) ? m.material[0] : m.material;
            if ((mat as THREE.MeshStandardMaterial).emissive) {
              (mat as THREE.MeshStandardMaterial).emissive.setHex(0x9922ee);
              (mat as THREE.MeshStandardMaterial).emissiveIntensity = 2.5;
            }
          }
        }
      });
    }

    this.baseWorldPos = grid.gridToWorld(col, row, FLOOR_HEIGHT);
    this.mesh.position.copy(this.baseWorldPos);

    // Subtle scale modifier based on blast power
    this.baseScale = 1.05 + Math.min(0.25, (blastRange - 1) * 0.04);
    this.mesh.scale.set(this.baseScale, this.baseScale, this.baseScale);

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

      // Clean arcade slide with rapid upright spin (keeps fuse ON TOP and prevents floor clipping!)
      this.mesh.rotation.y += step * 7.5;
      this.mesh.rotation.x = this.moveDir.z * 0.12;
      this.mesh.rotation.z = -this.moveDir.x * 0.12;

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
          this.mesh.rotation.x = 0;
          this.mesh.rotation.z = 0;
          this.impactBounce = 0.22; // Satisfying arcade impact squash & stretch!
          if (grid.isInBounds(this.col, this.row)) {
            grid.setTile(this.col, this.row, TileType.BOMB);
          }
          this.audio.playBombBounce();
        }
      }
    } else {
      // Ensure resting bomb is always perfectly upright
      if (Math.abs(this.mesh.rotation.x) > 0.001) this.mesh.rotation.x = 0;
      if (Math.abs(this.mesh.rotation.z) > 0.001) this.mesh.rotation.z = 0;
    }

    // Impact bounce animation when bomb hits wall / reaches final position
    if (this.impactBounce > 0) {
      this.impactBounce = Math.max(0, this.impactBounce - delta);
      const t = this.impactBounce / 0.22;
      const squash = Math.sin(t * Math.PI) * 0.22;
      this.mesh.scale.set(
        this.baseScale * (1.0 + squash * 0.35),
        this.baseScale * (1.0 - squash * 0.4),
        this.baseScale * (1.0 + squash * 0.35)
      );
    }

    this.animTime += delta;

    const progress = Math.min(1.0, 1.0 - Math.max(0, this.fuseTimer / this.initialFuse));
    const pulseFreq = 3.5 + progress * 14.0;
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * pulseFreq);

    // Dynamic ground danger ring animation (pulsing radius & opacity)
    if (this.groundRing) {
      this.groundRing.scale.setScalar(1.0 + pulse * 0.12);
      (this.groundRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + pulse * 0.35;
    }

    // A restrained colored pulse preserves the dark shell; the ring and fuse carry
    // most of the danger signal without washing the model into a flat bright color.
    if (this.bodyMaterial) {
      if (this.isRemote) {
        this.bodyMaterial.emissive.setHex(0xef4444);
        this.bodyMaterial.emissiveIntensity = 0.20 + pulse * 0.45;
      } else if (this.isPierce) {
        this.bodyMaterial.emissive.setHex(0xa855f7);
        this.bodyMaterial.emissiveIntensity = 0.20 + pulse * 0.50;
      } else {
        // Normal bombs stay gunmetal throughout the fuse. Their animated ring,
        // scale pulse, and sparks provide urgency without recoloring the shell.
        this.bodyMaterial.emissive.setHex(0x000000);
        this.bodyMaterial.emissiveIntensity = 0;
      }
    }

    // Active crackling fuse spark particles
    for (const spark of this.sparkMeshes) {
      spark.rotation.y += delta * 12.0;
      spark.scale.setScalar(0.85 + Math.random() * 0.3);
    }

    if (this.isRemote) {
      if (this.beaconMesh) {
        // High-energy pulsing beacon on remote bomb
        this.beaconMesh.scale.set(1.0 + pulse * 0.4, 1.0 + pulse * 0.4, 1.0 + pulse * 0.4);
      }
      return this.isDetonated;
    }

    this.fuseTimer -= delta;

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
    if (this.groundRing) {
      this.groundRing.geometry.dispose();
      (this.groundRing.material as THREE.Material).dispose();
      this.groundRing = null;
    }
    if (grid && grid.isInBounds(this.col, this.row) && grid.getTile(this.col, this.row) === TileType.BOMB) {
      grid.setTile(this.col, this.row, TileType.EMPTY);
    }
    scene.remove(this.mesh);
  }
}
