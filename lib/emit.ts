/**
 * The pipeline spine.
 *
 * One MDX file is the source of every published form. The seven outputs are
 * not seven equals, though, and the whole design rests on the split:
 *
 *   RENDERINGS   web · pdf · md · jsonld
 *     Complete. Everything in the source appears, transformed but not
 *     chosen. No authoring decisions, so no authoring input: the build
 *     produces them from the document alone and a block missing from one of
 *     them is a bug in a serializer.
 *
 *   SELECTIONS   deck · thread · social
 *     Incomplete by definition — they carry the argument in a fraction of
 *     the space. What survives is an editorial judgement, and it belongs in
 *     the source next to the prose it is judging. A build that picks for
 *     you is guessing, and a guess that looks like a decision is the exact
 *     failure this whole system exists to avoid.
 *
 * Two of the seven need no emitter at all, which is the useful half of
 * reconciliation. PDF is the web rendering through the print stylesheet
 * that already exists. The social card is the page's own head at poster
 * scale, already generated from front-matter. Adding code for either would
 * have meant two ways to render one thing, and eventually two answers.
 */

export type Rendering = 'web' | 'pdf' | 'md' | 'jsonld';
export type Selection = 'deck' | 'thread' | 'social';
export type Channel = Rendering | Selection;

/* Lower-case on purpose: everything in lib/ is build-time Node, never a
   browser export, and a capitalised name here would be picked up as a
   design-system component by anything scanning the package. */
export const renderings: Rendering[] = ['web', 'pdf', 'md', 'jsonld'];
export const selections: Selection[] = ['deck', 'thread', 'social'];

/** Front-matter. `emits` lists the channels this document publishes to. */
export interface DocMeta {
  title: string;
  subtitle?: string;
  kind: 'report' | 'note' | 'page';
  revision?: number;
  updated: string;
  canonical: string;
  /** BCP 47 tag of the document's language. Defaults to 'en' downstream —
   *  a rendering that misstates its language misreports the document. */
  lang?: string;
  emits: Channel[];
}

/**
 * A selection marker, written on the block itself:
 *
 *   <Finding deck thread>…</Finding>
 *   <Finding deck="Nobody owns the roadmap" thread="…">…</Finding>
 *
 * Bare opt-in reuses the block's own text. The string form is a rewrite,
 * and it exists because selection is not only filtering — a slide line and
 * a post are a different register from a report sentence, and pretending
 * one text serves all three is how a deck ends up unreadable at the back of
 * a room. Opting in without a rewrite is fine when the sentence genuinely
 * travels; the budget check below decides, and says so out loud.
 */
export type Mark = boolean | string;

/**
 * Budgets, in the unit each channel actually runs out of.
 *
 * Deck: a headline that wraps to three lines on a 1920 stage has already
 * failed, and the number is set from the type scale, not from taste.
 * Thread: 280 minus the room the numbering and the trailing link take.
 */
export const budgets = {
  deck: { unit: 'words', max: 14, note: 'one line at d1 on a 1920 stage' },
  thread: { unit: 'chars', max: 240, note: '280 less numbering and the link' },
} as const;

export interface Selected {
  id: string;
  component: string;
  /** The block's own text, for provenance and for the fallback. */
  source: string;
  /** What this channel will actually publish. */
  text: string;
  /** True when an explicit rewrite was given rather than the source reused. */
  rewritten: boolean;
  order: number;
  tag?: string;
}

/** Build failures carry a prefix rather than a class — nothing catches
 *  these by type, and a class export would surface as a component. */
const fail = (msg: string): never => {
  throw new Error(`[emit] ${msg}`);
};

const words = (s: string) => s.trim().split(/\s+/).length;

/**
 * Resolve one marked block for one selection channel.
 *
 * Overflow is an error, never a truncation. Cutting a sentence at 240
 * characters produces something that reads like a finished thought and is
 * not one — the reader has no way to know the qualification was severed. So
 * the build stops and names the block, and a person decides what the short
 * version says. That is a few seconds of friction against the class of
 * error this site is about.
 */
export const resolve = (
  channel: 'deck' | 'thread',
  block: { id: string; component: string; text: string; mark: Mark; order: number; tag?: string },
): Selected | null => {
  if (!block.mark) return null;
  const rewritten = typeof block.mark === 'string';
  const text = rewritten ? (block.mark as string) : block.text;
  const b = budgets[channel];
  const size = b.unit === 'words' ? words(text) : text.length;
  if (size > b.max) {
    fail(
      `${block.component}#${block.id} is ${size} ${b.unit} for the ${channel} ` +
        `(max ${b.max} — ${b.note}). ` +
        (rewritten
          ? 'Shorten the rewrite.'
          : `Give it a rewrite: ${channel}="…". The block's own text does not travel.`),
    );
  }
  return { id: block.id, component: block.component, source: block.text, text, rewritten, order: block.order, tag: block.tag };
};

/**
 * Gate a selection channel before anything is written.
 *
 * Declaring `emits: [deck]` and marking nothing is the interesting failure:
 * it produces a deck of one title slide, which looks like a deck and says
 * nothing. Empty output is the one result the build refuses to publish
 * quietly — the same rule as the zero row in the evidence meter.
 */
export const gate = (meta: DocMeta, channel: Selection, picked: number) => {
  if (!meta.emits.includes(channel)) return false;
  if (channel !== 'social' && picked === 0) {
    fail(
      `${meta.title} declares emits: [… ${channel} …] and no block is marked ` +
        `${channel}. Mark the blocks that carry the argument, or drop the channel.`,
    );
  }
  return true;
};
