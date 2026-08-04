import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DICTIONARY, checkDictionary, lookup } from "../dictionary";
import { AMBIENT, CONSTRUCTS } from "../render-html";
import { EXHIBITS, REGISTERS } from "../doc";

/**
 * The dictionary against every renderer that claims to implement it.
 *
 * The drift this prevents is the quiet kind. A construct gets added, the
 * web rendering looks right, and the markdown serializer never learns
 * about it — so it falls to `containerFlow`, keeps its words, loses its
 * semantics, and errors nowhere. The document just says less in one
 * channel than another. Nothing catches that except a list of what each
 * channel owes, checked against what each channel does.
 *
 * These read source rather than calling the renderers, on purpose. A
 * serializer's dispatch table IS the fact under test; asking it to also
 * export the answer would let the export drift from the switch and leave
 * the check agreeing with a lie.
 */
const LIB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(LIB, "..");
const read = (f: string) => readFileSync(join(LIB, f), "utf8");

/** Names the markdown serializer dispatches on: flow `case "X"` labels and
 *  the phrasing handler's `node.name === "X"` branches. */
function mdHandled(): Set<string> {
  const src = read("render-md.ts");
  const names = [
    ...[...src.matchAll(/case "([A-Za-z]+)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/node\.name === "([A-Za-z]+)"/g)].map((m) => m[1]),
  ];
  return new Set(names);
}

describe("the dictionary", () => {
  it("agrees with the renderer about what exists", () => {
    expect(checkDictionary()).toEqual([]);
    expect(DICTIONARY.length).toBe(CONSTRUCTS.length);
  });

  it("describes every prop the emitter actually takes", () => {
    /* The emitters' signatures are the truth; the dictionary may not
       invent a prop, rename one, or quietly go on documenting a prop that
       was removed. */
    const src = read("html.ts");
    const rh = read("render-html.ts");
    const fnOf = new Map(
      [...rh.matchAll(/^\s{2}(\w+):\s*H\.(\w+),/gm)].map((m) => [m[1], m[2]]),
    );

    const problems: string[] = [];
    for (const entry of DICTIONARY) {
      const fn = fnOf.get(entry.name);
      if (!fn) {
        problems.push(`${entry.name}: no emitter bound`);
        continue;
      }
      const at = src.indexOf(`export const ${fn} = (`);
      if (at < 0) {
        problems.push(`${entry.name}: no emitter named ${fn}`);
        continue;
      }
      /* Read the parameter list by brace balance — a props type spans
         lines and contains its own braces. */
      const open = src.indexOf("(", at);
      let depth = 0;
      let i = open;
      for (; i < src.length; i++) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")" && --depth === 0) break;
      }
      const sig = src.slice(open + 1, i);
      const b = sig.indexOf("{");
      const takesProps = b >= 0 && /^\s*p\s*:/.test(sig.slice(0, b));

      let declared: string[] = [];
      if (takesProps) {
        let d = 0;
        let j = b;
        for (; j < sig.length; j++) {
          if (sig[j] === "{") d++;
          else if (sig[j] === "}" && --d === 0) break;
        }
        const body = sig.slice(b + 1, j).replace(/\/\*[\s\S]*?\*\//g, "");
        let depth2 = 0;
        let cur = "";
        const parts: string[] = [];
        for (const ch of body) {
          if ("{[(".includes(ch)) depth2++;
          if ("}])".includes(ch)) depth2--;
          if (ch === ";" && depth2 === 0) {
            parts.push(cur);
            cur = "";
          } else cur += ch;
        }
        parts.push(cur);
        declared = parts
          .map((p) => p.trim().match(/^(\w+)\??:/)?.[1])
          .filter((x): x is string => Boolean(x));
      }

      const documented = entry.props.map((p) => p.name);
      const missing = declared.filter((p) => !documented.includes(p));
      const invented = documented.filter((p) => !declared.includes(p));
      if (missing.length) problems.push(`${entry.name}: undocumented props ${missing.join(", ")}`);
      if (invented.length) problems.push(`${entry.name}: documents props it does not take — ${invented.join(", ")}`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("keeps every markdown promise it makes", () => {
    const handled = mdHandled();
    const problems: string[] = [];

    for (const entry of DICTIONARY) {
      const { md, name } = entry;

      if (md.contract !== undefined && !handled.has(name))
        problems.push(
          `${name} promises markdown ("${md.contract.slice(0, 48)}…") but render-md.ts has no handler — it will fall through and lose its semantics`,
        );

      if (md.via !== undefined && !handled.has(md.via))
        problems.push(`${name} is serialized via ${md.via}, which has no handler either`);

      /* A construct that says it drops must not also be serialized: one of
         the two statements is wrong, and the dictionary is the one people
         read. `Spark` is the exception that proves it — it is handled,
         and what it is handled into is "". */
      if (md.drops !== undefined && handled.has(name) && name !== "Spark")
        problems.push(`${name} is documented as carrying nothing, but render-md.ts handles it`);

      /* `plain` means the default serialization is already right. A
         handler would be a second opinion about a construct that asked
         for none. */
      if (md.plain !== undefined && handled.has(name))
        problems.push(
          `${name} is documented as needing no serializer, but render-md.ts has one — one of the two is wrong`,
        );
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("has no serializer for anything outside the language", () => {
    /* The rot this catches: a construct is dropped from the language and
       its markdown handler stays behind, dead but reassuring. */
    const known = new Set(DICTIONARY.map((e) => e.name));
    const orphans = [...mdHandled()].filter((n) => !known.has(n));
    expect(orphans, `render-md.ts serializes constructs the language does not have: ${orphans.join(", ")}`).toEqual([]);
  });

  it("agrees with the deck about what a mark means", () => {
    const problems: string[] = [];
    for (const entry of DICTIONARY) {
      const inExhibits = EXHIBITS.has(entry.name);
      const inRegisters = REGISTERS.has(entry.name);
      if (inExhibits && entry.deck !== "exhibit")
        problems.push(`${entry.name} is a deck exhibit, undocumented`);
      if (inRegisters && entry.deck !== "register")
        problems.push(`${entry.name} is a deck register, undocumented`);
      if (entry.deck === "exhibit" && !inExhibits)
        problems.push(`${entry.name} is documented as an exhibit but doc.ts does not treat it as one`);
      if (entry.deck === "register" && !inRegisters)
        problems.push(`${entry.name} is documented as a register but doc.ts does not treat it as one`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("has a worked example for every construct", () => {
    const stories = new Set(
      readdirSync(join(ROOT, "stories"))
        .filter((f) => f.endsWith(".stories.ts"))
        .map((f) => f.replace(".stories.ts", "")),
    );
    const dirOf = (n: string) => n.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    const missing = DICTIONARY.filter((e) => !stories.has(dirOf(e.name))).map((e) => e.name);
    expect(missing, `no story for: ${missing.join(", ")}`).toEqual([]);
  });

  it("is exercised end to end by the fixture", () => {
    /* Two independent demonstrations: the dictionary says what each
       construct owes, the fixture makes every one of them actually run. */
    const mdx = readFileSync(join(ROOT, "fixtures/foobar/report.mdx"), "utf8");
    const missing = AMBIENT.filter((n) => !new RegExp(`<${n}[\\s/>]`).test(mdx));
    expect(missing, `the fixture never uses: ${missing.join(", ")}`).toEqual([]);
  });

  it("says something useful about each construct", () => {
    const thin = DICTIONARY.filter((e) => e.summary.length < 40).map((e) => e.name);
    expect(thin, `summary too thin to help an author: ${thin.join(", ")}`).toEqual([]);
    expect(lookup("Risk")?.props.map((p) => p.name)).toContain("falsifier");
  });
});
