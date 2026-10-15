/**
 * audioManager.js
 * Comprehensive Web Audio API synthesizers for Bhima's Hollow:
 * - Ambient village sounds (daytime songbirds, night crickets, rustling wind, rain)
 * - Multi-surface footsteps (grass, stone/cobble path, wood verandah) synced with speed
 * - Master, Music, SFX volume controls and mute toggle
 * - Respects browser autoplay policy: audio only starts upon first user interaction
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.8;
    this.ambientVolume = 0.5;
    this.sfxVolume = 0.7;

    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;

    // Ambient nodes
    this.windNode = null;
    this.rainNode = null;
    this.birdsTimer = null;
    this.cricketsTimer = null;

    this.currentWeather = "clear";
    this.isNight = false;
    this.hasInteracted = false;
  }

  /**
   * Initializes AudioContext upon user gesture
   */
  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Ambient Bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.hasInteracted = true;
      this.startAmbient();
    } catch (e) {
      console.warn("Web Audio not supported or blocked:", e);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
    return this.isMuted;
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  /**
   * Generates continuous filtered pink noise for wind
   */
  startAmbient() {
    if (!this.ctx) return;

    // 1. Procedural Wind generator
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.12;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.setValueAtTime(380, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.ambientGain);
    windSource.start(0);

    this.windNode = { source: windSource, filter: windFilter, gain: windGain };

    // Start time-of-day audio loop (birds / crickets)
    this.scheduleAtmosphere();
  }

  /**
   * Update ambient audio based on day/night and weather
   */
  updateAtmosphere(time, weather) {
    this.currentWeather = weather;
    this.isNight = time < 5 || time >= 20;

    // Adjust wind filter frequency if drought or storm
    if (this.windNode && this.ctx) {
      const freq = weather === "rain" ? 650 : weather === "drought" ? 480 : 320;
      this.windNode.filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 1.5);
    }

    // Toggle Rain sound
    if (weather === "rain" && !this.rainNode && this.ctx) {
      this.startRainAudio();
    } else if (weather !== "rain" && this.rainNode && this.ctx) {
      this.stopRainAudio();
    }
  }

  startRainAudio() {
    if (!this.ctx || this.rainNode) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.18;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    source.start(0);

    this.rainNode = { source, gain };
  }

  stopRainAudio() {
    if (!this.rainNode || !this.ctx) return;
    try {
      this.rainNode.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      setTimeout(() => {
        if (this.rainNode) {
          this.rainNode.source.stop();
          this.rainNode.source.disconnect();
          this.rainNode = null;
        }
      }, 600);
    } catch (_) {}
  }

  /**
   * Periodic scheduler for bird chirps and night crickets
   */
  scheduleAtmosphere() {
    if (this.birdsTimer) clearInterval(this.birdsTimer);
    if (this.cricketsTimer) clearInterval(this.cricketsTimer);

    // Birds chirp every 4 - 8s during daytime if not raining
    this.birdsTimer = setInterval(() => {
      if (!this.isNight && this.currentWeather !== "rain" && this.ctx && Math.random() > 0.35) {
        this.playBirdChirp();
      }
    }, 4500);

    // Crickets chirp continuously at night
    this.cricketsTimer = setInterval(() => {
      if (this.isNight && this.ctx && Math.random() > 0.25) {
        this.playCricket();
      }
    }, 1800);
  }

  /**
   * Synthesize natural Indian village bird chirp (frequency FM sweep)
   */
  playBirdChirp() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    const baseFreq = 2200 + Math.random() * 800;
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, now + 0.16);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Synthesize cricket trill (high frequency square pulse)
   */
  playCricket() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(4600 + (Math.random() - 0.5) * 400, now);

    // Rapid amplitude modulation
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.linearRampToValueAtTime(0.002, now + 0.04);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Multi-surface footstep synthesizer:
   * - 'grass': soft muffled rustle
   * - 'stone': crisp click/crunch
   * - 'wood': resonant hollow thump
   */
  playFootstep(surface = "grass") {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    if (surface === "stone") {
      // Crisp cobblestone tap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280 + Math.random() * 60, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (surface === "wood") {
      // Hollow resonant wood thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140 + Math.random() * 20, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      // Grass / soil soft rustle
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(90 + Math.random() * 25, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  /**
   * Sound effect: Water splash / well draw
   */
  playWaterDraw() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const audioManager = new AudioManager();
