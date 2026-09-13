import { GameState, GameMode } from './constants';
import { InputManager } from './InputManager';

export class UIManager {
  private input: InputManager;

  // Mode Selector Elements
  private modeSelectModal: HTMLElement | null;
  private modeCards: HTMLElement[] = [];
  private modeControlsHint: HTMLElement | null;
  private btnStartGame: HTMLElement | null;
  public selectedMode: GameMode = GameMode.CLASSIC;
  private onStartModeCallback: ((mode: GameMode) => void) | null = null;
  private onOpenModeMenuCallback: (() => void) | null = null;

  // DOM Elements
  private loadingOverlay: HTMLElement;
  private loadingBar: HTMLElement;
  private loadingText: HTMLElement;

  private hudContainer: HTMLElement;
  private bombValEl: HTMLElement;
  private rangeValEl: HTMLElement;
  private speedValEl: HTMLElement;
  private enemiesValEl: HTMLElement;
  private shieldValEl: HTMLElement | null;
  private livesValEl: HTMLElement | null;
  private livesMeterEl: HTMLElement | null;
  private hudLivesBadgeValEl: HTMLElement | null;
  private kickValEl: HTMLElement | null;
  private kickMeterEl: HTMLElement | null;

  private timerValEl: HTMLElement | null;
  private timerBadgeEl: HTMLElement | null;
  private hurryUpBannerEl: HTMLElement | null;
  private bossBarEl: HTMLElement | null;
  private bossHpValEl: HTMLElement | null;
  private bossHpFillEl: HTMLElement | null;

  private remoteValEl: HTMLElement | null;
  private remoteMeterEl: HTMLElement | null;
  private bombPassValEl: HTMLElement | null;
  private bombPassMeterEl: HTMLElement | null;
  private pierceValEl: HTMLElement | null;
  private pierceMeterEl: HTMLElement | null;
  private touchDetonateBtn: HTMLElement | null;

  private cardKickEl: HTMLElement | null;
  private cardShieldEl: HTMLElement | null;
  private cardRemoteEl: HTMLElement | null;
  private cardBombPassEl: HTMLElement | null;
  private cardPierceEl: HTMLElement | null;
  private powerupsDividerEl: HTMLElement | null;

  private pauseModal: HTMLElement;
  private winModal: HTMLElement;
  private lossModal: HTMLElement;

  private muteBtn: HTMLElement;

  private rangeMeterEl: HTMLElement | null;
  private bombsMeterEl: HTMLElement | null;
  private speedMeterEl: HTMLElement | null;
  private enemiesMeterEl: HTMLElement | null;
  private shieldMeterEl: HTMLElement | null;
  private upgradeBannerEl: HTMLElement | null;
  private upgradeTextEl: HTMLElement | null;
  private bannerTimer: number | null = null;

  private stageBadgeEl: HTMLElement | null;
  private stageNumEl: HTMLElement | null;
  private stageNameEl: HTMLElement | null;

  private winRibbonTextEl: HTMLElement | null;
  private winBadgeTextEl: HTMLElement | null;
  private winTitleTextEl: HTMLElement | null;
  private winDescTextEl: HTMLElement | null;
  private winActionLabelEl: HTMLElement | null;

  constructor(input: InputManager) {
    this.input = input;

    this.modeSelectModal = document.getElementById('mode-select-modal');
    this.modeCards = Array.from(document.querySelectorAll('.mode-card'));
    this.modeControlsHint = document.getElementById('mode-controls-hint');
    this.btnStartGame = document.getElementById('btn-start-game');

    this.loadingOverlay = document.getElementById('loading-overlay')!;
    this.loadingBar = document.getElementById('loading-progress-bar')!;
    this.loadingText = document.getElementById('loading-status-text')!;

    this.hudContainer = document.getElementById('hud')!;
    this.bombValEl = document.getElementById('stat-bombs-val')!;
    this.rangeValEl = document.getElementById('stat-range-val')!;
    this.speedValEl = document.getElementById('stat-speed-val')!;
    this.enemiesValEl = document.getElementById('stat-enemies-val')!;
    this.shieldValEl = document.getElementById('stat-shield-val');
    this.livesValEl = document.getElementById('stat-lives-val');
    this.livesMeterEl = document.getElementById('stat-lives-meter');
    this.hudLivesBadgeValEl = document.getElementById('hud-lives-badge-val');
    this.kickValEl = document.getElementById('stat-kick-val');
    this.kickMeterEl = document.getElementById('stat-kick-meter');

    this.timerValEl = document.getElementById('hud-timer-val');
    this.timerBadgeEl = document.getElementById('hud-timer-badge');
    this.hurryUpBannerEl = document.getElementById('hud-hurryup-banner');
    this.bossBarEl = document.getElementById('hud-boss-bar');
    this.bossHpValEl = document.getElementById('boss-hp-val');
    this.bossHpFillEl = document.getElementById('boss-hp-fill');

    this.remoteValEl = document.getElementById('stat-remote-val');
    this.remoteMeterEl = document.getElementById('stat-remote-meter');
    this.bombPassValEl = document.getElementById('stat-bombpass-val');
    this.bombPassMeterEl = document.getElementById('stat-bombpass-meter');
    this.pierceValEl = document.getElementById('stat-pierce-val');
    this.pierceMeterEl = document.getElementById('stat-pierce-meter');
    this.touchDetonateBtn = document.getElementById('touch-detonate');

    this.cardKickEl = document.getElementById('card-kick');
    this.cardShieldEl = document.getElementById('card-shield');
    this.cardRemoteEl = document.getElementById('card-remote');
    this.cardBombPassEl = document.getElementById('card-bombpass');
    this.cardPierceEl = document.getElementById('card-pierce');
    this.powerupsDividerEl = document.getElementById('hud-powerups-divider');

    this.rangeMeterEl = document.getElementById('stat-range-meter');
    this.bombsMeterEl = document.getElementById('stat-bombs-meter');
    this.speedMeterEl = document.getElementById('stat-speed-meter');
    this.enemiesMeterEl = document.getElementById('stat-enemies-meter');
    this.shieldMeterEl = document.getElementById('stat-shield-meter');
    this.upgradeBannerEl = document.getElementById('hud-upgrade-banner');
    this.upgradeTextEl = document.getElementById('hud-upgrade-text');

    this.stageBadgeEl = document.getElementById('hud-stage-badge');
    this.stageNumEl = document.getElementById('hud-stage-num');
    this.stageNameEl = document.getElementById('hud-stage-name');

    this.pauseModal = document.getElementById('pause-modal')!;
    this.winModal = document.getElementById('win-modal')!;
    this.lossModal = document.getElementById('loss-modal')!;

    this.winRibbonTextEl = document.getElementById('win-ribbon-text');
    this.winBadgeTextEl = document.getElementById('win-badge-text');
    this.winTitleTextEl = document.getElementById('win-title-text');
    this.winDescTextEl = document.getElementById('win-desc-text');
    this.winActionLabelEl = document.getElementById('win-action-label');

    this.muteBtn = document.getElementById('btn-mute')!;

    this.setupListeners();
  }

  private setupListeners(): void {
    // Mode selector cards
    this.modeCards.forEach((card) => {
      card.addEventListener('click', () => {
        const mode = card.getAttribute('data-mode') as GameMode;
        if (mode) this.selectMode(mode);
      });
      card.addEventListener('dblclick', () => {
        const mode = card.getAttribute('data-mode') as GameMode;
        if (mode) {
          this.selectMode(mode);
          this.confirmStart();
        }
      });
    });

    // Start Game button
    if (this.btnStartGame) {
      this.btnStartGame.addEventListener('click', () => {
        this.confirmStart();
      });
    }

    // Mode menu return buttons
    document.querySelectorAll('.btn-mode-menu').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.onOpenModeMenuCallback) {
          this.onOpenModeMenuCallback();
        }
      });
    });

    // Restart buttons on modals
    document.querySelectorAll('.btn-restart').forEach(btn => {
      btn.addEventListener('click', () => {
        this.input.triggerTouchRestart();
      });
    });

    // Resume button
    const resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.input.triggerTouchPause();
      });
    }

    // Mute button
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        this.input.triggerTouchMute();
      });
    }

    // Virtual D-Pad buttons
    const btnUp = document.getElementById('touch-up');
    const btnDown = document.getElementById('touch-down');
    const btnLeft = document.getElementById('touch-left');
    const btnRight = document.getElementById('touch-right');
    const btnBomb = document.getElementById('touch-bomb');

    const bindTouchDir = (el: HTMLElement | null, x: number, z: number) => {
      if (!el) return;
      const start = (e: Event) => {
        e.preventDefault();
        this.input.setTouchDirection(x, z);
      };
      const end = (e: Event) => {
        e.preventDefault();
        this.input.setTouchDirection(0, 0);
      };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('pointerleave', end);
    };

    bindTouchDir(btnUp, 0, -1);
    bindTouchDir(btnDown, 0, 1);
    bindTouchDir(btnLeft, -1, 0);
    bindTouchDir(btnRight, 1, 0);

    if (btnBomb) {
      btnBomb.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.triggerTouchBomb();
      });
    }

    if (this.touchDetonateBtn) {
      this.touchDetonateBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.triggerTouchDetonate();
      });
    }
  }

  public setOnStartMode(cb: (mode: GameMode) => void): void {
    this.onStartModeCallback = cb;
  }

  public setOnOpenModeMenu(cb: () => void): void {
    this.onOpenModeMenuCallback = cb;
  }

  public selectMode(mode: GameMode): void {
    this.selectedMode = mode;
    this.modeCards.forEach((c) => {
      if (c.getAttribute('data-mode') === mode) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    if (this.modeControlsHint) {
      if (mode === GameMode.CLASSIC) {
        this.modeControlsHint.innerHTML = `<span class="ctrl-tag">P1 CONTROLS:</span> [W A S D] / [ARROWS] TO MOVE • [SPACE] DROP BOMB`;
      } else if (mode === GameMode.VS_CPU) {
        this.modeControlsHint.innerHTML = `<span class="ctrl-tag">VS COMPUTER:</span> [W A S D] / [ARROWS] TO MOVE • [SPACE] DROP BOMB • OUTSMART THE RIVAL BOT!`;
      } else if (mode === GameMode.LOCAL_2P) {
        this.modeControlsHint.innerHTML = `<span class="ctrl-tag">LOCAL 2P:</span> P1 (CYAN): [W A S D] + [SPACE] &nbsp;|&nbsp; P2 (CRIMSON): [ARROWS] + [ENTER]`;
      }
    }
  }

  public navigateMode(delta: number): void {
    const modes = [GameMode.CLASSIC, GameMode.VS_CPU, GameMode.LOCAL_2P];
    const currentIndex = modes.indexOf(this.selectedMode);
    let nextIndex = (currentIndex + delta) % modes.length;
    if (nextIndex < 0) nextIndex = modes.length - 1;
    this.selectMode(modes[nextIndex]);
  }

  public confirmStart(): void {
    if (this.onStartModeCallback) {
      this.onStartModeCallback(this.selectedMode);
    }
  }

  public isModeSelectorVisible(): boolean {
    return this.modeSelectModal !== null && !this.modeSelectModal.classList.contains('hidden');
  }

  public showModeSelector(): void {
    this.modeSelectModal?.classList.remove('hidden');
    this.pauseModal.classList.add('hidden');
    this.winModal.classList.add('hidden');
    this.lossModal.classList.add('hidden');
    this.hudContainer.classList.add('hidden');
  }

  public hideModeSelector(): void {
    this.modeSelectModal?.classList.add('hidden');
    this.hudContainer.classList.remove('hidden');
  }

  public updateLoading(percent: number, assetKey: string): void {
    if (this.loadingBar) {
      this.loadingBar.style.width = `${percent}%`;
    }
    if (this.loadingText) {
      this.loadingText.textContent = `Assembling 3D Asset: ${assetKey} (${percent}%)`;
    }
  }

  public hideLoading(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('hidden');
    }
    if (this.hudContainer) {
      this.hudContainer.classList.remove('hidden');
    }
  }

  public updateStats(
    bombsAvail: number,
    maxBombs: number,
    range: number,
    speed: number,
    enemies: number,
    hasShield: boolean = false,
    lives: number = 3,
    maxLives: number = 5,
    hasKick: boolean = false,
    hasRemote: boolean = false,
    hasBombPass: boolean = false,
    hasPierce: boolean = false
  ): void {
    if (this.livesValEl) this.livesValEl.textContent = `${lives}/${maxLives}`;
    if (this.hudLivesBadgeValEl) this.hudLivesBadgeValEl.textContent = `${lives}`;

    if (this.livesMeterEl) {
      const pips = this.livesMeterEl.querySelectorAll('.meter-pip');
      pips.forEach((pip, idx) => {
        if (idx < lives) {
          pip.classList.add('active');
        } else {
          pip.classList.remove('active');
        }
      });
    }

    if (this.bombValEl) this.bombValEl.textContent = `${bombsAvail}/${maxBombs}`;
    if (this.rangeValEl) this.rangeValEl.textContent = `${range}/7`;
    if (this.speedValEl) this.speedValEl.textContent = speed.toFixed(1);
    if (this.enemiesValEl) this.enemiesValEl.textContent = `${enemies}`;

    // Dynamically toggle powerup cards: only visible when the player has that powerup!
    this.cardKickEl?.classList.toggle('hidden', !hasKick);
    this.cardShieldEl?.classList.toggle('hidden', !hasShield);
    this.cardRemoteEl?.classList.toggle('hidden', !hasRemote);
    this.cardBombPassEl?.classList.toggle('hidden', !hasBombPass);
    this.cardPierceEl?.classList.toggle('hidden', !hasPierce);

    const hasAnyPowerup = hasKick || hasShield || hasRemote || hasBombPass || hasPierce;
    this.powerupsDividerEl?.classList.toggle('hidden', !hasAnyPowerup);

    if (this.kickValEl) {
      this.kickValEl.textContent = 'READY';
      this.kickValEl.classList.add('kick-active');
    }
    if (this.kickMeterEl) {
      this.kickMeterEl.querySelectorAll('.meter-pip').forEach(p => p.classList.add('active'));
    }

    if (this.shieldValEl) {
      this.shieldValEl.textContent = 'ACTIVE';
      this.shieldValEl.classList.add('shield-active');
    }
    if (this.shieldMeterEl) {
      this.shieldMeterEl.querySelectorAll('.meter-pip').forEach(p => p.classList.add('active'));
    }

    // Remote detonator status
    if (this.remoteValEl) {
      this.remoteValEl.textContent = 'READY';
      this.remoteValEl.classList.add('remote-active');
    }
    if (this.remoteMeterEl) {
      this.remoteMeterEl.querySelectorAll('.meter-pip').forEach(p => p.classList.add('active'));
    }
    if (this.touchDetonateBtn) {
      if (hasRemote) this.touchDetonateBtn.classList.remove('hidden');
      else this.touchDetonateBtn.classList.add('hidden');
    }

    // Bomb pass status
    if (this.bombPassValEl) {
      this.bombPassValEl.textContent = 'ACTIVE';
      this.bombPassValEl.classList.add('bombpass-active');
    }
    if (this.bombPassMeterEl) {
      this.bombPassMeterEl.querySelectorAll('.meter-pip').forEach(p => p.classList.add('active'));
    }

    // Pierce bomb status
    if (this.pierceValEl) {
      this.pierceValEl.textContent = 'ACTIVE';
      this.pierceValEl.classList.add('pierce-active');
    }
    if (this.pierceMeterEl) {
      this.pierceMeterEl.querySelectorAll('.meter-pip').forEach(p => p.classList.add('active'));
    }

    // Update segmented Blast Power meter pips (starts at 1 pip min, fills gradually to 7)
    if (this.rangeMeterEl) {
      const pips = this.rangeMeterEl.querySelectorAll('.meter-pip');
      pips.forEach((pip, idx) => {
        if (idx < range) {
          pip.classList.add('active');
        } else {
          pip.classList.remove('active');
        }
      });
    }

    // Update segmented Bombs meter pips
    if (this.bombsMeterEl) {
      const pips = this.bombsMeterEl.querySelectorAll('.meter-pip');
      pips.forEach((pip, idx) => {
        if (idx < maxBombs) {
          pip.classList.add('active');
          if (idx < bombsAvail) {
            pip.classList.add('ready');
          } else {
            pip.classList.remove('ready');
          }
        } else {
          pip.classList.remove('active', 'ready');
        }
      });
    }

    // Update Speed gauge pips
    if (this.speedMeterEl) {
      const pips = this.speedMeterEl.querySelectorAll('.meter-pip');
      const speedLevel = Math.round((speed - 4.8) / 0.8) + 1;
      pips.forEach((pip, idx) => {
        if (idx < speedLevel) {
          pip.classList.add('active');
        } else {
          pip.classList.remove('active');
        }
      });
    }

    // Update Enemy danger pips
    if (this.enemiesMeterEl) {
      const pips = this.enemiesMeterEl.querySelectorAll('.meter-pip');
      pips.forEach((pip, idx) => {
        if (idx < enemies) {
          pip.classList.add('active');
        } else {
          pip.classList.remove('active');
        }
      });
    }
  }

  public triggerPowerUpFeedback(type: string, currentVal: number, maxVal: number): void {
    let cardId = '';
    let label = '';

    if (type === 'BLAST_RANGE') {
      cardId = 'card-blast-power';
      label = `BLAST POWER UPGRADE [LEVEL ${currentVal}/${maxVal}]`;
    } else if (type === 'BOMB_COUNT') {
      cardId = 'card-bombs';
      label = `BOMB CAPACITY UPGRADE [MAX ${maxVal}]`;
    } else if (type === 'SPEED') {
      cardId = 'card-speed';
      label = `VELOCITY THRUSTER BOOST`;
    } else if (type === 'SHIELD') {
      cardId = 'card-shield';
      label = `CYBER SHIELD ONLINE [1-HIT FORCE FIELD]`;
    } else if (type === 'EXTRA_LIFE') {
      cardId = 'card-lives';
      label = `EXTRA LIFE RESTORED [+1 LIFE (${currentVal}/${maxVal})]`;
    } else if (type === 'BOMB_KICK') {
      cardId = 'card-kick';
      label = `BOMB KICK POWER-UP ONLINE [WALK INTO BOMBS TO SLIDE THEM]`;
    } else if (type === 'REMOTE_CONTROL') {
      cardId = 'card-remote';
      label = `REMOTE DETONATOR ONLINE [PRESS 'E' TO TRIGGER]`;
    } else if (type === 'BOMB_PASS') {
      cardId = 'card-bombpass';
      label = `BOMB PASS POWER-UP ACTIVE [WALK THROUGH BOMBS]`;
    } else if (type === 'PIERCE_BOMB') {
      cardId = 'card-pierce';
      label = `PIERCE BOMB POWER-UP ONLINE [FLAME PENETRATES BLOCKS]`;
    } else if (type === 'FULL_FIRE') {
      cardId = 'card-blast-power';
      label = `GOLDEN FLAME! MAXIMUM BLAST RANGE [7/7]`;
    }

    const card = document.getElementById(cardId);
    if (card) {
      card.classList.remove('card-upgrade-flash');
      void card.offsetWidth;
      card.classList.add('card-upgrade-flash');
    }

    if (this.upgradeBannerEl && this.upgradeTextEl) {
      this.upgradeTextEl.textContent = label;
      this.upgradeBannerEl.classList.remove('hidden');

      if (this.bannerTimer !== null) {
        window.clearTimeout(this.bannerTimer);
      }
      this.bannerTimer = window.setTimeout(() => {
        this.upgradeBannerEl?.classList.add('hidden');
        this.bannerTimer = null;
      }, 1500);
    }
  }

  public triggerLifeLostNotification(livesRemaining: number, customMessage?: string): void {
    const card = document.getElementById('card-lives');
    if (card) {
      card.classList.remove('card-upgrade-flash');
      void card.offsetWidth;
      card.classList.add('card-upgrade-flash');
    }

    if (this.upgradeBannerEl && this.upgradeTextEl) {
      this.upgradeTextEl.textContent = customMessage || `LIFE LOST! ${livesRemaining} ${livesRemaining === 1 ? 'LIFE' : 'LIVES'} REMAINING`;
      this.upgradeBannerEl.classList.remove('hidden');

      if (this.bannerTimer !== null) {
        window.clearTimeout(this.bannerTimer);
      }
      this.bannerTimer = window.setTimeout(() => {
        this.upgradeBannerEl?.classList.add('hidden');
        this.bannerTimer = null;
      }, 2400);
    }
  }

  public setMuteIcon(muted: boolean): void {
    if (this.muteBtn) {
      this.muteBtn.setAttribute('aria-pressed', String(muted));
      this.muteBtn.setAttribute('aria-label', muted ? 'Enable audio' : 'Mute audio');
      const iconContainer = document.getElementById('mute-icon-container');
      const textLabel = document.getElementById('mute-text-label');
      if (iconContainer) {
        iconContainer.innerHTML = muted
          ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(244,63,94,0.2)"/>
              <line x1="23" y1="9" x2="17" y2="15" stroke="#f43f5e"/>
              <line x1="17" y1="9" x2="23" y2="15" stroke="#f43f5e"/>
            </svg>`
          : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ff8c26" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(255,140,38,0.2)"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>`;
      }
      if (textLabel) {
        textLabel.textContent = 'AUDIO';
      }
      const statusVal = document.getElementById('mute-status-val');
      if (statusVal) {
        statusVal.textContent = muted ? 'OFF' : 'ON';
        statusVal.classList.toggle('muted', muted);
      }
    }
  }

  public showStateModal(state: GameState): void {
    this.pauseModal.classList.add('hidden');
    this.winModal.classList.add('hidden');
    this.lossModal.classList.add('hidden');

    if (state === GameState.PAUSED) {
      this.pauseModal.classList.remove('hidden');
    } else if (state === GameState.WON) {
      this.winModal.classList.remove('hidden');
    } else if (state === GameState.LOST) {
      this.lossModal.classList.remove('hidden');
    }
  }

  public updateStageDisplay(stageNum: number, stageName: string, theme?: string): void {
    if (this.stageNumEl) {
      this.stageNumEl.textContent = `STAGE ${stageNum}`;
    }
    if (this.stageNameEl) {
      this.stageNameEl.textContent = stageName;
    }
    const themeKey = (theme || 'cyber').toLowerCase();
    if (this.stageBadgeEl) {
      this.stageBadgeEl.setAttribute('data-theme', themeKey);
    }
    const hudContainer = document.getElementById('hud');
    if (hudContainer) {
      hudContainer.setAttribute('data-theme', themeKey);
    }
  }

  public configureVictoryModal(isCampaignComplete: boolean, currentStageNum: number, nextStageName?: string): void {
    if (!isCampaignComplete) {
      if (this.winRibbonTextEl) this.winRibbonTextEl.textContent = 'SECTOR SECURED // TRANSIT READY';
      if (this.winBadgeTextEl) this.winBadgeTextEl.textContent = 'SECTOR HOSTILES CLEARED';
      if (this.winTitleTextEl) this.winTitleTextEl.textContent = `STAGE ${currentStageNum} CLEARED`;
      if (this.winDescTextEl) {
        this.winDescTextEl.textContent = `Sector threat neutralized! Prepare to advance to ${nextStageName || 'the next combat zone'}.`;
      }
      if (this.winActionLabelEl) this.winActionLabelEl.textContent = 'NEXT STAGE (R)';
    } else {
      if (this.winRibbonTextEl) this.winRibbonTextEl.textContent = 'CAMPAIGN COMPLETE // ARENA MASTER';
      if (this.winBadgeTextEl) this.winBadgeTextEl.textContent = 'ALL 4 STAGES CONQUERED';
      if (this.winTitleTextEl) this.winTitleTextEl.textContent = 'CAMPAIGN VICTORY';
      if (this.winDescTextEl) {
        this.winDescTextEl.textContent = 'You have dismantled every rogue mech across all themed sectors! Total victory achieved.';
      }
      if (this.winActionLabelEl) this.winActionLabelEl.textContent = 'PLAY AGAIN (R)';
    }
  }

  public configureVersusVictory(winner: 'p1' | 'p2' | 'draw'): void {
    if (winner === 'draw') {
      if (this.winRibbonTextEl) this.winRibbonTextEl.textContent = 'LOCAL SHOWDOWN // MUTUAL DESTRUCTION';
      if (this.winBadgeTextEl) this.winBadgeTextEl.textContent = 'DOUBLE KNOCKOUT';
      if (this.winTitleTextEl) this.winTitleTextEl.textContent = 'DRAW // BOTH DOWN';
      if (this.winDescTextEl) {
        this.winDescTextEl.textContent = 'Both bombers detonated in the same blast shockwave! Rematch to settle the score.';
      }
      if (this.winActionLabelEl) this.winActionLabelEl.textContent = 'REMATCH (R)';
    } else if (winner === 'p1') {
      if (this.winRibbonTextEl) this.winRibbonTextEl.textContent = 'ARENA DUEL // PLAYER 1 PREVAILS';
      if (this.winBadgeTextEl) this.winBadgeTextEl.textContent = 'CYAN BOMBER VICTORIOUS';
      if (this.winTitleTextEl) this.winTitleTextEl.textContent = 'PLAYER 1 WINS!';
      if (this.winDescTextEl) {
        this.winDescTextEl.textContent = 'Player 1 trapped and dismantled the rival with superior tactical bomb placement!';
      }
      if (this.winActionLabelEl) this.winActionLabelEl.textContent = 'REMATCH (R)';
    } else if (winner === 'p2') {
      if (this.winRibbonTextEl) this.winRibbonTextEl.textContent = 'LOCAL SHOWDOWN // PLAYER 2 PREVAILS';
      if (this.winBadgeTextEl) this.winBadgeTextEl.textContent = 'CRIMSON RIVAL VICTORIOUS';
      if (this.winTitleTextEl) this.winTitleTextEl.textContent = 'PLAYER 2 WINS!';
      if (this.winDescTextEl) {
        this.winDescTextEl.textContent = 'Player 2 trapped and blasted Player 1 to claim supreme arena dominance!';
      }
      if (this.winActionLabelEl) this.winActionLabelEl.textContent = 'REMATCH (R)';
    }
  }

  public configureVersusDefeat(byRival: boolean = true): void {
    const lossTitleEl = this.lossModal.querySelector('.loss-title');
    const lossDescEl = this.lossModal.querySelector('.modal-desc');
    const lossBadgeEl = this.lossModal.querySelector('.defeat-badge span');
    const lossRibbonEl = this.lossModal.querySelector('.defeat-ribbon .ribbon-text');

    if (byRival) {
      if (lossRibbonEl) lossRibbonEl.textContent = 'RIVAL ENCOUNTER // TACTICAL FAILURE';
      if (lossBadgeEl) lossBadgeEl.textContent = 'BLASTED BY RIVAL BOT';
      if (lossTitleEl) lossTitleEl.textContent = 'RIVAL BOT WINS';
      if (lossDescEl) lossDescEl.textContent = 'The AI rival bot predicted your trajectory and blew you out of the arena. Adapt your tactics and retry!';
    }
  }

  public configureClassicDefeat(): void {
    const lossTitleEl = this.lossModal.querySelector('.loss-title');
    const lossDescEl = this.lossModal.querySelector('.modal-desc');
    const lossBadgeEl = this.lossModal.querySelector('.defeat-badge span');
    const lossRibbonEl = this.lossModal.querySelector('.defeat-ribbon .ribbon-text');

    if (lossRibbonEl) lossRibbonEl.textContent = 'MISSION STATUS // RUN TERMINATED';
    if (lossBadgeEl) lossBadgeEl.textContent = 'PLAYER SIGNAL LOST';
    if (lossTitleEl) lossTitleEl.textContent = 'BLASTED OUT';
    if (lossDescEl) lossDescEl.textContent = 'You were caught in the blast zone. Reset the grid and make the next fuse count.';
  }

  public updateTimer(seconds: number): void {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (this.timerValEl) {
      this.timerValEl.textContent = formatted;
    }
    if (this.timerBadgeEl) {
      if (seconds <= 45 && seconds > 0) {
        this.timerBadgeEl.classList.add('hurry-up');
      } else {
        this.timerBadgeEl.classList.remove('hurry-up');
      }
    }
  }

  public showHurryUpBanner(): void {
    if (this.hurryUpBannerEl) {
      this.hurryUpBannerEl.classList.remove('hidden');
      window.setTimeout(() => {
        this.hurryUpBannerEl?.classList.add('hidden');
      }, 3500);
    }
  }

  public hideHurryUpBanner(): void {
    if (this.hurryUpBannerEl) {
      this.hurryUpBannerEl.classList.add('hidden');
    }
  }

  public updateBossHealth(health: number, maxHealth: number): void {
    if (this.bossBarEl) {
      this.bossBarEl.classList.remove('hidden');
    }
    if (this.bossHpValEl) {
      this.bossHpValEl.textContent = `${health}/${maxHealth} HP`;
    }
    if (this.bossHpFillEl) {
      const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
      this.bossHpFillEl.style.width = `${pct}%`;
    }
  }

  public hideBossHealth(): void {
    if (this.bossBarEl) {
      this.bossBarEl.classList.add('hidden');
    }
  }

  public showNotification(message: string, durationMs: number = 2600): void {
    if (this.upgradeBannerEl && this.upgradeTextEl) {
      this.upgradeTextEl.textContent = message;
      this.upgradeBannerEl.classList.remove('hidden');

      if (this.bannerTimer !== null) {
        window.clearTimeout(this.bannerTimer);
      }
      this.bannerTimer = window.setTimeout(() => {
        this.upgradeBannerEl?.classList.add('hidden');
        this.bannerTimer = null;
      }, durationMs);
    }
  }
}
