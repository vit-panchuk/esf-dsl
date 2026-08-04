/**
 * The package's own claim, made falsifiable.
 *
 * `esf-dsl/core` is supposed to produce four channels with no browser and
 * no build step — that is what lets an engagement emit deliverables while
 * it is still running rather than only at publish time. This script is
 * that claim as a runnable check: plain Bun, one import, nothing around it.
 *
 * If it ever needs more than that, the split has regressed.
 */
import { analyse, toMarkdownDoc, thread, jsonld, DSL, type DocMeta } from "./lib/index";

const body = `## Finding

Commits stopped four days ago <Chip kind="observed" />. Nobody owns it <Chip kind="assumed" />.

<Finding deck="Excellent machine. No driver." thread="Excellent machine, no driver." tag="observed">
Excellent machine. No driver.
</Finding>
`;

const meta: DocMeta = {
  title: "Core smoke",
  kind: "report",
  updated: "2026-08-04",
  canonical: "https://example.com/reports/smoke/",
  emits: ["md", "jsonld", "thread"],
};

const facts = analyse(body);
const md = toMarkdownDoc(facts.tree, facts, meta);
const posts = thread(meta, facts.blocks, { closing: "", tags: DSL.en.tags });
const ld = jsonld(meta, facts.claims, {
  identity: { origin: "https://example.com", author: "Nobody" },
});

const checks: [string, boolean, unknown][] = [
  ["claims counted from the chips", facts.total === 2, facts.total],
  ["markdown carries the finding", md.includes("> Excellent machine. No driver."), null],
  ["markdown carries the tag", md.includes("`[observed]`"), null],
  ["thread selected the marked block", (posts?.length ?? 0) > 0, posts?.length],
  ["json-ld counts match the prose", (ld as any)["ns#evidence"]["ns#total"] === 2, null],
];

let failed = 0;
for (const [name, ok, detail] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail !== null ? ` (${detail})` : ""}`);
}
console.log(failed === 0 ? "\ncore runs standalone." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
