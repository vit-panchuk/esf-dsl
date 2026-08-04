import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AMBIENT, CONSTRUCTS } from "../render-html";

/**
 * The gallery, checked rather than looked at.
 *
 * Storybook builds whether or not a story renders — the build only proves
 * the modules parse. What matters is that every worked example still
 * produces markup, because the stories are the only place most constructs
 * are exercised with realistic props, and a story that silently renders
 * nothing is a construct nobody is really looking at.
 */
const STORIES = resolve(dirname(fileURLToPath(import.meta.url)), "../../stories");

/** The one story that renders nothing on purpose: an index of one heading
 *  is furniture, so `<Toc>` declines to draw it. */
const INTENTIONALLY_EMPTY = new Set(["toc.stories.ts::TooFewToShow"]);

const files = readdirSync(STORIES).filter((f) => f.endsWith(".stories.ts"));

describe("the gallery", () => {
  it("has a story file per construct", () => {
    /* Every name the renderer answers to should be demonstrable. */
    const covered = new Set<string>();
    for (const f of files) covered.add(f.replace(".stories.ts", ""));
    expect(files.length).toBeGreaterThanOrEqual(CONSTRUCTS.length - 1);
    expect(covered.size).toBe(files.length);
  });

  it("renders every story to markup", async () => {
    const broken: string[] = [];
    let rendered = 0;

    for (const f of files) {
      const mod: any = await import(join(STORIES, f));
      const render = mod.default?.render;
      expect(render, `${f} has no render`).toBeTypeOf("function");

      for (const [name, story] of Object.entries<any>(mod)) {
        if (name === "default" || !story || typeof story !== "object" || !("args" in story)) continue;
        rendered++;
        const id = `${f}::${name}`;
        try {
          const html = render(story.args ?? {});
          if (typeof html !== "string") broken.push(`${id} returned ${typeof html}`);
          else if (html.trim() === "" && !INTENTIONALLY_EMPTY.has(id)) broken.push(`${id} rendered empty`);
        } catch (e: any) {
          broken.push(`${id} threw: ${e.message}`);
        }
      }
    }

    expect(rendered).toBeGreaterThan(80);
    expect(broken, broken.join("\n")).toEqual([]);
  });

  it("covers every ambient construct the fixture also uses", () => {
    /* Two independent demonstrations of the same vocabulary: the fixture
       proves the channels, the gallery proves the markup. Neither is
       allowed to fall behind the language. */
    const covered = new Set(files.map((f) => f.replace(".stories.ts", "")));
    const missing = AMBIENT.filter((name) => {
      const dir = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      return !covered.has(dir);
    });
    expect(missing, `no story for: ${missing.join(", ")}`).toEqual([]);
  });
});
