#!/usr/bin/env node
/**
 * esf — the command line the engineering-strategy-framework skill drives.
 *
 * An agent mid-engagement has a folder, not a website. These commands take
 * that folder and answer the three questions worth asking of a report
 * before anyone reads it: what does it actually claim, does it hold
 * together, and what are the deliverables.
 *
 *   esf check <dir>    validate, and print the evidence meter
 *   esf emit  <dir>    write every offline deliverable to <dir>/out
 *   esf bar   <dir>    just the evidence meter, for pasting
 *   esf dict           what the language offers, and what each part promises
 *
 * None of this needs a browser or a build step — which is the point.
 * `render` adds HTML and slides, `pdf` adds a browser; everything an
 * engagement needs while it is still running is in the first three.
 *
 * `dict` is the odd one out: it needs no folder at all. An agent about to
 * write a report can ask the language what it has instead of guessing at a
 * construct and finding out at build time, and `--json` is there because
 * the caller is usually a program.
 */
import { check, emit, load } from "./lib/engagement";
import { render } from "./lib/render";
import { pdf } from "./lib/pdf";
import { evidenceRows } from "./lib/doc";
import { evidence as evidenceBlock } from "./lib/markdown";
import { DSL, type Lang } from "./lib/strings";
import { DocumentError } from "./lib/document";
import { createRequire } from "node:module";
import {
  DICTIONARY,
  GROUPS,
  checkDictionary,
  lookup,
  type Entry,
  type Group,
} from "./lib/dictionary";

/* The manifest, not a literal: a version in two places is a version that
   will disagree with itself. Resolved from this file rather than the
   working directory, so `esf` run inside an engagement reports its own
   version and not the engagement's. */
const VERSION: string = (() => {
  try {
    return createRequire(import.meta.url)("../package.json").version;
  } catch {
    /* Bundled beside package.json rather than under dist/. */
    try {
      return createRequire(import.meta.url)("./package.json").version;
    } catch {
      return "unknown";
    }
  }
})();

const USAGE = `esf — engineering-strategy-framework report tooling

usage:
  esf check <dir> [--origin URL]     validate the report; exit 1 on error
  esf emit  <dir> [--out DIR] [--origin URL] [--author NAME] [--slug NAME]
  esf render <dir> [--out DIR] [--standalone] [--origin URL] [--theme FILE]
  esf pdf   <html-dir> [--out DIR]   print a render to PDF (needs Playwright)
  esf bar   <dir>                    print the evidence meter
  esf --version                      print the version, for a preflight check
  esf dict  [Name] [--group G] [--json] [--check]
                                     the language: every construct, its
                                     props, and what it promises each channel

The directory holds report.mdx (or one .mdx) and optionally graph.cypher.
Without --origin the document is addressed local: — honest about being
unpublished, rather than inventing a URL that will 404.`;

const argv = process.argv.slice(2);
const cmd = argv[0];
const dir = argv.find((a, i) => i > 0 && !a.startsWith("--") && !argv[i - 1]?.startsWith("--")) ?? ".";
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const bar = (e: Awaited<ReturnType<typeof load>>) => {
  const t = DSL[(e.meta.lang ?? "en") as Lang] ?? DSL.en;
  return evidenceBlock(
    evidenceRows(e.facts).map((r) => ({
      ...r,
      label: t.tags[r.label as keyof typeof t.tags] ?? r.label,
      note: r.label === "user" && r.n === 0 ? t.md.nobodySpoke : undefined,
    })),
    `${t.evidenceHeading} — ${e.facts.total} ${t.taggedClaims(e.facts.total)}`,
  )
    .trim()
    .replace(/^```\n?|\n?```$/g, "");
};

/* Wrap prose, but never a sample block — the evidence meter's contract
   contains the drawing it is promising, and rewrapping it would corrupt
   the one thing that has to be copied exactly. */
const wrap = (text: string, width = 74, indent = "  ") =>
  text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      if (/^\s{2,}/.test(line)) return indent + line;
      const out: string[] = [];
      let cur = "";
      for (const word of line.split(/\s+/)) {
        if (cur && cur.length + word.length + 1 > width) {
          out.push(indent + cur);
          cur = word;
        } else cur = cur ? `${cur} ${word}` : word;
      }
      if (cur) out.push(indent + cur);
      return out.join("\n");
    })
    .join("\n");

const mdLine = (e: Entry) =>
  e.md.contract !== undefined
    ? e.md.contract
    : e.md.via !== undefined
      ? `serialized by <${e.md.via}> — it has no line of its own.`
      : e.md.plain !== undefined
        ? `no serializer: the words survive as written — ${e.md.plain}.`
        : `carries nothing — ${e.md.drops}.`;

function describe(e: Entry): string {
  const out: string[] = [];
  out.push(`${e.name} — ${e.group}${e.ambient === false ? "" : " · ambient"}`);
  out.push("");
  out.push(wrap(e.summary));
  if (e.notes) {
    out.push("");
    out.push(wrap(e.notes));
  }
  if (e.props.length) {
    out.push("", "props");
    const w = Math.max(...e.props.map((p) => p.name.length + (p.optional ? 1 : 0)));
    for (const p of e.props)
      out.push(`  ${(p.name + (p.optional ? "?" : "")).padEnd(w)}  ${p.type}`);
  }
  out.push("", "markdown");
  out.push(wrap(mdLine(e)));
  if (e.deck)
    out.push(
      "",
      "deck",
      wrap(
        e.deck === "exhibit"
          ? "A `deck` mark puts the data itself on a slide, headlined by the mark's rewrite."
          : "A `deck` mark on any entry puts the whole register on one slide, as a table.",
      ),
    );
  return out.join("\n");
}

function list(entries: Entry[]): string {
  const out: string[] = [];
  const w = Math.max(...entries.map((e) => e.name.length));
  for (const g of GROUPS) {
    const inG = entries.filter((e) => e.group === g);
    if (!inG.length) continue;
    out.push(g);
    for (const e of inG) {
      const one = e.summary.split("\n")[0];
      const room = 78 - w - 4;
      out.push(
        `  ${e.name.padEnd(w)}  ${one.length > room ? one.slice(0, room - 1).replace(/\s+\S*$/, "") + "…" : one}`,
      );
    }
    out.push("");
  }
  return out.join("\n").trimEnd();
}

try {
  switch (cmd) {
    case "check": {
      const { engagement, problems } = await check(dir, { origin: flag("origin") });
      console.log(bar(engagement));
      console.log();
      const errors = problems.filter((p) => p.level === "error");
      for (const p of problems) console.log(`${p.level === "error" ? "ERROR  " : "warning"}  ${p.message}`);
      if (!problems.length) console.log("ok — no problems found");
      console.log(
        `\n${engagement.slug} · ${engagement.data.kind}` +
          (engagement.data.rev !== undefined ? ` · rev ${engagement.data.rev}` : "") +
          ` · ${engagement.facts.total} tagged claims` +
          ` · graph ${engagement.graph ? `${engagement.graph.nodes.length} nodes` : "absent"}`,
      );
      process.exit(errors.length ? 1 : 0);
    }

    case "emit": {
      const written = await emit(dir, {
        out: flag("out"),
        origin: flag("origin"),
        slug: flag("slug"),
        identity: { origin: flag("origin"), author: flag("author") },
        log: (m) => console.log(`  ${m}`),
      });
      console.log(`\n${written.length} file(s) written.`);
      break;
    }

    case "render": {
      const out = await render(dir, {
        out: flag("out"),
        origin: flag("origin"),
        standalone: argv.includes("--standalone"),
        theme: flag("theme"),
        log: (m) => console.log(`  ${m}`),
      });
      console.log(`\nrendered → ${out}`);
      break;
    }

    case "pdf": {
      const written = await pdf(dir, { out: flag("out"), log: (m) => console.log(`  ${m}`) });
      console.log(`\n${written.length} PDF(s) written.`);
      break;
    }

    case "bar": {
      console.log(bar(await load(dir, { origin: flag("origin") })));
      break;
    }

    case "dict": {
      if (argv.includes("--check")) {
        const problems = checkDictionary();
        for (const p of problems) console.error(`  - ${p}`);
        console.log(
          problems.length
            ? `\n${problems.length} construct(s) have drifted from the dictionary.`
            : `${DICTIONARY.length} constructs, all accounted for.`,
        );
        process.exit(problems.length ? 1 : 0);
      }

      const group = flag("group") as Group | undefined;
      /* The name is the first bare word after `dict`, so `--group figure`
         and `--json` do not get mistaken for one. */
      const name = argv
        .slice(1)
        .find((a, i) => !a.startsWith("--") && !argv.slice(1)[i - 1]?.startsWith("--"));

      const selected = group
        ? DICTIONARY.filter((e) => e.group === group)
        : name
          ? [lookup(name)].filter((e): e is Entry => Boolean(e))
          : DICTIONARY;

      if (name && !group && !selected.length) {
        const near = DICTIONARY.map((e) => e.name).filter(
          (n) => n.toLowerCase().includes(name.toLowerCase()),
        );
        console.error(
          `esf: no construct named "${name}"` +
            (near.length ? `\n\ndid you mean: ${near.join(", ")}` : `\n\nesf dict  lists them all`),
        );
        process.exit(1);
      }
      if (group && !selected.length) {
        console.error(`esf: no such group "${group}"\n\ngroups: ${GROUPS.join(", ")}`);
        process.exit(1);
      }

      if (argv.includes("--json")) {
        console.log(JSON.stringify(selected.length === 1 && name ? selected[0] : selected, null, 2));
        break;
      }

      /* One construct asked for by name gets the whole entry; a set gets
         the index, because 51 full entries is not something anyone reads. */
      if (selected.length === 1 && name) console.log(describe(selected[0]));
      else {
        console.log(list(selected));
        console.log(
          `\n${selected.length} construct(s). \`esf dict <Name>\` for one, \`--json\` for all of it.`,
        );
      }
      break;
    }

    case "--version":
    case "-v":
      console.log(VERSION);
      break;

    case "--help":
    case "-h":
    case undefined:
      console.log(USAGE);
      break;

    default:
      console.error(`esf: unknown command "${cmd}"\n\n${USAGE}`);
      process.exit(2);
  }
} catch (err) {
  if (err instanceof DocumentError) {
    console.error("esf: the report's front-matter is not valid\n");
    for (const p of err.problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  /* Messages that already name themselves are printed as written — the
     Playwright guidance is a paragraph, not a one-liner to prefix. */
  const m = (err as Error).message;
  console.error(m.startsWith("[esf]") ? m : `esf: ${m}`);
  process.exit(1);
}
