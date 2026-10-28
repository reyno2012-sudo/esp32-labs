/** One byte as two upper-case hex digits, e.g. 10 → "0A". */
export const hx = (n: number): string => n.toString(16).toUpperCase().padStart(2, "0");

/** Bytes as space-separated hex, e.g. [1, 255] → "01 FF". */
export const hxs = (bytes: readonly number[]): string => bytes.map(hx).join(" ");

/** ASCII text as bytes. */
export const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

/** A 16-bit value little-endian, as Bluetooth sends it. */
export const le16 = (v: number): [number, number] => [v & 255, (v >> 8) & 255];

/** A byte read as a signed 8-bit number. */
export const int8 = (b: number): number => (b << 24) >> 24;
