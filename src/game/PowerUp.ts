import * as THREE from 'three';
import { PowerUpType, FLOOR_HEIGHT, POWERUP_COLORS } from './constants';
import { Grid } from './Grid';

export class PowerUp {
  public col: number;
  public row: number;
  public type: PowerUpType;
  public mesh: THREE.Group;
  public isCollected: boolean = false;
  
  public spawnTime: number = Date.now();
  private timeOffset: number;
  private baseY: number = FLOOR_HEIGHT + 0.55;

  private haloRing: THREE.Mesh;
  private haloDisc: THREE.Mesh;

  constructor(col: number, row: number, type: PowerUpType, mesh: THREE.Group, grid: Grid) {
    this.col = col;
    this.row = row;
    this.type = type;
    this.mesh = mesh;
    this.timeOffset = Math.random() * Math.PI * 2;
    this.spawnTime = Date.now();

    const worldPos = grid.gridToWorld(col, row, this.baseY);
    this.mesh.position.copy(worldPos);

    // Configure 3D model materials: preserve rich authentic colors and contrast,
    // calibrating emissive accents so they glow vibrantly without burning out to white in ACES tone mapping
    const colors = POWERUP_COLORS[type] || { main: 0x00f5ff, glow: 0x00d2ff, name: 'POWERUP' };

    this.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const std = mat as THREE.MeshStandardMaterial;
          if (std && std.isMeshStandardMaterial) {
            // Check if this material has an emissive accent (runes, flame cores, arrows, radar screens)
            const hasEmissive = std.emissive && (std.emissive.r > 0.02 || std.emissive.g > 0.02 || std.emissive.b > 0.02);
            if (hasEmissive) {
              // Vibrant, richly saturated emissive intensity that avoids clipping to pure white
              std.emissiveIntensity = 1.05;
            } else {
              // A faint type-colored lift keeps newly uncovered pickups readable in wall shadows
              // without flattening their iron, leather, and chrome materials.
              std.emissive.setHex(colors.glow);
              std.emissiveIntensity = 0.09;
            }
          }
        }
      }
    });

    // 1. Holographic Floor Energy Ring (NormalBlending preserves pure saturated color without washing out)
    const ringGeo = new THREE.RingGeometry(0.55, 0.78, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colors.main,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.68,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.haloRing = new THREE.Mesh(ringGeo, ringMat);
    this.haloRing.rotation.x = -Math.PI / 2;
    this.haloRing.position.set(0, (FLOOR_HEIGHT + 0.04) - this.baseY, 0);
    this.mesh.add(this.haloRing);

    // 2. Inner Glowing Energy Disc
    const discGeo = new THREE.CircleGeometry(0.52, 32);
    const discMat = new THREE.MeshBasicMaterial({
      color: colors.main,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.24,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.haloDisc = new THREE.Mesh(discGeo, discMat);
    this.haloDisc.rotation.x = -Math.PI / 2;
    this.haloDisc.position.set(0, (FLOOR_HEIGHT + 0.02) - this.baseY, 0);
    this.mesh.add(this.haloDisc);
  }

  public isInvulnerable(): boolean {
    // 900ms protection window to prevent immediate chain reaction detonations from vaporizing freshly revealed power-ups
    return (Date.now() - this.spawnTime) < 900;
  }

  public update(delta: number): void {
    if (this.isCollected) return;

    // Continuous spin of 3D item
    this.mesh.rotation.y += delta * 2.4;

    // Gentle float bobbing of 3D item
    const elapsed = Date.now() * 0.001 + this.timeOffset;
    this.mesh.position.y = this.baseY + Math.sin(elapsed * 3.5) * 0.12;

    // Keep floor halo ring and disc locked to ground level with smooth subtle pulsing
    if (this.haloRing) {
      this.haloRing.position.y = (FLOOR_HEIGHT + 0.04) - this.mesh.position.y;
      this.haloRing.rotation.z += delta * 1.2;
      (this.haloRing.material as THREE.MeshBasicMaterial).opacity = 0.56 + Math.sin(elapsed * 3.5) * 0.12;
    }
    if (this.haloDisc) {
      this.haloDisc.position.y = (FLOOR_HEIGHT + 0.02) - this.mesh.position.y;
      (this.haloDisc.material as THREE.MeshBasicMaterial).opacity = 0.21 + Math.sin(elapsed * 3.5) * 0.05;
    }
  }

  public checkCollection(playerPos: THREE.Vector3): boolean {
    if (this.isCollected) return false;

    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    const distSq = dx * dx + dz * dz;

    // Threshold ~ 1.1 units (responsive pickup radius)
    if (distSq < 1.2) {
      this.isCollected = true;
      return true;
    }
    return false;
  }

  public dispose(scene: THREE.Scene): void {
    if (this.haloRing) {
      this.haloRing.geometry.dispose();
      (this.haloRing.material as THREE.Material).dispose();
    }
    if (this.haloDisc) {
      this.haloDisc.geometry.dispose();
      (this.haloDisc.material as THREE.Material).dispose();
    }
    scene.remove(this.mesh);
  }
}
