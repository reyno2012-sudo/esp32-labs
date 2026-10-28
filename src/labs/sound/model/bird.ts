// Clap Bird (S6): every clap is a flap; fly through the gaps. Screen coordinates of the 320×170 TFT.

export const BIRD = {
  top: 30,
  bottom: 158,
  birdX: 70,
  r: 6,
  gravity: 420,
  flap: -150,
  speed: 72,
  pipeW: 26,
  gap: 58,
  spacing: 130,
} as const;

export interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

export type BirdState = "ready" | "playing" | "over";

const gapY = () =>
  BIRD.top + BIRD.gap / 2 + 8 + Math.random() * (BIRD.bottom - BIRD.top - BIRD.gap - 16);

export class BirdGame {
  state: BirdState = "ready";
  y = 0;
  vy = 0;
  score = 0;
  pipes: Pipe[] = [];
  flapAt = 0;
  overAt = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.state = "ready";
    this.y = (BIRD.top + BIRD.bottom) / 2;
    this.vy = 0;
    this.score = 0;
    this.pipes = [0, 1, 2].map((i) => ({ x: 360 + i * BIRD.spacing, gapY: gapY(), passed: false }));
  }

  flapNow(): void {
    if (this.state === "over") return;
    this.state = "playing";
    this.vy = BIRD.flap;
    this.flapAt = performance.now();
  }

  step(dt: number): void {
    if (this.state !== "playing") return;
    this.vy += BIRD.gravity * dt;
    this.y += this.vy * dt;
    for (const p of this.pipes) {
      p.x -= BIRD.speed * dt;
      if (!p.passed && p.x + BIRD.pipeW < BIRD.birdX - BIRD.r) {
        p.passed = true;
        this.score++;
      }
      if (p.x + BIRD.pipeW < 0) {
        const far = Math.max(...this.pipes.map((q) => q.x));
        Object.assign(p, { x: far + BIRD.spacing, gapY: gapY(), passed: false });
      }
      const inColumn = !(BIRD.birdX + BIRD.r < p.x || BIRD.birdX - BIRD.r > p.x + BIRD.pipeW);
      if (
        inColumn &&
        (this.y - BIRD.r < p.gapY - BIRD.gap / 2 || this.y + BIRD.r > p.gapY + BIRD.gap / 2)
      )
        this.state = "over";
    }
    if (this.y - BIRD.r <= BIRD.top || this.y + BIRD.r >= BIRD.bottom) this.state = "over";
  }
}
