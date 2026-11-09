/**
 * sound_effects.js — Procedural Sound Generator using Web Audio API
 * 
 * Provides subtle, crisp auditory feedback for switch toggles, wire connects,
 * step success, and lesson completion. Zero external dependencies or audio files.
 * Fully safe in headless/SSR environments.
 * 
 * @module SoundEffects
 */

export class SoundController {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        try {
            if (typeof localStorage !== 'undefined') {
                this.isMuted = localStorage.getItem('rtl_sound_muted') === 'true';
            }
        } catch {}
    }

    _getAudioContext() {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                try {
                    this.ctx = new AudioCtx();
                } catch {
                    return null;
                }
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('rtl_sound_muted', this.isMuted.toString());
            }
        } catch {}
        return this.isMuted;
    }

    setMuted(muted) {
        this.isMuted = !!muted;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('rtl_sound_muted', this.isMuted.toString());
            }
        } catch {}
    }

    /**
     * Mechanical toggle switch click (fast decaying dual tone)
     */
    playSwitchClick() {
        if (this.isMuted) return;
        const ctx = this._getAudioContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
        } catch {}
    }

    /**
     * Wire connection snap blip (rising chirp)
     */
    playWireConnect() {
        if (this.isMuted) return;
        const ctx = this._getAudioContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.06); // A5
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        } catch {}
    }

    /**
     * Micro-step success chime (uplifting major third: C5 -> E5)
     */
    playStepSuccess() {
        if (this.isMuted) return;
        const ctx = this._getAudioContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const notes = [523.25, 659.25]; // C5, E5
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + (idx * 0.08);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.08, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + 0.12);
            });
        } catch {}
    }

    /**
     * Full lesson complete fanfare (celebratory major arpeggio: C5 -> E5 -> G5 -> C6)
     */
    playLessonComplete() {
        if (this.isMuted) return;
        const ctx = this._getAudioContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            chord.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + (idx * 0.09);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.1, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + 0.28);
            });
        } catch {}
    }
}

export const soundManager = new SoundController();
