// Where a lab's code lives online. A lesson's command names its PlatformIO project folder
// (`pio run -d labs/02-led -e 02-led`), and that folder is the lab's page in the esp-labs repo.

/** "uv run pio run -d labs/02-led -e 02-led -t upload" → "02-led"; undefined for lessons with no lab. */
export const labDirOfCommand = (cmd: string): string | undefined =>
  /(?:^|\s)-d\s+labs\/([\w.-]+)/.exec(cmd)?.[1];

/** The lab's folder under `base` (the labs folder's URL, ending in "/"), or undefined without a lab. */
export function labSourceUrl(base: string, cmd: string): string | undefined {
  const dir = labDirOfCommand(cmd);
  return dir ? `${base}${dir}` : undefined;
}
