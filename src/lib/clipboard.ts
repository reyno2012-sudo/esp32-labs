/** Copies text; when the Clipboard API is unavailable, selects `fallbackNode` so ⌘C works. */
export async function copyText(
  text: string,
  fallbackNode?: Node | null,
): Promise<"copied" | "selected"> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    if (fallbackNode) {
      const range = document.createRange();
      range.selectNodeContents(fallbackNode);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    return "selected";
  }
}
