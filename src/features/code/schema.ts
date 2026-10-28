import * as z from "zod/mini";

// The firmware documents written by tools/firmware/vite-plugin.ts, validated when fetched.
const Role = z.enum(["lab", "shared"]);

export const FirmwareIndexSchema = z.object({
  envs: z.array(
    z.object({
      env: z.string(),
      about: z.string(),
      files: z.array(
        z.object({ path: z.string(), role: Role, group: z.string(), lines: z.number() }),
      ),
    }),
  ),
});

export const FirmwareEnvSchema = z.object({
  env: z.string(),
  about: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      role: Role,
      group: z.string(),
      lines: z.number(),
      text: z.string(),
    }),
  ),
});

export type FirmwareIndex = z.infer<typeof FirmwareIndexSchema>;
export type FirmwareEnvDoc = z.infer<typeof FirmwareEnvSchema>;
