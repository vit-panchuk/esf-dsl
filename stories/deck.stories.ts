import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Deck",
  render: ({ slots, ...props }: any) => construct("Deck", props, slots),
};
export default meta;
type S = StoryObj;

/** The slide channel. Layouts come out of `select.ts` already
 *  budget-checked; these are the five it can produce. */

const rows = [
  { label: "observed", pct: 69, n: 74, assumed: false },
  { label: "web", pct: 18, n: 19, assumed: false },
  { label: "user", pct: 0, n: 0, assumed: false },
  { label: "inferred", pct: 10, n: 11, assumed: false },
  { label: "assumed", pct: 3, n: 4, assumed: true },
];

export const Full: S = {
  args: {
    total: 108,
    rows,
    reportHref: "/reports/solidus",
    eyebrow: "existing-system audit",
    slides: [
      {
        layout: "title",
        text: "Solidus",
        note: "A well-engineered framework that has quietly lost its steward.",
        order: 0,
      },
      { layout: "evidence", text: "", order: 1 },
      {
        layout: "finding",
        text: "Excellent machine. No driver.",
        tag: "observed",
        order: 2,
        anchor: { slug: "the-machine", title: "The machine" },
      },
      {
        layout: "exhibit",
        text: "Commits per year, since the fork",
        tag: "observed",
        order: 3,
        exhibit: {
          component: "Bars",
          props: {
            title: "Commits per year",
            rows: [
              { label: "2023", v: 100, value: "1810" },
              { label: "2026", v: 29, value: "~520", assumed: true },
            ],
          },
        },
      },
    ],
  },
};

/** The one-slide edge: a deck with a title and nothing else still has to
 *  number itself correctly, and the hint has to say "1 slide". */
export const Minimal: S = {
  args: {
    total: 0,
    rows,
    reportHref: "/reports/x",
    slides: [{ layout: "title", text: "One slide", order: 0 }],
  },
};

/** The Ukrainian edition — the deck's strings are the language's, so the
 *  channel is translatable rather than English-only. */
export const Ukrainian: S = {
  args: {
    lang: "uk",
    total: 108,
    rows,
    reportHref: "/uk/reports/solidus",
    eyebrow: "аудит наявної системи",
    slides: [
      { layout: "title", text: "Solidus", order: 0 },
      { layout: "evidence", text: "", order: 1 },
      {
        layout: "finding",
        text: "Чудова машина. Без водія.",
        tag: "observed",
        order: 2,
        anchor: { slug: "mashyna", title: "Машина" },
      },
    ],
  },
};
