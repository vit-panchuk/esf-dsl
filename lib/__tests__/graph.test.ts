import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { assertPublic, loadGraph, parseGraph, publicProjection, sanitizeGraph } from "../graph";
import { jsonld } from "../jsonld";
import type { DocMeta } from "../emit";

const SNIPPET = `
// ── increment test ──────────────────────────────
MERGE (n:\`risk\` {id:'R1'}) SET n.title = 'A risk with an escaped quote: don\\'t', n.status = 'open', n.file = 'nodes/R1.md', n.falsifier = 'A config landing';
MERGE (n:\`bet\` {id:'B2'}) SET n.title = 'A bet', n.status = 'open', n.verdict = 'Do', n.file = 'nodes/B2.md';
MERGE (n:\`source\` {id:'src-x'}) SET n.title = 'the checkout', n.uri = 'file:///Users/somebody/dev/checkout', n.mirror = 'https://example.com/tree/abc', n.recovered_from = 'session-transcript deadbeef', n.file = 'nodes/src-x.md';
MERGE (n:\`claim\` {id:'c001'}) SET n.title = 'a claim', n.status = 'settled', n.tag = 'observed', n.chips = 2, n.file = 'nodes/c001.md';
MERGE (n:\`section\` {id:'sec-01'}) SET n.title = 'Start Here', n.status = 'settled';
MATCH (a {id:'B2'}), (b {id:'R1'}) MERGE (a)-[:DERIVED_FROM]->(b);
MATCH (a {id:'c001'}), (b {id:'src-x'}) MERGE (a)-[:DERIVED_FROM]->(b);
// a status change lands as SET
MATCH (n {id:'R1'}) SET n.status = 'settled', n.flag = 'downgraded';
// and an edge can be withdrawn
MATCH (a {id:'c001'})-[r:DERIVED_FROM]->(b {id:'src-x'}) DELETE r;
`;

describe("parseGraph", () => {
  it("replays MERGE/SET, updates, edges and edge deletions", () => {
    const g = parseGraph(SNIPPET);
    expect(g.nodes).toHaveLength(5);
    const r1 = g.nodes.find((n) => n.id === "R1")!;
    expect(r1.type).toBe("risk");
    expect(r1.props.title).toContain("don't"); // \' unescaped
    expect(r1.props.status).toBe("settled"); // later SET wins
    expect(r1.props.flag).toBe("downgraded");
    const c = g.nodes.find((n) => n.id === "c001")!;
    expect(c.props.chips).toBe(2); // integers stay numbers
    expect(g.edges).toEqual([{ from: "B2", type: "DERIVED_FROM", to: "R1" }]); // deleted edge gone
  });
});

describe("sanitizeGraph", () => {
  const g = sanitizeGraph(parseGraph(SNIPPET));
  const src = g.nodes.find((n) => n.id === "src-x")!;

  it("drops working-state props and local uris, keeps the public mirror as the address", () => {
    expect(src.props.file).toBeUndefined();
    expect(src.props.recovered_from).toBeUndefined();
    expect(src.props.uri).toBe("https://example.com/tree/abc");
  });

  it("never lets local topology through, wherever it hides", () => {
    expect(() => assertPublic(JSON.stringify(g))).not.toThrow();
    expect(JSON.stringify(g)).not.toMatch(/file:\/\/|\/Users\//);
  });
});

describe("publicProjection", () => {
  const p = publicProjection(parseGraph(SNIPPET));

  it("keeps the register vocabulary and sources, drops claims and sections", () => {
    expect(p.nodes.map((n) => n.id).sort()).toEqual(["B2", "R1", "src-x"]);
  });

  it("keeps only edges between emitted nodes", () => {
    expect(p.edges).toEqual([{ from: "B2", type: "DERIVED_FROM", to: "R1" }]);
  });
});

describe("the real Solidus graph, end to end", () => {
  const graph = loadGraph("solidus");
  const available = existsSync("reports/solidus/graph.cypher");

  it.runIf(available)("loads and projects the expected registers", () => {
    const p = publicProjection(graph!);
    const byType = (t: string) => p.nodes.filter((n) => n.type === t).length;
    expect(byType("risk")).toBe(5);
    expect(byType("bet")).toBe(10);
    expect(byType("decision")).toBe(37);
    expect(byType("premortem")).toBe(5);
    expect(p.edges).toContainEqual({ from: "B2", type: "DERIVED_FROM", to: "R3" });
  });

  it.runIf(available)("emits JSON-LD with no local topology, transcript ids or node files", () => {
    const meta: DocMeta = {
      title: "t",
      kind: "report",
      updated: "2026-07-25",
      canonical: "https://example.com/reports/solidus/",
      emits: ["jsonld"],
    };
    const doc = jsonld(meta, [], {
      graph,
      /* A deliberately foreign identity: the sanitizer must hold for any
         publisher, not just this site's origin. */
      identity: { origin: "https://example.com", author: "A" },
    });
    const s = JSON.stringify(doc);
    expect(s).not.toMatch(/\/Users\/|file:\/\/|session-transcript|f8913827|esf-corpus|nodes\/[\w-]+\.md/);
    expect(s).toContain('"ns#register"');
    expect(s).toContain('"ns#edge"');
    // the audited checkout stays addressable through its public mirror
    expect(s).toContain("https://github.com/solidusio/solidus/tree/cdcdfaf");
  });
});
