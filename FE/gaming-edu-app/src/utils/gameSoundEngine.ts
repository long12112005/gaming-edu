
class GameSoundEngine {
    private ctx: AudioContext | null = null;

    private init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    // Âm thanh dùng chung khi trả lời ĐÚNG / Lên Combo
    playCorrectCombo(comboCount: number = 1) {
        this.init();
        const now = this.ctx!.currentTime;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        // Pitch tăng dần theo số Combo
        const baseFreq = 440 + Math.min(comboCount * 60, 600);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    // GAME 1 (Đế Chế Lục Giác): Tiếng đóng dấu chiếm ô & Phá vòng vây
    playHexClaim() {
        this.init();
        const now = this.ctx!.currentTime;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    // GAME 2 (Thủ Thành): Tiếng bắn tia Laser / Đặt tháp & Đóng băng
    playTowerLaser() {
        this.init();
        const now = this.ctx!.currentTime;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // GAME 5 (Đua Thuyền): Tiếng mái chèo khua nước & Tăng tốc Nitro
    playBoatSplash() {
        this.init();
        const bufferSize = this.ctx!.sampleRate * 0.25;
        const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx!.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, this.ctx!.currentTime);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);
        noise.start();
    }

    // GAME 7 (Chuyến Tàu Sinh Tử): Tiếng còi tàu hỏa & Khớp đường ray sắt
    playTrainWhistle() {
        this.init();
        const now = this.ctx!.currentTime;
        [587.33, 739.99, 880].forEach((freq) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        });
    }

    // GAME 8 (Pháo Đài Đại Bác) & GAME 10 (Đặt Bom): Tiếng đạn bay & Vụ nổ lớn
    playBigExplosion() {
        this.init();
        const now = this.ctx!.currentTime;
        const bufferSize = this.ctx!.sampleRate * 0.5;
        const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx!.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, now);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);
        noise.start();
    }

    // Âm thanh khi trả lời SAI hoặc HẾT GIỜ
    playWrongAnswer() {
        this.init();
        const now = this.ctx!.currentTime;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.3);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 0.32);
    }

    playTimeOut() {
        this.init();
        const now = this.ctx!.currentTime;
        [220, 175].forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * 0.16);
            gain.gain.setValueAtTime(0.22, now + idx * 0.16);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.16 + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + idx * 0.16);
            osc.stop(now + idx * 0.16 + 0.15);
        });
    }

    // GAME 9 (Truy Tìm Nội Gián): Tiếng Còi Báo Động Khẩn Cấp (Sabotage / Emergency)
    playEmergencyAlarm() {
        this.init();
        const now = this.ctx!.currentTime;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.25);
        osc.frequency.linearRampToValueAtTime(400, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 0.55);
    }
}

export const soundFX = new GameSoundEngine();