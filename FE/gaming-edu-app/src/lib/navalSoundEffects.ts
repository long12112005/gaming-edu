import { NAVAL_ASSETS } from "@/lib/navalAssets";

let HowlClass: any = null;
let HowlerGlobal: any = null;

if (typeof window !== "undefined") {
  try {
    const howler = require("howler");
    HowlClass = howler.Howl;
    HowlerGlobal = howler.Howler;
  } catch {}
}

class NavalSoundSynthesizer {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private ambientSound: any = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Helper phát file audio từ thư mục assets bằng Howler (với Web Audio/HTML5 Audio fallback)
  private playAudioFile(src: string | string[], volume: number = 0.8) {
    if (this.isMuted || typeof window === "undefined") return;

    const sources = Array.isArray(src) ? src : [src];

    if (HowlClass) {
      try {
        const sound = new HowlClass({
          src: sources,
          volume: Math.max(0, Math.min(1, volume)),
          onloaderror: () => {
            // Fallback sang Audio element thuần nếu Howler gặp lỗi file
            this.nativePlayFallback(sources, volume);
          },
        });
        sound.play();
        return;
      } catch {}
    }

    this.nativePlayFallback(sources, volume);
  }

  private nativePlayFallback(sources: string[], volume: number) {
    const tryPlay = (index: number) => {
      if (index >= sources.length) return;
      try {
        const audio = new Audio(sources[index]);
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.play().catch(() => {
          tryPlay(index + 1);
        });
      } catch {
        tryPlay(index + 1);
      }
    };
    tryPlay(0);
  }

  // Tiếng đại bác bắn (GunShot.wav)
  public playCannon() {
    this.playAudioFile(NAVAL_ASSETS.sounds.cannon, 0.75);
    // Bổ sung tiếng trầm synth để tăng độ giòn giã
    this.synthCannon();
  }

  // Tiếng nổ bắn trúng tàu (ExplosionMetal.wav)
  public playHit() {
    this.playAudioFile(NAVAL_ASSETS.sounds.hit, 0.9);
    this.synthHit();
  }

  // Tiếng nước bắn tung tóe khi trượt (Splash.wav)
  public playMiss() {
    this.playAudioFile(NAVAL_ASSETS.sounds.miss, 0.65);
    this.synthMiss();
  }

  // Tiếng đánh chìm tàu hoành tráng (WaterSurfaceExplosion01.wav)
  public playShipSunk() {
    this.playAudioFile(NAVAL_ASSETS.sounds.sunk, 1.0);
    setTimeout(() => this.playAudioFile(NAVAL_ASSETS.sounds.hit, 0.8), 350);
  }

  // Tiếng Radar quét sóng (computerNoise_000.ogg)
  public playRadarPing() {
    this.playAudioFile(NAVAL_ASSETS.sounds.radar, 0.6);
    this.synthRadarPing();
  }

  // Tiếng bật Lá chắn phòng thủ (forceField_000.ogg)
  public playShieldActivate() {
    this.playAudioFile(NAVAL_ASSETS.sounds.shield, 0.75);
  }

  // Tiếng Bắn chính xác (laserLarge_000.ogg)
  public playLaserPrecision() {
    this.playAudioFile(NAVAL_ASSETS.sounds.laser, 0.7);
  }

  // Nhạc nền sóng biển và động cơ hạm đội (BattleShipMovementAmbient.wav / mp3 / ogg)
  public startAmbient() {
    if (this.isMuted || typeof window === "undefined" || this.ambientSound) return;
    const sources = Array.isArray(NAVAL_ASSETS.sounds.ambient)
      ? NAVAL_ASSETS.sounds.ambient
      : [NAVAL_ASSETS.sounds.ambient];

    if (HowlClass) {
      try {
        this.ambientSound = new HowlClass({
          src: sources,
          html5: true,
          loop: true,
          volume: 0.25,
        });
        this.ambientSound.play();
        return;
      } catch {}
    }

    try {
      const audio = new Audio(sources[0]);
      audio.loop = true;
      audio.volume = 0.25;
      audio.play().then(() => {
        this.ambientSound = audio;
      }).catch(() => {});
    } catch {}
  }

  public stopAmbient() {
    if (this.ambientSound) {
      if (typeof this.ambientSound.stop === "function") {
        this.ambientSound.stop();
        this.ambientSound.unload?.();
      } else if (typeof this.ambientSound.pause === "function") {
        this.ambientSound.pause();
      }
      this.ambientSound = null;
    }
  }

  // Tiếng trả lời đúng câu hỏi (Chime)
  public playCorrect() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // Tiếng trả lời sai (Thud)
  public playWrong() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.setValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // ─── Synth Fallbacks ─────────────────────────────────────────────────────

  private synthCannon() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.3);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private synthHit() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.25);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  private synthMiss() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.2);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private synthRadarPing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.4);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const navalSounds = new NavalSoundSynthesizer();
