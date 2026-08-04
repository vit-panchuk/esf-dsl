/**
 * Markdown serializers — one per component, matching the @md comment at the
 * top of each construct's emitter. Every report is published twice: as a
 * page and as a .md next to it. These functions are what makes the second
 * one honest.
 *
 * Three rules the whole file obeys:
 *
 *   1. Keep the claim and its provenance. Drop the treatment. A halftone,
 *      a bar, a dashed rule and a hover state are treatments. A chip, a
 *      percentage, a date and a silence are not.
 *   2. Never lose something silently. Anything with no markdown form leaves
 *      a visible trace — an italic stand-in line, not a hole.
 *   3. Round-trip the numbers, not the pictures. A chart becomes its table.
 *      ASCII art is never acceptable: it is unreadable to a screen reader
 *      and lies about precision.
 */

export type Md = string;

const esc = (s: string) => s.replace(/([|*_\[\]])/g, '\\$1');
const block = (s: Md) => `\n\n${s.trim()}\n\n`;
const quote = (s: string) => s.trim().split('\n').map((l) => `> ${l}`).join('\n');
const table = (head: string[], rows: string[][]) =>
  [`| ${head.join(' | ')} |`,
   `| ${head.map(() => '---').join(' | ')} |`,
   ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

export const chip = (kind: string) => `\`[${kind}]\``;

/**
 * The one deliberate exception to "no ASCII art".
 *
 * Everywhere else a chart becomes its table, because the drawing was a
 * reading aid for numbers that survive on their own. The evidence bar is
 * the opposite: it is the site's thesis rendered as a shape, and the shape
 * is what a reader takes in before any single figure — how much of this is
 * observed, how much is guessed. A table of five percentages does not do
 * that. So this one meter is drawn, in a fenced block so the monospace grid
 * is guaranteed, with the numbers printed alongside the blocks rather than
 * replaced by them: the picture is fast, the digits are exact, neither is
 * asked to be the other.
 *
 * U+2588 FULL BLOCK and U+2591 LIGHT SHADE, 36 cells. Both are in every
 * monospace font a terminal is likely to have; the track is drawn rather
 * than left blank so that trailing whitespace cannot be stripped and take
 * the scale with it.
 */
const CELLS = 36;
export const evidence = (
  rows: { label: string; pct: number; n: number; assumed?: boolean; note?: string }[],
  head?: string,
) => {
  const w = Math.max(...rows.map((r) => r.label.length)) + 2;
  const nw = Math.max(...rows.map((r) => String(r.n).length));
  const lines = rows.map((r) => {
    const on = Math.round((r.pct / 100) * CELLS);
    return `[${r.label}]`.padEnd(w + 1) +
      '█'.repeat(on) + '░'.repeat(CELLS - on) +
      `  ${String(r.pct).padStart(3)}%  (${String(r.n).padStart(nw)})` +
      (r.note ? `  ← ${r.note}` : '');
  });
  return block(`\`\`\`\n${head ? head + '\n' : ''}${lines.join('\n')}\n\`\`\``);
};

export const callout = (label: string | undefined, body: string) =>
  block(quote((label ? `**${label.toUpperCase()}**\n` : '') + body));

export const plate = (alt: string, src?: string) =>
  block(src ? `![${esc(alt)}](${src})` : `*[plate: ${alt}]*`);

export const figure = (alt: string, caption?: string, src?: string) =>
  plate(alt, src) + (caption ? block(`*${caption}*`) : '');

export const timeline = (items: { when: string; body: string; gap?: boolean; open?: boolean; assumed?: boolean }[]) =>
  block(items.map((i) => {
    const when = i.gap ? '**gap**' : `**${i.when}**`;
    const tail = (i.open ? ' (ongoing)' : '') + (i.assumed ? ' ' + chip('assumed') : '');
    return `- ${when} — ${i.body}${tail}`;
  }).join('\n'));

export const dialog = (
  turns: { who?: string; when?: string; body?: string; silence?: boolean; note?: string }[],
) =>
  block(turns.map((t) =>
    /* The author's gloss stays outside the quotes — same rule as on the
       page, where .dialog-note is never italic. */
    t.note !== undefined
      ? t.note
      : quote(
          `**${t.who}**${t.when ? ` · ${t.when}` : ''}\n` +
          (t.silence ? '*no reply*' : `"${t.body}"`),
        ),
  ).join('\n\n'));

export const listing = (code: string, o: { lang?: string; file?: string; caption?: string } = {}) => {
  const comment = o.file ? commentFor(o.lang) + ' ' + o.file + '\n' : '';
  return block(`\`\`\`${o.lang ?? ''}\n${comment}${code.trim()}\n\`\`\``)
    + (o.caption ? block(`*${o.caption}*`) : '');
};

const commentFor = (lang = '') =>
  /^(rb|ruby|py|python|sh|bash|yml|yaml|toml)$/.test(lang) ? '#' :
  /^(html|xml|md)$/.test(lang) ? '<!--' : '//';

/** Any chart except the evidence bar. The marks are dropped; the numbers
 *  are the content. If a chart seems to need drawing in plain text, check
 *  whether it is actually carrying an argument the way the evidence bar
 *  does — almost none of them are. */
export const chart = (title: string | undefined, head: string[], rows: string[][], caption?: string) =>
  (title ? block(`**${title}**`) : '') + block(table(head, rows)) + (caption ? block(`*${caption}*`) : '');

/**
 * Diagrams — emitted as their own source language, not as a picture and
 * not as an apology.
 *
 * The earlier rule ("name it, link it, let the caption stand in") was right
 * about ASCII renderings and wrong about everything else. A sequence
 * diagram is not fundamentally a picture: it is an ordered list of messages
 * that happens to be drawn. Mermaid is that list, written down — so
 * serializing to it loses the styling and keeps the structure, which is
 * exactly the contract every other component here follows. And unlike a
 * placeholder, it is *executable*: GitHub, Obsidian, Notion and most LLM
 * chat surfaces render mermaid fences natively, so the markdown edition
 * gets a real diagram back rather than a hole where one was.
 *
 * The test for adding a kind: the component's props must already BE the
 * graph. Where that holds, the fence is a serialization. Where it does not
 * — where the diagram's meaning lives in hand-placed positions — no text
 * format can carry it, and the placeholder is the honest output.
 *
 *   sequence  → mermaid sequenceDiagram   (lossless: messages are the data)
 *   flow      → mermaid flowchart          (lossless: nodes and edges)
 *   quadrant  → mermaid quadrantChart      (lossless: labelled x/y in 0–1)
 *   timeline  → mermaid timeline           (lossless: dated events)
 *   wardley   → OWM text (`wardley` fence) (lossless: value chain + evolution)
 *   anything else → *[diagram: …]* + caption
 *
 * Wardley maps get Online Wardley Maps rather than mermaid, which has no
 * map type. OWM is the format Wardley mapping is actually authored in, it
 * renders at onlinewardleymaps.com, and its coordinates mean the same thing
 * the component's props do.
 *
 * Charts are deliberately NOT on this list. Mermaid can draw an xychart,
 * but a chart's argument survives as numbers and a diagram's does not —
 * turning a bar chart back into a picture would undo the one thing the
 * markdown edition does better than the page.
 *
 * LaTeX has no role here beyond `$…$` for maths inside prose. TikZ would be
 * write-only: nothing in the consuming chain renders it, so it would be a
 * picture no one can see, described in a language no one reads.
 */
const mermaid = (body: string) => block(`\`\`\`mermaid\n${body.trim()}\n\`\`\``);
const id = (s: string) => s.replace(/[^A-Za-z0-9]/g, '_');

export type DiagramSpec =
  | { kind: 'sequence'; actors: string[]; messages: { from: string; to: string; text: string; dashed?: boolean; note?: string }[] }
  | { kind: 'flow'; dir?: 'TD' | 'LR'; nodes: { id: string; label: string; shape?: 'box' | 'round' | 'diamond' }[]; edges: { from: string; to: string; label?: string }[] }
  | { kind: 'quadrant'; x: [string, string]; y: [string, string]; quadrants?: [string, string, string, string]; points: { label: string; x: number; y: number }[] }
  | { kind: 'timeline'; sections: { when: string; events: string[] }[] }
  | { kind: 'wardley'; anchor?: string; nodes: { label: string; visibility: number; evolution: number; inertia?: boolean }[]; links: [string, string][] }
  | { kind: 'other' };

/**
 * The fallback, for a diagram no text format carries.
 *
 * SVG is the right artifact and inline SVG is the wrong delivery: raw HTML
 * never appears in this markdown (rule 1), GitHub's sanitizer strips <svg>
 * from rendered markdown anyway, and a terminal or an LLM reading the file
 * gets a screenful of path data instead of a diagram. So the build writes
 * the SVG beside the .md and the markdown references it as an image.
 *
 * That degrades in the right order: a renderer with images shows the real
 * diagram, one without shows the alt text, and the caption is there for
 * both. The SVG is generated from the same spec the page draws from, so it
 * cannot drift — and being a file rather than a blob, it can be opened,
 * diffed, and dropped into a slide.
 */
export const diagram = (title: string, spec: DiagramSpec, caption?: string, src?: string) => {
  const head = block(`**${title}**`);
  const tail = caption ? block(`*${caption}*`) : '';
  let body = '';
  switch (spec.kind) {
    case 'sequence':
      body = mermaid(['sequenceDiagram',
        ...spec.actors.map((a) => `  participant ${id(a)} as ${a}`),
        ...spec.messages.flatMap((m) => [
          `  ${id(m.from)}${m.dashed ? '-->>' : '->>'}${id(m.to)}: ${m.text}`,
          ...(m.note ? [`  Note over ${id(m.from)},${id(m.to)}: ${m.note}`] : []),
        ])].join('\n'));
      break;
    case 'flow': {
      const wrap = (l: string, s?: string) =>
        s === 'diamond' ? `{${l}}` : s === 'round' ? `(${l})` : `[${l}]`;
      body = mermaid([`flowchart ${spec.dir ?? 'TD'}`,
        ...spec.nodes.map((n) => `  ${id(n.id)}${wrap(n.label, n.shape)}`),
        ...spec.edges.map((e) => `  ${id(e.from)} -->${e.label ? `|${e.label}|` : ''} ${id(e.to)}`)].join('\n'));
      break;
    }
    case 'quadrant':
      body = mermaid(['quadrantChart',
        `  x-axis ${spec.x[0]} --> ${spec.x[1]}`,
        `  y-axis ${spec.y[0]} --> ${spec.y[1]}`,
        ...(spec.quadrants ?? []).map((q, i) => `  quadrant-${i + 1} ${q}`),
        ...spec.points.map((p) => `  ${p.label}: [${p.x}, ${p.y}]`)].join('\n'));
      break;
    case 'timeline':
      body = mermaid(['timeline',
        ...spec.sections.flatMap((s) => [`  ${s.when}`, ...s.events.map((e) => `    : ${e}`)])].join('\n'));
      break;
    case 'wardley':
      body = block(`\`\`\`wardley\ntitle ${title}\n` +
        (spec.anchor ? `anchor ${spec.anchor} [0.95, 0.05]\n` : '') +
        spec.nodes.map((n) => `component ${n.label} [${n.visibility}, ${n.evolution}]${n.inertia ? ' inertia' : ''}`).join('\n') +
        (spec.links.length ? '\n' + spec.links.map(([a, b]) => `${a}->${b}`).join('\n') : '') +
        `\n\`\`\``);
      break;
    default:
      body = src ? block(`![${esc(title)}](${src})`) : block(`*[diagram: ${title}]*`);
  }
  return head + body + tail;
};

export const horizon = (heads: { label: string }[], lanes: { label: string; cells: string[][] }[]) =>
  block(table(['', ...heads.map((h) => h.label)],
    lanes.map((l) => [`**${l.label}**`, ...l.cells.map((c) => (c.length ? c.join(' · ') : '—'))])));

export const state = (label: string, title?: string, body?: string, detail?: string) =>
  block(quote(`**${label.toUpperCase()}**${title ? ` — ${title}` : ''}` +
    (body ? `\n${body}` : '') + (detail ? `\n\n\`${detail}\`` : '')));

/**
 * Actions. A link survives; a button that runs script does not, because a
 * markdown reader cannot press it. Dropping it silently would leave the
 * reader stuck, so an unlinked action is named and marked unavailable.
 */
export const actions = (as: { label: string; href?: string }[]) =>
  block(as.map((a) => (a.href ? `[${esc(a.label)}](${a.href})` : `*${a.label} (needs the web page)*`)).join(' · '));

/** A decision-log entry: the superseded text stays, struck through. */
export const decision = (
  d: { id: string; status: string; rev?: number; was?: string },
  body: string,
) =>
  block(
    `**${d.id}${d.rev !== undefined ? ` · rev. ${d.rev}` : ''} · ${d.status}**` +
      (d.was ? `\n~~${esc(d.was)}~~` : '') +
      `\n${body}`,
  );

/** A risk-register entry. The falsifier line — what would change the
 *  author's mind — comes last; a risk nothing could disprove is an
 *  opinion. */
export const risk = (
  r: {
    id: string;
    title: string;
    flag?: string;
    happens?: string;
    likelihood?: string;
    notice?: string;
    cost?: string;
    falsifier?: string;
  },
  body: string,
) =>
  block(
    [
      `**${r.id} — ${esc(r.title)}**${r.flag ? ` *(${r.flag})*` : ''}`,
      body,
      ...(r.happens ? [`If it happens: ${r.happens}`] : []),
      ...(r.likelihood ? [`Likelihood: ${r.likelihood}`] : []),
      ...(r.notice ? [`Would you notice? ${r.notice}`] : []),
      ...(r.cost ? [`Cost: ${r.cost}`] : []),
      ...(r.falsifier ? [`What would change my mind: ${r.falsifier}`] : []),
    ].join('\n'),
  );

/** A ledger entry, either side. The side is a treatment (the rule colour);
 *  the status qualifier is content and survives. */
export const ledger = (
  e: { id?: string; title: string; kind?: string },
  body: string,
) =>
  block(
    `**${e.id ? `${e.id} — ` : ''}${esc(e.title)}**${e.kind ? ` *(${e.kind})*` : ''}` +
      (body ? `\n${body}` : ''),
  );

/** The marked beat reads as a quote in the flow — same as on the page. */
export const takeaway = (text: string) => block(quote(text));

/** The key figures strip: layout on the page, pairs in the file. */
export const figures = (items: { v: string; cap: string }[]) =>
  block(items.map((i) => `- **${i.v}** — ${i.cap}`).join('\n'));

/** A pre-mortem entry — the risk shape, with its two mandatory facts. */
export const mortem = (
  m: { id: string; title: string; note?: string; warning: string; mitigation: string },
  body: string,
) =>
  block(
    [
      `**${m.id} — ${esc(m.title)}**${m.note ? ` *(${m.note})*` : ''}`,
      body,
      `Early warning: ${m.warning}`,
      `Mitigation: ${m.mitigation}`,
    ].join('\n'),
  );

/** The numbered sources list, numbered as on the page. */
export const sources = (items: string[]) =>
  block(items.map((s, i) => `${i + 1}. ${s}`).join('\n'));

export const registry = {
  Chip: chip, Evidence: evidence, Callout: callout, Plate: plate, Figure: figure,
  Timeline: timeline, Dialog: dialog, Listing: listing, Bars: chart, Horizon: horizon,
  State: state, Diagram: diagram,
  Cols: chart, Share: chart, Donut: chart,
  Decision: decision, Risk: risk, Debt: ledger, Credit: ledger, Takeaway: takeaway, Sources: sources,
} as const;
