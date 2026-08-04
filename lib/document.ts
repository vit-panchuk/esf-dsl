/**
 * A document, from a file — front-matter parsed, validated, and turned
 * into the `DocMeta` every channel reads.
 *
 * The schema lives here rather than in a consumer, because the consumer
 * this package is for is an agent mid-engagement with a directory and a
 * report in it — no content collections, no validation layer, no website.
 * Asking it to hand-assemble a `DocMeta` before it can count its own
 * claims is the kind of coupling that makes a tool go unused.
 *
 * These are the framework's fields, not any site's: the ones SKILL.md
 * makes a report carry.
 */
import { parse as parseYaml } from "yaml";
import type { Channel, DocMeta } from "./emit";

const CHANNELS = ["web", "pdf", "md", "jsonld", "deck", "thread", "social"] as const;
const MODES = [
  "existing-system audit",
  "greenfield initiative",
  "single decision",
  "mid-flight initiative",
] as const;

/** The framework's report front-matter. Everything optional except the
 *  two facts a document cannot be published without. */
export interface ReportData {
  title: string;
  subtitle?: string;
  /** What the report is about, when the title is a name. */
  subject?: string;
  summary?: string;
  kind: "report" | "note" | "page";
  mode?: (typeof MODES)[number];
  /** Living documents carry a revision; finished ones carry a date. */
  rev?: number;
  status?: "live" | "settled";
  published?: string;
  updated?: string;
  /** Which framework version the report was written against. Reports may
   *  legitimately trail the current one. */
  framework?: string;
  stakeholders?: "none reached" | "partial" | "full";
  emits: Channel[];
  tags?: string[];
  lang?: string;
  /** Only a published document has one; an engagement usually does not. */
  canonical?: string;
  author?: string;
}

export class DocumentError extends Error {
  constructor(readonly problems: string[], file?: string) {
    super(`${file ? file + ": " : ""}${problems.join("; ")}`);
    this.name = "DocumentError";
  }
}

/** Split `---\n…\n---` off the top. Returns the raw data and the body. */
export function splitFrontmatter(source: string): { data: Record<string, unknown>; body: string } {
  const m = source.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: source };
  const data = parseYaml(m[1]) ?? {};
  if (typeof data !== "object" || Array.isArray(data))
    throw new DocumentError(["front-matter is not a mapping"]);
  return { data: data as Record<string, unknown>, body: source.slice(m[0].length) };
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const asDate = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};

/**
 * Validate raw front-matter into `ReportData`. Collects every problem
 * rather than throwing on the first: an agent fixing a document wants the
 * whole list, not one round-trip per field.
 */
export function validate(raw: Record<string, unknown>, file?: string): ReportData {
  const p: string[] = [];

  if (!isStr(raw.title)) p.push("`title` is required");
  const kind = raw.kind ?? "report";
  if (!["report", "note", "page"].includes(kind as string))
    p.push("`kind` must be report, note or page");
  if (raw.mode !== undefined && !MODES.includes(raw.mode as any))
    p.push(`\`mode\` must be one of: ${MODES.join(", ")}`);
  if (raw.rev !== undefined && (typeof raw.rev !== "number" || raw.rev < 0))
    p.push("`rev` must be a non-negative number");
  if (raw.status !== undefined && !["live", "settled"].includes(raw.status as string))
    p.push("`status` must be live or settled");

  const emits = raw.emits ?? ["md", "jsonld"];
  if (!Array.isArray(emits)) p.push("`emits` must be a list of channels");
  else
    for (const c of emits)
      if (!CHANNELS.includes(c as any)) p.push(`\`emits\` has unknown channel "${c}"`);

  if (p.length) throw new DocumentError(p, file);

  return {
    title: raw.title as string,
    subtitle: isStr(raw.subtitle) ? raw.subtitle : undefined,
    subject: isStr(raw.subject) ? raw.subject : undefined,
    summary: isStr(raw.summary) ? raw.summary : undefined,
    kind: kind as ReportData["kind"],
    mode: raw.mode as ReportData["mode"],
    rev: raw.rev as number | undefined,
    status: raw.status as ReportData["status"],
    published: asDate(raw.published),
    updated: asDate(raw.updated),
    framework: isStr(raw.framework) ? raw.framework : undefined,
    stakeholders: raw.stakeholders as ReportData["stakeholders"],
    emits: emits as Channel[],
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : undefined,
    lang: isStr(raw.lang) ? raw.lang : undefined,
    canonical: isStr(raw.canonical) ? raw.canonical : undefined,
    author: isStr(raw.author) ? raw.author : undefined,
  };
}

export interface DocumentOptions {
  /** Used for the canonical URL when the front-matter has none. An
   *  engagement usually has no published address, so this is how one is
   *  supplied without editing the document. */
  origin?: string;
  /** The document's address under `origin`. Defaults to the slug. */
  slug?: string;
  /** For error messages. */
  file?: string;
}

/**
 * Parse a source file into everything the channels need.
 *
 * `canonical` is required by `DocMeta` because a rendering that cannot say
 * where it came from is a rendering somebody will paste without
 * attribution. An engagement that has no published address gets a
 * `local:` one, which is honest — it says "this has not been published"
 * rather than inventing a URL that will 404.
 */
export function documentOf(source: string, o: DocumentOptions = {}) {
  const { data: raw, body } = splitFrontmatter(source);
  const data = validate(raw, o.file);
  const slug = o.slug ?? "report";
  const canonical =
    data.canonical ??
    (o.origin
      ? `${o.origin.replace(/\/$/, "")}/reports/${slug}/`
      : `local:${slug}`);

  const meta: DocMeta = {
    title: data.title,
    subtitle: data.subtitle,
    kind: data.kind,
    revision: data.rev,
    updated: data.updated ?? data.published ?? new Date().toISOString().slice(0, 10),
    canonical,
    lang: data.lang ?? "en",
    emits: data.emits,
  };

  return { meta, data, body };
}
