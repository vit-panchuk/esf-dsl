/**
 * Channel: PDF. The web rendering, through the print stylesheet, driven by
 * a headless browser.
 *
 * It is the same page rather than a second rendering, so it cannot drift
 * from the HTML — which is the whole reason there is no separate PDF
 * serializer here. What it costs is a browser, and a browser is a heavy
 * thing to make every consumer of a markdown pipeline install. So
 * Playwright is optional: not a dependency, not a peer dependency, just
 * something this one function looks for and explains how to get.
 *
 * The files are loaded from disk over `file://`. No server, no port, no
 * race between "is it up yet" and the first navigation.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface PdfOptions {
  /** Where the PDFs go. Default `<html>/pdf`. */
  out?: string;
  /** Which files to print. Default: every .html in the directory, minus
   *  the standalone copies, which are the same documents again. */
  pages?: string[];
  /** Landscape for slides, portrait for documents. Decided per file by
   *  default: anything named like a deck goes landscape. */
  landscape?: (file: string) => boolean;
  log?: (message: string) => void;
}

const MISSING = [
  "[esf] PDF needs Playwright, which is deliberately not a dependency —",
  "      a browser is a lot to install for a markdown pipeline.",
  "",
  "      bun add -d playwright",
  "      bunx playwright install chromium",
  "",
  "      Then: esf pdf <html-dir>",
  "",
  "      Everything else — markdown, JSON-LD, the thread, the deck",
  "      selection, the HTML itself — needs none of it.",
].join("\n");

/**
 * Print a rendered directory to PDF. Returns the files written.
 *
 * `html` is what `esf render` produced: an `index.html`, maybe a
 * `deck.html`, and their assets.
 */
export async function pdf(html: string, o: PdfOptions = {}): Promise<string[]> {
  const dir = resolve(html);
  const out = o.out ?? join(dir, "pdf");
  const log = o.log ?? (() => {});

  if (!existsSync(dir)) throw new Error(`[esf] ${dir} not found — run \`esf render\` first.`);

  /* Resolved through a variable so a bundler does not try to follow it,
     and so a type check passes without the optional dependency present. */
  const PLAYWRIGHT = "playwright";
  let chromium: any;
  try {
    ({ chromium } = await import(PLAYWRIGHT));
  } catch {
    throw new Error(MISSING);
  }

  const pages =
    o.pages ??
    (await readdir(dir))
      .filter((f) => f.endsWith(".html"))
      .sort((a) => (a === "index.html" ? -1 : 1));

  if (pages.length === 0) throw new Error(`[esf] no .html in ${dir}`);

  const isDeck = o.landscape ?? ((f: string) => /deck/i.test(f));

  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  const written: string[] = [];
  try {
    for (const file of pages) {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(join(dir, file)).href, { waitUntil: "networkidle" });
      /* Pagination is measured from laid-out text, so the faces have to be
         resolved first. Without this a deck can come out as one page
         because the slides were measured before the type arrived. */
      await page.evaluate(() => document.fonts.ready);
      /* The print stylesheet is what makes this the PDF rendering rather
         than a screenshot of the screen one. */
      await page.emulateMedia({ media: "print" });
      const target = join(out, file.replace(/\.html$/, ".pdf"));
      await page.pdf({
        path: target,
        format: "A4",
        landscape: isDeck(file),
        printBackground: true,
        /* Margins live in the stylesheet's `@page`, which Chromium lets
           override anything passed here — so they are set in one place
           rather than disagreeing in two. */
      });
      await page.close();
      written.push(target);
      log(`${file} → ${target.split("/").pop()}${isDeck(file) ? " (landscape)" : ""}`);
    }
  } finally {
    await browser.close();
  }
  return written;
}
