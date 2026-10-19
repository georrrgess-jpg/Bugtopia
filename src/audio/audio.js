// Synthesised sound effects and a gentle generative music-box tune, built on
// the Web Audio API so the game ships without audio files.

const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5,
};
const SCALE = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];
const BASS = [130.81, 98.0, 110.0, 87.31]; // C3 G2 A2 F2

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.settings = { musicVolume: 0.35, sfxVolume: 0.6, muted: false };
    this.musicOn = false;
    this.musicTimer = null;
    this.lastPlayed = {};
    this.step = 0;
  }

  // Browsers only allow audio after a user gesture; call this from one.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    this.musicGain.connect(lp);
    lp.connect(this.master);
    this.applySettings(this.settings);
    if (this.musicOn) this.scheduleMusic();
  }

  applySettings(settings) {
    this.settings = { ...this.settings, ...settings };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume * 0.7, now, 0.05);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume * 0.45, now, 0.2);
  }

  tone(freq, { type = 'sine', start = 0, dur = 0.15, vol = 0.3, slide = 0, attack = 0.005, dest } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise({ start = 0, dur = 0.12, vol = 0.15, freq = 1200 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + start;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  play(name) {
    if (!this.ctx || this.settings.muted) return;
    // Throttle very frequent sounds so busy workshops stay pleasant.
    const now = performance.now();
    const minGap = { produce: 140, craftStart: 200 }[name] || 40;
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < minGap) return;
    this.lastPlayed[name] = now;

    switch (name) {
      case 'click':
        this.tone(660, { type: 'triangle', dur: 0.06, vol: 0.12 });
        break;
      case 'select':
        this.tone(520, { type: 'triangle', dur: 0.08, vol: 0.14 });
        this.tone(780, { type: 'triangle', start: 0.05, dur: 0.08, vol: 0.1 });
        break;
      case 'produce': {
        const f = [784, 880, 988][Math.floor(Math.random() * 3)];
        this.tone(f, { type: 'sine', dur: 0.12, vol: 0.06 });
        break;
      }
      case 'craftStart':
        this.noise({ dur: 0.25, vol: 0.06, freq: 600 });
        break;
      case 'crafted':
        this.tone(523, { type: 'triangle', dur: 0.2, vol: 0.14 });
        this.tone(784, { type: 'triangle', start: 0.07, dur: 0.22, vol: 0.12 });
        this.tone(1047, { type: 'sine', start: 0.14, dur: 0.35, vol: 0.1 });
        this.noise({ start: 0, dur: 0.18, vol: 0.05, freq: 3000 });
        break;
      case 'coin':
        this.tone(988, { type: 'square', dur: 0.06, vol: 0.05 });
        this.tone(1319, { type: 'square', start: 0.06, dur: 0.16, vol: 0.05 });
        break;
      case 'purchase':
        this.tone(392, { type: 'triangle', dur: 0.1, vol: 0.14 });
        this.tone(523, { type: 'triangle', start: 0.08, dur: 0.1, vol: 0.14 });
        this.tone(659, { type: 'triangle', start: 0.16, dur: 0.2, vol: 0.14 });
        break;
      case 'place':
        this.tone(180, { type: 'sine', dur: 0.14, vol: 0.25, slide: 0.6 });
        this.noise({ dur: 0.1, vol: 0.08, freq: 400 });
        break;
      case 'assign':
        this.tone(440, { type: 'sine', dur: 0.1, vol: 0.15, slide: 1.5 });
        this.tone(880, { type: 'sine', start: 0.08, dur: 0.12, vol: 0.1 });
        break;
      case 'order':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, { type: 'triangle', start: i * 0.08, dur: 0.25, vol: 0.13 }));
        this.tone(1319, { type: 'sine', start: 0.34, dur: 0.5, vol: 0.08 });
        break;
      case 'milestone':
        [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, { type: 'triangle', start: i * 0.07, dur: 0.3, vol: 0.12 }));
        break;
      case 'error':
        this.tone(220, { type: 'square', dur: 0.12, vol: 0.06, slide: 0.8 });
        this.tone(180, { type: 'square', start: 0.1, dur: 0.14, vol: 0.06, slide: 0.8 });
        break;
      case 'open':
        this.tone(600, { type: 'sine', dur: 0.08, vol: 0.08, slide: 1.4 });
        break;
      case 'close':
        this.tone(700, { type: 'sine', dur: 0.08, vol: 0.07, slide: 0.7 });
        break;
      default:
        break;
    }
  }

  // ----- Music --------------------------------------------------------------

  setMusic(on) {
    this.musicOn = on;
    if (on && this.ctx && !this.musicTimer) this.scheduleMusic();
    if (!on && this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusic() {
    if (!this.musicOn || !this.ctx) return;
    const beat = 0.42;
    // A soft music-box melody wandering over a slow bass line.
    if (this.ctx.state === 'running' && this.settings.musicVolume > 0 && !this.settings.muted) {
      const bar = Math.floor(this.step / 8) % BASS.length;
      if (this.step % 8 === 0) {
        this.tone(BASS[bar], { type: 'sine', dur: beat * 7, vol: 0.18, attack: 0.3, dest: this.musicGain });
        this.tone(BASS[bar] * 1.5, { type: 'sine', dur: beat * 7, vol: 0.06, attack: 0.5, dest: this.musicGain });
      }
      if (Math.random() < 0.62) {
        const idx = Math.min(SCALE.length - 1, Math.max(0, Math.floor(this._melody ?? 5)));
        this._melody = Math.min(SCALE.length - 1, Math.max(0, idx + Math.round((Math.random() - 0.5) * 4)));
        const f = NOTES[SCALE[this._melody]];
        this.tone(f, { type: 'sine', dur: beat * 3, vol: 0.12, dest: this.musicGain });
        this.tone(f * 2, { type: 'sine', dur: beat * 1.2, vol: 0.025, dest: this.musicGain });
      }
    }
    this.step++;
    this.musicTimer = setTimeout(() => this.scheduleMusic(), beat * 1000);
  }
}

export const audio = new AudioEngine();
