/**
 * The render smoke test: the fixture through the bundled renderer, twice,
 * under two different themes.
 *
 * Separate from the vitest suite because it writes real directories. What
 * it proves cannot be proved any other way: that the package renders a
 * complete document with no consuming site and no framework, and that a
 * theme really is one swappable file rather than a description of one.
 *
 *   bun run test:render
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "./lib/render";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "fixtures", "foobar");
const MONO = join(HERE, "fixtures", "theme-mono.css");

let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (!cond) failed++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${name}${detail && !cond ? ` — ${detail}` : ""}`);
};

const work = await mkdtemp(join(tmpdir(), "esf-render-smoke-"));
try {
  /* --- the default theme ------------------------------------------- */
  const a = await render(FIXTURE, { out: join(work, "default"), standalone: true });
  const report = await readFile(join(a, "index.html"), "utf8");
  const deck = await readFile(join(a, "deck.html"), "utf8");
  const cssOf = async (dir: string) => {
    const { readdir } = await import("node:fs/promises");
    const assets = join(dir, "assets");
    const f = (await readdir(assets)).find((n) => n.endsWith(".css"))!;
    return readFile(join(assets, f), "utf8");
  };
  const cssA0 = await cssOf(a);

  ok("the document frame renders", /class="doc"/.test(report) && /class="rail"/.test(report));
  ok("the contents index renders", /class="toc"/.test(report));
  ok("the evidence meter renders", /evidence-meter/.test(report));
  ok("provenance survives as data", /data-evidence="assumed"/.test(report));
  ok("the legend is announced, not inferred", /data-legend/.test(report));
  ok("registers render as entries", (report.match(/register-entry/g) ?? []).length >= 3);
  ok("a superseded decision is struck, not dropped", /Move ship day to Thursday/.test(report));
  ok("charts render", /class="bars"/.test(report) && /class="wm"/.test(report));
  ok("diagrams render", (report.match(/diagram-fig/g) ?? []).length >= 2);
  ok("json-ld is inlined for machine readers", /application\/ld\+json/.test(report));
  ok("the deck renders its slides", (deck.match(/class="slide /g) ?? []).length >= 4);

  /* The rendered folder has to work when opened from disk, not only when
     served from a web root. Root-absolute asset paths resolve to the
     filesystem root over file://, which leaves the document unstyled with
     no error anywhere — and silently turned a four-slide deck into a
     one-page PDF, because pagination was measured on an unstyled page. */
  ok("assets are referenced relatively", /href="assets\//.test(report) && !/href="\/assets\//.test(report));
  ok("…and inside the CSS too", !/url\(\/assets\//.test(cssA0));

  const alone = join(a, "standalone", "report.html");
  const bundled = existsSync(alone) ? await readFile(alone, "utf8") : "";
  ok("the standalone bundle exists", bundled.length > 0);
  ok("…with the stylesheet inlined", /<style>/.test(bundled) && !/rel="stylesheet"/.test(bundled));
  ok("…and the faces as data URIs", (bundled.match(/data:font\/woff2/g) ?? []).length >= 1);

  /* --- a second theme ----------------------------------------------- */
  const b = await render(FIXTURE, { out: join(work, "mono"), theme: MONO });
  const themed = await readFile(join(b, "index.html"), "utf8");
  const [cssA, cssB] = [cssA0, await cssOf(b)];

  ok("the theme changes the tokens", /#1f5eff/i.test(cssB) && !/#1f5eff/i.test(cssA));
  ok("…and the type", /Georgia/.test(cssB) && !/Georgia/.test(cssA));
  /* The whole claim of the token contract: the same document, unchanged,
     under a stylesheet that knows none of its class names. */
  ok(
    "…and nothing else — same document either way",
    (themed.match(/class="chip"/g) ?? []).length === (report.match(/class="chip"/g) ?? []).length &&
      (themed.match(/register-entry/g) ?? []).length === (report.match(/register-entry/g) ?? []).length,
  );

  /* --- a theme that ships its own face ------------------------------- */
  const WEBFONT = join(HERE, "fixtures", "theme-webfont", "theme.css");
  const c = await render(FIXTURE, { out: join(work, "webfont"), theme: WEBFONT, standalone: true });
  const cssC = await cssOf(c);
  const { readdir } = await import("node:fs/promises");
  const emitted = (await readdir(join(c, "assets"))).filter((n) => n.endsWith(".woff2"));

  ok("a theme may name its own face", emitted.length === 1, emitted.join(","));
  /* Copied flat beside the stylesheet that names it, so the url is just
     the filename — no hashing, because a rendered folder is a deliverable
     rather than a cache-busted deployment. */
  /* Copied flat beside the stylesheet that names it, so the url is just a
     filename. The fixture's face lives two directories up, which also
     proves a `../` path resolves — a real theme will not always sit
     above its fonts. */
  ok("…its url is rewritten to sit beside the stylesheet", /src:url\(FixelText-SemiBoldItalic\.woff2\)/.test(cssC));
  /* The face has to survive into the single-file copy too, or the document
     you hand somebody renders in a fallback on their machine. */
  const aloneC = await readFile(join(c, "standalone", "report.html"), "utf8");
  ok("…and it is inlined into the standalone copy", /data:font\/woff2/.test(aloneC));
  ok("…leaving no asset url behind", !/url\(\/assets/.test(aloneC));

  /* --- the package is not written to -------------------------------- */
  /* There is no renderer project any more — rendering is a function call —
     so the only way anything lands in the package is a bug. */
  ok("the renderer writes nothing into the package", !existsSync(join(HERE, "renderer")));
} finally {
  await rm(work, { recursive: true, force: true });
}

console.log(failed === 0 ? "\nrendered clean." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
