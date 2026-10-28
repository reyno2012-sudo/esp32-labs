import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildReference } from "../../../tools/reference/build";
import { FIXTURE } from "../../../tools/reference/fixture";

// The reader through the real router and chip content, with the reference documents built from
// a fixture (never from docs-llm/) and served by a fake fetch.
const LOAD = { timeout: 8000 };
const ref = buildReference(FIXTURE);

function serve(withReference: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes("/reference/")) {
        if (!withReference) return new Response("not found", { status: 404 });
        if (url.endsWith("/index.json")) return new Response(JSON.stringify({ sections: ref.index }));
        const id = decodeURIComponent(/sections\/(.+)\.json$/.exec(url)?.[1] ?? "");
        const doc = ref.section(id);
        return doc ? new Response(JSON.stringify(doc)) : new Response("not found", { status: 404 });
      }
      return new Response(JSON.stringify({ overview: [], facts: [], entries: [] }));
    }),
  );
}

async function openApp(hash: string) {
  window.location.hash = hash;
  await (await import("@/i18n/i18n")).initI18n();
  const { App } = await import("@/app/App");
  render(<App />);
}

describe("reference reader", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it("opens the section named in the URL, with why you came, the key numbers and the way back", async () => {
    serve(true);
    await openApp("#/datasheet/blocks/uart?ref=T26.2");
    const dialog = await screen.findByRole("dialog", { name: "§26.2 特性" }, LOAD);
    expect(within(dialog).getByRole("heading", { name: "你为什么来到这里" })).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "关键信息" })).toBeTruthy();
    expect(within(dialog).getByText("Stop bits of 1, 1.5, or 2 bits")).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: /26\s+UART 控制器/ })).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: /下一节.*26\.4/ })).toBeTruthy();

    await userEvent.click(within(dialog).getByRole("button", { name: "回到刚才的位置" }));
    expect(window.location.hash).not.toContain("ref=");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // The page's citations now open the reader.
    expect(screen.getAllByRole("link", { name: /技术参考手册 §26\.2/ }).length).toBeGreaterThan(0);
  });

  it("closes on a click on the dimmed page around it, not on a click inside it", async () => {
    serve(true);
    await openApp("#/datasheet/blocks/uart?ref=T26.2");
    const dialog = await screen.findByRole("dialog", { name: "§26.2 特性" }, LOAD);
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(new DOMRect(700, 0, 560, 900));
    fireEvent.click(dialog, { clientX: 900, clientY: 300 });
    expect(window.location.hash).toContain("ref=");
    fireEvent.click(dialog, { clientX: 200, clientY: 300 });
    await waitFor(() => expect(window.location.hash).not.toContain("ref="));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("follows a cross-reference inside the reader", async () => {
    serve(true);
    await openApp("#/datasheet?ref=T26.1");
    const dialog = await screen.findByRole("dialog", { name: "§26.1 概述" }, LOAD);
    await userEvent.click(within(dialog).getByRole("link", { name: "§26.2 Features" }));
    expect(await screen.findByRole("dialog", { name: "§26.2 特性" }, LOAD)).toBeTruthy();
    expect(window.location.hash).toContain("ref=T26.2");
  });

  it("without the reference, citations stay citations with a link to Espressif's PDF", async () => {
    serve(false);
    // What tools/reference sets when the build has no reference: the reader's URL is off.
    const { env } = await import("@/config/env");
    // A fresh module per test (vi.resetModules), so the override never leaks.
    Object.defineProperty(env, "referenceUrl", { value: null });
    await openApp("#/datasheet/blocks/uart");
    expect(await screen.findByRole("heading", { level: 1, name: "UART" }, LOAD)).toBeTruthy();
    expect(screen.queryAllByRole("link", { name: /技术参考手册 §26\.2/ })).toEqual([]);
    expect(screen.getAllByRole("link", { name: /在乐鑫官网打开/ }).length).toBeGreaterThan(0);
  });
});
