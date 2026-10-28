import { useState, useSyncExternalStore } from "react";

/**
 * A simulated device's state. Frame loops read and change it 60 times a second, so it is a
 * plain mutable object, not React state. React only re-renders when code calls `notify()`
 * (after a button press or command).
 *
 * Render code reads `snapshot.state`: a shallow copy taken at each notify, so it is a new
 * object whenever something changed. That keeps the React Compiler's memoization correct even
 * for helpers that take the whole state (`caption(snapshot.state)`), which would otherwise be
 * cached on an object that never changes identity. Mutate only `sim.state` (via `update`).
 */
export class Simulation<S> {
  readonly state: S;
  #snapshot: { readonly state: S; readonly rev: number };
  #listeners = new Set<() => void>();

  constructor(state: S) {
    this.state = state;
    this.#snapshot = { state: copy(state), rev: 0 };
  }

  /** Tell React the state changed in a way the UI shows (labels, pressed buttons). */
  notify = () => {
    this.#snapshot = { state: copy(this.state), rev: this.#snapshot.rev + 1 };
    this.#listeners.forEach((l) => l());
  };

  /** Change the state, then notify. */
  update = (change: (state: S) => void) => {
    change(this.state);
    this.notify();
  };

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = () => this.#snapshot;
}

/** A shallow copy that keeps the prototype (methods keep working on the copy). */
function copy<S>(state: S): S {
  if (typeof state !== "object" || state === null) return state;
  return Object.assign(
    Object.create(Object.getPrototypeOf(state) as object | null) as S & object,
    state,
  );
}

/** One simulation per component instance; returns it and its current snapshot. */
export function useSimulation<S>(
  init: () => S,
): readonly [Simulation<S>, { readonly state: S; readonly rev: number }] {
  const [sim] = useState(() => new Simulation(init()));
  const snapshot = useSyncExternalStore(sim.subscribe, sim.getSnapshot, sim.getSnapshot);
  return [sim, snapshot];
}
