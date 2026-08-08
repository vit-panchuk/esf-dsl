/**
 * The single point of entry.
 *
 * One .mdx file is parsed exactly once into an mdast tree; every published
 * channel is derived from that tree. The vocabulary is the design system's
 * (`<Chip kind>`, `<Evidence>`, `<Finding deck thread>`, …) and the split
 * between renderings and selections is the one in `lib/emit.ts`.
 *
 * The rule that keeps it honest: the evidence meter is COUNTED from the
 * <Chip> elements in the prose. It cannot drift from the text, because it
 * isn't authored — it's derived.
 *
 * The one exception is announced, never inferred: a chip may declare itself
 * `legend` (`<Chip kind="observed" legend />`) — it demonstrates a tag
 * instead of grading a claim, so it renders like any chip but is invisible
 * to the counter, the JSON-LD claims, and every number derived from them.
 * The announcement also works one level up: `<Table legend>` marks a whole
 * notation-legend table, and every chip inside it is a demonstration with
 * no per-chip attr needed.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";
import type { Root, RootContent } from "mdast";
import type { Block } from "./select";
import type { ClaimNode } from "./jsonld";

/* The provenance vocabulary is declared in ./strings — one list, so the
   counter and the labels cannot disagree about what the grades are. */
export { TAGS, type Tag } from "./strings";
import { TAGS, type Tag } from "./strings";

/** Components a `deck` mark turns into an exhibit slide. Exported so the
 *  dictionary is checked against this set rather than describing it. */
export const EXHIBITS = new Set([
  "Bars",
  "Figures",
  "AxisPlot",
  "Horizon",
  "Table",
  "Bets",
  "Strategies",
  "EasyWins",
]);

/** Register-entry families: a `deck` mark on any one entry puts the WHOLE
 *  register on the slide, as a table — one risk per slide would be noise.
 *  Policy is deliberately NOT here: policies are the decided layer, and a
 *  deck-marked one gets its own detailed slide (see the Policy branch in
 *  the walk) rather than a summary row. */
export const REGISTERS = new Set(["Risk", "Debt", "Credit"]);
const REGISTER_HEADS: Record<string, string[]> = {
  Risk: ["", "Risk", "Flag", "Likelihood", "Would you notice?"],
  Debt: ["", "Debt", "Kind"],
  Credit: ["", "Credit", "Status"],
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** textOf, with <Ref> tokens kept as part of the sentence — "scoped to
 *  executing B3 and B5" must not flatten to "scoped to executing and". */
const textWithRefs = (n: any): string => {
  if (!n) return "";
  if ((n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") && n.name === "Ref")
    return str(attr(n, "id")) ?? "";
  if (typeof n.value === "string" && n.type !== "mdxFlowExpression") return n.value;
  if (Array.isArray(n.children)) return n.children.map(textWithRefs).join("");
  return "";
};

/** textWithRefs at deck grade. On the page a code is a link with a hover
 *  memo; on a slide it is ink, and "RC1" alone means nothing to a room —
 *  so each <Ref> flattens to "id (memo)", the framework's rule that a
 *  mention travels with its entry's one-line memo, expanded inline the
 *  way the markdown channel does it. */
const textWithMemos = (n: any): string => {
  if (!n) return "";
  if ((n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") && n.name === "Ref") {
    const id = str(attr(n, "id")) ?? "";
    const memo = str(attr(n, "memo"));
    return memo ? `${id} (${memo})` : id;
  }
  if (typeof n.value === "string" && n.type !== "mdxFlowExpression") return n.value;
  if (Array.isArray(n.children)) return n.children.map(textWithMemos).join("");
  return "";
};

export interface DocFacts {
  tree: Root;
  counts: Record<Tag, number>;
  total: number;
  /** Every graded claim, with the sentence it graded — for JSON-LD. */
  claims: ClaimNode[];
  /** Selection-marked blocks, in document order — for deck and thread. */
  blocks: Block[];
  headings: { depth: number; text: string; slug: string }[];
  plain: string;
  words: number;
  readingMinutes: number;
}

type AnyNode = RootContent | Root | Record<string, any>;

export function textOf(node: AnyNode): string {
  const n = node as any;
  if (!n) return "";
  if (typeof n.value === "string" && n.type !== "mdxFlowExpression") return n.value;
  if (Array.isArray(n.children)) return n.children.map(textOf).join("");
  return "";
}

/** Read an MDX attribute. Bare attributes (`<Finding deck>`) come back true. */
export function attr(node: any, name: string): string | boolean | undefined {
  const found = (node.attributes ?? []).find(
    (a: any) => a.type === "mdxJsxAttribute" && a.name === name,
  );
  if (!found) return undefined;
  if (found.value === null || found.value === undefined) return true; // bare
  if (typeof found.value === "string") return found.value;
  const raw = found.value?.value;
  if (typeof raw === "string") return raw.replace(/^['"`]|['"`]$/g, "");
  return true;
}

const str = (v: string | boolean | undefined) =>
  typeof v === "string" ? v : undefined;

/**
 * Evaluate a *static* MDX attribute expression — `rows={[{ label: 'x',
 * pct: 60 }]}` — by walking its parsed ESTree. No eval, no scope: only
 * literals, arrays, objects, template strings without expressions, and
 * negative numbers. Anything dynamic is a build error, because a prop the
 * serializer cannot read is a chart the markdown edition would silently
 * drop — and nothing here is allowed to be lost silently.
 */
function evalStatic(n: any): unknown {
  switch (n?.type) {
    case "Literal":
      return n.value;
    case "TemplateLiteral":
      if (n.expressions.length > 0) break;
      return n.quasis.map((q: any) => q.value.cooked).join("");
    case "ArrayExpression":
      return n.elements.map((e: any) => (e === null ? undefined : evalStatic(e)));
    case "ObjectExpression":
      return Object.fromEntries(
        n.properties.map((p: any) => [p.key.name ?? p.key.value, evalStatic(p.value)]),
      );
    case "UnaryExpression":
      if (n.operator === "-") return -(evalStatic(n.argument) as number);
      if (n.operator === "+") return +(evalStatic(n.argument) as number);
      break;
    case "Identifier":
      if (n.name === "undefined") return undefined;
      break;
  }
  throw new Error(
    `[md] cannot serialize a dynamic prop (${n?.type ?? "unknown"}) — the markdown edition reads props as data, so they must be literal in the source.`,
  );
}

/** Read an MDX attribute whose value is an expression — an array or object
 *  prop. Literal string/bare attributes come back as themselves. */
export function attrData<T = unknown>(node: any, name: string): T | undefined {
  const found = (node.attributes ?? []).find(
    (a: any) => a.type === "mdxJsxAttribute" && a.name === name,
  );
  if (!found) return undefined;
  if (found.value === null || found.value === undefined) return true as T;
  if (typeof found.value === "string") return found.value as T;
  const estree = found.value?.data?.estree;
  const expr = estree?.body?.[0]?.expression;
  if (!expr) return undefined;
  return evalStatic(expr) as T;
}

/**
 * Must produce exactly what github-slugger produces, or the section index
 * links to headings that do not exist. The telling
 * difference: punctuation is REMOVED, not dashed, and each space becomes
 * its own hyphen — "Bets — for you to set" is bets--for-you-to-set, with
 * the double hyphen where the em dash stood.
 */
export function slugify(s: string): string {
  // No NFKD folding: github-slugger keeps letters as written, and folding
  // mangles cyrillic — й decomposes to и + a combining breve, so «Стислий»
  // slugged to «стислии» while the rendered heading id kept the й.
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdx);
export const parse = (body: string): Root => processor.parse(body) as Root;

export function analyse(body: string): DocFacts {
  const tree = parse(body);

  // Pass zero: a legend table announces that every chip inside demonstrates
  // notation — mark them so both counting passes skip without per-chip attrs.
  visit(tree, (node: any) => {
    if (node.type !== "mdxJsxFlowElement" || node.name !== "Table") return;
    if (attr(node, "legend") === undefined) return;
    visit(node, (inner: any) => {
      if (
        (inner.type === "mdxJsxTextElement" || inner.type === "mdxJsxFlowElement") &&
        inner.name === "Chip"
      )
        inner.data = { ...inner.data, legend: true };
    });
  });
  const isLegend = (chip: any) => attr(chip, "legend") !== undefined || chip.data?.legend;

  const counts = Object.fromEntries(TAGS.map((t) => [t, 0])) as Record<Tag, number>;
  const claims: ClaimNode[] = [];
  const blocks: Block[] = [];
  const headings: DocFacts["headings"] = [];
  let order = 0;

  // Register entries collected as the walk passes them; a marked entry's
  // exhibit is filled AFTER the walk, because entries later in the document
  // still belong on its slide.
  const registerRows: Record<string, string[][]> = { Risk: [], Debt: [], Credit: [] };
  const pendingRegisters: { exhibit: NonNullable<Block["exhibit"]>; family: string }[] = [];
  const registerRow = (n: any): string[] => {
    const g = (name: string) => str(attr(n, name)) ?? "";
    switch (n.name) {
      case "Risk":
        return [g("id"), g("title"), g("flag"), g("likelihood"), g("notice")];
      case "Debt":
        return [g("id"), g("title"), g("kind")];
      default: // Credit
        return [
          g("id"),
          g("title"),
          g("status") || (attrData<boolean>(n, "realized") === false ? "projected" : "confirmed"),
        ];
    }
  };

  // The section a marked block sits in — the deck's way back into the
  // report. h2/h3 only: a register-entry h4 is too narrow a landing.
  // Mirrors rehype-entry-ids: an h3 led by a token anchors at the token.
  let lastAnchor: Block["anchor"];
  const TOKEN = /^\s*(Role [A-Z]|Step \d+|[A-Z]{1,2}\d+)\b/;

  visit(tree, (node: any, _index, _parent) => {
    if (node.type === "heading") {
      const text = textOf(node).trim();
      if (text) {
        headings.push({ depth: node.depth, text, slug: slugify(text) });
        if (node.depth <= 3) {
          const m = node.depth === 3 ? text.match(TOKEN) : null;
          lastAnchor = {
            slug: m ? m[1].toLowerCase().replace(/\s+/g, "-") : slugify(text),
            title: text,
          };
        }
      }
      return;
    }
    if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return;

    if (node.name === "Chip") {
      if (isLegend(node)) return; // demonstrates a tag, grades nothing
      const tag = (str(attr(node, "kind")) ?? "observed") as Tag;
      if (TAGS.includes(tag)) counts[tag] += 1;
      claims.push({ id: `claim-${claims.length + 1}`, text: "", tag });
      return;
    }

    if (node.name === "Finding") {
      const deck = attr(node, "deck");
      const thread = attr(node, "thread");
      if (deck === undefined && thread === undefined) return;
      const text = textOf(node).replace(/\s+/g, " ").trim();
      blocks.push({
        id: str(attr(node, "id")) ?? `f${blocks.length + 1}`,
        component: "Finding",
        text,
        order: order++,
        tag: str(attr(node, "tag")),
        deck: deck as Block["deck"],
        thread: thread as Block["thread"],
        anchor: lastAnchor,
      });
    }

    // A deck-marked policy is the exception to the register-table rule:
    // policies are the decided layer — the part of the strategy a reader
    // must accept or reject — so each one gets its own slide, in full.
    // The statement is the headline (a bare `deck` reuses it, and the
    // 14-word budget is exactly the discipline a policy statement should
    // pass anyway); the stated facts travel as typed fields; the rationale
    // digest becomes the speaker note.
    if (node.name === "Policy") {
      const deck = attr(node, "deck");
      if (deck === undefined) return;
      const g = (name: string) => str(attr(node, name));
      /* Slotted fragments parse inside paragraphs when authored without
         blank lines around them — unwrap one paragraph level, the same
         move the markdown channel makes. */
      const slotText = (name: string) => {
        const parts = (node.children ?? [])
          .flatMap((c: any) => (c.type === "paragraph" ? c.children : [c]))
          .filter(
            (c: any) =>
              (c.type === "mdxJsxFlowElement" || c.type === "mdxJsxTextElement") &&
              str(attr(c, "slot")) === name,
          )
          .map((c: any) => clean(textWithMemos(c)))
          .filter(Boolean);
        return parts.length ? parts.join(" ") : undefined;
      };
      /* Slotted fragments parse inside paragraphs when authored without
         blank lines around them, so the digest strip is deep, not a
         top-level filter — same rule as the markdown channel. */
      const stripSlots = (n: any): any => ({
        ...n,
        children: (n.children ?? [])
          .filter((c: any) => str(attr(c, "slot")) === undefined)
          .map(stripSlots),
      });
      const title = g("title") ?? "";
      blocks.push({
        id: g("id") ?? `pl${blocks.length + 1}`,
        component: "Policy",
        text: title,
        order: order++,
        deck: deck as Block["deck"],
        policy: {
          id: g("id") ?? "",
          title,
          kind: g("kind"),
          state: g("state") ?? "proposed",
          acceptedBy: g("acceptedBy"),
          executedBy: g("executedBy"),
          review: g("review"),
          addresses: slotText("addresses"),
          relation: slotText("relation"),
          operations: slotText("operations"),
          digest: clean(textWithMemos(stripSlots(node))) || undefined,
        },
        anchor: lastAnchor,
      });
      return;
    }

    // A deck-marked chart, table or register becomes an exhibit slide: the
    // data itself re-rendered on the deck, headlined by the mark. The mark
    // must be a rewrite — an exhibit has no sentence of its own to reuse, so
    // a bare `deck` would put an empty headline through the budget check.
    // `deckSplit={n}` is the slide break: n rows per slide.
    if (EXHIBITS.has(node.name) || REGISTERS.has(node.name)) {
      if (REGISTERS.has(node.name)) registerRows[node.name].push(registerRow(node));
      const deck = attr(node, "deck");
      if (deck === undefined) return;
      if (typeof deck !== "string")
        throw new Error(
          `[doc] <${node.name} deck> needs a rewrite (deck="…") — an exhibit has no text of its own for the slide headline.`,
        );
      const splitRaw = str(attr(node, "deckSplit"));
      const split =
        splitRaw && Number.isFinite(parseInt(splitRaw, 10)) && parseInt(splitRaw, 10) > 0
          ? parseInt(splitRaw, 10)
          : undefined;
      let exhibit: NonNullable<Block["exhibit"]>;
      if (node.name === "Table") {
        let caption: string | undefined;
        const head: string[] = [];
        const rows: string[][] = [];
        const cells = (tr: any) =>
          (tr.children ?? [])
            .filter((c: any) => c.name === "th" || c.name === "td")
            .map((c: any) => clean(textWithRefs(c)));
        // The caption parses as an inline element inside a paragraph, so it
        // is found by walking rather than by scanning direct children.
        visit(node, (n: any) => {
          if (n.name === "caption") caption = clean(textOf(n));
        });
        for (const sec of node.children ?? []) {
          if (sec.name === "thead" || sec.name === "tbody")
            visit(sec, (n: any) => {
              if (n.name !== "tr") return;
              if (sec.name === "thead") head.push(...cells(n));
              else rows.push(cells(n));
            });
        }
        /* A <Table> may hold GFM pipe rows instead of <tr> elements — both
           are ordinary ways to write one, and the web rendering treats them
           the same. Without this the exhibit came out as an empty slide:
           the mark was honoured, the data silently was not. */
        if (head.length === 0 && rows.length === 0)
          visit(node, (n: any) => {
            if (n.type !== "table") return;
            (n.children ?? []).forEach((row: any, i: number) => {
              const cs = (row.children ?? []).map((c: any) => clean(textWithRefs(c)));
              if (i === 0) head.push(...cs);
              else rows.push(cs);
            });
          });
        exhibit = { component: "Table", table: { caption, head, rows }, split };
      } else if (node.name === "Bets") {
        // A Bet's text is its default slot; the addresses slot flattens to
        // its Ref tokens — the deck reader follows them into the report.
        const rows: string[][] = [];
        visit(node, (n: any) => {
          if (n.name !== "Bet") return;
          const text: string[] = [];
          const refs: string[] = [];
          for (const c of n.children ?? []) {
            if (c.name === "Fragment") {
              visit(c, (r: any) => {
                if (r.name === "Ref") refs.push(str(attr(r, "id")) ?? "");
              });
            } else text.push(textWithRefs(c));
          }
          rows.push([
            str(attr(n, "id")) ?? "",
            clean(text.join("")),
            str(attr(n, "verdict")) ?? "",
            refs.filter(Boolean).join(", "),
            str(attr(n, "cost")) ?? "—",
          ]);
        });
        exhibit = {
          component: "Table",
          table: { head: ["", "Bet", "Verdict", "Addresses", "Cost"], rows },
          split,
        };
      } else if (node.name === "Strategies") {
        const rows: string[][] = [];
        visit(node, (n: any) => {
          if (n.name !== "Strategy") return;
          rows.push([
            str(attr(n, "id")) ?? "",
            clean(textWithRefs(n)),
            str(attr(n, "state")) ?? "",
            str(attr(n, "health")) ?? "",
          ]);
        });
        exhibit = {
          component: "Table",
          table: { head: ["", "Rule", "Written where?", "Health"], rows },
          split,
        };
      } else if (node.name === "EasyWins") {
        const rows: string[][] = [];
        visit(node, (n: any) => {
          if (n.name !== "EasyWin") return;
          rows.push([
            str(attr(n, "id")) ?? "",
            clean(textWithRefs(n)),
            str(attr(n, "feeds")) ?? "",
            str(attr(n, "day")) ?? "≤ a day",
            str(attr(n, "status")) ?? "—",
          ]);
        });
        exhibit = {
          component: "Table",
          table: { head: ["", "Win", "Feeds", "Day", "Status"], rows },
          split,
        };
      } else if (REGISTERS.has(node.name)) {
        exhibit = {
          component: "Table",
          table: { head: REGISTER_HEADS[node.name], rows: [] },
          split,
        };
        pendingRegisters.push({ exhibit, family: node.name });
      } else {
        const props: Record<string, unknown> = {};
        for (const a of node.attributes ?? []) {
          if (a.type !== "mdxJsxAttribute") continue;
          if (a.name === "deck" || a.name === "tag" || a.name === "id" || a.name === "deckSplit")
            continue;
          props[a.name] = attrData(node, a.name);
        }
        exhibit = { component: node.name as any, props, split };
      }
      blocks.push({
        id: str(attr(node, "id")) ?? `x${blocks.length + 1}`,
        component: node.name,
        text: exhibit.table?.caption ?? str(attr(node, "title")) ?? "",
        order: order++,
        tag: str(attr(node, "tag")),
        deck,
        exhibit,
        anchor: lastAnchor,
      });
    }
  });

  for (const p of pendingRegisters) p.exhibit.table!.rows = registerRows[p.family];

  // Second pass attaches each claim to the prose it grades. The walk keeps
  // pass one's preorder, so claims[ci] is always the chip in hand. A chip
  // takes what accumulated since the previous chip — not the whole
  // paragraph, which handed every chip in it the same text. Scopes keep a
  // sentence from leaking across structure: each block or JSX container
  // accumulates its own prose, so a timeline <Event>'s chip cannot pick up
  // the neighbouring events'. A chip immediately after another (the
  // double-graded sentence) shares its segment — that duplication is the
  // content, one statement graded twice.
  let ci = 0;
  const INLINE = new Set(["emphasis", "strong", "delete", "link", "linkReference"]);
  const attach = (nodes: any[], state: { acc: string; last: string }) => {
    for (const n of nodes ?? []) {
      if (n.type === "mdxJsxTextElement" || n.type === "mdxJsxFlowElement") {
        if (n.name === "Chip") {
          if (isLegend(n)) continue; // skipped in pass one too
          // The leading strip is the previous sentence's full stop — the
          // segment after "…green <Chip/>. Next claim" starts at ". Next".
          const seg =
            state.acc.replace(/\s+/g, " ").replace(/^[\s.,;:·—–-]+/, "").trim() || state.last;
          if (claims[ci]) claims[ci].text = seg;
          state.last = seg;
          state.acc = "";
          ci += 1;
        } else if (n.name === "Ref") {
          // The token reads as part of the sentence ("issues #6327, …").
          state.acc += str(attr(n, "id")) ?? "";
        } else {
          attach(n.children, { acc: "", last: "" });
        }
        continue;
      }
      if (typeof n.value === "string") {
        if (n.type !== "mdxFlowExpression" && n.type !== "mdxTextExpression")
          state.acc += n.value;
      } else if (INLINE.has(n.type)) {
        attach(n.children, state); // formatting is transparent to the sentence
      } else if (Array.isArray(n.children)) {
        attach(n.children, { acc: "", last: "" });
      }
    }
  };
  attach((tree as any).children, { acc: "", last: "" });

  const plain = textOf(tree).replace(/\s+/g, " ").trim();
  const words = plain ? plain.split(/\s+/).length : 0;

  return {
    tree,
    counts,
    total: TAGS.reduce((s, t) => s + counts[t], 0),
    claims,
    blocks,
    headings,
    plain,
    words,
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}

/** Rows for <Evidence>, in the design system's shape. Percentages are
 *  rounded so they still sum to 100 — the rounding drift lands on the
 *  largest row, where a point is invisible, never on a zero-count row:
 *  a tag with no claims must read 0%, not inherit the remainder. */
export function evidenceRows(facts: DocFacts) {
  const { counts, total } = facts;
  const pcts = TAGS.map((label) => (total === 0 ? 0 : Math.round((counts[label] / total) * 100)));
  const drift = total === 0 ? 0 : 100 - pcts.reduce((a, b) => a + b, 0);
  if (drift !== 0) {
    const biggest = TAGS.reduce((best, label, i) => (counts[label] > counts[TAGS[best]] ? i : best), 0);
    pcts[biggest] += drift;
  }
  return TAGS.map((label, i) => ({ label, pct: pcts[i], n: counts[label], assumed: label === "assumed" }));
}

/** One row of the evidence meter — a tag, its share, its count, and
 *  whether it is the one row that earns orange. Named so the deck and any
 *  other consumer can type a row without re-deriving it. */
export type EvidenceRow = ReturnType<typeof evidenceRows>[number];
