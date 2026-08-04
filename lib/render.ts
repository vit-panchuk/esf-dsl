/**
 * Channel: web, pdf, standalone — the deliverables you look at.
 *
 * Rendering is a function call. There is no subprocess, no scratch project
 * and no framework: a construct is a function from props to markup, the
 * document is assembled from the same tree every other channel reads, and
 * the only thing written is the output directory. That is what lets this
 * run from a read-only install and lets two renders proceed at once.
 *
 * The page shell is deliberately plain — no navigation, no branding, no
 * footer. A rendered report is the document, not a website with a document
 * in it. A consumer that has a site calls `renderDocument()` inside its
 * own layout and never comes here.
 */
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evidenceRows } from "./doc";
import { jsonld } from "./jsonld";
import { load } from "./engagement";
import { deck as deckHtml } from "./html";
import { DECK_SCRIPT, TOC_SCRIPT, renderDocument } from "./render-document";
import { deck as selectDeck } from "./select";
import { standalone } from "./standalone";
import { DSL, type Lang } from "./strings";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const THEME = join(PKG_ROOT, "styles", "theme-vit-panchuk.css");
const ESF_CSS = join(PKG_ROOT, "styles", "esf.css");

export interface RenderOptions {
  /** Where the HTML goes. Default `<dir>/out/html`. */
  out?: string;
  /** Read a specific file instead of searching the directory. */
  source?: string;
  /** A theme CSS file — one file defining the token contract. Defaults to
   *  the bundled vit-panchuk theme. */
  theme?: string;
  /** Also fold the report and its deck into single files. */
  standalone?: boolean;
  /** Canonical origin, for the standalone bundle's absolute links. */
  origin?: string;
  log?: (message: string) => void;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** The page shell. Assets are referenced relatively, so the folder opens
 *  from disk — a deliverable that only works served from a web root is not
 *  much of a deliverable. */
const page = (o: {
  title: string;
  description?: string;
  lang: string;
  body: string;
  script?: string;
  jsonLd?: unknown;
}) =>
  `<!doctype html>\n<html lang="${o.lang}">\n<head>\n` +
  `<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
  `<title>${o.title}</title>\n` +
  (o.description ? `<meta name="description" content="${o.description}">\n` : "") +
  /* The claims travel with the page for machine readers, the same way the
     .jsonld file carries them for anyone who asks for it directly. */
  (o.jsonLd ? `<script type="application/ld+json">${JSON.stringify(o.jsonLd)}</script>\n` : "") +
  `<link rel="stylesheet" href="assets/theme.css">\n` +
  `<link rel="stylesheet" href="assets/esf.css">\n` +
  `</head>\n<body>\n<div class="shell page">\n${o.body}\n</div>\n` +
  (o.script ? `<script type="module">\n${o.script}\n</script>\n` : "") +
  `</body>\n</html>\n`;

/**
 * Copy the two stylesheets and whatever they point at.
 *
 * The faces sit beside the theme that names them, so a custom theme brings
 * its own and nothing here needs to know which. They land flat in
 * `assets/`, so the url()s lose their directory on the way.
 */
async function copyAssets(theme: string, out: string) {
  const assets = join(out, "assets");
  await mkdir(assets, { recursive: true });
  await copyFile(theme, join(assets, "theme.css"));
  await copyFile(ESF_CSS, join(assets, "esf.css"));

  const css = (await readFile(theme, "utf8")) + (await readFile(ESF_CSS, "utf8"));
  const urls = new Set(
    [...css.matchAll(/url\(["']?([^)"']+)["']?\)/g)]
      .map((m) => m[1])
      .filter((u) => !/^(data:|https?:|\/\/)/.test(u)),
  );
  for (const rel of urls)
    for (const base of [dirname(theme), dirname(ESF_CSS)]) {
      const from = resolve(base, rel);
      if (existsSync(from)) {
        await copyFile(from, join(assets, basename(rel)));
        break;
      }
    }

  for (const f of ["theme.css", "esf.css"]) {
    const p = join(assets, f);
    await writeFile(
      p,
      (await readFile(p, "utf8")).replace(/url\((["']?)[^)"']*\/([^)"'/]+)\1\)/g, "url($2)"),
    );
  }
}

/**
 * Render an engagement to HTML. Returns the output directory: the report
 * is `index.html`, the deck — when the document publishes one —
 * `deck.html`.
 */
export async function render(dir: string, o: RenderOptions = {}): Promise<string> {
  const log = o.log ?? (() => {});
  const out = o.out ?? join(dir, "out", "html");
  const theme = o.theme ? resolve(o.theme) : THEME;
  if (!existsSync(theme)) throw new Error(`[esf] theme not found: ${theme}`);

  const e = await load(dir, { source: o.source, origin: o.origin });
  const lang = ((e.meta.lang as Lang) || "en") as Lang;

  await mkdir(out, { recursive: true });
  await copyAssets(theme, out);

  await writeFile(
    join(out, "index.html"),
    page({
      title: esc(e.data.title),
      description: e.data.summary ? esc(e.data.summary) : undefined,
      lang,
      body: renderDocument({ meta: e.meta, data: e.data, facts: e.facts, lang }),
      script: TOC_SCRIPT,
      jsonLd: e.meta.emits.includes("jsonld")
        ? jsonld(e.meta, e.facts.claims, {
            summary: e.data.summary,
            graph: e.graph,
            identity: { origin: o.origin ?? "local:", author: e.data.author ?? "" },
          })
        : undefined,
    }),
  );
  log("index.html");

  const slides = e.meta.emits.includes("deck") ? (selectDeck(e.meta, e.facts.blocks) ?? []) : [];
  if (slides.length) {
    await writeFile(
      join(out, "deck.html"),
      page({
        title: `${esc(e.data.title)} — deck`,
        lang,
        body: deckHtml({
          slides,
          rows: evidenceRows(e.facts).map((r) => ({ ...r, label: DSL[lang].tags[r.label] })),
          total: e.facts.total,
          reportHref: "./index.html",
          eyebrow: e.data.mode,
          lang,
        }),
        script: DECK_SCRIPT,
      }),
    );
    log(`deck.html (${slides.length} slides)`);
  }

  if (o.standalone) {
    const written = await standalone({
      dist: out,
      out: join(out, "standalone"),
      origin: o.origin ?? "local:",
      slugs: ["report"],
      routes: {
        reportPath: () => "/index.html",
        deckPath: () => "/deck.html",
        reportFile: () => "report.html",
        deckFile: () => "report-deck.html",
        reportSrc: () => "/index.html",
        deckSrc: () => "/deck.html",
      },
      log,
    });
    log(`${written.length} standalone file(s)`);
  }

  return out;
}
