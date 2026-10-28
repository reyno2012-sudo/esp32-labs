// Reads just enough of platformio.ini to know which source files each environment compiles:
// its build_src_filter and the comment lines under its header (the env's one-line purpose).

export interface PioEnv {
  readonly name: string;
  /** The raw build_src_filter value, e.g. "+<03b-showcase/> -<03b-showcase/controls/x.cpp>". */
  readonly srcFilter: string;
  /** The ";" comment lines directly under the [env:x] header, joined with spaces. */
  readonly about: string;
}

/** Parses the [env:*] sections. Continuation lines (indented) join their key's value. */
export function parsePlatformio(ini: string): PioEnv[] {
  const envs: PioEnv[] = [];
  let current: { name: string; values: Map<string, string>; about: string[] } | null = null;
  let lastKey: string | null = null;
  const flush = () => {
    if (!current) return;
    envs.push({
      name: current.name,
      srcFilter: current.values.get("build_src_filter") ?? "+<*>",
      about: current.about.join(" "),
    });
  };

  for (const raw of ini.split(/\r?\n/)) {
    const header = /^\[([^\]]+)\]\s*$/.exec(raw);
    if (header) {
      flush();
      const name = header[1]?.startsWith("env:") ? header[1].slice(4) : null;
      current = name ? { name, values: new Map(), about: [] } : null;
      lastKey = null;
      continue;
    }
    if (!current) continue;
    const comment = /^\s*;\s?(.*)$/.exec(raw);
    if (comment) {
      // Only the comment block right under the header describes the env.
      if (current.values.size === 0) current.about.push(comment[1] ?? "");
      continue;
    }
    if (/^\s+\S/.test(raw) && lastKey) {
      current.values.set(lastKey, `${current.values.get(lastKey) ?? ""} ${raw.trim()}`.trim());
      continue;
    }
    const pair = /^([\w.-]+)\s*=\s*(.*)$/.exec(raw);
    if (pair?.[1]) {
      lastKey = pair[1];
      current.values.set(lastKey, (pair[2] ?? "").trim());
    }
  }
  flush();
  return envs;
}

/**
 * Applies a build_src_filter to a list of paths relative to src/. Rules run in order: "+<p>"
 * adds every file under p (a folder ends with "/"), "-<p>" removes them, "*" matches everything.
 */
export function applySrcFilter(filter: string, files: readonly string[]): string[] {
  const kept = new Set<string>();
  for (const [, sign, pattern] of filter.matchAll(/([+-])<([^>]*)>/g)) {
    const matches = (f: string) =>
      pattern === "*" || (pattern?.endsWith("/") ? f.startsWith(pattern) : f === pattern);
    for (const f of files) {
      if (!matches(f)) continue;
      if (sign === "+") kept.add(f);
      else kept.delete(f);
    }
  }
  return files.filter((f) => kept.has(f));
}
