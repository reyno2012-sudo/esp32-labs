// The parrot panel's own microphone: only on an explicit click, 3 s, kept in the page.
import { normalise } from "../model/voice-fx";
import { browserAudio } from "./browser-audio";

export const CAPTURE_RATE = 16000;

export type CaptureFailure = "unsupported" | "denied" | "unreadable";

export class CaptureError extends Error {
  readonly reason: CaptureFailure;
  constructor(reason: CaptureFailure) {
    super(reason);
    this.reason = reason;
  }
}

/** True when this browser can record from a microphone at all. */
export const canCapture = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  typeof MediaRecorder !== "undefined";

/**
 * Records `ms` from the microphone, then decodes and resamples it to 16 kHz mono, normalised.
 * `onStart` runs once the microphone is open. `signal` stops early.
 */
export async function captureVoice(
  ms: number,
  onStart: () => void,
  signal: AbortSignal,
): Promise<{ samples: Float32Array; rate: number; seconds: number }> {
  if (!canCapture()) throw new CaptureError("unsupported");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new CaptureError("denied");
  }
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream);
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.ondataavailable = (e) => chunks.push(e.data);
  const stop = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  const timer = setTimeout(stop, ms);
  signal.addEventListener("abort", stop, { once: true });
  recorder.start();
  onStart();
  await stopped;
  clearTimeout(timer);
  stream.getTracks().forEach((t) => t.stop());
  if (signal.aborted) throw new CaptureError("unreadable");
  try {
    const decoded = await browserAudio.decode(await new Blob(chunks).arrayBuffer());
    const off = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(decoded.duration * CAPTURE_RATE)),
      CAPTURE_RATE,
    );
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    return {
      samples: normalise(rendered.getChannelData(0)),
      rate: CAPTURE_RATE,
      seconds: decoded.duration,
    };
  } catch {
    throw new CaptureError("unreadable");
  }
}
