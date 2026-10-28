/**
 * A tiny triangle-wave synth for "hear it". The AudioContext is created on the first note (always
 * from a key press or click, so the browser allows it) and closed by `close()`.
 */
export class Beeper {
  #audio: AudioContext | null = null;

  beep(note: number): void {
    this.#audio ??= new AudioContext();
    const audio = this.#audio;
    const o = audio.createOscillator();
    const gain = audio.createGain();
    o.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
    o.type = "triangle";
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.5);
    o.connect(gain).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.5);
  }

  close(): void {
    void this.#audio?.close();
    this.#audio = null;
  }
}
