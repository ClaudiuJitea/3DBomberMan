export interface InputState {
  moveX: number;
  moveZ: number;
  bomb: boolean;
  restart: boolean;
  pause: boolean;
  mute: boolean;
}

export class InputManager {
  private keys: Map<string, boolean>;
  private p1BombRequested: boolean = false;
  private p2BombRequested: boolean = false;
  private restartRequested: boolean = false;
  private pauseRequested: boolean = false;
  private muteRequested: boolean = false;
  private menuSelectRequested: boolean = false;
  private menuUpRequested: boolean = false;
  private menuDownRequested: boolean = false;
  private modeMenuRequested: boolean = false;
  private p1DetonateRequested: boolean = false;
  private p2DetonateRequested: boolean = false;

  // Virtual touch controls state
  private touchMoveX: number = 0;
  private touchMoveZ: number = 0;

  constructor() {
    this.keys = new Map();
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);

      if (e.code === 'Space') {
        this.p1BombRequested = true;
        this.menuSelectRequested = true;
        e.preventDefault();
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Numpad0') {
        this.p2BombRequested = true;
        this.menuSelectRequested = true;
        e.preventDefault();
      } else if (e.code === 'KeyE') {
        this.p1DetonateRequested = true;
      } else if (e.code === 'ShiftRight' || e.code === 'Numpad1' || e.code === 'Numpad3' || e.code === 'KeyL') {
        this.p2DetonateRequested = true;
      } else if (e.code === 'KeyR') {
        this.restartRequested = true;
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        this.pauseRequested = true;
      } else if (e.code === 'KeyM') {
        this.modeMenuRequested = true;
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.menuUpRequested = true;
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.menuDownRequested = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    // Support window blur
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.touchMoveX = 0;
      this.touchMoveZ = 0;
    });
  }

  public setTouchDirection(x: number, z: number): void {
    this.touchMoveX = x;
    this.touchMoveZ = z;
  }

  public triggerTouchBomb(): void {
    this.p1BombRequested = true;
  }

  public triggerTouchDetonate(): void {
    this.p1DetonateRequested = true;
  }

  public triggerTouchRestart(): void {
    this.restartRequested = true;
  }

  public triggerTouchPause(): void {
    this.pauseRequested = true;
  }

  public triggerTouchMute(): void {
    this.muteRequested = true;
  }

  public triggerModeMenu(): void {
    this.modeMenuRequested = true;
  }

  public getMovement(isStrictTwoPlayer: boolean = false): { x: number; z: number } | null {
    let x = 0;
    let z = 0;

    if (this.keys.get('KeyW')) z -= 1;
    if (this.keys.get('KeyS')) z += 1;
    if (this.keys.get('KeyA')) x -= 1;
    if (this.keys.get('KeyD')) x += 1;

    if (!isStrictTwoPlayer) {
      if (this.keys.get('ArrowUp')) z -= 1;
      if (this.keys.get('ArrowDown')) z += 1;
      if (this.keys.get('ArrowLeft')) x -= 1;
      if (this.keys.get('ArrowRight')) x += 1;
    }

    // Apply touch if keyboard is idle
    if (x === 0 && z === 0) {
      x = this.touchMoveX;
      z = this.touchMoveZ;
    }

    if (x === 0 && z === 0) return null;

    // Favor cardinal directions to prevent accidental diagonal slipping
    if (Math.abs(x) > 0 && Math.abs(z) > 0) {
      if (Math.abs(x) > Math.abs(z)) z = 0;
      else x = 0;
    }

    return { x, z };
  }

  public getP2Movement(): { x: number; z: number } | null {
    let x = 0;
    let z = 0;

    if (this.keys.get('ArrowUp')) z -= 1;
    if (this.keys.get('ArrowDown')) z += 1;
    if (this.keys.get('ArrowLeft')) x -= 1;
    if (this.keys.get('ArrowRight')) x += 1;

    if (x === 0 && z === 0) return null;

    if (Math.abs(x) > 0 && Math.abs(z) > 0) {
      if (Math.abs(x) > Math.abs(z)) z = 0;
      else x = 0;
    }

    return { x, z };
  }

  public consumeBomb(): boolean {
    if (this.p1BombRequested) {
      this.p1BombRequested = false;
      return true;
    }
    return false;
  }

  public consumeP2Bomb(): boolean {
    if (this.p2BombRequested) {
      this.p2BombRequested = false;
      return true;
    }
    return false;
  }

  public consumeDetonate(): boolean {
    if (this.p1DetonateRequested) {
      this.p1DetonateRequested = false;
      return true;
    }
    return false;
  }

  public consumeP2Detonate(): boolean {
    if (this.p2DetonateRequested) {
      this.p2DetonateRequested = false;
      return true;
    }
    return false;
  }

  public consumeRestart(): boolean {
    if (this.restartRequested) {
      this.restartRequested = false;
      return true;
    }
    return false;
  }

  public consumePause(): boolean {
    if (this.pauseRequested) {
      this.pauseRequested = false;
      return true;
    }
    return false;
  }

  public consumeMute(): boolean {
    if (this.muteRequested) {
      this.muteRequested = false;
      return true;
    }
    return false;
  }

  public consumeMenuSelect(): boolean {
    if (this.menuSelectRequested) {
      this.menuSelectRequested = false;
      return true;
    }
    return false;
  }

  public consumeMenuUp(): boolean {
    if (this.menuUpRequested) {
      this.menuUpRequested = false;
      return true;
    }
    return false;
  }

  public consumeMenuDown(): boolean {
    if (this.menuDownRequested) {
      this.menuDownRequested = false;
      return true;
    }
    return false;
  }

  public consumeModeMenu(): boolean {
    if (this.modeMenuRequested) {
      this.modeMenuRequested = false;
      return true;
    }
    return false;
  }

  public clearTransientInputs(): void {
    this.p1BombRequested = false;
    this.p2BombRequested = false;
    this.p1DetonateRequested = false;
    this.p2DetonateRequested = false;
    this.restartRequested = false;
    this.pauseRequested = false;
    this.muteRequested = false;
    this.menuSelectRequested = false;
    this.menuUpRequested = false;
    this.menuDownRequested = false;
    this.modeMenuRequested = false;
  }
}
