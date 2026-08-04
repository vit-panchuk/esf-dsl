import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyse } from "../doc";
import { documentOf } from "../document";
import { check, emit, load } from "../engagement";
import { assertPublic } from "../graph";
import { AMBIENT } from "../render-html";

/**
 * The smoke test: one fixture using every construct the language has,
 * proved to survive into every channel that can be produced offline.
 *
 * The failure this exists to catch is a quiet one. A construct can be
 * added, rendered beautifully on the web, and silently drop out of the
 * markdown or the JSON-LD — nothing errors, the document just says less
 * in one channel than in another. That is the exact drift the whole
 * one-source design is meant to prevent, so it is worth a test that fails
 * loudly the first time a new construct forgets a backend.
 */
const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../fixtures/foobar");
/* The vocabulary's roll-call comes from the emitter table itself, so this
   cannot drift from what the language actually defines. */
const ambientNames = () => AMBIENT;

const outDir = () => mkdtemp(join(tmpdir(), "esf-smoke-"));

describe("smoke: the fixture covers the language", () => {
  it("uses every construct the language defines", () => {
    const src = readFileSync(join(FIXTURE, "report.mdx"), "utf8");
    const missing = ambientNames().filter((n) => !new RegExp(`<${n}[\\s/>]`).test(src));
    expect(missing, `fixture is missing: ${missing.join(", ")}`).toEqual([]);
  });

  it("parses, and counts only the claims that are claims", async () => {
    const e = await load(FIXTURE);
    /* Five of the chips are inside <Table legend> and demonstrate the
       notation rather than grading anything. If the legend exclusion ever
       breaks, this number jumps to 12 and the meter starts lying. */
    expect(e.facts.total).toBe(7);
    expect(e.facts.counts.observed).toBe(3);
    expect(e.facts.counts.assumed).toBe(1);
  });

  it("validates clean, with the graph beside it", async () => {
    const { problems } = await check(FIXTURE);
    expect(problems.filter((p) => p.level === "error")).toEqual([]);
  });
});

describe("smoke: every channel carries the document", () => {
  it("markdown keeps the registers, the tags, the tables and the code", async () => {
    const out = await outDir();
    await emit(FIXTURE, { out });
    const md = await readFile(join(out, "report.md"), "utf8");

    /* The evidence meter, counted not authored. */
    expect(md).toContain("Evidence Base — 7 tagged claims");
    /* Provenance survives as content, in every channel. */
    expect(md).toContain("`[observed]`");
    expect(md).toContain("`[assumed]`");
    /* Registers rebuild as tables with their mandatory fields. */
    expect(md).toContain("R1");
    expect(md).toContain("a week of queue timings"); // the falsifier
    expect(md).toContain("~~Move ship day to Thursday.~~"); // struck, not deleted
    expect(md).toContain("Instrument the queue for one week"); // a bet
    expect(md).toContain("Log queue entry and exit timestamps"); // an easy win
    /* A chart is its table. */
    expect(md).toContain("| compile |");
    /* The code listing keeps its language and its file. */
    expect(md).toContain("```ts");
    expect(md).toContain("build.ts");
    /* Dialog keeps the silence — dropping it would edit the record. */
    expect(md).toContain("*no reply*");
  });

  it("json-ld projects the registers and edges, and leaks nothing", async () => {
    const out = await outDir();
    await emit(FIXTURE, { out });
    const raw = await readFile(join(out, "report.jsonld"), "utf8");
    const ld = JSON.parse(raw);

    expect(ld["ns#evidence"]["ns#total"]).toBe(7);
    expect(ld["ns#register"].length).toBeGreaterThan(10);
    expect(ld["ns#edge"].length).toBeGreaterThan(4);

    /* The working-state properties and the local checkout address are in
       the graph on purpose, so this is a real test of the sanitizer and
       not a tautology. */
    expect(raw).not.toMatch(/\/Users\/|file:\/\/|session-transcript|\.jsonl/);
    expect(() => assertPublic(raw)).not.toThrow();
    /* A dropped local uri falls back to the node's public mirror. */
    expect(raw).toContain("https://example.com/foobar/logs");
  });

  it("the thread and the deck carry only what was marked", async () => {
    const out = await outDir();
    await emit(FIXTURE, { out });

    const thread = await readFile(join(out, "thread.txt"), "utf8");
    expect(thread).toContain("Foobar ships every Tuesday");

    const slides = JSON.parse(await readFile(join(out, "deck.json"), "utf8"));
    const layouts = slides.map((s: any) => s.layout);
    expect(layouts).toContain("title");
    expect(layouts).toContain("finding");
    /* The <Table deck="…"> mark becomes an exhibit carrying its own data. */
    const exhibit = slides.find((s: any) => s.layout === "exhibit");
    expect(exhibit.exhibit.component).toBe("Table");
    expect(exhibit.exhibit.table.rows.flat().join(" ")).toContain("compile");
  });

  it("the evidence meter is a bar anyone can paste into a terminal", async () => {
    const out = await outDir();
    await emit(FIXTURE, { out });
    const bar = await readFile(join(out, "evidence.txt"), "utf8");
    expect(bar).toContain("█");
    expect(bar).toContain("[observed]");
    expect(bar).toContain("[assumed]");
  });
});

describe("smoke: the front-matter is the framework's", () => {
  it("carries mode, revision, framework version and stakeholder reach", () => {
    const { meta, data } = documentOf(readFileSync(join(FIXTURE, "report.mdx"), "utf8"), {
      slug: "foobar",
    });
    expect(data.mode).toBe("existing-system audit");
    expect(data.framework).toBe("ESF v0.7");
    expect(data.stakeholders).toBe("partial");
    expect(meta.revision).toBe(3);
    expect(meta.emits).toContain("deck");
  });

  it("keeps the legend out of the count no matter how the chips are written", () => {
    const withLegend = analyse(`
<Table legend>
| <Chip kind="observed" /> | demo |
</Table>

A real claim <Chip kind="observed" />.
`);
    expect(withLegend.total).toBe(1);
  });
});
