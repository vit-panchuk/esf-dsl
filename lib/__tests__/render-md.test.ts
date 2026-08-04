import { describe, expect, it } from "vitest";
import { analyse } from "../doc";
import { toMarkdownDoc } from "../render-md";
import type { DocMeta } from "../emit";

const meta: DocMeta = {
  title: "T",
  kind: "report",
  updated: "2026-07-27",
  canonical: "https://vit-panchuk.com/reports/t/",
  emits: ["md"],
};

const render = (body: string) => {
  const f = analyse(body);
  return toMarkdownDoc(f.tree, f, meta);
};

describe("md channel — charts become their tables", () => {
  it("Bars keeps values, ranges and the assumed mark", () => {
    const out = render(`<Bars title="Commits" rows={[
      { label: "tvdeyen", v: 100, value: "412" },
      { label: "unattributed", v: 8, value: "33+", to: 22, assumed: true },
    ]} />`);
    expect(out).toContain("| tvdeyen | 412 |");
    expect(out).toContain("33+–22");
    expect(out).toContain("`[assumed]`");
  });

  it("Cols and Donut round-trip their numbers", () => {
    const out = render(`<Cols title="Per year" cols={[
      { label: "2023", n: 1810, v: 100 },
      { label: "2026", n: "~520", v: 29, assumed: true },
    ]} />

<Donut title="Provenance" parts={[
  { label: "observed", pct: 69 },
  { label: "assumed", pct: 3, signal: true },
]} />`);
    expect(out).toContain("| 2023 | 1810 |");
    expect(out).toContain("| observed | 69% |");
    expect(out).toContain("**Provenance**");
  });

  it("LinePlot leaves a visible trace, never a hole", () => {
    const out = render(`<LinePlot title="Maintainers" caption="Fell from 9 to 4." series={[{ points: "0,0 1,1" }]} />`);
    expect(out).toContain("**Maintainers**");
    expect(out).toContain("*[line chart");
    expect(out).toContain("Fell from 9 to 4.");
  });

  it("refuses a dynamic prop instead of dropping it silently", () => {
    expect(() => render(`<Bars rows={someVariable} />`)).toThrow(/dynamic prop/);
  });
});

describe("md channel — narrative components", () => {
  it("Timeline serializes its Events, gaps included", () => {
    const out = render(`<Timeline>
  <Event when="2023-05">New admin started</Event>
  <Event when="gap" gap>No releases, Oct 23 – Mar 24</Event>
  <Event when="2026-06" open>Storefront added</Event>
</Timeline>`);
    expect(out).toContain("- **2023-05** — New admin started");
    expect(out).toContain("- **gap** — No releases");
    expect(out).toContain("(ongoing)");
  });

  it("Dialog keeps every turn, the silence, and the author's gloss outside the quotes", () => {
    const out = render(`<Dialog>
  <Turn who="forkata" when="2026-06-30">I am thinking of taking a stab.</Turn>
  <DialogNote>Three weeks pass.</DialogNote>
  <Turn who="tvdeyen" silence />
</Dialog>`);
    expect(out).toContain('> **forkata** · 2026-06-30');
    expect(out).toContain('"I am thinking of taking a stab."');
    expect(out).toContain("\nThree weeks pass.");
    expect(out).toContain("*no reply*");
  });

  it("Sources numbers its items and a footnote points at them", () => {
    const out = render(`Looked in the wrong place<Fn n={1} href="#src-1" />.

<Sources>
  <li id="src-1">Repository history.</li>
  <li>Release notes.</li>
</Sources>`);
    expect(out).toContain("[1]");
    expect(out).toContain("1. Repository history.");
    expect(out).toContain("2. Release notes.");
  });
});

describe("md channel — the reserve vocabulary", () => {
  it("Decision strikes the superseded text but keeps it", () => {
    const out = render(`<Decision id="D-07" status="superseded" rev={11} was="Rank the absent policy top risk.">
  Withdrawn — the policy exists.
</Decision>`);
    expect(out).toContain("**D-07 · rev. 11 · superseded**");
    expect(out).toContain("~~Rank the absent policy top risk.~~");
    expect(out).toContain("Withdrawn — the policy exists.");
  });

  it("Risk always prints its falsifier", () => {
    const out = render(`<Risk id="R1" title="Fork cost" falsifier="A meta-gem naming only the new engines.">
  Two implementations per release.
</Risk>`);
    expect(out).toContain("**R1 — Fork cost**");
    expect(out).toContain("What would change my mind: A meta-gem naming only the new engines.");
  });

  it("EasyWin rows keep the machine mapping the gate requires", () => {
    const out = render(`<EasyWins>
  <EasyWin id="E1" feeds="dependency hygiene" day="~0.5 agent-day">Turn on Renovate</EasyWin>
  <EasyWin id="E2" feeds="agent harness" status="ejected">Coverage backfill blew its day — became D4</EasyWin>
</EasyWins>`);
    expect(out).toContain("Feeds the machine");
    expect(out).toContain("| E1 | Turn on Renovate | dependency hygiene | ~0.5 agent-day | — |");
    expect(out).toContain("| E2 | Coverage backfill blew its day — became D4 | agent harness | ≤ a day | ejected |");
  });

  it("EvidenceBar draws the meter with the zero row intact", () => {
    const out = render(`<EvidenceBar observed={3} assumed={1} note="nobody spoke" />`);
    expect(out).toContain("[stakeholder]");
    expect(out).toContain("nobody spoke");
    expect(out).toContain("75%");
  });

  it("Takeaway reads as a quote; Spark and Skeleton vanish without a hole", () => {
    const out = render(`<Takeaway>
  Excellent machine. No driver.
</Takeaway>

Flat <Spark points="0,8 60,7" /> across the year.`);
    expect(out).toContain("> Excellent machine. No driver.");
    expect(out).toContain("Flat  across the year.");
  });
});

describe("md channel — diagrams serialize to their source language", () => {
  it("a Wardley spec becomes OWM text", () => {
    const out = render(`<Diagram title="Value chain" spec={{
      kind: "wardley",
      nodes: [{ label: "Buyer trust", visibility: 0.92, evolution: 0.3 }],
      links: [["Buyer trust", "The public report"]],
    }} />`);
    expect(out).toContain("```wardley");
    expect(out).toContain("component Buyer trust [0.92, 0.3]");
    expect(out).toContain("Buyer trust->The public report");
  });
});
