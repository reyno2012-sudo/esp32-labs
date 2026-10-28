import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// End to end through the real router, loaders and query client (only the network is faked).
// The first render waits for lazily loaded chunks, which a cold transform can make slow.
const LOAD = { timeout: 5000 };

// resetModules gives each test a fresh i18n instance: load its catalogues like main.tsx does.
async function loadApp() {
  await (await import("@/i18n/i18n")).initI18n();
  return (await import("./App")).App;
}
describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ overview: [], facts: [], entries: [] }))),
    );
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it("opens a lesson from its URL and remembers a ticked step", async () => {
    window.location.hash = "#/lessons/02";
    const App = await loadApp();
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "面包板上的 LED" }, LOAD),
    ).toBeTruthy();

    const first = screen.getAllByRole("checkbox")[0]!;
    await userEvent.click(first);
    expect(JSON.parse(localStorage.getItem("esp-ticks") ?? "{}")).toEqual({ "02-0": true });
    expect(localStorage.getItem("esp-lesson")).toBe('"02"');
  });

  it("shows a 404 for an unknown lesson", async () => {
    window.location.hash = "#/lessons/Z9";
    const App = await loadApp();
    render(<App />);
    expect(await screen.findByText("这个引脚上什么也没有。", undefined, LOAD)).toBeTruthy();
  });

  it("opens on the labs map, with the last lesson one click away", async () => {
    localStorage.setItem("esp-lesson", '"02"');
    window.location.hash = "#/";
    const App = await loadApp();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "所有实验" }, LOAD)).toBeTruthy();
    expect(screen.getByText("从上次停下的地方继续")).toBeTruthy();
    expect(screen.getByRole("link", { name: /继续实验/ }).getAttribute("href")).toBe(
      "#/lessons/02",
    );
  });

  it("ignores legacy language query parameters and keeps links language-free", async () => {
    window.location.hash = "#/lessons/02?lang=fr";
    const App = await loadApp();
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "面包板上的 LED" }, LOAD),
    ).toBeTruthy();
    expect(document.documentElement.lang).toBe("zh-Hans");
    expect(localStorage.getItem("esp-locale")).toBeNull();

    // Navigating must not re-introduce a language parameter.
    await (await import("./router")).router.navigate("/lessons/01");
    await vi.waitFor(() => expect(window.location.hash).toBe("#/lessons/01"));
  });
});
