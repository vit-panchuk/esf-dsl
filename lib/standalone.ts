/**
 * Channel: standalone. A built report, folded into one file that opens from
 * disk with no server and no network.
 *
 * This is the channel for handing a report to somebody — an email
 * attachment, a shared drive, a USB stick in a room with no wifi. The
 * stylesheet is inlined, the fonts become data URIs inside it, the scripts
 * come along, and the report and its deck cross-link to each other so the
 * pair travels as a pair. Every other root-relative link is rewritten
 * absolute against the canonical origin, so navigation degrades to the live
 * site instead of a broken file path.
 *
 * It runs over a *built* site rather than a source tree, which makes it a
 * post-build step rather than part of the pipeline — and means it cannot
 * disagree with the web rendering, because it is the web rendering.
 *
 * Node's fs, not Bun's: the rest of the core runs anywhere, and there is no
 * reason this should be the one file that pins a runtime.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export interface StandaloneOptions {
  /** Root of the built site. */
  dist: string;
  /** Output directory. Default: `<dist>/standalone`. */
  out?: string;
  /** Canonical origin. Every root-relative link that is not part of the
   *  pair is rewritten against it, so a reader who clicks through lands on
   *  the live site rather than a missing file. */
  origin: string;
  /** Which reports to bundle. Default: every directory under
   *  `<dist>/reports`. */
  slugs?: string[];
  /**
   * Markup the consuming site wraps a report in, removed before bundling.
   *
   * The DSL cannot know what your masthead looks like, and a standalone
   * file is the document rather than the site — the reader was handed this
   * file directly, so the navigation around it is noise. Defaults to
   * removing nothing, which is the only safe assumption a language can
   * make about a site it has never seen.
   */
  strip?: RegExp[];
  /** Where a report and its deck live in the build, and what the bundled
   *  files are called. Defaults match the conventional `/reports/<slug>/`
   *  layout. */
  routes?: {
    /** URL paths, as the built HTML links to them — used to re-point the
     *  pair at each other so they travel together. */
    reportPath?: (slug: string) => string;
    deckPath?: (slug: string) => string;
    /** What the bundled files are called. */
    reportFile?: (slug: string) => string;
    deckFile?: (slug: string) => string;
    /** Where the built HTML actually sits, relative to `dist`. Defaults to
     *  `<path>/index.html`, which is the directory convention — a build
     *  emitting `index.html` and `deck.html` side by side instead has to
     *  say so. */
    reportSrc?: (slug: string) => string;
    deckSrc?: (slug: string) => string;
  };
  log?: (message: string) => void;
}

const MIME: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};
const mimeOf = (path: string) =>
  MIME[path.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

const DEFAULTS = {
  reportPath: (slug: string) => `/reports/${slug}/`,
  deckPath: (slug: string) => `/reports/${slug}/deck/`,
  reportFile: (slug: string) => `${slug}.html`,
  deckFile: (slug: string) => `${slug}-deck.html`,
  reportSrc: (slug: string) => `/reports/${slug}/index.html`,
  deckSrc: (slug: string) => `/reports/${slug}/deck/index.html`,
};

/** Inline the stylesheet (fonts become data URIs inside it) and scripts. */
async function inline(html: string, dist: string): Promise<string> {
  const dataUri = async (path: string, mime: string) =>
    `data:${mime};base64,${(await readFile(join(dist, path))).toString("base64")}`;

  for (const [tag, href] of [
    ...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g),
  ].map((m) => [m[0], m[1]] as const)) {
    let css = await readFile(join(dist, href), "utf8");
    /* Both shapes of url() have to be understood. A site served from a root
       emits `/assets/face.woff2`; a folder meant to be opened from disk
       emits `face.woff2`, relative to the stylesheet. Matching only the
       first is how the faces silently stopped being inlined the moment the
       renderer started producing portable output. */
    for (const url of new Set(
      [...css.matchAll(/url\(["']?([^)"']+)["']?\)/g)]
        .map((m) => m[1])
        .filter((u) => !/^(data:|https?:|\/\/)/.test(u)),
    )) {
      const from = url.startsWith("/") ? url : join(dirname(href), url);
      css = css.replaceAll(`url(${url})`, `url(${await dataUri(from, mimeOf(url))})`);
    }
    html = html.replace(tag, `<style>${css}</style>`);
  }

  for (const [tag, src] of [
    ...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g),
  ].map((m) => [m[0], m[1]] as const)) {
    html = html.replace(tag, `<script type="module">${await readFile(join(dist, src), "utf8")}</script>`);
  }

  /* The favicon survives as a data URI; every other icon or feed link is
     resolved absolute below like any other root-relative href. */
  const favicon = html.match(/<link rel="icon" href="(\/[^"]+\.svg)" type="image\/svg\+xml">/);
  if (favicon && existsSync(join(dist, favicon[1])))
    html = html.replace(
      favicon[0],
      `<link rel="icon" href="${await dataUri(favicon[1], "image/svg+xml")}" type="image/svg+xml">`,
    );
  return html;
}

/** Pair links stay local; everything else root-relative goes absolute. */
const relink = (
  html: string,
  slug: string,
  origin: string,
  r: Required<NonNullable<StandaloneOptions["routes"]>>,
) =>
  html
    .replaceAll(`href="${r.deckPath(slug)}"`, `href="${r.deckFile(slug)}"`)
    .replace(
      new RegExp(`href="${r.reportPath(slug).replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&")}(#[^"]+)?"`, "g"),
      (_, frag) => `href="${r.reportFile(slug)}${frag ?? ""}"`,
    )
    .replace(/(href|src)="\/([^"]*)"/g, (_, attr, rest) => `${attr}="${origin}/${rest}"`);

/**
 * Bundle each report and its deck into `<out>`. Returns the paths written.
 */
export async function standalone(o: StandaloneOptions): Promise<string[]> {
  const dist = o.dist;
  const out = o.out ?? join(dist, "standalone");
  const routes = { ...DEFAULTS, ...(o.routes ?? {}) };
  const strip = o.strip ?? [];
  const log = o.log ?? (() => {});

  if (!existsSync(dist)) throw new Error(`[standalone] ${dist} not found — build first.`);

  const slugs =
    o.slugs ??
    (existsSync(join(dist, "reports"))
      ? (await readdir(join(dist, "reports"), { withFileTypes: true }))
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : []);

  await mkdir(out, { recursive: true });
  const written: string[] = [];

  for (const slug of slugs) {
    const jobs = [
      { src: join(dist, routes.reportSrc(slug)), file: routes.reportFile(slug) },
      { src: join(dist, routes.deckSrc(slug)), file: routes.deckFile(slug) },
    ];
    for (const job of jobs) {
      if (!existsSync(job.src)) {
        log(`skip ${job.file} (no ${job.src})`);
        continue;
      }
      let html = await inline(await readFile(job.src, "utf8"), dist);
      for (const pattern of strip) html = html.replace(pattern, "");
      html = relink(html, slug, o.origin, routes);
      const target = join(out, job.file);
      await writeFile(target, html);
      written.push(target);
      log(`wrote ${job.file} (${(html.length / 1024).toFixed(0)} KiB)`);
    }
  }
  return written;
}
