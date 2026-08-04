/**
 * Add `.js` to relative import specifiers in the compiled library.
 *
 * TypeScript emits `from "./strings"` because that is what the source says,
 * and Node's ESM resolver requires a real filename. Bundlers do not care,
 * which is exactly why this goes unnoticed until somebody imports the
 * published package from plain Node — the one consumer least able to work
 * around it.
 *
 * The alternative is writing `.js` extensions in the TypeScript source,
 * which is the officially blessed spelling but puts a lie in every import
 * line of a file that is not JavaScript. This is a build detail, so it
 * lives in the build.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "dist/lib";

/* Only relative specifiers: bare ones are packages and already resolve. */
const FIX = /(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.\.?\/[^"']*?)(["'])/g;

let touched = 0;
for (const file of await readdir(DIR)) {
  if (!file.endsWith(".js") && !file.endsWith(".d.ts")) continue;
  const path = join(DIR, file);
  const before = await readFile(path, "utf8");
  const after = before.replace(FIX, (m, kw, q1, spec, q2) =>
    /\.(js|json|css)$/.test(spec) ? m : `${kw}${q1}${spec}.js${q2}`,
  );
  if (after !== before) {
    await writeFile(path, after);
    touched++;
  }
}
console.log(`  esm: added extensions in ${touched} file(s)`);
