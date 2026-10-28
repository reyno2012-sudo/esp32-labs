import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildReference } from "../../../../tools/reference/build";
import { FIXTURE } from "../../../../tools/reference/fixture";

// The book through the real router and chip content, with the reference built from the fixture
// and served by a fake fetch. Every observed element counts as on screen at once, so sections load.
const LOAD = { timeout: 8000 };
const ref = buildReference(FIXTURE);

function serve() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes("/reference/")) {
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

describe("the datasheet as a book", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        readonly callback: IntersectionObserverCallback;
        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
        }
        observe(target: Element) {
          this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        }
        disconnect() {}
      },
    );
    serve();
  });

  it("opens on a cover with the documents, the contents and the switch back to exploring", async () => {
    await openApp("#/datasheet/read");
    expect(await screen.findByRole("heading", { level: 1, name: "阅读数据手册" }, LOAD)).toBeTruthy();
    const modes = screen.getByRole("navigation", { name: "浏览数据手册的方式" });
    expect(within(modes).getByRole("link", { name: "阅读" }).getAttribute("aria-current")).toBe("page");
    expect(within(modes).getByRole("link", { name: "探索" }).getAttribute("aria-current")).toBeNull();
    const contents = screen.getByRole("navigation", { name: "目录" });
    expect(within(contents).getByRole("link", { name: /26\s+UART 控制器/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /从头开始/ }).getAttribute("href")).toContain("at=C2");
  });

  it("reads a chapter as one page, its sections' text and charts inside, cross-references staying in the book", async () => {
    await openApp("#/datasheet/read?at=T26.1");
    expect(await screen.findByRole("heading", { level: 2, name: /§26 .*UART/ }, LOAD)).toBeTruthy();
    expect(await screen.findByText("Stop bits of 1, 1.5, or 2 bits", {}, LOAD)).toBeTruthy();
    const overview = screen.getByRole("region", { name: "§26.1 概述" });
    await userEvent.click(within(overview).getByRole("link", { name: "§26.2 Features" }));
    expect(window.location.hash).toContain("/datasheet/read?at=T26.2");
    expect(screen.queryByRole("dialog")).toBeNull();
    // What you scrolled through is remembered, for the contents' ticks and "Continue at".
    await waitFor(() => expect(localStorage.getItem("esp-datasheet-read")).toContain("26"));
  });

  it("from a citation's reader, carries on in the book at that section", async () => {
    await openApp("#/datasheet/blocks/uart?ref=T26.2");
    const dialog = await screen.findByRole("dialog", { name: "§26.2 特性" }, LOAD);
    await userEvent.click(within(dialog).getByRole("link", { name: "在完整数据手册中继续阅读" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.location.hash).toContain("/datasheet/read?at=T26.2");
    expect(await screen.findByRole("region", { name: "§26.2 特性" }, LOAD)).toBeTruthy();
  });
});
