/**
 * An engagement directory, in and out.
 *
 * This is the package's answer to the question the skill actually asks:
 * "I have a report and a graph in a folder — give me the deliverables."
 * No website, no content collections, no build step, no framework.
 *
 * The layout is the one SKILL.md already describes, because the graph was
 * always meant to live beside the report:
 *
 *     <engagement>/
 *       report.mdx        the document (or the only .mdx in the folder)
 *       graph.cypher      optional — the WIP graph
 *       nodes/            optional — working memory, never published
 *       out/              written here
 *
 * Everything below reads the report exactly once, because `analyse` does,
 * and every channel is derived from that one parse. Two channels can no
 * more disagree about what the document says than two views of the same
 * object can.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { analyse, evidenceRows, type DocFacts } from "./doc";
import { documentOf, type ReportData } from "./document";
import type { Channel, DocMeta } from "./emit";
import { loadGraphFile, type Graph } from "./graph";
import { jsonld, type Identity } from "./jsonld";
import { evidence as evidenceBlock } from "./markdown";
import { toMarkdownDoc } from "./render-md";
import { deck, thread } from "./select";
import { DSL, type Lang } from "./strings";

export interface Engagement {
  dir: string;
  /** The report file that was found. */
  source: string;
  slug: string;
  meta: DocMeta;
  data: ReportData;
  facts: DocFacts;
  graph?: Graph;
}

/** Find the report in a directory: `report.mdx` if present, else the only
 *  `.mdx` there. Ambiguity is an error rather than a guess — picking one
 *  of two reports silently is exactly the kind of helpfulness that costs
 *  an afternoon. */
export async function findReport(dir: string): Promise<string> {
  if (existsSync(join(dir, "report.mdx"))) return join(dir, "report.mdx");
  const mdx = (await readdir(dir)).filter((f) => f.endsWith(".mdx"));
  if (mdx.length === 1) return join(dir, mdx[0]);
  if (mdx.length === 0) throw new Error(`[esf] no .mdx report in ${dir}`);
  throw new Error(
    `[esf] ${mdx.length} .mdx files in ${dir} (${mdx.join(", ")}) — name one report.mdx, or pass it directly.`,
  );
}

export interface LoadOptions {
  /** Canonical origin, when the report has been or will be published. */
  origin?: string;
  /** Read a specific file instead of searching the directory. */
  source?: string;
  /** The document address, when it differs from the file name. */
  slug?: string;
}

/** Read an engagement: the report, its front-matter, its facts, its graph. */
export async function load(dir: string, o: LoadOptions = {}): Promise<Engagement> {
  const source = o.source ?? (await findReport(dir));
  const slug = o.slug ?? basename(source).replace(/\.mdx$/, "");
  const raw = await readFile(source, "utf8");
  const { meta, data, body } = documentOf(raw, { origin: o.origin, slug, file: source });
  return {
    dir,
    source,
    slug,
    meta,
    data,
    facts: analyse(body),
    /* The graph sits beside the report, not under a slug directory. */
    graph: loadGraphFile(join(dir, "graph.cypher")),
  };
}

export interface EmitOptions extends LoadOptions {
  /** Where the deliverables go. Default `<dir>/out`. */
  out?: string;
  /** Restrict to these channels. Default: whatever `emits:` declares,
   *  intersected with what can be produced without a renderer. */
  channels?: Channel[];
  /** For the JSON-LD `author` and vocabulary namespace. Falls back to the
   *  front-matter `author` and a `local:` namespace. */
  identity?: Partial<Identity>;
  log?: (message: string) => void;
}

/** The vocabulary namespace an unpublished engagement gets: honest about
 *  having no address, rather than inventing one that will 404. */
const originOf = (canonical: string) => {
  try {
    const u = new URL(canonical);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : "local:";
  } catch {
    return "local:";
  }
};

/** The channels this module produces without touching the filesystem for
 *  anything but the answer — no rendering, no assets. */
export const OFFLINE_CHANNELS: Channel[] = ["md", "jsonld", "thread", "deck"];

/**
 * Produce every offline deliverable an engagement declares.
 *
 * The deck comes out as JSON rather than slides: the *selection* is the
 * expensive, editorial part and it is fully determined here, while turning
 * it into HTML needs the component half. A consumer with a renderer feeds
 * this straight to `<Deck>`; a consumer without one still gets the answer
 * to "what would be on the slides", which is the part a human reviews.
 */
export async function emit(dir: string, o: EmitOptions = {}): Promise<string[]> {
  const e = await load(dir, o);
  const out = o.out ?? join(dir, "out");
  const log = o.log ?? (() => {});
  const lang = (e.meta.lang ?? "en") as Lang;
  const t = DSL[lang] ?? DSL.en;

  const wanted = (o.channels ?? e.meta.emits).filter((c) => OFFLINE_CHANNELS.includes(c));
  await mkdir(out, { recursive: true });
  const written: string[] = [];
  const put = async (name: string, body: string) => {
    const p = join(out, name);
    await writeFile(p, body);
    written.push(p);
    log(`${name} (${(body.length / 1024).toFixed(1)} KiB)`);
  };

  /* The evidence bar is not a channel — it is the trust meter the
     framework requires every report to open with, and an agent wants it
     on its own so it can be pasted into a terminal or a message. */
  await put(
    "evidence.txt",
    evidenceBlock(
      evidenceRows(e.facts).map((r) => ({
        ...r,
        label: t.tags[r.label as keyof typeof t.tags] ?? r.label,
        note: r.label === "user" && r.n === 0 ? t.md.nobodySpoke : undefined,
      })),
      `${t.evidenceHeading} — ${e.facts.total} ${t.taggedClaims(e.facts.total)}`,
    ).trim(),
  );

  if (wanted.includes("md")) await put(`${e.slug}.md`, toMarkdownDoc(e.facts.tree, e.facts, e.meta, lang));

  if (wanted.includes("jsonld"))
    await put(
      `${e.slug}.jsonld`,
      JSON.stringify(
        jsonld(e.meta, e.facts.claims, {
          summary: e.data.summary,
          graph: e.graph,
          identity: {
            origin: o.identity?.origin ?? originOf(e.meta.canonical),
            author: o.identity?.author ?? e.data.author ?? "",
          },
        }),
        null,
        2,
      ),
    );

  if (wanted.includes("thread")) {
    const posts = thread(e.meta, e.facts.blocks, { closing: "", tags: t.tags });
    if (posts?.length)
      await put(
        "thread.txt",
        posts.map((p) => `--- ${p.n}/${p.of}\n${p.text}`).join("\n\n") + "\n",
      );
  }

  if (wanted.includes("deck")) {
    const slides = deck(e.meta, e.facts.blocks);
    if (slides?.length) await put("deck.json", JSON.stringify(slides, null, 2) + "\n");
  }

  return written;
}

export interface CheckProblem {
  level: "error" | "warning";
  message: string;
}

/**
 * Validate a document without writing anything: front-matter, the
 * selection budgets, and the gaps the framework treats as findings in
 * their own right.
 *
 * A zero-`[user]` report is the one worth shouting about. The framework is
 * explicit that an artefact-only report is biased low and has to say so;
 * a tool that stayed quiet about it would be helping to hide the thing the
 * evidence meter exists to expose.
 */
export async function check(dir: string, o: LoadOptions = {}): Promise<{
  engagement: Engagement;
  problems: CheckProblem[];
}> {
  const problems: CheckProblem[] = [];
  const e = await load(dir, o);

  /* Run the selections for real rather than re-deriving their rules: the
     budget check and the refusal to publish an empty selection live inside
     deck() and thread(), and a validator that reimplemented them would
     eventually disagree with the thing it validates. */
  for (const run of [() => deck(e.meta, e.facts.blocks), () => thread(e.meta, e.facts.blocks, { closing: "", tags: DSL.en.tags })]) {
    try {
      run();
    } catch (err) {
      problems.push({ level: "error", message: (err as Error).message });
    }
  }

  if (e.facts.total === 0)
    problems.push({ level: "error", message: "no tagged claims — the evidence meter would be empty" });

  const counts = e.facts.counts;
  if (e.facts.total > 0 && (counts.user ?? 0) === 0)
    problems.push({
      level: "warning",
      message:
        "zero [user] claims — this report is biased low and must say so. Artefacts cannot tell you what a stakeholder would have.",
    });

  if (!e.data.summary) problems.push({ level: "warning", message: "no `summary` — the card and the abstract will be empty" });
  if (!e.data.framework)
    problems.push({ level: "warning", message: "no `framework` version — a report should say what it was written against" });
  if (e.data.kind === "report" && e.data.rev === undefined)
    problems.push({ level: "warning", message: "no `rev` — a living report carries a revision number" });
  if (!e.graph)
    problems.push({
      level: "warning",
      message: "no graph.cypher beside the report — the WIP graph is default-on in this framework",
    });

  return { engagement: e, problems };
}
