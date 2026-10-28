import type { TrackId } from "@/domain/lesson";
import type { Track } from "@/domain/track";

// The table of contents. Adding a theme = one entry here + a lessons file + one loader below.
// Lesson content itself is code-split per track and loaded on demand (see ./queries.ts).
export const TRACKS: readonly Track[] = [
  {
    id: "intro",
    title: "Intro",
    blurb: "Tools, first program, first circuit",
    color: "--ok",
    lessonIds: ["00", "01", "02"],
  },
  {
    id: "display",
    title: "Display & input",
    blurb: "The 1.9″ screen and buttons",
    color: "--copper",
    lessonIds: ["03", "03b"],
  },
  {
    id: "wifi",
    title: "Wi-Fi",
    blurb: "Scan, join, serve pages, update over the air",
    color: "--w-sda",
    lessonIds: ["W1", "W2", "W3", "W4", "W5"],
  },
  {
    id: "rfid",
    title: "RFID & NFC",
    blurb: "Cards, tags and the 13.56 MHz field",
    color: "--rfid",
    lessonIds: ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"],
  },
  {
    id: "sensors",
    title: "Sensors",
    blurb: "Temperature, air, motion over I2C",
    color: "--w-dc",
    lessonIds: [],
    planned: true,
  },
  {
    id: "ble",
    title: "Bluetooth LE",
    blurb: "Listen, pair, control: phones, keyboards, music",
    color: "--ble",
    lessonIds: ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"],
  },
  {
    id: "sound",
    title: "Sound",
    blurb: "Hear, measure, clap, record, see pitch, play",
    color: "--sound",
    lessonIds: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"],
  },
];

export const DEFAULT_LESSON_ID = "00";

export const findTrack = (id: string) => TRACKS.find((t) => t.id === id);

/** The track a lesson id belongs to, or undefined for an unknown id. */
export const trackOfLesson = (lessonId: string): TrackId | undefined =>
  TRACKS.find((t) => t.lessonIds.includes(lessonId))?.id;
