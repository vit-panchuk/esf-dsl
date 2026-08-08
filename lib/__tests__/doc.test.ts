import { describe, expect, it } from "vitest";
import { analyse, evidenceRows } from "../doc";

/**
 * The evidence meter is the site's central honesty claim: it is COUNTED from
 * the prose, never authored. These tests are what stop that claim rotting.
 */
describe("evidence counting", () => {
  it("counts a chip per kind and never invents one", () => {
    const f = analyse(`
Text one <Chip kind="observed" />. Text two <Chip kind="observed" />.
Text three <Chip kind="assumed" />.
`);
    expect(f.counts.observed).toBe(2);
    expect(f.counts.assumed).toBe(1);
    expect(f.counts.web).toBe(0);
    expect(f.total).toBe(3);
  });

  it("defaults a chip with no kind to observed, matching the component", () => {
    const f = analyse(`A claim <Chip />.`);
    expect(f.counts.observed).toBe(1);
  });

  it("attaches each claim to the sentence it grades", () => {
    const f = analyse(`The build fails on deprecations <Chip kind="observed" />.`);
    expect(f.claims).toHaveLength(1);
    expect(f.claims[0].text).toContain("The build fails on deprecations");
    expect(f.claims[0].tag).toBe("observed");
  });

  it("gives two chips in one paragraph their own segments, not the whole paragraph", () => {
    const f = analyse(`CI is green <Chip kind="observed" />. Spree shipped seven releases <Chip kind="web" />.`);
    expect(f.claims[0].text).toBe("CI is green");
    expect(f.claims[1].text).toBe("Spree shipped seven releases");
  });

  it("a double-graded sentence shares its text — that duplication is the content", () => {
    const f = analyse(`Nebulab went from 60% to 1% <Chip kind="observed" /><Chip kind="web" />.`);
    expect(f.claims).toHaveLength(2);
    expect(f.claims[0].text).toBe("Nebulab went from 60% to 1%");
    expect(f.claims[1].text).toBe(f.claims[0].text);
  });

  it("a JSX container is its own scope — an <Event>'s chip never sees its neighbours", () => {
    const f = analyse(`
<Timeline>
  <Event when="2015">Solidus is born <Chip kind="web" />.</Event>
  <Event when="2024">Nebulab collapses <Chip kind="observed" />.</Event>
</Timeline>
`);
    expect(f.claims).toHaveLength(2);
    expect(f.claims[0].text).toBe("Solidus is born");
    expect(f.claims[1].text).toBe("Nebulab collapses");
  });

  it("inline formatting is transparent to the sentence a chip grades", () => {
    const f = analyse(`**The engineering is good.** Four combinations run *in CI* <Chip kind="observed" />.`);
    expect(f.claims[0].text).toBe("The engineering is good. Four combinations run in CI");
  });

  it("rounds percentages so they still sum to 100", () => {
    const f = analyse(`
<Chip kind="observed" /><Chip kind="observed" /><Chip kind="observed" />
<Chip kind="web" /><Chip kind="inferred" /><Chip kind="assumed" />
`);
    const rows = evidenceRows(f);
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBe(100);
  });

  it("reports zero rows rather than omitting them — the zero is the finding", () => {
    const rows = evidenceRows(analyse(`<Chip kind="observed" />`));
    expect(rows).toHaveLength(5);
    expect(rows.find((r) => r.label === "user")?.n).toBe(0);
  });

  it("omits announced legend chips — they demonstrate a tag, they grade nothing", () => {
    const f = analyse(`
<table>
  <tbody>
    <tr><td><Chip kind="observed" legend /></td><td>Seen directly in the system.</td></tr>
    <tr><td><Chip kind="assumed" legend /></td><td>Neither checked nor verified.</td></tr>
  </tbody>
</table>

A real claim <Chip kind="observed" />.
`);
    expect(f.total).toBe(1);
    expect(f.counts.assumed).toBe(0);
    expect(f.claims).toHaveLength(1);
    expect(f.claims[0].text).toContain("A real claim");
  });

  it("omits every chip inside <Table legend> — the table announces once, no per-chip attrs", () => {
    const f = analyse(`
<Table legend>
  <tbody>
    <tr><td><Chip kind="observed" /></td><td>Seen directly in the system.</td></tr>
    <tr><td><Chip kind="user" /></td><td>Stated by a stakeholder.</td></tr>
    <tr><td><Chip kind="assumed" /></td><td>Neither checked nor verified.</td></tr>
  </tbody>
</Table>

A real claim <Chip kind="observed" />.
`);
    expect(f.total).toBe(1);
    expect(f.counts.user).toBe(0);
    expect(f.counts.assumed).toBe(0);
    expect(f.claims).toHaveLength(1);
    expect(f.claims[0].text).toContain("A real claim");
  });

  it("still counts chips inside a plain <Table> — legend is announced, never inferred", () => {
    const f = analyse(`
<Table>
  <tbody>
    <tr><td>A tabulated claim <Chip kind="web" /></td></tr>
  </tbody>
</Table>
`);
    expect(f.total).toBe(1);
    expect(f.counts.web).toBe(1);
  });
});

describe("selection marks", () => {
  it("collects only Findings that opted into a channel, in document order", () => {
    const f = analyse(`
<Finding deck thread>First.</Finding>
<Finding>Unmarked — carries no channel.</Finding>
<Finding deck="Rewritten for the room">Second.</Finding>
`);
    expect(f.blocks).toHaveLength(2);
    expect(f.blocks[0].text).toBe("First.");
    expect(f.blocks[0].deck).toBe(true);
    expect(f.blocks[1].deck).toBe("Rewritten for the room");
    expect(f.blocks[1].thread).toBeUndefined();
  });
});

describe("headings", () => {
  it("slugs headings so the contents rail can link them", () => {
    const f = analyse(`## What actually expired\n\nBody.`);
    expect(f.headings[0]).toMatchObject({ depth: 2, slug: "what-actually-expired" });
  });

  it("keeps Cyrillic in slugs so the Ukrainian edition links too", () => {
    const f = analyse(`## Що саме протухло\n\nТекст.`);
    expect(f.headings[0].slug).toBe("що-саме-протухло");
  });
});

/**
 * A <Listing>'s template-literal child is the one expression a document
 * writes — it protects `#` lines from parsing as headings. It must render
 * as its text and highlight; the default unknown-node handler would leak
 * the expression source, backticks and all, which is exactly the
 * regression this pins down.
 */
describe("listing expressions", () => {
  it("renders a template-literal child as text, highlighted — never as its own source", async () => {
    const { toHtmlDoc } = await import("../render-html");
    const f = analyse(
      '<Listing lang="sh" file="action.yml">\n{`# a comment\nmkdir -p app/assets`}\n</Listing>',
    );
    const html = toHtmlDoc(f.tree as any);
    expect(html).not.toContain("`# a comment");
    expect(html).toContain("hljs-comment");
    /* Tokenized, so the command sits inside a span — the assertion checks
       both halves rather than the contiguous string. */
    expect(html).toContain("hljs-built_in");
    expect(html).toContain("-p app/assets");
  });

  it("renders an interpolating expression as nothing rather than as source", async () => {
    const { toHtmlDoc } = await import("../render-html");
    const f = analyse("A paragraph.\n\n{`before ${1 + 1} after`}\n");
    const html = toHtmlDoc(f.tree as any);
    expect(html).not.toContain("${");
    expect(html).not.toContain("before");
  });
});

/**
 * Policies are the decided layer, and the deck treats them that way: a
 * deck-marked <Policy> becomes its own detailed slide, never a summary
 * table row. These tests pin the card's whole journey — extraction,
 * selection, and the statement doubling as the budget-checked headline.
 */
describe("policy cards", () => {
  const POLICY = `
## Policies & Operations

<Policy
  id="PL1"
  title="Every replacement names the release that removes what it replaces"
  kind="direction"
  state="proposed"
  acceptedBy="Core Team (proposed)"
  executedBy="release checklist"
  review="2027-02-08"
  deck
>
The rationale digest, with a code <Ref id="RC1" href="#rc1" memo="the root cause" /> inline.
<Fragment slot="addresses"><Ref id="RC1" href="#rc1" memo="the root cause" />, <Ref id="D1" href="#d1" memo="the debt" /></Fragment>
<Fragment slot="relation">amends <Ref id="S3" href="#s3" memo="the strategy row" /></Fragment>
<Fragment slot="operations">an exit-criteria line in the release notes</Fragment>
</Policy>
`;

  it("carries a deck-marked policy whole — props, slots and digest", () => {
    const f = analyse(POLICY);
    expect(f.blocks).toHaveLength(1);
    const b = f.blocks[0];
    expect(b.component).toBe("Policy");
    expect(b.text).toBe("Every replacement names the release that removes what it replaces");
    expect(b.policy).toMatchObject({
      id: "PL1",
      kind: "direction",
      state: "proposed",
      acceptedBy: "Core Team (proposed)",
      review: "2027-02-08",
    });
    /* On a slide a bare code means nothing to the room, so every Ref
       travels with its memo, expanded inline. */
    expect(b.policy?.addresses).toBe("RC1 (the root cause), D1 (the debt)");
    expect(b.policy?.relation).toBe("amends S3 (the strategy row)");
    expect(b.policy?.operations).toBe("an exit-criteria line in the release notes");
    expect(b.policy?.digest).toContain("RC1 (the root cause) inline");
    expect(b.policy?.digest).not.toContain("amends");
  });

  it("defaults the state to proposed — an emitter must not manufacture a mandate", () => {
    const f = analyse(`<Policy id="PL9" title="Short rule" deck>Body.</Policy>`);
    expect(f.blocks[0].policy?.state).toBe("proposed");
  });

  it("leaves an unmarked policy out of the selection", () => {
    const f = analyse(`<Policy id="PL2" title="Unmarked rule">Body.</Policy>`);
    expect(f.blocks).toHaveLength(0);
  });

  it("becomes its own slide, with the digest as the speaker note", async () => {
    const { deck } = await import("../select");
    const f = analyse(POLICY);
    const slides = deck({ title: "T", emits: ["deck"] } as any, f.blocks);
    expect(slides).not.toBeNull();
    const policySlides = slides!.filter((s) => s.layout === "policy");
    expect(policySlides).toHaveLength(1);
    expect(policySlides[0].text).toBe(
      "Every replacement names the release that removes what it replaces",
    );
    expect(policySlides[0].policy?.id).toBe("PL1");
    expect(policySlides[0].note).toContain("rationale digest");
  });

  it("still budget-checks the headline — a long statement needs a rewrite", async () => {
    const { deck } = await import("../select");
    const long = Array.from({ length: 16 }, (_, i) => `word${i}`).join(" ");
    const f = analyse(`<Policy id="PL8" title="${long}" deck>Body.</Policy>`);
    expect(() => deck({ title: "T", emits: ["deck"] } as any, f.blocks)).toThrow(/16 words/);
  });
});
