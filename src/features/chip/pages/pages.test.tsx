import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Each chip page through the real router, query client and content (only the network and
// IntersectionObserver are faked; jsdom has no WebGL, so the scenes show their flat versions).
const LOAD = { timeout: 8000 };

async function openApp(hash: string) {
  window.location.hash = hash;
  await (await import("@/i18n/i18n")).initI18n();
  const { App } = await import("@/app/App");
  render(<App />);
}

describe("chip pages", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
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

  it("home: the headline, the progress and the section pills", async () => {
    await openApp("#/datasheet");
    expect(await screen.findByRole("heading", { level: 1, name: "走进 ESP32-S3" }, LOAD)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "你在芯片上的进度" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "芯片页面" })).toBeTruthy();
  });

  it("pins: the matrix and a pin card from the URL", async () => {
    await openApp("#/datasheet/pins?pin=0");
    expect(await screen.findByRole("heading", { level: 1, name: "引脚与供电" }, LOAD)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "GPIO0" })).toBeTruthy();
  });

  it("atlas: the filters narrow the tiles and land in the URL", async () => {
    await openApp("#/datasheet/blocks");
    expect(await screen.findByRole("heading", { level: 1, name: "外设图鉴" }, LOAD)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /射频/ })).toBeTruthy();
    const family = screen.getByRole("group", { name: "家族" });
    await userEvent.click(within(family).getByRole("button", { name: "模拟" }));
    expect(screen.queryByRole("heading", { name: /射频/ })).toBeNull();
    expect(screen.getByRole("heading", { name: /模拟/ })).toBeTruthy();
    expect(window.location.hash).toContain("family=analog");
    await userEvent.type(screen.getByRole("searchbox"), "touch");
    expect(screen.getByText("显示 1 个模块")).toBeTruthy();
  });

  it("atlas: opens filtered from a family link", async () => {
    await openApp("#/datasheet/blocks?family=radio");
    expect(await screen.findByRole("heading", { level: 1, name: "外设图鉴" }, LOAD)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /模拟/ })).toBeNull();
  });

  it("block: a full block with its registers", async () => {
    await openApp("#/datasheet/blocks/uart");
    expect(await screen.findByRole("heading", { level: 1, name: "UART" }, LOAD)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "关键寄存器" })).toBeTruthy();
  });

  it("block: an unknown id is a 404", async () => {
    await openApp("#/datasheet/blocks/flux-capacitor");
    expect(await screen.findByText("404", undefined, LOAD)).toBeTruthy();
  });

  it("inside: memory, clocks and power", async () => {
    await openApp("#/datasheet/inside");
    expect(await screen.findByRole("heading", { level: 1, name: "内存、时钟与电源模式" }, LOAD)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /你的程序住在哪里/ })).toBeTruthy();
  });
});
