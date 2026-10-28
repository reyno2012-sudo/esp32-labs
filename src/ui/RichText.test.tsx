import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText } from "./RichText";

describe("RichText", () => {
  it("renders the allowed inline tags as elements", () => {
    const { container } = render(<RichText text="Type <code>help</code>, then <b>wait</b>." />);
    expect(container.querySelector("code")?.textContent).toBe("help");
    expect(container.querySelector("b")?.textContent).toBe("wait");
  });

  it("keeps unknown tags and entities as visible text, never as HTML", () => {
    render(<RichText text={"<code>dump <n></code> &lt;script&gt; <img src=x onerror=alert(1)>"} />);
    expect(screen.getByText("dump <n>")).toBeTruthy();
    expect(document.querySelector("img")).toBeNull();
    expect(document.body.textContent).toContain("<script>");
  });
});
