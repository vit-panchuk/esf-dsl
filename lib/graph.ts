/**
 * The WIP graph, read at build time.
 *
 * An engagement's working state lives beside the repo as
 * `reports/<slug>/graph.cypher` — append-only openCypher, the canonical
 * serialization the ESF skill defines. This module replays the increments
 * into nodes and edges so the JSON-LD emit can derive the registers and
 * their cross-references from the graph instead of re-extracting them
 * from prose (the skill's stated end state for the pipeline).
 *
 * The published projection is SANITIZED. The graph is working memory and
 * legitimately records private topology — local checkout URIs, session
 * transcript identifiers, node-file paths. None of that may reach a
 * public emit:
 *
 *   - `file`, `recovered_from`, `body_restored` never leave the build;
 *   - a `uri` survives only when it is https?://; a dropped local uri
 *     falls back to the node's public `mirror` when one exists;
 *   - any remaining value that looks like local topology (file://,
 *     /Users/, ~/, a Windows drive) drops the whole property;
 *   - `assertPublic` is the belt-and-braces final check the tests and
 *     the emit both run over the serialized output.
 */
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

export interface GraphNode {
  id: string;
  type: string;
  props: Record<string, string | number | boolean>;
}
export interface GraphEdge {
  from: string;
  type: string;
  to: string;
}
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const unesc = (s: string) => s.replace(/\\(['\\])/g, "$1");

const parseProps = (setClause: string): Record<string, string | number | boolean> => {
  const props: Record<string, string | number | boolean> = {};
  for (const m of setClause.matchAll(/n\.([\w]+)\s*=\s*('(?:[^'\\]|\\.)*'|\d+|true|false)/g)) {
    const [, key, raw] = m;
    props[key] =
      raw === "true" ? true : raw === "false" ? false : raw.startsWith("'") ? unesc(raw.slice(1, -1)) : Number(raw);
  }
  return props;
};

/** Replay a graph.cypher file (the dialect the skill defines: one
 *  statement per line, MERGE/SET nodes, MATCH…MERGE edges, MATCH…SET
 *  updates, MATCH…DELETE edge removals, comments on their own line). */
export function parseGraph(cypher: string): Graph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const line of cypher.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("//")) continue;

    let m = s.match(/^MERGE \(n:`?([\w-]+)`? \{id:'((?:[^'\\]|\\.)*)'\}\) SET (.+);$/);
    if (m) {
      const id = unesc(m[2]);
      const existing = nodes.get(id);
      const props = parseProps(m[3]);
      if (existing) Object.assign(existing.props, props);
      else nodes.set(id, { id, type: m[1], props });
      continue;
    }

    m = s.match(/^MATCH \(n \{id:'((?:[^'\\]|\\.)*)'\}\) SET (.+);$/);
    if (m) {
      const n = nodes.get(unesc(m[1]));
      if (n) Object.assign(n.props, parseProps(m[2]));
      continue;
    }

    m = s.match(
      /^MATCH \(a \{id:'((?:[^'\\]|\\.)*)'\}\), \(b \{id:'((?:[^'\\]|\\.)*)'\}\) MERGE \(a\)-\[:([\w]+)\]->\(b\);$/,
    );
    if (m) {
      const e = { from: unesc(m[1]), type: m[3], to: unesc(m[2]) };
      if (!edges.some((x) => x.from === e.from && x.to === e.to && x.type === e.type)) edges.push(e);
      continue;
    }

    m = s.match(
      /^MATCH \(a \{id:'((?:[^'\\]|\\.)*)'\}\)-\[r:([\w]+)\]->\(b \{id:'((?:[^'\\]|\\.)*)'\}\) DELETE r;$/,
    );
    if (m) {
      const [, from, type, to] = m;
      const i = edges.findIndex((x) => x.from === unesc(from) && x.type === type && x.to === unesc(to));
      if (i >= 0) edges.splice(i, 1);
      continue;
    }
  }
  return { nodes: [...nodes.values()], edges };
}

/** Working-state properties that never leave the build. */
const PRIVATE_PROPS = new Set(["file", "recovered_from", "body_restored"]);
/** Anything that names local topology. */
const LOCAL = /file:\/\/|\/Users\/|(?:^|[\s'"(])~\/|[A-Za-z]:\\/;

const isPublicUrl = (v: unknown) => typeof v === "string" && /^https?:\/\//.test(v);

/** Strip everything a public emit must not carry. Pure — the graph on
 *  disk is untouched; only the projection is cleaned. */
export function sanitizeGraph(graph: Graph): Graph {
  const nodes = graph.nodes.map((n) => {
    const props: GraphNode["props"] = {};
    for (const [k, v] of Object.entries(n.props)) {
      if (PRIVATE_PROPS.has(k)) continue;
      if (k === "uri" && !isPublicUrl(v)) continue;
      if (typeof v === "string" && LOCAL.test(v)) continue;
      props[k] = v;
    }
    /* A source whose local uri was dropped stays addressable through its
       public mirror. */
    if (!props.uri && isPublicUrl(props.mirror)) props.uri = props.mirror;
    return { ...n, props };
  });
  return { nodes, edges: graph.edges };
}

/** The final gate: refuse to publish anything that still names local
 *  topology or a harness session. Throwing here fails the build — the
 *  correct outcome when the sanitizer misses a new leak shape. */
export function assertPublic(serialized: string): void {
  const leak = serialized.match(/file:\/\/|\/Users\/|[A-Za-z]:\\|session-transcript|\.jsonl/);
  if (leak) throw new Error(`[graph] sanitized emit still carries local topology: "${leak[0]}"`);
}

/** Node types that project into the published JSON-LD. Claims stay
 *  prose-derived (the chips are authoritative for the evidence meter);
 *  sections/data/report duplicate the page itself; everything below is
 *  the register vocabulary the report's item codes address. */
export const EMIT_TYPES = new Set([
  "risk",
  "debt",
  "credit",
  "strategy",
  "bet",
  "easy-win",
  "root-cause",
  "factor",
  "decision",
  "premortem",
  "option",
  "question",
  "source",
]);

/** The register projection: emit-typed nodes, sanitized, plus the edges
 *  that connect them to one another. */
export function publicProjection(graph: Graph): Graph {
  const g = sanitizeGraph(graph);
  const nodes = g.nodes.filter((n) => EMIT_TYPES.has(n.type));
  const ids = new Set(nodes.map((n) => n.id));
  return { nodes, edges: g.edges.filter((e) => ids.has(e.from) && ids.has(e.to)) };
}

/**
 * Where engagements keep their working graphs. This site puts them in
 * `reports/<slug>/graph.cypher` beside the checkout, which is the default
 * — but the skill drives the same pipeline from an engagement directory
 * that has nothing to do with this repo's layout, so the root is
 * configurable rather than assumed.
 *
 * Relative roots resolve against the working directory, so the default
 * behaves exactly as the hardcoded path it replaced.
 */
export const DEFAULT_ENGAGEMENT_ROOT = "reports";

/** Load an engagement's graph if one is kept beside the repo. */
export function loadGraph(slug: string, root: string = DEFAULT_ENGAGEMENT_ROOT): Graph | undefined {
  const path = join(isAbsolute(root) ? root : join(process.cwd(), root), slug, "graph.cypher");
  if (!existsSync(path)) return undefined;
  return parseGraph(readFileSync(path, "utf8"));
}

/** Load a graph from an explicit path — the engagement layout keeps it
 *  beside the report rather than under a slug directory. */
export function loadGraphFile(path: string): Graph | undefined {
  if (!existsSync(path)) return undefined;
  return parseGraph(readFileSync(path, "utf8"));
}
