import { bindLab, type SoundLab } from "./bind";
import { S1 } from "./s1/s1";
import { S2 } from "./s2/s2";
import { S3 } from "./s3/s3";
import { S4 } from "./s4/s4";
import { S5 } from "./s5/s5";
import { S6 } from "./s6/s6";
import { S7 } from "./s7/s7";
import { S8 } from "./s8/s8";

/** Each sound lab's screen, by lesson id. */
export const SOUND_LABS: Readonly<Record<string, SoundLab | undefined>> = {
  S1: bindLab(S1),
  S2: bindLab(S2),
  S3: bindLab(S3),
  S4: bindLab(S4),
  S5: bindLab(S5),
  S6: bindLab(S6),
  S7: bindLab(S7),
  S8: bindLab(S8),
};
