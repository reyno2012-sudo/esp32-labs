// B4 Pair & trust: ceremony · bonds · gatt · link · log.
import type { ScreenSpec } from "@/labs/shared/lab-screen/types";
import type { TerminalPrinter } from "@/ui/terminal/terminal-log";
import { bleSimLog } from "../kit/state";
import { benchInit, benchOp } from "./shared/bench";
import { drawGatt, drawLink, drawLog } from "./shared/draw";
import { drawBonds, drawCeremony } from "./b4-draw";
import { B4_METHOD_NAMES, type B4State, isMethod } from "./b4-state";

const nowS = () => performance.now() / 1000;
const IDENTITY = "C7:3B:51:9E:2A:4C";

/** Marks phase `p` reached; earlier phases nobody reported count as inferred. */
function reach(st: B4State, p: number, inferred: boolean, t: number) {
  for (let i = 0; i < p; i++)
    if (!st.at[i]) {
      st.at[i] = t;
      st.inferred[i] = true;
    }
  if (!st.at[p]) {
    st.at[p] = t;
    st.inferred[p] = inferred;
  }
}

function secured(st: B4State, term: TerminalPrinter) {
  const t = nowS();
  const authed = st.how !== "Just Works";
  st.passkey = 0;
  st.compare = false;
  st.encrypted = true;
  st.bonded = true;
  st.authed = authed;
  reach(st, 5, false, t);
  reach(st, 6, true, t);
  reach(st, 7, false, t);
  if (!st.bonds.length) st.bonds.push(IDENTITY);
  bleSimLog(st, term, "-", "ENC_CHANGE: link encrypted (AES-CCM)");
  bleSimLog(st, term, "+", `secured: ${authed ? "authenticated" : "Just Works"}, bonded, key 16 B`);
  bleSimLog(st, term, "-", `identity: ${IDENTITY}`);
  st.at[6] = t;
  st.inferred[6] = false;
  if (authed) {
    benchOp(st, 5, "read");
    st.rx++;
    bleSimLog(st, term, "<", "read Vault");
  } else {
    benchOp(st, 5, "refused");
    bleSimLog(st, term, "x", "Vault refused: pair first");
  }
}

function readVault(st: B4State, term: TerminalPrinter) {
  if (st.radio !== "connected") return term.line("[W] connect first", "warn");
  if (st.encrypted && st.authed !== false) {
    benchOp(st, 5, "read");
    st.rx++;
    return bleSimLog(st, term, "<", "read Vault");
  }
  if (st.encrypted) {
    benchOp(st, 5, "refused");
    return bleSimLog(st, term, "x", "Vault refused: pair first");
  }
  benchOp(st, 5, "refused");
  if (st.method === "justworks") {
    st.how = "Just Works";
    return secured(st, term);
  }
  st.how = st.method === "passkey" ? "Passkey Entry" : "Numeric Comparison";
  reach(st, 4, false, nowS());
  st.passkey = st.method === "passkey" ? 482915 : 731406;
  st.compare = st.method === "compare";
  bleSimLog(
    st,
    term,
    "!",
    st.compare
      ? "compare 731406: same on the phone? (click/yes)"
      : "passkey 482915: type it on the other device",
  );
}

const hangUp = (st: B4State, term: TerminalPrinter) => {
  st.radio = "advertising";
  st.encrypted = st.bonded = false;
  bleSimLog(st, term, "!", "disconnected 0x16: we hung up");
};

export const b4Screen: ScreenSpec<B4State> = {
  views: ["ceremony", "bonds", "gatt", "link", "log"],
  captions: [
    (t) => t("labs-ble:screens.b4.captions.0"),
    (t) => t("labs-ble:screens.b4.captions.1"),
    (t) => t("labs-ble:screens.b4.captions.2"),
    (t) => t("labs-ble:screens.b4.captions.3"),
    (t) => t("labs-ble:screens.b4.captions.4"),
  ],
  boot: [
    "ble-lab-b4: NimBLE 2.5.1 up, address 7C:DF:A1:0B:5E:3C, TX power 9 dBm",
    '  - advertising as "Bench B4"',
    "  - pairing: Passkey · lock off · anyone may connect",
    "",
    'Bluetooth lab B4 Pair & trust  (ble-lab-b4)  ·  phones see "Bench B4"',
  ],
  init: () => ({
    ...benchInit(),
    method: "passkey",
    at: [],
    inferred: [],
    how: "",
    failed: "",
    bonds: [],
    allow: false,
    log: [["    2.1", "-", "pairing: Passkey · lock off · anyone may connect"]],
    footer: "- pairing: Passkey · lock off · anyone may connect",
  }),
  actions: [
    {
      label: (_, t) => t("labs-ble:screens.b4.actions.phoneConnect"),
      run(st, term) {
        if (st.radio === "connected") return;
        if (st.allow && !st.bonds.length)
          return term.line("[I] the phone gets no connection: not on the accept list", "warn");
        const t = nowS();
        st.radio = "connected";
        st.at = [t];
        st.inferred = [];
        st.failed = "";
        bleSimLog(st, term, "+", "connected: 5A:3C:91:2E:7B:44");
        if (st.bonds.length) {
          st.how = "stored keys";
          st.at[5] = st.at[7] = t;
          st.encrypted = st.bonded = true;
          bleSimLog(st, term, "+", "secured: authenticated, bonded, key 16 B");
        } else st.how = "";
      },
    },
    { label: (_, t) => t("labs-ble:screens.b4.actions.phoneReadVault"), run: readVault },
    {
      label: (_, t) => t("labs-ble:screens.b4.actions.phoneTypeThePasskeyTapYes"),
      run(st, term) {
        if (!st.passkey) return term.line("[W] no pairing is waiting", "warn");
        if (st.compare && !st.boardYes)
          return term.line("[I] the phone said yes; the board still waits for its click", "info");
        secured(st, term);
      },
    },
    {
      label: (_, t) => t("labs-ble:screens.b4.actions.boardClickYes"),
      run(st, term) {
        if (!(st.passkey && st.compare)) {
          st.view = (st.view + 1) % 5;
          return;
        }
        st.boardYes = true;
        bleSimLog(st, term, "-", "you said yes, it matches");
        secured(st, term);
        st.boardYes = false;
      },
    },
  ],
  onCommand(line, st, term) {
    const [cmd, a] = line.split(/\s+/);
    if (cmd === "pair" && isMethod(a)) {
      st.method = a;
      bleSimLog(st, term, "+", `next pairing: ${B4_METHOD_NAMES[a]} (saved)`);
      if (st.bonds.length)
        bleSimLog(st, term, "-", "old bonds keep their old level: forget + pair again");
      st.view = 0;
      return true;
    }
    if (cmd === "bonds") {
      term.line(
        `${st.bonds.length} bonded device${st.bonds.length === 1 ? "" : "s"} (identity addresses, as the bond store keeps them):`,
      );
      st.bonds.forEach((b, i) => term.line(`  ${i + 1}  ${b}  random static`));
      st.view = 1;
      return true;
    }
    if (cmd === "forget") {
      st.bonds = [];
      bleSimLog(st, term, "!", "forgot every bond");
      bleSimLog(st, term, "-", 'now forget "Bench B4" on the phone too');
      if (st.radio === "connected") hangUp(st, term);
      return true;
    }
    if (cmd === "allow" && (a === "bonded" || a === "anyone")) {
      st.allow = a === "bonded";
      if (st.allow && !st.bonds.length)
        bleSimLog(st, term, "!", "no bonds yet: nobody can connect now");
      bleSimLog(st, term, "+", `${st.allow ? "only bonded phones" : "anyone"} may connect (saved)`);
      return true;
    }
    if (cmd === "yes" || cmd === "no") {
      if (!(st.passkey && st.compare)) {
        term.line("[W] no numbers are waiting for a comparison", "warn");
        return true;
      }
      if (cmd === "yes") {
        bleSimLog(st, term, "-", "you said yes, it matches");
        secured(st, term);
      } else {
        st.passkey = 0;
        st.failed = "numbers didn't match: said no";
        bleSimLog(st, term, "-", "you said no");
        bleSimLog(st, term, "x", "ENC_CHANGE failed 0x50C: numbers didn't match: said no");
      }
      return true;
    }
    if (cmd === "secure") {
      if (st.radio !== "connected") {
        term.line("[W] connect first", "warn");
        return true;
      }
      bleSimLog(st, term, ">", "Security Request: please encrypt");
      readVault(st, term);
      return true;
    }
    if (cmd === "lock") {
      term.line(
        `lock ${a ?? ""} saved. The GATT table is fixed at start-up, so the board restarts now...`,
      );
      return true;
    }
    if (cmd === "disconnect" && st.radio === "connected") {
      hangUp(st, term);
      return true;
    }
    return false;
  },
  draw(g, C, view, t, st) {
    if (view === 0) drawCeremony(g, C, t, st);
    else if (view === 1) drawBonds(g, C, t, st);
    else if (view === 2) drawGatt(g, C, t, st, true);
    else if (view === 3) drawLink(g, C, t, st);
    else drawLog(g, C, st);
  },
};
