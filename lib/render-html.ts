/**
 * The HTML backend's walker — the same mdast tree every other channel
 * reads, serialized to markup.
 *
 * Every channel — markdown, JSON-LD, the thread, the deck selection, and
 * this one — walks the tree `doc.ts` already parsed. One document, one
 * parse, one set of facts: two renderings of the same report cannot
 * disagree about what it says, because they are reading the same object.
 *
 * Prose is handed to mdast-util-to-hast, so tables, footnotes, emphasis
 * and links behave exactly as the ecosystem says they should; only the
 * DSL's own constructs get custom handling, and they get it by calling the
 * emitters in `html.ts`.
 */
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import type { Root } from "mdast";
import { attr, attrData, slugify } from "./doc";
import * as H from "./html";
import type { Lang } from "./strings";

/**
 * The ambient vocabulary: what a document may write without imports, and
 * the one place a construct's name is bound to its markup. Adding a
 * construct means adding a line here and nowhere else.
 */
const AMBIENT_EMITTERS: Record<string, (p: any, s?: H.Slots) => string> = {
  Chip: H.chip,
  Evidence: H.evidence,
  Verdict: H.verdict,
  Ref: H.ref,
  Finding: H.finding,
  Takeaway: H.takeaway,
  Risk: H.risk,
  Debt: H.debt,
  Credit: H.credit,
  Cause: H.cause,
  Mortem: H.mortem,
  Decision: H.decision,
  Policy: H.policy,
  Strategies: H.strategies,
  Strategy: H.strategy,
  Bets: H.bets,
  Bet: H.bet,
  EasyWins: H.easyWins,
  EasyWin: H.easyWin,
  Callout: H.callout,
  PullQuote: H.pullQuote,
  Cols: H.cols,
  Fn: H.fn,
  Sources: H.sources,
  State: H.state,
  Timeline: H.timeline,
  Event: H.event,
  Dialog: H.dialog,
  Turn: H.turn,
  DialogNote: H.dialogNote,
  Table: H.table,
  Figure: H.figure,
  Figures: H.figures,
  Plate: H.plate,
  Bars: H.bars,
  Horizon: H.horizon,
  AxisPlot: H.axisPlot,
  LinePlot: H.linePlot,
  Donut: H.donut,
  Spark: H.spark,
  Share: H.share,
  Diagram: H.diagram,
  Wardley: H.wardley,
  Listing: H.listing,
};

/**
 * Not ambient, and deliberately so.
 *
 * The frame (Doc, DocHead, Rail, RailBlock, Toc) is the language's, but a
 * document does not author its own furniture — `renderDocument()` wraps
 * it. The reserve (Claim, EvidenceBar) is unwired: every ambient construct
 * owes a rendering to every channel, and these two do not have one yet.
 * Both still dispatch, so a document that names one is rendered rather
 * than silently dropped.
 */
const OFF_STAGE: Record<string, (p: any, s?: H.Slots) => string> = {
  /* The deck is a channel, not a construct: select.ts decides what is on
     it, so a document never writes one. It dispatches all the same, so a
     host can ask for it by name like anything else. */
  Deck: H.deck,
  Claim: H.claim,
  EvidenceBar: H.evidenceBar,
  Doc: H.doc,
  DocHead: H.docHead,
  Rail: H.rail,
  RailBlock: H.railBlock,
  Toc: H.toc,
};

const EMITTERS = { ...AMBIENT_EMITTERS, ...OFF_STAGE };

/** The 44 constructs a document may write. Exported so the fixture can be
 *  checked against the language rather than against a list someone
 *  maintains by hand. */
export const AMBIENT = Object.keys(AMBIENT_EMITTERS);

/** Every name this renderer answers to, ambient or not. */
export const CONSTRUCTS = Object.keys(EMITTERS);

/**
 * Render one construct by name.
 *
 * The whole vocabulary through a single call, which is what a host with a
 * component model needs: one adapter that takes a name instead of fifty
 * that each know one. A page wanting a Wardley map in the middle of an
 * essay asks for "Wardley" and gets it, and nothing has to be added here
 * when the language grows.
 */
export function construct(
  name: string,
  props: Record<string, unknown> = {},
  slots?: H.Slots,
): string {
  const emit = EMITTERS[name];
  if (!emit)
    throw new Error(
      `[esf] unknown construct "${name}". The vocabulary is closed and announced: ` +
        CONSTRUCTS.join(", "),
    );
  return emit(props, slots);
}

/** Props whose values are JS expressions rather than strings, so they are
 *  read through the estree evaluator instead of taken literally. */
const readProps = (node: any): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const a of node.attributes ?? []) {
    if (a.type !== "mdxJsxAttribute") continue;
    /* Strings stay strings; anything in braces is evaluated statically.
       `attr` collapses an expression to `true`, which is right for bare
       flags and wrong for `rows={[…]}`, so the data reader goes first. */
    const data = attrData(node, a.name);
    out[a.name] = data !== undefined ? data : attr(node, a.name);
  }
  return out;
};

export interface HtmlOptions {
  lang?: Lang;
  /** Heading levels that get an `id`. Defaults to h2–h4, which is what the
   *  section index and every `<Ref>` target. */
  anchorDepths?: number[];
}

/**
 * Render a parsed document to HTML.
 *
 * Takes the tree from `analyse()`, so the bytes counted and the bytes
 * rendered are the same bytes.
 */
export function toHtmlDoc(tree: Root, o: HtmlOptions = {}): string {
  const lang = o.lang ?? "en";
  const depths = o.anchorDepths ?? [2, 3, 4];

  /**
   * Drop the paragraph mdast wraps around indented JSX children.
   *
   * `<Sources>` holding two indented `<li>` elements parses as a paragraph
   * containing them, which serializes to `<p><li>…` — invalid, and not
   * what the MDX compiler produces. A paragraph whose content is entirely
   * elements and whitespace was never a paragraph; it is the author's
   * indentation showing through.
   */
  const unwrapJsxParagraphs = (children: any[]): any[] =>
    children.flatMap((c) => {
      if (c.type !== "paragraph") return [c];
      const kids = c.children ?? [];
      const meaningful = kids.filter(
        (k: any) => !(k.type === "text" && /^\s*$/.test(k.value ?? "")),
      );
      const allJsx =
        meaningful.length > 0 &&
        meaningful.every((k: any) => k.type === "mdxJsxTextElement" || k.type === "mdxJsxFlowElement");
      return allJsx ? meaningful : [c];
    });

  /**
   * Split a construct's children into the default slot and any named ones.
   * A named slot is a `<Fragment slot="…">` — the spelling documents
   * already use, and the one component-model hosts recognise.
   */
  const slotsOf = (state: any, node: any): H.Slots => {
    const named: Record<string, any[]> = {};
    const rest: any[] = [];
    /* A slotted fragment authored on its own line without blank lines
       around it parses INSIDE a paragraph, not beside it — so the scan
       looks one level into paragraphs and lifts the fragments out,
       leaving the surrounding prose where it was. */
    const consider = (child: any, sink: any[]) => {
      const slot =
        child.type === "mdxJsxFlowElement" || child.type === "mdxJsxTextElement"
          ? attr(child, "slot")
          : undefined;
      if (typeof slot === "string") (named[slot] ??= []).push(...(child.children ?? []));
      else sink.push(child);
    };
    for (const child of node.children ?? []) {
      if (child.type === "paragraph") {
        const keep: any[] = [];
        for (const k of child.children ?? []) consider(k, keep);
        if (keep.some((k: any) => !(k.type === "text" && /^\s*$/.test(k.value ?? ""))))
          rest.push({ ...child, children: keep });
      } else consider(child, rest);
    }
    const render = (kids: any[]) =>
      toHtml(
        { type: "root", children: state.all({ ...node, children: unwrapJsxParagraphs(kids) }) } as any,
        { allowDangerousHtml: true },
      );
    const slots: H.Slots = { default: render(rest) };
    for (const [name, kids] of Object.entries(named)) slots[name] = render(kids);
    return slots;
  };

  const construct = (state: any, node: any) => {
    /* A nameless element is `<>…</>`; a lowercase one is ordinary HTML the
       author wrote inline, which MDX also parses as JSX. Neither is a
       construct, and both pass through as themselves. */
    if (!node.name) return { type: "root", children: state.all(node) } as any;
    if (node.name[0] === node.name[0].toLowerCase()) {
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(readProps(node))) props[k] = v;
      return {
        type: "element",
        tagName: node.name,
        properties: props,
        children: state.all(node),
      } as any;
    }

    const emit = EMITTERS[node.name];
    /* An unknown *construct* is a bug in the document rather than something
       to render as a div: the vocabulary is closed and announced. */
    if (!emit)
      return { type: "raw", value: `<!-- unknown construct <${node.name}> -->` } as any;
    return { type: "raw", value: emit({ lang, ...readProps(node) }, slotsOf(state, node)) } as any;
  };

  const hast = toHast(tree, {
    allowDangerousHtml: true,
    handlers: {
      mdxJsxFlowElement: construct,
      mdxJsxTextElement: construct,
      /* Headings carry their own anchor. The slug matches `doc.ts`, which
         is what the section index links to — a contents list that
         disagreed with the ids would be worse than none. Entry headings
         (F1, RC1, Role A) anchor by their token instead, so a `<Ref>` can
         point at them with the token alone. */
      heading(state: any, node: any) {
        const el: any = { type: "element", tagName: `h${node.depth}`, properties: {}, children: state.all(node) };
        if (depths.includes(node.depth)) {
          /* Collect raw text from the hast nodes — never via toHtml, whose
             escaping leaks into the slug: "Policies & Operations" serialized
             to "Policies &#x26; Operations", and once the tags were stripped
             the entity's body survived slugify as "policies-x26-operations",
             a heading id the section index could not find. */
          const textOf = (n: any): string =>
            n.type === "text" ? n.value : (n.children ?? []).map(textOf).join("");
          const text = state.all(node).map(textOf).join("");
          const token = text.match(/^((?:[A-Z]{1,3}\d+|Role\s+[A-Z]))\b/);
          el.properties.id = token
            ? token[1].toLowerCase().replace(/\s+/g, "-")
            : slugify(text);
        }
        return el;
      },
    },
  });

  return toHtml(hast as any, { allowDangerousHtml: true });
}
