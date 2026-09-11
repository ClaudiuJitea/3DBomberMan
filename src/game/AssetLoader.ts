import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ASSET_PATHS } from './constants';

export class AssetLoader {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group>;
  private onProgressCallback?: (progress: number, currentAsset: string) => void;

  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
  }

  public setProgressCallback(callback: (progress: number, currentAsset: string) => void): void {
    this.onProgressCallback = callback;
  }

  public async loadAll(): Promise<void> {
    const entries = Object.entries(ASSET_PATHS);
    const total = entries.length;
    let loadedCount = 0;

    await Promise.all(
      entries.map(async ([key, path]) => {
        try {
          const gltf = await this.loader.loadAsync(path);
          const model = gltf.scene;

          // Configure shadows and material properties
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (const m of mats) {
                  const mat = m as THREE.MeshStandardMaterial;
                  // Ensure warm, vibrant, non-inox stylized finish across all 3D assets
                  if (mat.metalness !== undefined) {
                    mat.metalness = Math.min(mat.metalness, 0.20);
                  }
                  if (mat.roughness !== undefined) {
                    mat.roughness = Math.max(mat.roughness, 0.45);
                  }
                  if (mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)) {
                    mat.emissiveIntensity = 3.0;
                  }
                }
              }
            }
          });

          model.animations = gltf.animations || [];
          this.cache.set(key, model);
        } catch (err) {
          console.warn(`[AssetLoader] Failed to load asset "${key}" from ${path}, generating fallback.`, err);
          const fallback = this.createFallback(key);
          this.cache.set(key, fallback);
        } finally {
          loadedCount++;
          const percent = Math.round((loadedCount / total) * 100);
          if (this.onProgressCallback) {
            this.onProgressCallback(percent, key);
          }
        }
      })
    );
  }

  public cloneModel(key: string): THREE.Group {
    const original = this.cache.get(key);
    if (!original) {
      console.warn(`[AssetLoader] Model "${key}" not in cache! Using emergency fallback.`);
      return this.createFallback(key);
    }

    const cloned = original.clone(true);
    // Deep clone materials so individual instances (e.g. flashing bombs or fading flames) can be modified
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });

    cloned.animations = original.animations ? [...original.animations] : [];
    return cloned;
  }

  private createFallback(key: string): THREE.Group {
    const group = new THREE.Group();
    let color = 0x888888;
    if (key.includes('player')) color = 0x00d2ff;
    else if (key.includes('enemy')) color = 0xff4422;
    else if (key.includes('wall')) color = 0x334455;
    else if (key.includes('block')) color = 0xdd7722;
    else if (key.includes('bomb')) color = 0x111111;
    else if (key.includes('explosion')) color = 0xff8800;
    else if (key.includes('powerup')) color = 0xffee00;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 1.6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
    );
    mesh.position.y = 0.8;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }
}
