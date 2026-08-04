import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { documentOf, splitFrontmatter, validate, DocumentError } from "../document";
import { check, emit, findReport, load } from "../engagement";

const REPORT = `---
title: Solidus
subtitle: A framework without a driver
summary: An existing-system audit run entirely on public evidence.
kind: report
mode: existing-system audit
rev: 25
status: live
updated: 2026-08-03
framework: ESF v0.5
emits: [md, jsonld, deck, thread]
---

## The machine

Commits stopped four days ago <Chip kind="observed" />. Nobody owns it <Chip kind="assumed" />.

<Finding deck="Excellent machine. No driver." thread="Excellent machine, no driver." tag="observed">
Excellent machine. No driver.
</Finding>
`;

const GRAPH = `MERGE (n:\`risk\` {id:'R1'}) SET n.title = 'The steward leaves again', n.falsifier = 'a second maintainer merges';
MERGE (n:\`bet\` {id:'B1'}) SET n.title = 'Fund the admin migration';
MATCH (a {id:'B1'}), (b {id:'R1'}) MERGE (a)-[:ADDRESSES]->(b);
`;

async function engagement(report = REPORT, graph?: string) {
  const dir = await mkdtemp(join(tmpdir(), "esf-"));
  await writeFile(join(dir, "report.mdx"), report);
  if (graph) await writeFile(join(dir, "graph.cypher"), graph);
  return dir;
}

describe("front-matter", () => {
  it("splits and parses without a YAML block present", () => {
    const { data, body } = splitFrontmatter("no front-matter here");
    expect(data).toEqual({});
    expect(body).toBe("no front-matter here");
  });

  it("collects every problem at once rather than one per round-trip", () => {
    try {
      validate({ kind: "essay", rev: -1, emits: ["web", "carrier-pigeon"] });
      throw new Error("should have thrown");
    } catch (e) {
      const problems = (e as DocumentError).problems;
      expect(problems).toHaveLength(4); // title, kind, rev, emits
      expect(problems.join(" ")).toContain("carrier-pigeon");
    }
  });

  it("addresses an unpublished document local:, never a URL that would 404", () => {
    const { meta } = documentOf(REPORT, { slug: "solidus" });
    expect(meta.canonical).toBe("local:solidus");
    const published = documentOf(REPORT, { slug: "solidus", origin: "https://example.com" });
    expect(published.meta.canonical).toBe("https://example.com/reports/solidus/");
  });

  it("carries the framework's fields through to DocMeta", () => {
    const { meta, data } = documentOf(REPORT, { slug: "s" });
    expect(meta.revision).toBe(25);
    expect(meta.updated).toBe("2026-08-03");
    expect(data.mode).toBe("existing-system audit");
    expect(data.framework).toBe("ESF v0.5");
  });
});

describe("engagement", () => {
  it("finds the report, counts the claims and loads the graph beside it", async () => {
    const dir = await engagement(REPORT, GRAPH);
    const e = await load(dir);
    expect(e.facts.total).toBe(2);
    expect(e.graph?.nodes).toHaveLength(2);
    expect(e.graph?.edges).toHaveLength(1);
  });

  it("refuses to guess between two reports", async () => {
    const dir = await mkdtemp(join(tmpdir(), "esf-"));
    await writeFile(join(dir, "a.mdx"), REPORT);
    await writeFile(join(dir, "b.mdx"), REPORT);
    await expect(findReport(dir)).rejects.toThrow(/2 .mdx files/);
  });

  it("emits every offline channel from a bare directory", async () => {
    const dir = await engagement(REPORT, GRAPH);
    const written = await emit(dir);
    const names = written.map((p) => p.split("/").pop()).sort();
    expect(names).toEqual(["deck.json", "evidence.txt", "report.jsonld", "report.md", "thread.txt"]);

    const md = await readFile(join(dir, "out", "report.md"), "utf8");
    expect(md).toContain("Evidence Base — 2 tagged claims");
    expect(md).toContain("`[observed]`");

    /* The registers project from the graph, and the working-state
       properties never reach the public file. */
    const ld = JSON.parse(await readFile(join(dir, "out", "report.jsonld"), "utf8"));
    expect(ld["ns#register"]).toHaveLength(2);
    expect(ld["ns#edge"]).toHaveLength(1);
    expect(ld["ns#evidence"]["ns#total"]).toBe(2);
  });

  it("names the namespace local: until an origin is supplied", async () => {
    const dir = await engagement(REPORT, GRAPH);
    await emit(dir);
    let ld = JSON.parse(await readFile(join(dir, "out", "report.jsonld"), "utf8"));
    expect(ld["@context"][1].ns).toBe("local:/ns#");

    await emit(dir, { origin: "https://example.com", identity: { author: "A" } });
    ld = JSON.parse(await readFile(join(dir, "out", "report.jsonld"), "utf8"));
    expect(ld["@context"][1].ns).toBe("https://example.com/ns#");
    expect(ld.author.name).toBe("A");
  });
});

describe("check", () => {
  it("passes a sound report and reports the graph it found", async () => {
    const dir = await engagement(REPORT, GRAPH);
    const { problems } = await check(dir);
    expect(problems.filter((p) => p.level === "error")).toHaveLength(0);
  });

  /* The framework is explicit that an artefact-only report is biased low
     and has to say so. A validator that stayed quiet would help hide the
     thing the evidence meter exists to expose. */
  it("warns that a zero-[user] report is biased low", async () => {
    const dir = await engagement(REPORT, GRAPH);
    const { problems } = await check(dir);
    expect(problems.some((p) => p.level === "warning" && /biased low/.test(p.message))).toBe(true);
  });

  it("errors when a declared selection has nothing marked", async () => {
    const noMarks = REPORT.replace(
      /<Finding[^>]*>[\s\S]*?<\/Finding>/,
      "Excellent machine. No driver.",
    );
    const dir = await engagement(noMarks, GRAPH);
    const { problems } = await check(dir);
    expect(problems.some((p) => p.level === "error" && /no block is marked/.test(p.message))).toBe(true);
  });

  it("notices a missing graph — the WIP graph is default-on", async () => {
    const dir = await engagement(REPORT);
    const { problems } = await check(dir);
    expect(problems.some((p) => /no graph.cypher/.test(p.message))).toBe(true);
  });
});
