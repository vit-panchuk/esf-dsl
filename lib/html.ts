/**
 * The HTML backend — every construct as a function from props to markup.
 *
 * This is the web channel's emitter, and it sits beside `markdown.ts`
 * rather than above it: same tree, same props, a different serialization.
 * Every channel works this way, which is what keeps a report data rather
 * than a page — and what lets this package render one with no framework
 * anywhere in it.
 *
 * There is exactly one place each construct's markup is decided. A host
 * with a component model wraps these functions; it does not reimplement
 * them, so every consumer gets the same bytes.
 *
 * Conventions
 * -----------
 * Every emitter takes `(props, slots?)`. `slots.default` is the already
 * rendered inner HTML; named slots (only `addresses`, on a bet) come in
 * beside it. Emitters never escape their slots — the caller has already
 * produced HTML — and always escape their props, which are text.
 */
import { DSL, type Lang, type Tag } from "./strings";

/* ── plumbing ─────────────────────────────────────────────────────── */

/** Text into markup. Includes the apostrophe as `&#39;`, which matters
 *  less for correctness than for agreement: the MDX compiler escapes it,
 *  and a backend that did not would produce a diff on every possessive. */
export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** An optional attribute: absent when the value is, so `undefined` never
 *  becomes the string "undefined" in the output. */
export const attr = (name: string, v: unknown): string =>
  v === undefined || v === false || v === null ? "" : v === true ? ` ${name}` : ` ${name}="${esc(v)}"`;

/** An id attribute, lowercased — item codes are one namespace and the
 *  anchor is the code. */
const idAttr = (id: unknown, on = true) =>
  on && id !== undefined ? ` id="${esc(String(id).toLowerCase())}"` : "";

export interface Slots {
  default?: string;
  [name: string]: string | undefined;
}
const inner = (s?: Slots) => s?.default ?? "";
const langOf = (p: { lang?: string }): Lang => ((p.lang as Lang) in DSL ? (p.lang as Lang) : "en");

/* ── provenance, judgement, reference ─────────────────────────────── */

export const chip = (
  p: { kind?: Tag; label?: string; lang?: string; legend?: boolean } = {},
): string => {
  const kind = p.kind ?? "observed";
  /* data-evidence carries the grade for machine readers: the label is
     localized and the hue is treatment, but an agent parsing the HTML gets
     the English token either way. */
  return `<span class="chip"${attr("data-evidence", kind)}${p.legend ? ' data-legend=""' : ""}>${esc(
    p.label ?? DSL[langOf(p)].tags[kind],
  )}</span>`;
};

export interface EvidenceRowIn {
  label: string;
  pct: number;
  n: number;
  assumed?: boolean;
}

export const evidence = (p: { rows?: EvidenceRowIn[]; note?: string } = {}): string => {
  const rows = p.rows ?? [];
  const body = rows
    .map(
      (r) =>
        `<div class="evidence-meter-row"${r.assumed ? ' data-tag="assumed"' : ""}>` +
        `<span>${esc(r.label)}</span>` +
        `<span class="evidence-meter-track"><span class="evidence-meter-fill" style="width:${r.pct}%"></span></span>` +
        `<span class="evidence-meter-pct">${r.pct}%</span>` +
        `<span class="evidence-meter-n">${r.n}</span></div>`,
    )
    .join("");
  return (
    `<div class="evidence-meter">${body}</div>` +
    (p.note ? `<p class="evidence-meter-note">${esc(p.note)}</p>` : "")
  );
};

export const verdict = (p: { value: "yes" | "no" | "part"; symbol?: boolean }, s?: Slots): string =>
  `<span class="verdict${p.symbol === false ? " verdict--bare" : ""}"${attr("data-verdict", p.value)}>${inner(s)}</span>`;

export const ref = (p: { id: string; memo: string; href?: string }): string =>
  `<a class="ref" href="${esc(p.href ?? `#${p.id.toLowerCase()}`)}">${esc(p.id)}<span class="ref-tip">${esc(p.memo)}</span></a>`;

/** The marked beat. The marks themselves are authoring metadata for the
 *  deck and thread and never reach a rendering. */
export const finding = (p: { tag?: Tag } = {}, s?: Slots): string =>
  `<blockquote class="pull-quote" data-finding${attr("data-tag", p.tag)}>${inner(s)}</blockquote>`;

export const takeaway = (_p: unknown, s?: Slots): string =>
  `<aside class="takeaway"><p>${inner(s)}</p></aside>`;

/* ── the registers ────────────────────────────────────────────────── */

const fact = (label: string, v?: string) =>
  v ? `<p class="register-fact"><b>${label}</b> ${esc(v)}</p>` : "";

const head = (id: string | undefined, title: string, note?: string) =>
  `<p class="register-head">${id ? `${esc(id)} — ` : ""}${esc(title)}` +
  (note ? `<span class="register-note">${esc(note)}</span>` : "") +
  `</p>`;

export const risk = (
  p: {
    id: string;
    title: string;
    flag?: string;
    happens?: string;
    likelihood?: string;
    notice?: string;
    cost?: string;
    falsifier?: string;
  },
  s?: Slots,
): string =>
  `<div class="register-entry"${idAttr(p.id)}>${head(p.id, p.title, p.flag)}${inner(s)}` +
  fact("If it happens:", p.happens) +
  fact("Likelihood:", p.likelihood) +
  fact("Would you notice?", p.notice) +
  fact("Cost:", p.cost) +
  /* The falsifier comes last and is never optional in spirit: a risk
     nothing could disprove is an opinion. */
  fact("What would change my mind:", p.falsifier) +
  `</div>`;

export const debt = (p: { id: string; title: string; kind?: string }, s?: Slots): string =>
  `<div class="ledger"${idAttr(p.id)}>${head(p.id, p.title, p.kind)}${inner(s)}</div>`;

export const credit = (
  p: { id?: string; title: string; status?: string; realized?: boolean },
  s?: Slots,
): string =>
  `<div class="ledger"${p.realized === false ? "" : ' data-realized=""'}${idAttr(p.id, p.id !== undefined)}>` +
  head(p.id, p.title, p.status) +
  `${inner(s)}</div>`;

export const cause = (p: { id: string; title: string; ensures?: string }, s?: Slots): string =>
  `<div class="register-entry"${idAttr(p.id)}>${head(p.id, p.title)}${inner(s)}` +
  fact("Ensures:", p.ensures) +
  `</div>`;

export const mortem = (
  p: { id: string; title: string; note?: string; warning: string; mitigation: string },
  s?: Slots,
): string =>
  `<div class="register-entry"${idAttr(p.id)}>${head(p.id, p.title, p.note)}${inner(s)}` +
  fact("Early warning:", p.warning) +
  fact("Mitigation:", p.mitigation) +
  `</div>`;

export const decision = (
  p: { id: string; status: "superseded" | "standing" | "withdrawn"; rev?: number; was?: string },
  s?: Slots,
): string =>
  `<div class="decision"${attr("data-status", p.status)}>` +
  `<p class="decision-meta">${esc(p.id)}${p.rev !== undefined ? ` · rev. ${esc(p.rev)}` : ""} · ${esc(p.status)}</p>` +
  /* Superseded text is struck, never deleted — a reader who only knows the
     original plan has to be able to see that it changed. */
  (p.was ? `<p class="decision-was">${esc(p.was)}</p>` : "") +
  `<div class="decision-now">${inner(s)}</div></div>`;

const tableWrap = (headRow: string, body: string) =>
  `<div class="table-scroll"><table><thead><tr>${headRow}</tr></thead><tbody>${body}</tbody></table></div>`;

export const strategies = (p: { lang?: string } = {}, s?: Slots): string => {
  const h = DSL[langOf(p)].registers.strategies;
  return tableWrap(
    [h.code, h.rule, h.written, h.working].map((c) => `<th>${esc(c)}</th>`).join(""),
    inner(s),
  );
};

export const strategy = (
  p: {
    id: string;
    state: string;
    stateVerdict?: "yes" | "no" | "part";
    health: string;
    healthVerdict?: "yes" | "no" | "part";
  },
  s?: Slots,
): string =>
  `<tr${idAttr(p.id)}><td>${esc(p.id)}</td><td>${inner(s)}</td>` +
  `<td>${p.stateVerdict ? verdict({ value: p.stateVerdict }, { default: esc(p.state) }) : esc(p.state)}</td>` +
  `<td>${p.healthVerdict ? verdict({ value: p.healthVerdict }, { default: esc(p.health) }) : esc(p.health)}</td></tr>`;

export const bets = (p: { lang?: string } = {}, s?: Slots): string => {
  const h = DSL[langOf(p)].registers.bets;
  return tableWrap(
    [h.code, h.bet, h.verdict, h.addresses, h.cost].map((c) => `<th>${esc(c)}</th>`).join(""),
    inner(s),
  );
};

/** The verbs a bet's call may take, and the hue each earns. Derived, so a
 *  bet's colour cannot disagree with its verdict. */
const BET_HUE = { do: "yes", build: "yes", buy: "yes", kill: "no" } as const;

export const bet = (
  p: { id: string; verdict: string; value?: "yes" | "no" | "part"; cost?: string; anchor?: boolean },
  s?: Slots,
): string => {
  const hue = p.value ?? BET_HUE[p.verdict.toLowerCase() as keyof typeof BET_HUE] ?? "part";
  return (
    `<tr${idAttr(p.id, p.anchor !== false)}><td>${esc(p.id)}</td><td>${inner(s)}</td>` +
    `<td>${verdict({ value: hue }, { default: esc(p.verdict) })}</td>` +
    `<td>${s?.addresses ?? ""}</td><td>${esc(p.cost ?? "—")}</td></tr>`
  );
};

export const easyWins = (p: { lang?: string } = {}, s?: Slots): string => {
  const h = DSL[langOf(p)].registers.easyWins;
  return tableWrap(
    [h.code, h.win, h.feeds, h.day, h.status].map((c) => `<th>${esc(c)}</th>`).join(""),
    inner(s),
  );
};

const WIN_HUE = { shipped: "yes", ejected: "no" } as const;

export const easyWin = (
  p: { id: string; feeds: string; day?: string; status?: string; anchor?: boolean },
  s?: Slots,
): string => {
  const hue = WIN_HUE[p.status?.toLowerCase() as keyof typeof WIN_HUE];
  const cell = p.status
    ? hue
      ? verdict({ value: hue }, { default: esc(p.status) })
      : esc(p.status)
    : "—";
  return (
    `<tr${idAttr(p.id, p.anchor !== false)}><td>${esc(p.id)}</td><td>${inner(s)}</td>` +
    `<td>${esc(p.feeds)}</td><td>${esc(p.day ?? "≤ a day")}</td><td>${cell}</td></tr>`
  );
};

/* ── the reserve ──────────────────────────────────────────────────── */

export const claim = (p: { tag: Tag; source?: string }): string =>
  `<span class="chip"${attr("data-evidence", p.tag)}${attr("title", p.source)}>${esc(p.tag)}</span>`;

export const evidenceBar = (
  p: Partial<Record<Tag | "total", string | number>> & { note?: string } = {},
): string => {
  const num = (v: unknown) => Number(v ?? 0);
  const TAGS: Tag[] = ["observed", "web", "user", "inferred", "assumed"];
  const counts = Object.fromEntries(TAGS.map((t) => [t, num(p[t])])) as Record<Tag, number>;
  const total = num(p.total) || TAGS.reduce((a, t) => a + counts[t], 0);
  const pct = (c: number) => (total === 0 ? 0 : Math.round((c / total) * 100));
  const rows = TAGS.map(
    (t) =>
      `<div class="evidence-meter-row"${attr("data-tag", t)}>` +
      `<span>${t}</span>` +
      `<span class="evidence-meter-track"><span class="evidence-meter-fill" style="width:${pct(counts[t])}%"></span></span>` +
      `<span class="evidence-meter-pct">${pct(counts[t])}%</span>` +
      `<span class="evidence-meter-n">${counts[t]}</span></div>`,
  ).join("");
  return (
    `<figure class="evidence-meter-wrap">` +
    `<figcaption class="evidence-meter-cap">Evidence base — ${total} claims</figcaption>` +
    `<div class="evidence-meter">${rows}</div>` +
    (p.note ? `<p class="evidence-meter-note">${esc(p.note)}</p>` : "") +
    `</figure>`
  );
};

/* ── prose bodies ─────────────────────────────────────────────────── */

export const callout = (p: { kind?: "claim" | "unknown"; label?: string } = {}, s?: Slots): string =>
  /* The orange is treatment; data-epistemic="unknown" is the same fact for
     machine readers — this is unresolved, not asserted. */
  `<div class="callout"${p.kind === "unknown" ? ' data-epistemic="unknown"' : ""}>` +
  (p.label ? `<p class="callout-h">${esc(p.label)}</p>` : "") +
  `${inner(s)}</div>`;

export const pullQuote = (p: { cite?: string } = {}, s?: Slots): string =>
  `<blockquote class="pull-quote">${inner(s)}${p.cite ? `<cite>${esc(p.cite)}</cite>` : ""}</blockquote>`;

export const cols = (
  p: {
    title?: string;
    cols: { label: string; n: string | number; v: number; muted?: boolean; assumed?: boolean }[];
    caption?: string;
  },
  _s?: Slots,
): string =>
  `<figure class="chart">` +
  (p.title ? `<figcaption class="chart-title">${esc(p.title)}</figcaption>` : "") +
  `<div class="cols">` +
  p.cols
    .map(
      (c) =>
        `<div class="cols-col${c.muted ? " cols-col--muted" : ""}"${c.assumed ? ' data-epistemic="assumed"' : ""}>` +
        `<span class="cols-n">${esc(c.n)}</span>` +
        `<span class="cols-bar" style="--v:${c.v}"></span></div>`,
    )
    .join("") +
  `</div><div class="cols-x">${p.cols.map((c) => `<span>${esc(c.label)}</span>`).join("")}</div>` +
  (p.caption ? `<p class="chart-cap">${p.caption}</p>` : "") +
  `</figure>`;

export const fn = (p: { n: string | number; href: string }): string =>
  `<a class="footnote" href="${esc(p.href)}">${esc(p.n)}</a>`;

export const sources = (_p: unknown, s?: Slots): string => `<ol class="sources">${inner(s)}</ol>`;

export const state = (
  p: { kind?: "empty" | "error" | "unknown" | "inline"; label: string; title?: string; detail?: string },
  s?: Slots,
): string => {
  const kind = p.kind ?? "empty";
  if (kind === "inline")
    return `<p class="state state--inline"><span class="state-k">${esc(p.label)}</span>${inner(s)}</p>`;
  return (
    `<div class="state state--${esc(kind)}">` +
    `<p class="state-k">${esc(p.label)}</p>` +
    (p.title ? `<h2 class="state-h">${esc(p.title)}</h2>` : "") +
    `<div class="state-b">${inner(s)}</div>` +
    (s?.actions ? `<div class="state-act">${s.actions}</div>` : "") +
    (p.detail ? `<p class="state-detail">${esc(p.detail)}</p>` : "") +
    `</div>`
  );
};

/* ── sequence ─────────────────────────────────────────────────────── */

export const timeline = (_p: unknown, s?: Slots): string => `<div class="tl">${inner(s)}</div>`;

export const event = (
  p: { when: string; assumed?: boolean; open?: boolean; gap?: boolean; turn?: boolean; good?: boolean },
  s?: Slots,
): string => {
  const cls = p.gap
    ? "tl-gap"
    : `tl-item${p.open ? " tl-item--open" : ""}${p.turn ? " tl-item--turn" : ""}${p.good ? " tl-item--good" : ""}`;
  return (
    `<div class="${cls}"${p.assumed ? ' data-epistemic="assumed"' : ""}>` +
    `<span class="tl-when">${esc(p.when)}</span>${inner(s)}</div>`
  );
};

export const dialog = (_p: unknown, s?: Slots): string => `<div class="dialog">${inner(s)}</div>`;

export const turn = (p: { who: string; when?: string; silence?: boolean }, s?: Slots): string =>
  `<div class="dialog-turn${p.silence ? " dialog-turn--silence" : ""}">` +
  `<p class="dialog-who"><b>${esc(p.who)}</b>${p.when ? ` · ${esc(p.when)}` : ""}</p>` +
  `<q>${inner(s)}</q></div>`;

export const dialogNote = (_p: unknown, s?: Slots): string =>
  `<p class="dialog-note">${inner(s)}</p>`;

/* ── data ─────────────────────────────────────────────────────────── */

export const table = (p: { legend?: boolean } = {}, s?: Slots): string =>
  `<div class="table-scroll"${p.legend ? ' data-legend=""' : ""}><table>${inner(s)}</table></div>`;

export const plate = (p: { src?: string; alt: string; tone?: "ink" | "orange"; band?: boolean }): string =>
  `<div class="plate plate--${esc(p.tone ?? "ink")}${p.band ? " plate-band" : ""}">` +
  (p.src ? `<img src="${esc(p.src)}" alt="${esc(p.alt)}">` : `<div class="plate-slot">${esc(p.alt)}</div>`) +
  `</div>`;

export const figure = (p: {
  src?: string;
  alt: string;
  tone?: "ink" | "orange";
  caption?: string;
}): string =>
  `<figure class="plate-fig">${plate(p)}` +
  (p.caption ? `<figcaption class="plate-cap">${p.caption}</figcaption>` : "") +
  `</figure>`;

export const figures = (p: { items: { v: string; cap: string }[] }): string =>
  `<ul class="figures">` +
  p.items
    .map(
      (i) =>
        `<li class="figures-item"><b class="figures-v">${esc(i.v)}</b>` +
        `<span class="figures-cap">${esc(i.cap)}</span></li>`,
    )
    .join("") +
  `</ul>`;

/* ── charts ───────────────────────────────────────────────────────── */

const chartWrap = (title: string | undefined, body: string, caption?: string) =>
  `<figure class="chart">` +
  (title ? `<figcaption class="chart-title">${esc(title)}</figcaption>` : "") +
  body +
  /* Captions may carry inline markup the author wrote, so they pass
     through — the same decision `set:html` made in the component. */
  (caption ? `<p class="chart-cap">${caption}</p>` : "") +
  `</figure>`;

export const bars = (p: {
  title?: string;
  rows: { label: string; v: number; value: string; to?: number; assumed?: boolean }[];
  caption?: string;
}): string =>
  chartWrap(
    p.title,
    `<div class="bars">` +
      p.rows
        .map(
          (r) =>
            `<div class="bars-row"${r.assumed ? ' data-epistemic="assumed"' : ""}>` +
            `<span>${esc(r.label)}</span><span class="bars-track">` +
            `<span class="bars-fill" style="--v:${r.v}"></span>` +
            (r.to !== undefined ? `<span class="bars-range" style="--v:${r.v};--to:${r.to}"></span>` : "") +
            `</span><span class="bars-val">${esc(r.value)}</span></div>`,
        )
        .join("") +
      `</div>`,
    p.caption,
  );

export const horizon = (p: {
  lanes: { label: string; note?: string; cells: string[][] }[];
  heads: { label: string; note?: string; now?: boolean }[];
}): string =>
  `<div class="horizon" style="--cols:${p.heads.length}"><div class="horizon-corner"></div>` +
  p.heads
    .map(
      (h) =>
        `<div class="horizon-head"${h.now ? ' data-now=""' : ""}><b>${esc(h.label)}</b>` +
        (h.note ? `<span>${esc(h.note)}</span>` : "") +
        `</div>`,
    )
    .join("") +
  p.lanes
    .map(
      (l) =>
        `<div class="horizon-lane"><b>${esc(l.label)}</b>${esc(l.note ?? "")}</div>` +
        l.cells
          .map(
            (cell) =>
              `<div class="horizon-cell${cell.length ? "" : " horizon-cell--empty"}">` +
              cell.map((i) => `<div class="horizon-item"><b>${esc(i)}</b></div>`).join("") +
              `</div>`,
          )
          .join(""),
    )
    .join("") +
  `</div>`;

export const spark = (p: { points: string }): string =>
  `<svg class="spark" viewBox="0 0 60 16" preserveAspectRatio="none" aria-hidden="true">` +
  `<polyline points="${esc(p.points)}"></polyline></svg>`;

/** The greyscale series, in the order the design system deals them. */
const DONUT_KEYS = ["var(--ink)", "var(--tag-web)", "var(--ink-muted)", "var(--tag-user)"];

export const donut = (p: {
  title?: string;
  parts: { label: string; pct: number; signal?: boolean }[];
  caption?: string;
}): string => {
  /* Four is the ceiling. Past that a reader is comparing angles, which is
     what a table is for — so this is an error rather than a squeeze. */
  if (p.parts.length > 4)
    throw new Error(
      `[Donut] ${p.parts.length} parts — four is the ceiling. Past that a reader compares angles; use a table.`,
    );
  let dealt = 0;
  const coloured = p.parts.map((x) => ({
    ...x,
    colour: x.signal ? "var(--signal)" : DONUT_KEYS[dealt++],
  }));
  let at = 0;
  const stops = coloured
    .map((x) => {
      const from = at;
      at += x.pct;
      return `${x.colour} ${from}% ${at}%`;
    })
    .join(", ");
  return chartWrap(
    p.title,
    `<div class="donut-fig"><div class="donut" style="background:conic-gradient(${stops})"></div>` +
      `<div class="donut-legend">` +
      coloured
        .map(
          (x) =>
            `<div><i style="background:${x.colour}"></i><span>${esc(x.label)}</span><span>${x.pct}%</span></div>`,
        )
        .join("") +
      `</div></div>`,
    p.caption,
  );
};

const SHARE_SERIES = ["", " stack-seg--2", " stack-seg--3", " stack-seg--4"];
const SHARE_KEYS = ["var(--ink)", "var(--tag-web)", "var(--tag-user)", "var(--ink-muted)"];

export const share = (p: {
  title?: string;
  segments: { label: string; pct: number; signal?: boolean }[];
  caption?: string;
}): string => {
  let dealt = 0;
  const segs = p.segments.map((s) =>
    s.signal
      ? { ...s, cls: "", key: "var(--signal)" }
      : { ...s, cls: SHARE_SERIES[dealt] ?? " stack-seg--4", key: SHARE_KEYS[dealt++] ?? "var(--ink-muted)" },
  );
  return chartWrap(
    p.title,
    `<div class="stack-bar">` +
      segs
        .map(
          (s) =>
            `<span class="stack-seg${s.cls}"${s.signal ? ' data-epistemic="assumed"' : ""} style="--v:${s.pct}"></span>`,
        )
        .join("") +
      `</div><div class="stack-key">` +
      segs
        .map((s) => `<span><i style="background:${s.key}"></i>${esc(s.label)} ${s.pct}%</span>`)
        .join("") +
      `</div>`,
    p.caption,
  );
};

export interface AxisPt {
  id: string;
  x: number;
  y: number;
  tip: string;
  at?: "left" | "under" | "left under";
}

export const axisPlot = (p: {
  title: string;
  caption?: string;
  x: string;
  y: string;
  quadrants: [string, string, string, string];
  hot?: "tl" | "tr" | "bl" | "br";
  points: AxisPt[];
}): string => {
  const tipCls = (at?: string) =>
    ["axis-tip", ...(at ?? "").split(" ").filter(Boolean).map((m) => `axis-tip--${m}`)].join(" ");
  const quads = (["tl", "tr", "bl", "br"] as const)
    .map(
      (q, i) =>
        `<span class="axis-q axis-q--${q}${p.hot === q ? " axis-q--hot" : ""}">${esc(p.quadrants[i])}</span>`,
    )
    .join("");
  const pts = p.points
    .map(
      (pt) =>
        `<span class="axis-pt" style="--x:${pt.x};--y:${pt.y}" tabindex="0">${esc(pt.id)}` +
        `<span class="${tipCls(pt.at)}">${esc(pt.tip)}</span></span>`,
    )
    .join("");
  /* Position is an opinion, so every dot carries its number and the legend
     repeats it — the plot is never the only place a point is named. */
  const legend = p.points
    .map((pt) => `<li><b>${esc(pt.id)}</b><span>${esc(pt.tip)}</span></li>`)
    .join("");
  return (
    `<figure class="diagram-fig" data-kind="quadrant"><div class="diagram"><div class="axis">` +
    `<span class="axis-y">${esc(p.y)}</span><div class="axis-plot">` +
    `<span class="axis-head axis-head--up"></span><span class="axis-head axis-head--right"></span>` +
    quads +
    pts +
    `</div><span class="axis-x">${esc(p.x)}</span>` +
    `<ol class="axis-legend">${legend}</ol></div></div>` +
    `<figcaption class="diagram-cap"><b>${esc(p.title)}.</b>${p.caption ? ` ${esc(p.caption)}` : ""}</figcaption></figure>`
  );
};

export const linePlot = (p: {
  title?: string;
  series: { points: string; muted?: boolean }[];
  forecast?: string;
  xLabels?: string[];
  keyItems?: { label: string; tone?: "ink" | "muted" | "signal" }[];
  caption?: string;
}): string => {
  const tone = (t?: string) =>
    t === "muted" ? "var(--ink-muted)" : t === "signal" ? "var(--signal)" : "var(--ink)";
  const xLabels = p.xLabels ?? [];
  const keyItems = p.keyItems ?? [];
  return chartWrap(
    p.title,
    `<div class="line-plot"><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">` +
      p.series
        .map((s) => `<polyline${s.muted ? ' class="is-muted"' : ""} points="${esc(s.points)}"></polyline>`)
        .join("") +
      (p.forecast ? `<polyline data-forecast points="${esc(p.forecast)}"></polyline>` : "") +
      `</svg></div>` +
      (xLabels.length
        ? `<div class="line-x">${xLabels.map((l) => `<span>${esc(l)}</span>`).join("")}</div>`
        : "") +
      (keyItems.length
        ? `<div class="chart-key">` +
          keyItems
            .map(
              (k) =>
                `<span><i${k.tone ? ` style="background:${tone(k.tone)}"` : ""}></i>${esc(k.label)}</span>`,
            )
            .join("") +
          `</div>`
        : ""),
    p.caption,
  );
};

/* ── diagrams ─────────────────────────────────────────────────────── */

/** The wrapper. The picture itself is the construct's children, because a
 *  diagram's body is authored rather than derived. */
export const diagram = (p: { title: string; kind?: string; caption?: string }, s?: Slots): string =>
  `<figure class="diagram-fig"${attr("data-kind", p.kind)}>` +
  `<div class="diagram">${inner(s)}</div>` +
  `<figcaption class="diagram-cap"><b>${esc(p.title)}.</b>${p.caption ? ` ${esc(p.caption)}` : ""}</figcaption></figure>`;

export interface WNode {
  label: string;
  visibility: number;
  evolution: number;
  own?: boolean;
  assumed?: boolean;
  side?: "below" | "left";
  moveTo?: number;
}

export const wardley = (p: {
  yLabel?: string;
  nodes: WNode[];
  links?: [string, string][];
  stages?: [string, string, string, string];
}): string => {
  const stages = p.stages ?? ["Genesis", "Custom", "Product", "Commodity"];
  const byLabel = new Map(p.nodes.map((n) => [n.label, n]));
  /* A link naming a node that does not exist is an error rather than a
     dropped line: a map may not point at nothing. */
  const resolved = (p.links ?? []).map(([a, b]) => {
    const from = byLabel.get(a);
    const to = byLabel.get(b);
    if (!from || !to)
      throw new Error(
        `[Wardley] link "${a} -> ${b}" names a node that does not exist — a map may not point at nothing.`,
      );
    return { from, to };
  });
  const x = (n: WNode) => Math.round(n.evolution * 100);
  const y = (n: WNode) => Math.round(n.visibility * 100);
  const cls = (n: WNode) =>
    `wm-node${n.own ? " wm-node--own" : ""}${n.assumed ? " wm-node--assumed" : ""}${n.side ? ` wm-node--${n.side}` : ""}`;
  return (
    `<div class="wm"><span class="wm-y">${esc(p.yLabel ?? "Visible to the buyer")}</span><div class="wm-plot">` +
    `<svg class="wm-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
    resolved
      .map(
        ({ from, to }) =>
          `<line x1="${x(from)}" y1="${100 - y(from)}" x2="${x(to)}" y2="${100 - y(to)}" vector-effect="non-scaling-stroke"></line>`,
      )
      .join("") +
    `</svg>` +
    p.nodes
      .filter((n) => n.moveTo !== undefined)
      .map(
        (n) =>
          `<span class="wm-move" style="--x:${x(n)};--y:${y(n)};--to:${Math.round((n.moveTo as number) * 100)}"></span>`,
      )
      .join("") +
    p.nodes
      .map(
        (n) =>
          `<span class="${cls(n)}" style="--x:${x(n)};--y:${y(n)}"><b>${esc(n.label)}</b><i class="wm-dot"></i></span>`,
      )
      .join("") +
    `</div><div class="wm-x">${stages.map((s) => `<span>${esc(s)}</span>`).join("")}</div></div>`
  );
};

/* ── the document frame ───────────────────────────────────────────── */

export const doc = (_p: unknown, s?: Slots): string => `<div class="doc">${inner(s)}</div>`;

export const docHead = (
  p: { eyebrow: string; title: string; lede?: string; oblique?: boolean },
  s?: Slots,
): string =>
  `<header class="doc-head"><p class="eyebrow">${esc(p.eyebrow)}</p><h1 class="d2">${esc(p.title)}</h1>` +
  (p.lede
    ? p.oblique
      ? `<p class="oblique" style="font-size:var(--step-2); line-height:1.3; margin:0; color:var(--ink-muted)">${esc(p.lede)}</p>`
      : `<p class="lede" style="color:var(--ink-muted)">${esc(p.lede)}</p>`
    : "") +
  (s?.also ?? "") +
  `</header>`;

export const rail = (_p: unknown, s?: Slots): string => `<aside class="rail">${inner(s)}</aside>`;

export const railBlock = (p: { k: string; live?: boolean }, s?: Slots): string =>
  `<div class="rail-block"><span class="rail-k">${esc(p.k)}</span>` +
  `<span class="rail-v${p.live ? " row-live" : ""}">${inner(s)}</span></div>`;

/** The section index. One entry is not an index, so a single-section
 *  document gets none. */
export const toc = (p: { label: string; sections: { text: string; slug: string }[]; start?: number }): string => {
  if (p.sections.length <= 1) return "";
  const start = p.start ?? 1;
  return (
    `<nav class="toc"><p class="toc-h">${esc(p.label)}</p>` +
    p.sections
      .map(
        (h, i) =>
          `<a href="#${esc(h.slug)}"><span>${String(i + start).padStart(2, "0")}</span><span>${esc(h.text)}</span></a>`,
      )
      .join("") +
    `</nav>`
  );
};

/* ── code ─────────────────────────────────────────────────────────── */

/**
 * A code listing, tokenized at build time.
 *
 * The slot arrives as HTML because everything else in this file does, so
 * markup in it means the caller has already highlighted (or the author
 * wrote markup deliberately) and it is left alone. Otherwise the entities
 * are decoded back to source and handed to highlight.js — colouring is a
 * treatment applied to text, and text is what it needs.
 */
export const listing = (
  p: { file?: string; lang?: string; caption?: string; meta?: string } = {},
  s?: Slots,
): string => {
  const lang = p.lang ?? "text";
  const raw = inner(s);
  const hasMarkup = /<[a-z][\s\S]*>/i.test(raw);
  const decode = (t: string) =>
    t
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");

  let code = raw;
  if (!hasMarkup && lang !== "text") {
    /* Required lazily: highlight.js is the one heavyweight import here, and
       a document with no listings should not pay for it. */
    const hljs = requireHljs();
    if (hljs?.getLanguage(lang)) code = hljs.highlight(decode(raw).trim(), { language: lang }).value;
  }
  return (
    `<div class="listing">` +
    (p.file
      ? `<p class="listing-file"><span>${esc(p.file)}</span>${p.meta ? `<span>${esc(p.meta)}</span>` : ""}</p>`
      : "") +
    `<pre class="hljs language-${esc(lang)}"><code>${code}</code></pre>` +
    (p.caption ? `<p class="listing-cap">${p.caption}</p>` : "") +
    `</div>`
  );
};

let hljsCache: any;
function requireHljs() {
  if (hljsCache !== undefined) return hljsCache;
  try {
    /* createRequire rather than a static import so the module graph of a
       consumer that never renders a listing stays small. */
    const { createRequire } = require("node:module");
    hljsCache = createRequire(import.meta.url)("highlight.js").default ?? null;
  } catch {
    hljsCache = null;
  }
  return hljsCache;
}

/* ── the deck ─────────────────────────────────────────────────────── */

/**
 * The slide channel. `select.ts` decides what is said and hands over
 * layout names; this decides how they look. Neither gets a vote on the
 * other, and by the time a slide arrives here every editorial decision —
 * including the 14-word budget — has been made and checked.
 */
export const deck = (p: {
  slides: any[];
  rows?: EvidenceRowIn[];
  total?: number;
  reportHref: string;
  eyebrow?: string;
  lang?: string;
}): string => {
  const t = DSL[langOf(p)].deck;
  const tags = DSL[langOf(p)];
  const n = p.slides.length;

  const exhibitOf = (ex: any): string => {
    if (!ex) return "";
    if (ex.component === "Bars") return bars(ex.props);
    if (ex.component === "Figures") return figures(ex.props);
    if (ex.component === "AxisPlot") return axisPlot(ex.props);
    if (ex.component === "Horizon") return horizon(ex.props);
    if (ex.component === "Table" && ex.table) {
      const head = ex.table.head?.length
        ? `<thead><tr>${ex.table.head.map((h: string) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`
        : "";
      const body = (ex.table.rows ?? [])
        .map((r: string[]) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
        .join("");
      return (
        `<div class="table-scroll"><table>` +
        (ex.table.caption ? `<caption>${esc(ex.table.caption)}</caption>` : "") +
        `${head}<tbody>${body}</tbody></table></div>`
      );
    }
    return "";
  };

  const slide = (s: any, i: number) => {
    let body = "";
    if (s.layout === "title")
      body =
        (p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : "") +
        `<h2 class="slide-h slide-h--title">${esc(s.text)}</h2>` +
        (s.note ? `<p class="slide-body">${esc(s.note)}</p>` : "");
    else if (s.layout === "statement" || s.layout === "finding")
      body =
        (s.tag ? `<p class="eyebrow">${chip({ kind: s.tag, lang: p.lang })}</p>` : "") +
        `<h2 class="slide-h">${esc(s.text)}</h2>` +
        (s.note ? `<p class="slide-note no-print">${esc(s.note)}</p>` : "");
    else if (s.layout === "exhibit")
      body =
        (s.tag ? `<p class="eyebrow">${chip({ kind: s.tag, lang: p.lang })}</p>` : "") +
        `<h2 class="slide-h slide-h--exhibit">${esc(s.text)}</h2>` +
        exhibitOf(s.exhibit);
    else if (s.layout === "evidence")
      body =
        `<p class="eyebrow">${esc(t.evidenceEyebrow)}</p>` +
        `<h2 class="slide-h">${p.total ?? 0} ${esc(tags.taggedClaims(p.total ?? 0))}</h2>` +
        evidence({ rows: p.rows ?? [] }) +
        `<p class="slide-body">${esc(t.evidenceNote)}</p>`;

    /* Every slide names the place it was selected from: a slide quoted out
       of the room still says where its argument lives. */
    const href = s.anchor ? `${p.reportHref}/#${s.anchor.slug}` : `${p.reportHref}/`;
    const label = s.anchor ? t.seeSection(s.anchor.title) : t.seeReport;
    return (
      `<section class="slide slide--${esc(s.layout)}"><div class="slide-inner">${body}</div>` +
      `<a class="slide-ref" href="${esc(href)}">${esc(label)}</a>` +
      `<span class="slide-n">${i + 1} / ${n}</span></section>`
    );
  };

  return (
    `<div class="deck"><p class="deck-hint no-print">${esc(t.hint(n))}</p>` +
    p.slides.map(slide).join("") +
    `</div>`
  );
};
