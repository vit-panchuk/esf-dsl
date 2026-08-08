import { gate, resolve, type DocMeta, type Mark, type Selected } from './emit';

/**
 * Deck and thread — the two selections that carry an argument in a
 * fraction of the space.
 *
 * They share every hard part: pick the marked blocks, keep the document's
 * order, check the budget, refuse to publish an empty one. So they share
 * the code, and differ only in what a unit is and how the units are framed.
 * Writing them separately would have meant two selection rules drifting
 * apart, and the second one being the wrong one.
 */

/**
 * A deck-marked exhibit — the chart or table re-rendered on its own slide.
 * Prop-driven components carry their literal props; a Table carries its
 * flattened cells, because a slide wants the data, not the page markup.
 */
export interface Exhibit {
  component: 'Bars' | 'Figures' | 'AxisPlot' | 'Horizon' | 'Table';
  props?: Record<string, unknown>;
  table?: { caption?: string; head: string[]; rows: string[][] };
  /** Rows per slide (`deckSplit={n}`) — a table longer than this breaks
   *  into continuation slides sharing the headline. */
  split?: number;
}

/**
 * A deck-marked policy, carried whole. Policies are the decided layer —
 * the part of the strategy the room is being asked to accept — so the
 * deck refuses to reduce one to a table row: every stated fact travels,
 * and the rationale digest rides along as the speaker note.
 */
export interface PolicyCard {
  id: string;
  title: string;
  kind?: string;
  state: string;
  acceptedBy?: string;
  executedBy?: string;
  review?: string;
  addresses?: string;
  relation?: string;
  operations?: string;
  digest?: string;
}

export interface Block {
  id: string;
  component: string;
  text: string;
  order: number;
  tag?: string;
  deck?: Mark;
  thread?: Mark;
  /** Set on a deck-marked chart or table — a slide can show it, a post cannot. */
  exhibit?: Exhibit;
  /** Set on a deck-marked policy — the whole row, for its own slide. */
  policy?: PolicyCard;
  /** The section the block sits in — the slide's way back into the report. */
  anchor?: { slug: string; title: string };
}

const pick = (channel: 'deck' | 'thread', blocks: Block[]) =>
  blocks
    .map((b) => resolve(channel, { ...b, mark: b[channel] ?? false }))
    .filter((s): s is Selected => s !== null)
    .sort((a, b) => a.order - b.order);

/* ── deck ──────────────────────────────────────────────────────────────
 *
 * Slides come out as layout names from the deck template, not as markup:
 * the selection decides what is said, the template decides how it looks,
 * and neither gets a vote on the other.
 *
 * The opening and closing slides are generated rather than marked. A title
 * slide is document metadata and marking it would be ceremony; the evidence
 * meter closes every deck because a talk that ends on its strongest finding
 * and never says how much of it was observed is the talk this site argues
 * against.
 */
export interface Slide {
  layout: 'title' | 'statement' | 'finding' | 'exhibit' | 'policy' | 'evidence';
  text?: string;
  tag?: string;
  exhibit?: Exhibit;
  policy?: PolicyCard;
  note?: string;
  /** Where in the report this slide comes from. */
  anchor?: { slug: string; title: string };
}

export const deck = (meta: DocMeta, blocks: Block[]): Slide[] | null => {
  const picked = pick('deck', blocks);
  if (!gate(meta, 'deck', picked.length)) return null;
  const byId = new Map(blocks.map((b) => [b.id, b]));
  return [
    { layout: 'title', text: meta.title, note: meta.subtitle },
    ...picked.flatMap((s): Slide[] => {
      const block = byId.get(s.id);
      const exhibit = block?.exhibit;
      const anchor = block?.anchor;
      /* A policy slide: the statement (or its rewrite) as the headline,
         the stated facts on the slide, the rationale digest as the note —
         what the room reads is the rule; what you say is why. */
      if (block?.policy)
        return [{
          layout: 'policy',
          text: s.text,
          policy: block.policy,
          anchor,
          note: block.policy.digest,
        }];
      if (!exhibit)
        return [{
          layout: s.tag ? 'finding' : 'statement',
          text: s.text,
          tag: s.tag,
          anchor,
          /* The block's full sentence becomes the speaker note whenever the
             slide is a rewrite. The short version is for the room; the long
             one is what you actually say, and it is already written. */
          note: s.rewritten && s.source ? s.source : undefined,
        }];
      const t = exhibit.table;
      if (!t || !exhibit.split || t.rows.length <= exhibit.split)
        return [{ layout: 'exhibit', text: s.text, tag: s.tag, exhibit, anchor }];
      /* The slide break: a long table continues onto sibling slides that
         share the headline. The caption travels once, the header repeats —
         a continuation with unlabeled columns is unreadable from the back. */
      const chunks: string[][][] = [];
      for (let i = 0; i < t.rows.length; i += exhibit.split)
        chunks.push(t.rows.slice(i, i + exhibit.split));
      return chunks.map((rows, i) => ({
        layout: 'exhibit',
        text: s.text,
        tag: s.tag,
        anchor,
        exhibit: {
          ...exhibit,
          table: { caption: i === 0 ? t.caption : undefined, head: t.head, rows },
        },
      }));
    }),
    { layout: 'evidence' },
  ];
};

/* ── thread ────────────────────────────────────────────────────────────
 *
 * A thread is the most lossy form here and the one most likely to be
 * quoted, which is an uncomfortable combination. Two rules make it
 * survivable: every post that states a graded claim carries its tag inline
 * — a finding torn out of the thread still says how it was arrived at —
 * and the last post links the full document. A thread that cannot be
 * checked is an assertion, and this site does not publish those.
 */
export interface Post {
  n: number;
  of: number;
  text: string;
  asset?: string;
}

/** The inline provenance suffix and the closing post, per edition. The
 *  budget check in resolve() runs before the suffix is appended, so the
 *  labels never eat into the author's 240 characters. */
export interface ThreadLabels {
  tags: Record<string, string>;
  closing: string;
}

const EN_LABELS: ThreadLabels = {
  tags: {
    observed: 'observed',
    user: 'from the client',
    inferred: 'inferred',
    web: 'sourced',
    assumed: 'assumed — unverified',
  },
  closing: 'Full report, sources and the evidence breakdown:',
};

export const thread = (
  meta: DocMeta,
  blocks: Block[],
  labels: ThreadLabels = EN_LABELS,
): Post[] | null => {
  const picked = pick('thread', blocks);
  if (!gate(meta, 'thread', picked.length)) return null;
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const body = picked.map((s) => {
    const suffix = s.tag ? ` [${labels.tags[s.tag] ?? s.tag}]` : '';
    return { text: s.text + suffix, asset: byId.get(s.id)?.exhibit?.component };
  });
  const parts = [
    { text: meta.subtitle ? `${meta.title} — ${meta.subtitle}` : meta.title },
    ...body,
    { text: `${labels.closing} ${meta.canonical}` },
  ];
  return parts.map((p, i) => ({ n: i + 1, of: parts.length, ...p }));
};
