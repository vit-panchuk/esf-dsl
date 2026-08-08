/**
 * The dictionary: one entry per construct, and the only place a
 * construct's meaning is written down.
 *
 * A DSL whose channels each decide for themselves what a construct means
 * drifts silently. A `<Risk>` that renders on the web, degrades to bare
 * prose in markdown and never reaches the graph is not an error anywhere —
 * the document simply says less in one channel than another, and nobody
 * finds out until a reader does. That is the failure this file exists to
 * make impossible: every renderer is checked against these entries rather
 * than against its own habits, so a construct cannot be added to one
 * channel and forgotten in the rest.
 *
 * The load-bearing field is `md`. Each construct owes the markdown channel
 * a promise, and the promise is written here as prose a person can hold
 * the serializer to. It is also the admission test for the language: a
 * construct that owes a rendering to the channels is document vocabulary,
 * and one that renders in no channel — a loading skeleton, a nav — is
 * application UI and belongs to the consumer, not here.
 *
 * Three ways to owe nothing, and they are different on purpose:
 *
 *   { contract }  a promise, kept by a serializer of its own
 *   { via }       the parent serializes it — an <Event> is a Timeline row
 *   { plain }     the words survive as written; only treatment is lost
 *   { drops }     carries nothing, and the reason is stated
 *
 * `drops` is what stops the check from being satisfied by silence. Without
 * it, "no serializer" and "deliberately renders nothing" look identical,
 * and the check would pass for a construct nobody had got around to.
 *
 * `esf dict` prints all of this, which is the point: an agent writing a
 * report can ask the language what it offers rather than guess.
 */
import { AMBIENT, CONSTRUCTS } from "./render-html";

/** What a construct is for. Grouping is editorial — it organises `esf
 *  dict` and nothing dispatches on it. */
export type Group =
  | "provenance"
  | "reference"
  | "finding"
  | "register"
  | "plan"
  | "prose"
  | "narrative"
  | "figure"
  | "frame";

export interface Prop {
  name: string;
  /** As written in the emitter's signature — the dictionary does not get
   *  to describe a prop differently from the function that takes it. */
  type: string;
  optional?: boolean;
}

/** What a construct owes the markdown channel. */
export type MdContract =
  /** A promise kept by a serializer of its own, in `render-md.ts`. */
  | { contract: string; via?: never; plain?: never; drops?: never }
  /** Serialized by its parent — the child has no line of its own. */
  | { via: string; contract?: never; plain?: never; drops?: never }
  /** The default serialization is the right one: the construct adds
   *  treatment, and treatment is what markdown is allowed to lose. Distinct
   *  from `drops` because the words do survive, and distinct from
   *  `contract` because no serializer should exist. */
  | { plain: string; contract?: never; via?: never; drops?: never }
  /** Carries nothing into markdown, for the stated reason. */
  | { drops: string; contract?: never; via?: never; plain?: never };

export interface Entry {
  name: string;
  group: Group;
  /** May a document write it with no import? Frame and reserve may not. */
  ambient?: boolean;
  /** One line: what it means, and the framework rule it carries. */
  summary: string;
  /** Everything else worth knowing before authoring one. */
  notes?: string;
  props: Prop[];
  md: MdContract;
  /** How a `deck` mark on this construct is treated. An exhibit puts the
   *  data itself on a slide; a register entry puts the whole register
   *  there, because one risk per slide is noise; a card puts THAT entry on
   *  its own slide, in full — the treatment the decided layer gets, because
   *  a policy reduced to a table row buries the thing the room is being
   *  asked to accept. Everything else marked `deck` travels as a block
   *  with its rewrite. */
  deck?: "exhibit" | "register" | "card";
}

export const DICTIONARY: Entry[] = [
  {
    name: "Chip",
    group: "provenance",
    summary: "The provenance chip: where a claim came from, stated beside the claim.",
    notes: "Translation is data, not a construct: the edition follows the document's `lang`, and the `lang` prop is an explicit override for a context that has none.",
    props: [
      { name: "kind", type: "Tag", optional: true },
      { name: "label", type: "string", optional: true },
      { name: "lang", type: "string", optional: true },
      { name: "legend", type: "boolean", optional: true },
    ],
    md: {
      contract: "`[observed]` — a code span immediately after the claim, no space. Provenance is content, never treatment: it survives every channel. In plain text with no code spans available, it stays as (observed).",
    },
  },
  {
    name: "EvidenceBase",
    group: "provenance",
    ambient: false,
    summary: "The Evidence Base section, whole: the localized heading, the meter, and the note under it. Furniture the language owns — the standalone edition renders this and a hosting site adopts the same construct, so the heading is a .prose h2 the body counter numbers like every section after it: 00 and 01 come from one zero, per consumer, by construction.",
    props: [
      { name: "rows", type: "EvidenceRowIn[]", optional: true },
      { name: "note", type: "string", optional: true },
      { name: "lang", type: "string", optional: true },
    ],
    md: { drops: "the section frame belongs to the view; the meter itself travels via Evidence" },
  },
  {
    name: "Evidence",
    group: "provenance",
    summary: "The evidence meter, drawn in the body from the same counts the header bar reads. Never authored with numbers — they are counted from the chips, which is the only reason to trust them.",
    props: [
      { name: "rows", type: "EvidenceRowIn[]", optional: true },
      { name: "note", type: "string", optional: true },
    ],
    md: {
      contract:
      "A drawn meter in a fenced block — the one place ASCII art is allowed. Elsewhere a chart becomes its table because the drawing only aided numbers that stand on their own; here the shape IS the claim, and it is the first thing a reader takes in.\n" +
      "\n" +
      "  ```\n" +
      "  Evidence base — 25 tagged claims · 0 assumed\n" +
      "  [observed] █████████████████░░░░░░░░░░░░░░░░░░░  48%  (12)\n" +
      "  [assumed]  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  ( 0)\n" +
      "  ```\n" +
      "\n" +
      "36 cells, U+2588 and U+2591, numbers printed alongside rather than replaced. A zero row is never omitted: the zero is usually the finding, and an empty track says so louder than a table cell.",
    },
  },
  {
    name: "Verdict",
    group: "provenance",
    summary: "The assessed binary — the green/red text in a comparison table, and the cell the registers render their own judgements into (`<Bet verdict>`, `<Strategy stateVerdict healthVerdict>`, `<EasyWin status>`). Those three derive the value from the entry rather than taking it from an author, which is why authoring a verdict inside a register cell is an error.",
    notes:
      "Two hues and no amber: `yes` and `no` carry the binary; `part` stays ink-muted and lets the sentence qualify itself — that includes the qualified no (\"no, but the disclosure apparatus covers it\"), which is a middle case, not a red one. A verdict is never orange — \"no\" and \"assumed\" mean entirely different things.\n" +
      "\n" +
      "Never author ✓/✗ inside the slot: the glyph comes from the component, and an authored one doubles it.\n" +
      "\n" +
      "`symbol={false}` is the bare edition: hue only, for cells where the value already is the verdict (\"$0\", \"nothing at all\") and a glyph would just repeat it. Keep the wording explicit in those cells — the colour may not carry the meaning alone.\n" +
      "\n" +
      "The value is content, so it travels as `data-verdict` — machine readers get the verdict the same way they get a chip's `data-evidence`; the hue is treatment and selects on the attribute.",
    props: [
      { name: "value", type: "\"yes\" | \"no\" | \"part\"" },
      { name: "symbol", type: "boolean", optional: true },
    ],
    md: { plain: "the hue and the glyph were the treatment; the assessed word is already in the sentence" },
  },
  {
    name: "Ref",
    group: "reference",
    summary: "An inline pointer to a register entry — R3, D1, C2. Links to the entry's anchor and carries its one-line memo on hover and focus, so the reader never loses their place to check what R3 was.",
    props: [
      { name: "id", type: "string" },
      { name: "memo", type: "string" },
      { name: "href", type: "string", optional: true },
    ],
    md: {
      contract: "A link to the entry: [R3](#r3). The memo is a hover treatment; the register itself carries the substance.",
    },
  },
  {
    name: "Finding",
    group: "finding",
    summary: "The selection marker — the block-level opt-in for the deck and thread channels (see lib/emit.ts):",
    notes:
      "  <Finding deck thread>…</Finding>\n" +
      "  <Finding deck=\"Nobody owns the roadmap\" thread=\"…\">…</Finding>\n" +
      "\n" +
      "Bare opt-in reuses the block's own text; the string form is a rewrite, because a slide line and a post are a different register from a report sentence. Budgets (deck 14 words, thread 240 chars) are enforced at build time by `resolve()` — overflow stops the build rather than truncating.\n" +
      "\n" +
      "On the page it is a pull-quote: the sentence the author judged strong enough to travel should look like it on the page too.",
    props: [
      { name: "tag", type: "Tag", optional: true },
    ],
    md: {
      contract: "A blockquote. The mark itself is authoring metadata for the deck and thread channels and never appears in a rendering.",
    },
  },
  {
    name: "Takeaway",
    group: "finding",
    summary: "The beat a section lands on — emphasis in the flow of the argument, and nothing more. It carries no props, so it selects nothing: the lossy targets are marked with `<Finding deck thread>`, which is the only construct `lib/doc.ts` scans for marks.",
    notes: "That division is worth keeping. A Takeaway says \"this is the point of the section\"; a Finding says \"this travels to the deck and the thread\". They coincide often enough to be confused and are not the same judgement — the strongest sentence in a section is not automatically the one that survives being read out of the room.",
    props: [],
    md: {
      contract: "A blockquote, like <Finding>. The two are indistinguishable in the markdown rendering because emphasis is all either one has left once the marks are gone — and the marks are authoring metadata that never appears in a rendering.",
    },
  },
  {
    name: "Risk",
    group: "register",
    summary: "A Risk Register entry: something that might happen, ranked by damage × likelihood × how likely you'd notice × cost to recover. The falsifier — what would change the author's mind — is the load-bearing field: a risk nothing could disprove is an opinion. Each entry anchors by its id so a <Ref> can point at it from anywhere in the document.",
    props: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "flag", type: "string", optional: true },
      { name: "happens", type: "string", optional: true },
      { name: "likelihood", type: "string", optional: true },
      { name: "notice", type: "string", optional: true },
      { name: "cost", type: "string", optional: true },
      { name: "falsifier", type: "string", optional: true },
    ],
    md: {
      contract: "A bold header line (id · title · flag), the body, then one line per stated fact, \"What would change my mind\" always last.",
    },
    deck: "register",
  },
  {
    name: "Debt",
    group: "register",
    summary: "A Debt Ledger entry. Distinct from a risk: a risk might happen; a debt is a cost already being paid, every single release. The red rule is the verdict \"no\", not the signal orange — a cost being paid is certain.",
    props: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "kind", type: "string", optional: true },
    ],
    md: {
      contract: "A bold header line (id · title · kind), then the body.",
    },
    deck: "register",
  },
  {
    name: "Credit",
    group: "register",
    summary: "A Credit Ledger entry — the asset side. An investment counts as real only once something actually reuses it, so `status` carries the honest qualifier on projected entries (OVERDUE, PAST THE POINT OF WRITE-OFF). The green rule is the verdict \"yes\"; a projected entry keeps the red.",
    props: [
      { name: "id", type: "string", optional: true },
      { name: "title", type: "string" },
      { name: "status", type: "string", optional: true },
      { name: "realized", type: "boolean", optional: true },
    ],
    md: {
      contract: "A bold header line (id · title · status), then the body.",
    },
    deck: "register",
  },
  {
    name: "Cause",
    group: "finding",
    summary: "A root-cause entry: the mechanism behind a family of symptoms, in the same register treatment as a risk — anchored by id so a <Ref> can point at it from every symptom it explains. `ensures` is the compounding one-liner: what this mechanism guarantees for as long as it stands.",
    props: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "ensures", type: "string", optional: true },
    ],
    md: {
      contract: "A bold header line (id — title), the body with its structure kept — a cause explains a chain, and flattening the chain would unexplain it — then the \"Ensures:\" line.",
    },
  },
  {
    name: "Mortem",
    group: "finding",
    summary: "A pre-mortem entry: one way the plan fails, imagined from a year out. Two fields are mandatory where the risk register's are optional — a failure mode without an early warning cannot be watched for, and one without a mitigation is just dread. Anchors by id like every register entry, so a <Ref> can point at it.",
    props: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "note", type: "string", optional: true },
      { name: "warning", type: "string" },
      { name: "mitigation", type: "string" },
    ],
    md: {
      contract: "A bold header line (id — title, the note in italics), the body, then the two fact lines.",
    },
  },
  {
    name: "Decision",
    group: "finding",
    summary: "A Decision Log entry. Superseded decisions stay on the page, struck through — a reader who only knows the original plan must be able to see that it changed, and why.",
    props: [
      { name: "id", type: "string" },
      { name: "status", type: "\"superseded\" | \"standing\" | \"withdrawn\"" },
      { name: "rev", type: "number", optional: true },
      { name: "was", type: "string", optional: true },
    ],
    md: {
      contract:
      "A bold meta line, then the superseded text struck, then the body:\n" +
      "  **D2 · rev. 3 · superseded**\n" +
      "  ~~Ship the new admin behind a flag in Q3.~~\n" +
      "  Hold the flag until the promotions migration lands.\n" +
      "The strike survives as GFM `~~…~~` rather than being dropped, because struck-not-deleted is the whole point of the construct — a markdown reader must see the reversal, not just its result. The status word is content and stays in the line; the hue was the treatment. `rev.` appears only when the entry carries one.",
    },
  },
  {
    name: "Policy",
    group: "plan",
    summary: "A Policy register entry (PL…) — the decided layer's unit: a standing decision rule that governs future decisions of its class, where a bet decides an investment once. `kind` is the Larson type (approval · allocation · direction · guidance); `state` is the acceptance state, and it defaults to `proposed` — a policy is born proposed and only the human running the engagement accepts it, because an agent-accepted policy is a fabricated mandate. The statement is the title; the body is the rationale digest built from the memos of the codes it addresses, so the reasoning stays one link away. Anchors by its lowercased id (`#pl1`) so a <Ref> can point at it.",
    notes:
      "Named slots carry the linked facts, <Ref>s welcome: `addresses` — the diagnosis items it solves (the rendered projection of the graph's ADDRESSES edges; a policy that addresses nothing has no context); `relation` — the Observed-Strategy-Inventory rows it reinforces, amends or replaces (silent contradiction of a strategy-in-force is how re-litigation wars start); `operations` — the mechanisms that make it real, because a policy row without operations is a wish with a register code.\n" +
      "\n" +
      "`acceptedBy`/`executedBy` are dual-addressability: acceptance is the human verb, and the execution address climbs the enforcement ladder as far as the policy's stance requires.",
    props: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "kind", type: "string", optional: true },
      { name: "state", type: "\"proposed\" | \"accepted\"", optional: true },
      { name: "acceptedBy", type: "string", optional: true },
      { name: "executedBy", type: "string", optional: true },
      { name: "review", type: "string", optional: true },
    ],
    md: {
      contract: "A bold header line (id — title, kind · state as the note), the body, then one line per stated fact: Addresses, Relation, Operations, Accepted by, Executed by, Review.",
    },
    deck: "card",
  },
  {
    name: "Strategies",
    group: "plan",
    summary: "The Observed Strategy Inventory — the register of strategies already in force, written or not. There is always one; this table is where it gets named. Renders its <Strategy> rows under the canonical four-column header (localized), so the register reads the same across reports.",
    props: [
      { name: "lang", type: "string", optional: true },
    ],
    md: {
      contract: "A GFM table rebuilt from the <Strategy> rows: # · the rule · written? · working?",
    },
    deck: "exhibit",
  },
  {
    name: "Strategy",
    group: "plan",
    summary: "One Observed-Strategy-Inventory row: a strategy in force whether or not anyone wrote it down. The rule itself is the slot; `state` answers \"written?\" (ratified · in the gems, not the governance · nowhere · by omission…), `health` answers \"working?\" in one honest phrase — the same two properties the strategy's node carries in the WIP graph. Verdict hues are optional: the unqualified middle stays ink and the sentence qualifies itself. Anchors by its lowercased id (`#s1`) so a <Ref> lands on the row, not the section top.",
    props: [
      { name: "id", type: "string" },
      { name: "state", type: "string" },
      { name: "stateVerdict", type: "\"yes\" | \"no\" | \"part\"", optional: true },
      { name: "health", type: "string" },
      { name: "healthVerdict", type: "\"yes\" | \"no\" | \"part\"", optional: true },
    ],
    md: { via: "Strategies" },
  },
  {
    name: "Bets",
    group: "plan",
    summary: "The Strategic Bets register — Build/Buy/Wait/Kill calls, left as a starting position for the owner to set. Renders its <Bet> rows under the canonical five-column header (localized).",
    props: [
      { name: "lang", type: "string", optional: true },
    ],
    md: {
      contract: "A GFM table rebuilt from the <Bet> rows: # · bet · verdict · addresses · cost.",
    },
    deck: "exhibit",
  },
  {
    name: "Bet",
    group: "plan",
    summary: "One Strategic-Bets row. The bet text is the default slot (inline <Ref>s welcome); the register entries it addresses travel in the `addresses` slot as <Ref>s — the rendered projection of the bet's DERIVED_FROM edges in the WIP graph. `verdict` is the call in the report's own verbs (Do · Kill · Wait · Cheap · Decide); its hue derives from the verb (Do → yes, Kill → no, every qualified call stays the ink middle) and `value` overrides it. Anchors by its lowercased id; pass `anchor={false}` when a walkthrough heading owns the bet's anchor instead of the row.",
    props: [
      { name: "id", type: "string" },
      { name: "verdict", type: "string" },
      { name: "value", type: "\"yes\" | \"no\" | \"part\"", optional: true },
      { name: "cost", type: "string", optional: true },
      { name: "anchor", type: "boolean", optional: true },
    ],
    md: { via: "Bets" },
  },
  {
    name: "EasyWins",
    group: "plan",
    summary: "The Easy Wins register — the fast lane. Machine-feeding items that passed the fast/easy/feeds-the-machine gate, one line each, outside the cut: they run alongside the strategic bets, never in their table. Renders its <EasyWin> rows under the canonical five-column header (localized).",
    props: [
      { name: "lang", type: "string", optional: true },
    ],
    md: {
      contract: "A GFM table rebuilt from the <EasyWin> rows: # · win · feeds · day · status.",
    },
    deck: "exhibit",
  },
  {
    name: "EasyWin",
    group: "plan",
    summary: "One Easy-Wins row — the fast lane's unit. The framework caps its depth deliberately: one line each, never a Decision Template. The win text is the default slot (inline <Ref>s welcome); `feeds` names the delivery-machine catalog item the win maps to — the admission gate made visible: an entry that cannot name what machine capability it feeds is not an easy win. `day` is the expected cost in agent wall-clock (the gate is ~a day or less); `status` tracks the lane in a living report, swept by Loop 2 — `shipped` goes green, `ejected` goes red (the overrun is the finding; the row text should Ref the bet or debt it became), anything else stays the ink middle. Anchors by its lowercased id; pass `anchor={false}` when a walkthrough heading owns the win's anchor instead of the row.",
    props: [
      { name: "id", type: "string" },
      { name: "feeds", type: "string" },
      { name: "day", type: "string", optional: true },
      { name: "status", type: "string", optional: true },
      { name: "anchor", type: "boolean", optional: true },
    ],
    md: { via: "EasyWins" },
  },
  {
    name: "Callout",
    group: "prose",
    summary: "A short aside set off from the prose. `kind=\"unknown\"` states, for machine readers as well as people, that the content is unresolved rather than asserted.",
    props: [
      { name: "kind", type: "\"claim\" | \"unknown\"", optional: true },
      { name: "label", type: "string", optional: true },
    ],
    md: {
      contract:
      "A blockquote whose first line is the bolded label:\n" +
      "  > **NOT ESTABLISHED**\n" +
      "  > Nobody who maintains Solidus was contacted.\n" +
      "kind=\"unknown\" adds nothing extra — the label already says it, and markdown has no orange.",
    },
  },
  {
    name: "PullQuote",
    group: "prose",
    summary: "The pull quote — at most one per document. `Finding` shares the same treatment but is a selection marker; this is just a sentence worth raising, with its source named.",
    props: [
      { name: "cite", type: "string", optional: true },
    ],
    md: {
      contract: "A blockquote, with the citation as an em-dashed last line.",
    },
  },
  {
    name: "Cols",
    group: "prose",
    summary: "Columns — the same quantity over time. Values are labelled on the column and there is no y-axis: a reader wants the figure, not to measure a height against a ruler. `muted` marks a real figure counted by a different definition; `assumed` is the annualised/estimated column and the only orange in the chart.",
    props: [
      { name: "title", type: "string", optional: true },
      { name: "cols", type: "{ label: string; n: string | number; v: number; muted?: boolean; assumed?: boolean }[]" },
      { name: "caption", type: "string", optional: true },
    ],
    md: {
      contract: "A chart becomes its table: one row per column, label then value. The drawing aided numbers that stand on their own; the numbers survive, the treatment does not.",
    },
  },
  {
    name: "Fn",
    group: "reference",
    summary: "A footnote reference — the superscript that points into the sources list. It follows the claim with no space, the same placement rule as a chip.",
    props: [
      { name: "n", type: "string | number" },
      { name: "href", type: "string" },
    ],
    md: {
      contract: "`[n]` after the claim; the link target is in the sources list.",
    },
  },
  {
    name: "Sources",
    group: "reference",
    summary: "The numbered sources list. Each item may carry an id so a footnote (`<Fn n href=\"#src-1\" />`) can link back to it — a claim's provenance is a round trip, not a citation dump.",
    props: [],
    md: {
      contract: "An ordered list, numbered as on the page.",
    },
  },
  {
    name: "State",
    group: "prose",
    summary: "A state says what is missing, how the absence is known, and what to do next — in that order, in that many sentences. The body's job is scope (what still works); the detail line is machine-readable and never the loudest thing on screen. One primary action, a ghost second at most. `unknown` is the one state that earns orange, and only because the fact is unverified — a broken system is an error, not a prettier unknown.",
    props: [
      { name: "kind", type: "\"empty\" | \"error\" | \"unknown\" | \"inline\"", optional: true },
      { name: "label", type: "string" },
      { name: "title", type: "string", optional: true },
      { name: "detail", type: "string", optional: true },
    ],
    md: {
      contract: "A blockquote: > **NO RESULTS** — nothing matches \"graphql\". Then the body as a second line. Actions become a link list only when they are real URLs; a button that runs script has no markdown and is dropped, because a markdown reader cannot press it.",
    },
  },
  {
    name: "Timeline",
    group: "narrative",
    summary: "A dated sequence of events. A gap is an entry in its own right, because a hole in the record is a fact about the record.",
    props: [],
    md: {
      contract:
      "A bullet list, one item per event, date bolded and em-dashed off:\n" +
      "  - **2024-03** — the meta-gem stopped depending on the old admin\n" +
      "A gap is an item too — *- **gap** — no releases, Oct 2023 to Mar 2024* — because a hole in the record is a fact about the record.",
    },
  },
  {
    name: "Event",
    group: "narrative",
    summary: "One entry in a Timeline — a date and what happened, optionally still open, assumed, or the turn the story pivots on.",
    props: [
      { name: "when", type: "string" },
      { name: "assumed", type: "boolean", optional: true },
      { name: "open", type: "boolean", optional: true },
      { name: "gap", type: "boolean", optional: true },
      { name: "turn", type: "boolean", optional: true },
      { name: "good", type: "boolean", optional: true },
    ],
    md: { via: "Timeline" },
  },
  {
    name: "Dialog",
    group: "narrative",
    summary: "A recorded exchange, one Turn per speaker. A silence keeps its place in the sequence rather than being edited out of it.",
    props: [],
    md: {
      contract:
      "One blockquote per turn, speaker line first:\n" +
      "  > **kennyadsl** · 2024-11-02\n" +
      "  > \"We are not planning a v5.\"\n" +
      "A silence turn keeps its place in the sequence and renders as *> no reply* — dropping it would edit the record.",
    },
  },
  {
    name: "Turn",
    group: "narrative",
    summary: "One turn in a quoted exchange — who spoke, when, and what they said. `silence` is a turn nobody took: it holds its place in the sequence rather than being dropped, because a question that went unanswered is evidence and closing the gap would edit the record.",
    props: [
      { name: "who", type: "string" },
      { name: "when", type: "string", optional: true },
      { name: "silence", type: "boolean", optional: true },
    ],
    md: { via: "Dialog" },
  },
  {
    name: "DialogNote",
    group: "narrative",
    summary: "The author's own gloss inside a quoted exchange — never italic, so a reader can tell in one glance where the quoting stops and the author's voice resumes.",
    props: [],
    md: { via: "Dialog" },
  },
  {
    name: "Table",
    group: "figure",
    summary: "A table of records. `legend` marks one that demonstrates notation instead of stating facts, so its chips are excluded from the evidence count.",
    props: [
      { name: "legend", type: "boolean", optional: true },
    ],
    md: {
      contract: "A GFM table, unchanged. The scroll wrapper is a phone affordance and has no markdown. A table wider than about six columns should have been a list of records in both channels.",
    },
    deck: "exhibit",
  },
  {
    name: "Figure",
    group: "figure",
    summary: "An image with a caption, where the caption survives into every channel rather than living in the markup.",
    props: [
      { name: "src", type: "string", optional: true },
      { name: "alt", type: "string" },
      { name: "tone", type: "\"ink\" | \"orange\"", optional: true },
      { name: "caption", type: "string", optional: true },
    ],
    md: {
      contract: "The plate's markdown, then the caption as its own italic paragraph. Never an HTML <figure> — a caption that only renders in one channel is a caption that will be wrong in the other.",
    },
  },
  {
    name: "Figures",
    group: "figure",
    summary: "The key figures strip — the three or four numbers a section hangs off, promoted out of the prose. The value speaks in the display voice; the caption is the fragment that makes it a fact rather than decoration.",
    props: [
      { name: "items", type: "{ v: string; cap: string }[]" },
    ],
    md: {
      contract: "A bullet list, `- **value** — caption`. The strip is layout; the pairs are the content, and nothing is lost.",
    },
    deck: "exhibit",
  },
  {
    name: "Plate",
    group: "figure",
    summary: "A full-bleed image. A plate with no image yet stays visible as a named absence instead of disappearing.",
    props: [
      { name: "src", type: "string", optional: true },
      { name: "alt", type: "string" },
      { name: "tone", type: "\"ink\" | \"orange\"", optional: true },
      { name: "band", type: "boolean", optional: true },
    ],
    md: {
      contract: "![alt](src) and nothing else. The halftone is a print treatment; it carries no information, so it does not survive. If the plate is a placeholder with no image yet, the markdown is a single italic line: *[plate: what belongs here]* — an absence stays visible.",
    },
  },
  {
    name: "Bars",
    group: "figure",
    summary: "A bar chart of labelled values that carries its own uncertainty — an unverified bound travels as a range beside an `[assumed]` chip.",
    props: [
      { name: "title", type: "string", optional: true },
      { name: "rows", type: "{ label: string; v: number; value: string; to?: number; assumed?: boolean }[]" },
      { name: "caption", type: "string", optional: true },
    ],
    md: {
      contract: "A table of the underlying values — never ASCII art. An unverified upper bound becomes a range in the value cell (33–92) plus the `[assumed]` chip, so the uncertainty travels with the number.",
    },
    deck: "exhibit",
  },
  {
    name: "Horizon",
    group: "figure",
    summary: "A lanes-by-horizons grid: what lands when, across workstreams. Empty cells are drawn rather than skipped, because the emptiness is the point.",
    props: [
      { name: "lanes", type: "{ label: string; note?: string; cells: string[][] }[]" },
      { name: "heads", type: "{ label: string; note?: string; now?: boolean }[]" },
    ],
    md: {
      contract: "A table: lanes as rows, horizons as column headers, one item per cell separated by a middot. An empty cell renders as an em dash, not as blank — the emptiness is the point of a horizon chart.",
    },
    deck: "exhibit",
  },
  {
    name: "AxisPlot",
    group: "figure",
    summary: "A quadrant plot whose props are the plot itself. One set of points feeds three renderings — the plotted dots, the numbered legend beneath, and the markdown edition's quadrantChart — so a nudged coordinate or a reworded tip can never leave a stale copy behind. (The hand-written .axis markup this replaces authored all three separately.)",
    notes: "`at` places a point's hover tip when the default (right of the dot) would leave the plot: \"left\", \"under\", or \"left under\".",
    props: [
      { name: "title", type: "string" },
      { name: "caption", type: "string", optional: true },
      { name: "x", type: "string" },
      { name: "y", type: "string" },
      { name: "quadrants", type: "[string, string, string, string]" },
      { name: "hot", type: "\"tl\" | \"tr\" | \"bl\" | \"br\"", optional: true },
      { name: "points", type: "AxisPt[]" },
    ],
    md: {
      contract: "A mermaid quadrantChart via the Diagram serializer — axes, quadrant names, and one labelled point per entry.",
    },
    deck: "exhibit",
  },
  {
    name: "LinePlot",
    group: "figure",
    summary: "Line — a trend, and where it stops being known. The forecast tail is a separate polyline in the signal treatment: drawing an extrapolation in the same weight as the measurement would be the lie.",
    props: [
      { name: "title", type: "string", optional: true },
      { name: "series", type: "{ points: string; muted?: boolean }[]" },
      { name: "forecast", type: "string", optional: true },
      { name: "xLabels", type: "string[]", optional: true },
      { name: "keyItems", type: "{ label: string; tone?: \"ink\" | \"muted\" | \"signal\" }[]", optional: true },
      { name: "caption", type: "string", optional: true },
    ],
    md: {
      contract: "A chart becomes its table where the numbers are in the prose; a trend whose only content is its shape should carry its figures in the caption, which survives.",
    },
  },
  {
    name: "Donut",
    group: "figure",
    summary: "Donut — one composition, four parts at most. Past four a reader is comparing angles, which nobody does well — so a fifth part is a build error, the same rule as a thread post over budget. One conic-gradient, no markup per slice; adjacent parts are parted by the ground.",
    props: [
      { name: "title", type: "string", optional: true },
      { name: "parts", type: "{ label: string; pct: number; signal?: boolean }[]" },
      { name: "caption", type: "string", optional: true },
    ],
    md: {
      contract: "A chart becomes its table: label and percentage per part.",
    },
  },
  {
    name: "Spark",
    group: "figure",
    summary: "Sparkline — a trend inside a sentence. It earns its place only when the shape is the point and the number is already in the prose.",
    props: [
      { name: "points", type: "string" },
    ],
    md: { drops: "the figure is already in the sentence, so the shape carries nothing the words do not" },
  },
  {
    name: "Share",
    group: "figure",
    summary: "Share — parts of one whole, as a stacked bar. Beats a donut whenever the reader compares two of them side by side, which is most of the time. Segments sit on the provenance greyscale in order; `signal: true` is the unaccounted/unverified part and the only orange.",
    props: [
      { name: "title", type: "string", optional: true },
      { name: "segments", type: "{ label: string; pct: number; signal?: boolean }[]" },
      { name: "caption", type: "string", optional: true },
    ],
    md: {
      contract: "A chart becomes its table: label and percentage per segment.",
    },
  },
  {
    name: "Diagram",
    group: "figure",
    summary: "A diagram whose props are the graph itself — which is what makes the markdown edition possible. Authoring order matters here: write the spec, let the page draw it. A diagram drawn first and described afterwards cannot round-trip, and should use <Figure> with a caption instead.",
    props: [
      { name: "title", type: "string" },
      { name: "kind", type: "string", optional: true },
      { name: "caption", type: "string", optional: true },
    ],
    md: {
      contract: "A fence in the diagram's own source language, so the markdown edition gets a real diagram rather than a placeholder: sequence / flow / quadrant / timeline → `mermaid`; wardley → `wardley` (Online Wardley Maps). Styling is dropped, structure is kept, and the caption always follows. A kind with no faithful text form falls back to *[diagram: title]* + caption.",
    },
  },
  {
    name: "Wardley",
    group: "figure",
    summary: "A Wardley map — value chain against evolution, drawn from its spec. A map is a claim about position, and position is contested: filled nodes are ours, hollow ones are somebody else's, orange marks a placement the author is guessing at, and the dashed run is expected movement — the most uncertain mark on the page.",
    notes: "Coordinates are the OWM convention the markdown edition uses: 0–1, with visibility up and evolution rightward. A link naming a node that does not exist is a build error — a map may not point at nothing.",
    props: [
      { name: "yLabel", type: "string", optional: true },
      { name: "nodes", type: "WNode[]" },
      { name: "links", type: "[string, string][]", optional: true },
      { name: "stages", type: "[string, string, string, string]", optional: true },
    ],
    md: {
      contract: "OWM text in a `wardley` fence (via the Diagram serializer) — the format Wardley maps are actually authored in; coordinates mean the same thing the props do.",
    },
  },
  {
    name: "Listing",
    group: "prose",
    summary: "A code listing, tokenized at build time, carrying its file path where a reader can act on it.",
    props: [
      { name: "file", type: "string", optional: true },
      { name: "lang", type: "string", optional: true },
      { name: "caption", type: "string", optional: true },
      { name: "meta", type: "string", optional: true },
    ],
    md: {
      contract: "A fenced block with the language in the info string and the file path as a comment on the first line — markdown fences carry no filename slot, and the path is the part a reader needs to go look. The caption follows as an italic paragraph. Gutter numbers are never emitted: they would make the block un-copyable.",
    },
  },
  {
    name: "Claim",
    group: "provenance",
    ambient: false,
    summary: "Inline provenance carried by the element itself — a graded claim whose tag travels with the sentence instead of sitting beside it as a chip.",
    notes:
      "Reserve, not ambient: a document writes `<Chip>`. This renders on the web and in markdown, but the evidence counter reads `<Chip>` and only `<Chip>`, so a claim graded this way is not counted and does not reach the JSON-LD.\n" +
      "\n" +
      "That gap is the reason it is held in reserve rather than offered to documents — a provenance construct the meter cannot see would let a report look better graded than it is, which is the one failure the meter exists to prevent.",
    props: [
      { name: "tag", type: "Tag" },
      { name: "source", type: "string", optional: true },
    ],
    md: {
      contract: "The tag as a chip — `[observed]` — exactly as `<Chip>` renders it; the sentence it grades is the surrounding prose.",
    },
  },
  {
    name: "EvidenceBar",
    group: "provenance",
    ambient: false,
    summary: "The provenance meter drawn from counts named on the element — the bar a consumer renders when it holds the numbers already, rather than deriving them from the prose.",
    notes: "Reserve, not ambient: a document writes `<Evidence>` and gets the counts taken from its own chips, which is the only version that cannot lie. This one takes them from whoever renders it, so it is for a host that has counted already — never for an author typing numbers in by hand.",
    props: [
      { name: "note", type: "string", optional: true },
    ],
    md: {
      contract:
        "The same drawn meter `<Evidence>` produces, from the counts named on the element rather than from the document — this is the bar a consumer renders when it has the numbers but not the prose.",
    },
  },
  {
    name: "Doc",
    group: "frame",
    ambient: false,
    summary: "The rail layout: masthead, rail, body. One of the three sanctioned arrangements (stack, rail, split) — \"a layout that needs a fourth is a layout that needs an argument first\".",
    notes: "Owns the break between the masthead and itself, because margins in this system run one direction only: down.",
    props: [],
    md: { drops: "the document frame belongs to the view, not to the document" },
  },
  {
    name: "DocHead",
    group: "frame",
    ambient: false,
    summary: "A document masthead: eyebrow, title, standfirst. Grid area \"head\".",
    props: [
      { name: "eyebrow", type: "string" },
      { name: "title", type: "string" },
      { name: "lede", type: "string", optional: true },
      { name: "oblique", type: "boolean", optional: true },
    ],
    md: { drops: "the markdown edition writes its own title block" },
  },
  {
    name: "Rail",
    group: "frame",
    ambient: false,
    summary: "The hanging metadata rail — a drawing's title block. Sticky on a wide screen; below 62rem it becomes a band between the masthead and the body, because a 400px index above the headline is how a reader on a phone never learns what they opened.",
    props: [],
    md: { drops: "furniture — the rail's blocks are already in the body" },
  },
  {
    name: "RailBlock",
    group: "frame",
    ambient: false,
    summary: "One key/value pair in the rail. `live` is the only one that earns orange.",
    props: [
      { name: "k", type: "string" },
      { name: "live", type: "boolean", optional: true },
    ],
    md: { drops: "furniture — the rail's blocks are already in the body" },
  },
  {
    name: "Toc",
    group: "frame",
    ambient: false,
    summary: "Contents, with scroll-spy. Renders nothing for a single section: an index of one is furniture, not navigation.",
    notes: "The spy script is scoped to this component, so every document that hangs a Toc gets the behaviour without four copies of the same listener.",
    props: [
      { name: "label", type: "string" },
      { name: "sections", type: "{ text: string; slug: string }[]" },
      { name: "start", type: "number", optional: true },
    ],
    md: { drops: "markdown readers index headings themselves" },
  },
  {
    name: "Deck",
    group: "frame",
    ambient: false,
    summary: "Channel: deck. The selection decides what is said; this decides how it looks; neither gets a vote on the other.",
    notes:
      "`select.ts` hands over slides as *layout names* rather than markup, which is the whole reason the two halves can live apart: the budget check (14 words) and the refusal to publish an empty selection happen back there, and by the time a slide reaches this file every editorial decision has already been made and checked.\n" +
      "\n" +
      "The consuming route owns the page — the shell, the `<head>`, whether the chrome is stripped. This owns the deck and nothing outside it.",
    props: [
      { name: "slides", type: "any[]" },
      { name: "rows", type: "EvidenceRowIn[]", optional: true },
      { name: "total", type: "number", optional: true },
      { name: "reportHref", type: "string" },
      { name: "eyebrow", type: "string", optional: true },
      { name: "lang", type: "string", optional: true },
    ],
    md: { drops: "the deck is a channel of its own; select.ts decides what is on it" },
  },];

const BY_NAME = new Map(DICTIONARY.map((e) => [e.name, e]));

/** Look a construct up by its exact name. */
export const lookup = (name: string): Entry | undefined => BY_NAME.get(name);

/** Every construct in a group, in dictionary order. */
export const inGroup = (group: Group): Entry[] =>
  DICTIONARY.filter((e) => e.group === group);

export const GROUPS: Group[] = [
  "provenance",
  "reference",
  "finding",
  "register",
  "plan",
  "prose",
  "narrative",
  "figure",
  "frame",
];

/**
 * The dictionary against the renderer it describes.
 *
 * Exported rather than left in the tests because the check is worth
 * running from the CLI: `esf dict --check` answers "has anything drifted?"
 * without a checkout of this package. It compares names only — whether
 * each channel keeps its promise is what the test suite is for.
 */
export function checkDictionary(): string[] {
  const problems: string[] = [];
  const named = new Set(DICTIONARY.map((e) => e.name));

  for (const name of CONSTRUCTS)
    if (!named.has(name)) problems.push(`${name} renders but has no dictionary entry`);
  for (const e of DICTIONARY)
    if (!CONSTRUCTS.includes(e.name)) problems.push(`${e.name} is in the dictionary but nothing renders it`);

  const ambient = new Set(AMBIENT);
  for (const e of DICTIONARY) {
    const isAmbient = e.ambient !== false;
    if (isAmbient && !ambient.has(e.name))
      problems.push(`${e.name} is documented as ambient but is not in the ambient namespace`);
    if (!isAmbient && ambient.has(e.name))
      problems.push(`${e.name} is ambient but the dictionary says otherwise`);
  }

  /* A `via` that names nothing is worse than no entry: it reads as
     "handled" while pointing at a construct that cannot handle it. */
  for (const e of DICTIONARY)
    if (e.md.via && !named.has(e.md.via))
      problems.push(`${e.name} is serialized via ${e.md.via}, which is not a construct`);

  if (DICTIONARY.length !== BY_NAME.size) problems.push("the dictionary has duplicate names");

  return problems;
}
