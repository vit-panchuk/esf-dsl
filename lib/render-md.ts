/**
 * The markdown rendering.
 *
 * Walks the same mdast the page renders from and hands each design-system
 * component to its serializer in `lib/markdown.ts`. Those serializers
 * implement the `@md` contract written at the top of each emitter, so
 * the page and the .md cannot drift without that comment being wrong on
 * screen.
 */
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";
import type { Root } from "mdast";
import * as md from "./markdown";
import type { DocMeta } from "./emit";
import { attr, attrData, evidenceRows, textOf, type DocFacts } from "./doc";
import { DSL, type Lang } from "./strings";

/** The named JSX children of a component node, in document order. MDX
 *  wraps single-line children in paragraphs, so one level is unwrapped. */
const jsxChildren = (node: any, ...names: string[]) =>
  (node.children ?? [])
    .flatMap((c: any) => (c.type === "paragraph" ? c.children : [c]))
    .filter(
      (c: any) =>
        (c.type === "mdxJsxFlowElement" || c.type === "mdxJsxTextElement") &&
        names.includes(c.name),
    );

const str = (v: string | boolean | undefined) => (typeof v === "string" ? v : undefined);

/**
 * Flatten a node to one line of markdown, keeping the inline tokens textOf
 * cannot see: a self-closing <Ref> or <Chip> has no text children, so a
 * plain textOf flatten silently drops the R3 from "see R3" — and nothing
 * here is allowed to be lost silently.
 */
const flatMd = (node: any): string => {
  const n = node as any;
  if (!n) return "";
  if (n.type === "mdxJsxTextElement" || n.type === "mdxJsxFlowElement") {
    if (n.name === "Ref") {
      const rid = str(attr(n, "id")) ?? "";
      return `[${rid}](${str(attr(n, "href")) ?? `#${rid.toLowerCase()}`})`;
    }
    if (n.name === "Chip") return md.chip(str(attr(n, "kind")) ?? "observed");
    if (n.name === "Claim") return md.chip(str(attr(n, "tag")) ?? "observed");
    if (n.name === "Fn") return `[${str(attr(n, "n")) ?? ""}]`;
    if (n.name === "Spark") return "";
  }
  if (typeof n.value === "string" && n.type !== "mdxFlowExpression") return n.value;
  if (Array.isArray(n.children)) return n.children.map(flatMd).join("");
  return "";
};
const flatLine = (node: any) => flatMd(node).replace(/\s+/g, " ").trim();

/** A <Dialog> to its markdown form. Shared between the top-level case and
 *  the Callout case — a dialog quoted inside a callout must keep its
 *  speakers, and those are attributes textOf cannot see. */
const dialogMd = (node: any) =>
  md
    .dialog(
      jsxChildren(node, "Turn", "DialogNote").map((c: any) =>
        c.name === "DialogNote"
          ? { note: textOf(c).replace(/\s+/g, " ").trim() }
          : {
              who: str(attr(c, "who")) ?? "",
              when: str(attr(c, "when")),
              body: textOf(c).replace(/\s+/g, " ").trim(),
              silence: attr(c, "silence") === true,
            },
      ),
    )
    .trim();

export function toMarkdownDoc(
  tree: Root,
  facts: DocFacts,
  meta: DocMeta,
  lang: Lang = "en",
): string {
  const t = DSL[lang];

  /* The evidence table, from the same counts the page's meter reads. Used
     for an authored <Evidence> in the body, and injected at the top of a
     report — on the web the bar is furniture the view adds, so the body
     alone would silently drop it from this rendering. */
  const evidenceMd = () =>
    md
      .evidence(
        evidenceRows(facts).map((r) => ({
          ...r,
          label: t.tags[r.label],
          note: r.label === "user" && r.n === 0 ? t.md.nobodySpoke : undefined,
        })),
        `${t.evidenceHeading} — ${facts.total} ${t.taggedClaims(facts.total)}`,
      )
      .trim();

  const body = toMarkdown(tree as any, {
    bullet: "-",
    emphasis: "*",
    strong: "*",
    fences: true,
    rule: "-",
    extensions: [gfmToMarkdown()],
    handlers: {
      mdxjsEsm: () => "",
      mdxFlowExpression: () => "",
      mdxTextExpression: () => "",

      mdxJsxTextElement(node: any, _p, state, info) {
        if (node.name === "Chip") return md.chip(str(attr(node, "kind")) ?? "observed");
        if (node.name === "Claim") return md.chip(str(attr(node, "tag")) ?? "observed");
        /* A footnote ref keeps its number; the target is the sources list. */
        if (node.name === "Fn") return `[${str(attr(node, "n")) ?? attr(node, "n") ?? ""}]`;
        /* A register pointer keeps the link; the memo is a hover treatment
           and the register carries the substance. */
        if (node.name === "Ref") {
          const rid = str(attr(node, "id")) ?? "";
          return `[${rid}](${str(attr(node, "href")) ?? `#${rid.toLowerCase()}`})`;
        }
        /* A sparkline is a treatment — the figure is already in the
           sentence, so nothing is lost by dropping the shape. */
        if (node.name === "Spark") return "";
        return state.containerPhrasing(node, info);
      },

      mdxJsxFlowElement(node: any, _p, state, info) {
        switch (node.name) {
          case "Chip":
            return md.chip(str(attr(node, "kind")) ?? "observed");

          case "Evidence":
            return evidenceMd();

          case "Callout": {
            /* Children serialized piecewise, not flattened in one textOf
               pass, so a nested Dialog keeps its structure. */
            const parts = (node.children ?? [])
              .map((c: any) =>
                c.type === "mdxJsxFlowElement" && c.name === "Dialog"
                  ? dialogMd(c)
                  : flatLine(c),
              )
              .filter(Boolean);
            return md.callout(str(attr(node, "label")), parts.join("\n\n")).trim();
          }

          // A Finding is a marked statement; in a rendering it is just the
          // sentence, quoted. The mark itself is authoring metadata.
          case "Finding":
            return `> ${flatLine(node)}`;

          case "PullQuote": {
            const quote = `> ${flatLine(node)}`;
            const cite = str(attr(node, "cite"));
            return cite ? `${quote}\n> — ${cite}` : quote;
          }

          case "Plate":
            return md.plate(str(attr(node, "alt")) ?? "", str(attr(node, "src"))).trim();

          case "Figure":
            return md
              .figure(
                str(attr(node, "alt")) ?? "",
                str(attr(node, "caption")),
                str(attr(node, "src")),
              )
              .trim();

          case "Listing":
            return md
              .listing(textOf(node), {
                lang: str(attr(node, "lang")),
                file: str(attr(node, "file")),
                caption: str(attr(node, "caption")),
              })
              .trim();

          case "State":
            return md
              .state(
                str(attr(node, "label")) ?? "",
                str(attr(node, "title")),
                textOf(node).trim(),
                str(attr(node, "detail")),
              )
              .trim();

          /* An authored table is raw <tr>/<td> markup — containerFlow
             flattens the tags AND the structure, gluing cells into one
             line. Rebuild it as a GFM table, cell by cell, so the file
             stays a table for whoever reads it. */
          /* The typed registers rebuild as GFM tables, same as an authored
             <Table>: cells come from the row components' own props, the
             rule/bet text from their slots. Verdict hues were treatment;
             the words survive. */
          case "Strategies": {
            const h = t.registers.strategies;
            const rows = jsxChildren(node, "Strategy").map((s: any) => [
              str(attr(s, "id")) ?? "",
              flatLine(s).replace(/\|/g, "\\|"),
              (str(attr(s, "state")) ?? "").replace(/\|/g, "\\|"),
              (str(attr(s, "health")) ?? "").replace(/\|/g, "\\|"),
            ]);
            return md.chart(undefined, [h.code, h.rule, h.written, h.working], rows).trim();
          }

          case "Bets": {
            const h = t.registers.bets;
            const rows = jsxChildren(node, "Bet").map((b: any) => {
              const addresses = jsxChildren(b, "Fragment")
                .filter((f: any) => str(attr(f, "slot")) === "addresses")
                .map(flatLine)
                .join(" ");
              const text = {
                ...b,
                children: (b.children ?? []).filter(
                  (c: any) => str(attr(c, "slot")) !== "addresses",
                ),
              };
              return [
                str(attr(b, "id")) ?? "",
                flatLine(text).replace(/\|/g, "\\|"),
                str(attr(b, "verdict")) ?? "",
                addresses.replace(/\|/g, "\\|"),
                (str(attr(b, "cost")) ?? "—").replace(/\|/g, "\\|"),
              ];
            });
            return md.chart(undefined, [h.code, h.bet, h.verdict, h.addresses, h.cost], rows).trim();
          }

          case "EasyWins": {
            const h = t.registers.easyWins;
            const rows = jsxChildren(node, "EasyWin").map((w: any) => [
              str(attr(w, "id")) ?? "",
              flatLine(w).replace(/\|/g, "\\|"),
              (str(attr(w, "feeds")) ?? "").replace(/\|/g, "\\|"),
              (str(attr(w, "day")) ?? "≤ a day").replace(/\|/g, "\\|"),
              (str(attr(w, "status")) ?? "—").replace(/\|/g, "\\|"),
            ]);
            return md.chart(undefined, [h.code, h.win, h.feeds, h.day, h.status], rows).trim();
          }

          case "Table": {
            const rowsOf = (n: any) => jsxChildren(n, "tr");
            const cells = (tr: any) =>
              jsxChildren(tr, "td", "th").map((c: any) => flatLine(c).replace(/\|/g, "\\|"));
            const thead = jsxChildren(node, "thead")[0];
            const tbody = jsxChildren(node, "tbody")[0];
            const caption = jsxChildren(node, "caption")[0];
            const headRow = thead ? cells(rowsOf(thead)[0]) : undefined;
            const bodyRows = [
              ...(tbody ? rowsOf(tbody) : []),
              ...rowsOf(node),
            ].map(cells);
            const width = Math.max(headRow?.length ?? 0, ...bodyRows.map((r) => r.length), 1);
            return md
              .chart(
                caption ? flatLine(caption) : undefined,
                headRow ?? Array(width).fill(""),
                bodyRows,
              )
              .trim();
          }

          /* Charts become their tables — the drawing aided numbers that
             stand on their own. Ranges and estimates keep their marks. */
          case "Bars": {
            const rows = attrData<any[]>(node, "rows") ?? [];
            return md
              .chart(
                str(attr(node, "title")),
                ["item", "value"],
                rows.map((r) => [
                  r.label,
                  `${r.value}${r.to !== undefined ? `–${r.to}` : ""}${r.assumed ? ` ${md.chip("assumed")}` : ""}`,
                ]),
                str(attr(node, "caption")),
              )
              .trim();
          }

          case "Cols": {
            const cols = attrData<any[]>(node, "cols") ?? [];
            return md
              .chart(
                str(attr(node, "title")),
                ["period", "value"],
                cols.map((c) => [c.label, `${c.n}${c.assumed ? ` ${md.chip("assumed")}` : ""}`]),
                str(attr(node, "caption")),
              )
              .trim();
          }

          case "Share": {
            const segments = attrData<any[]>(node, "segments") ?? [];
            return md
              .chart(
                str(attr(node, "title")),
                ["part", "share"],
                segments.map((s) => [s.label, `${s.pct}%${s.signal ? ` ${md.chip("assumed")}` : ""}`]),
                str(attr(node, "caption")),
              )
              .trim();
          }

          case "Donut": {
            const parts = attrData<any[]>(node, "parts") ?? [];
            return md
              .chart(
                str(attr(node, "title")),
                ["part", "share"],
                parts.map((p) => [p.label, `${p.pct}%${p.signal ? ` ${md.chip("assumed")}` : ""}`]),
                str(attr(node, "caption")),
              )
              .trim();
          }

          /* A line plot carries no printable numbers — the trend is drawn
             and the figures live in the caption, which survives. The trace
             stays visible; nothing is lost silently. */
          case "LinePlot": {
            const title = str(attr(node, "title")) ?? "trend";
            const caption = str(attr(node, "caption"));
            return (
              `**${title}**\n\n*[line chart — the trend is drawn on the page; the figures live in the caption]*` +
              (caption ? `\n\n*${caption}*` : "")
            );
          }

          case "Horizon": {
            const heads = attrData<any[]>(node, "heads") ?? [];
            const lanes = attrData<any[]>(node, "lanes") ?? [];
            return md.horizon(heads, lanes).trim();
          }

          case "Timeline": {
            const items = jsxChildren(node, "Event").map((c: any) => ({
              when: str(attr(c, "when")) ?? "",
              body: flatLine(c),
              gap: attr(c, "gap") === true,
              open: attr(c, "open") === true,
              assumed: attr(c, "assumed") === true,
            }));
            return md.timeline(items).trim();
          }

          case "Dialog":
            return dialogMd(node);

          case "EvidenceBar": {
            const tags = ["observed", "web", "user", "inferred", "assumed"] as const;
            const counts = Object.fromEntries(
              tags.map((tg) => [tg, Number(attrData(node, tg) ?? 0)]),
            ) as Record<(typeof tags)[number], number>;
            const total =
              Number(attrData(node, "total") ?? 0) ||
              tags.reduce((a, tg) => a + counts[tg], 0);
            const note = str(attr(node, "note"));
            return md
              .evidence(
                tags.map((tg) => ({
                  label: t.tags[tg],
                  pct: total ? Math.round((counts[tg] / total) * 100) : 0,
                  n: counts[tg],
                  assumed: tg === "assumed",
                  note: tg === "user" && counts[tg] === 0 ? note : undefined,
                })),
                `${t.evidenceHeading} — ${total} ${t.taggedClaims(total)}`,
              )
              .trim();
          }

          case "Decision":
            return md
              .decision(
                {
                  id: str(attr(node, "id")) ?? "",
                  status: str(attr(node, "status")) ?? "",
                  rev: attrData<number>(node, "rev"),
                  was: str(attr(node, "was")),
                },
                flatLine(node),
              )
              .trim();

          case "Policy": {
            /* Named slots flatten to one line each; the body is what is
               left once they are filtered out — same split as a Bet. */
            const slotMd = (name: string) => {
              const parts = jsxChildren(node, "Fragment")
                .filter((f: any) => str(attr(f, "slot")) === name)
                .map(flatLine)
                .filter(Boolean);
              return parts.length ? parts.join(" ") : undefined;
            };
            /* Slotted fragments parse inside paragraphs when authored
               without blank lines around them, so the body strip is deep,
               not a top-level filter. */
            const stripSlots = (n: any): any => ({
              ...n,
              children: (n.children ?? [])
                .filter((c: any) => str(attr(c, "slot")) === undefined)
                .map(stripSlots),
            });
            return md
              .policy(
                {
                  id: str(attr(node, "id")) ?? "",
                  title: str(attr(node, "title")) ?? "",
                  kind: str(attr(node, "kind")),
                  state: str(attr(node, "state")),
                  acceptedBy: str(attr(node, "acceptedBy")),
                  executedBy: str(attr(node, "executedBy")),
                  review: str(attr(node, "review")),
                },
                flatLine(stripSlots(node)),
                {
                  addresses: slotMd("addresses"),
                  relation: slotMd("relation"),
                  operations: slotMd("operations"),
                },
              )
              .trim();
          }

          case "Risk":
            return md
              .risk(
                {
                  id: str(attr(node, "id")) ?? "",
                  title: str(attr(node, "title")) ?? "",
                  flag: str(attr(node, "flag")),
                  happens: str(attr(node, "happens")),
                  likelihood: str(attr(node, "likelihood")),
                  notice: str(attr(node, "notice")),
                  cost: str(attr(node, "cost")),
                  falsifier: str(attr(node, "falsifier")),
                },
                flatLine(node),
              )
              .trim();

          /* The body keeps its structure — a cause explains a chain, and
             flattening the chain would unexplain it. */
          case "Cause": {
            const ensures = str(attr(node, "ensures"));
            return [
              `**${str(attr(node, "id")) ?? ""} — ${str(attr(node, "title")) ?? ""}**`,
              state.containerFlow(node, info),
              ...(ensures ? [`Ensures: ${ensures}`] : []),
            ].join("\n\n");
          }

          case "Mortem":
            return md
              .mortem(
                {
                  id: str(attr(node, "id")) ?? "",
                  title: str(attr(node, "title")) ?? "",
                  note: str(attr(node, "note")),
                  warning: str(attr(node, "warning")) ?? "",
                  mitigation: str(attr(node, "mitigation")) ?? "",
                },
                flatLine(node),
              )
              .trim();

          case "Figures":
            return md.figures(attrData<{ v: string; cap: string }[]>(node, "items") ?? []).trim();

          /* One set of points, three renderings — here it becomes the
             Diagram serializer's quadrantChart. */
          case "AxisPlot": {
            const pts = attrData<{ id: string; x: number; y: number; tip: string }[]>(node, "points") ?? [];
            return md
              .diagram(
                str(attr(node, "title")) ?? "",
                {
                  kind: "quadrant",
                  x: [str(attr(node, "x")) ?? "", "Higher"],
                  y: [str(attr(node, "y")) ?? "", "Higher"],
                  quadrants: attrData<[string, string, string, string]>(node, "quadrants"),
                  points: pts.map((p) => ({ label: p.id, x: p.x / 100, y: p.y / 100 })),
                },
                str(attr(node, "caption")),
              )
              .trim();
          }

          case "Debt":
          case "Credit":
            return md
              .ledger(
                {
                  id: str(attr(node, "id")),
                  title: str(attr(node, "title")) ?? "",
                  kind: str(attr(node, "kind")) ?? str(attr(node, "status")),
                },
                flatLine(node),
              )
              .trim();

          case "Takeaway":
            return md.takeaway(flatLine(node)).trim();

          case "Sources":
            return md
              .sources(
                jsxChildren(node, "li").map((li: any) =>
                  textOf(li).replace(/\s+/g, " ").trim(),
                ),
              )
              .trim();

          /* A standalone Wardley map serializes exactly like the Diagram
             spec would — OWM text, the format maps are authored in. */
          case "Wardley": {
            const nodes = attrData<any[]>(node, "nodes") ?? [];
            const links = attrData<[string, string][]>(node, "links") ?? [];
            return md
              .diagram(str(attr(node, "title")) ?? "Value chain", {
                kind: "wardley",
                nodes: nodes.map((n) => ({
                  label: n.label,
                  visibility: n.visibility,
                  evolution: n.evolution,
                  inertia: n.inertia,
                })),
                links,
              })
              .trim();
          }

          case "Diagram":
            return md
              .diagram(
                str(attr(node, "title")) ?? "",
                attrData<md.DiagramSpec>(node, "spec") ?? { kind: "other" },
                str(attr(node, "caption")),
                str(attr(node, "svg")),
              )
              .trim();

          /* Loading chrome has no place in a finished rendering. */
          case "Spark":
            return "";

          default:
            return state.containerFlow(node, info);
        }
      },
    },
  });

  const head = [
    `# ${meta.title}`,
    "",
    ...(meta.subtitle ? [`*${meta.subtitle}*`, ""] : []),
    `> ${[
      meta.kind === "report" ? t.kind.report : t.kind.note,
      ...(meta.revision !== undefined ? [`${t.rev} ${meta.revision}`] : []),
      `${t.md.updated} ${meta.updated}`,
      `${facts.total} ${t.taggedClaims(facts.total)}`,
      meta.canonical,
    ].join(" · ")}`,
    "",
    "---",
    "",
    /* A report leads with its evidence base, same as the web rendering. */
    ...(meta.kind === "report" && facts.total > 0 ? [evidenceMd(), "", "---", ""] : []),
  ].join("\n");

  return head + body.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
