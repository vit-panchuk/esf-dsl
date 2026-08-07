/**
 * A whole report, as one string.
 *
 * `render-html.ts` turns a document's *body* into markup. This puts the
 * frame around it — the head, the metadata rail, the section index, the
 * evidence meter — and hands back everything that goes inside a page's
 * content area.
 *
 * It exists so a consumer needs exactly one seam. A website drops the
 * result into its own shell with a single `set:html`; `esf render` writes
 * it into a minimal HTML file. Neither has to know the vocabulary, compose
 * fifty components, or run a framework. The frame is part of the language
 * — a report that renders its findings into no document is not a
 * deliverable — so the language is what assembles it.
 */
import type { DocFacts } from "./doc";
import { evidenceRows } from "./doc";
import type { ReportData } from "./document";
import type { DocMeta } from "./emit";
import * as H from "./html";
import { toHtmlDoc } from "./render-html";
import { DSL, type Lang } from "./strings";

export interface DocumentOptions {
  meta: DocMeta;
  data: ReportData;
  facts: DocFacts;
  lang?: Lang;
  /** Extra rail rows a consumer wants beside the derived ones — a
   *  published date, a link back to an index. Rendered after them. */
  rail?: { k: string; v: string; live?: boolean }[];
  /** Dropped into the head block, under the lede: the "also as" line, a
   *  deck invitation, whatever the consumer publishes alongside. */
  also?: string;
  /** Heading levels the section index lists. Defaults to h2. */
  indexDepth?: number;
}

/**
 * Render the report's content area: `<div class="doc">` and everything in
 * it. The caller supplies the page around it.
 */
export function renderDocument(o: DocumentOptions): string {
  const lang = o.lang ?? ((o.meta.lang as Lang) || "en");
  const t = DSL[lang] ?? DSL.en;
  const { facts, data } = o;

  /* The Evidence Base section is injected by this view (the meter), so the
     document's own headings never contain it — prepend it here or the
     Contents starts one section late and every number drifts off the ones
     the body counter paints. */
  const sections = [
    ...(facts.total > 0 ? [{ depth: 2, text: t.evidenceHeading, slug: "evidence-base" }] : []),
    ...facts.headings.filter((h) => h.depth === (o.indexDepth ?? 2)),
  ];

  /* The rail is derived from what the document already says. A consumer
     adding rows appends; it cannot silently replace the revision or the
     claim count, which are facts about the document rather than
     presentation. */
  const rows: { k: string; v: string; live?: boolean }[] = [];
  if (data.mode) rows.push({ k: t.frame.contents === "CONTENTS" ? "MODE" : "РЕЖИМ", v: data.mode });
  if (data.rev !== undefined)
    rows.push({ k: t.rev, v: String(data.rev), live: data.status === "live" });
  if (data.updated) rows.push({ k: t.md.updated, v: data.updated });
  if (facts.total) rows.push({ k: t.evidenceHeading, v: `${facts.total}` });
  if (data.stakeholders) rows.push({ k: "stakeholders", v: data.stakeholders });
  if (data.framework) rows.push({ k: "framework", v: data.framework });
  rows.push(...(o.rail ?? []));

  /* Meta blocks first, Contents last — the order esf.css depends on: the
     toc is position:sticky, and a pinned element glides down over LATER
     siblings, so a toc rendered first paints over every meta block as the
     page scrolls. */
  const rail =
    rows.map((r) => H.railBlock({ k: r.k, live: r.live }, { default: H.esc(r.v) })).join("") +
    H.toc({ label: t.frame.contents, sections, start: 0 });

  const head = H.docHead(
    {
      eyebrow: data.mode ?? (data.kind === "note" ? t.kind.note : t.kind.report),
      title: data.title,
      lede: data.subtitle,
    },
    o.also ? { also: o.also } : undefined,
  );

  /* A report opens with its evidence base, before the conclusions — the
     meter is the framework's selling point and counted, never authored. */
  const meter =
    facts.total > 0
      ? `<section class="prose"><h2 id="evidence-base">${H.esc(t.evidenceHeading)}</h2>` +
        H.evidence({ rows: evidenceRows(facts).map((r) => ({ ...r, label: t.tags[r.label] })) }) +
        `</section>`
      : "";

  const body = `<div class="prose">${toHtmlDoc(facts.tree, { lang })}</div>`;

  return H.doc(undefined, {
    default: head + H.rail(undefined, { default: rail }) + `<main>${meter}${body}</main>`,
  });
}

/**
 * The client-side behaviour the document needs, as a script body.
 *
 * Two small things, and neither is optional if the page is to work: the
 * section index tracks the heading you are reading, and the deck answers
 * the arrow keys. A consumer with a bundler can import these as modules
 * instead; `esf render` inlines them, because a single file handed to
 * somebody has nowhere to fetch a bundle from.
 */
export const TOC_SCRIPT = `
const links = [...document.querySelectorAll(".toc a")];
if (links.length) {
  const heads = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const mark = () => {
    let current = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top <= 120) current = h;
    for (const a of links) a.removeAttribute("aria-current");
    const active = links.find((a) => a.getAttribute("href") === "#" + (current && current.id));
    if (active) { active.setAttribute("aria-current", "true"); active.scrollIntoView({ block: "nearest" }); }
  };
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; mark(); });
  }, { passive: true });
  addEventListener("resize", mark, { passive: true });
  mark();
}`.trim();

export const DECK_SCRIPT = `
const slides = [...document.querySelectorAll(".slide")];
let index = 0;
const go = (next) => {
  index = Math.max(0, Math.min(slides.length - 1, next));
  slides[index] && slides[index].scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
};
addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(index + 1); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(index - 1); }
});
const spy = new IntersectionObserver(
  (es) => { for (const e of es) if (e.isIntersecting) index = slides.indexOf(e.target); },
  { threshold: 0.5 },
);
slides.forEach((s) => spy.observe(s));`.trim();
