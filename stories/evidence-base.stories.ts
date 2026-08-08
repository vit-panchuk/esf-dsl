import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* The whole opening section, not just the meter: heading, meter, note.
   This is what the standalone edition renders and what a hosting site
   adopts — one construct, one zero for the section counter. */
const meta: Meta = {
  title: "ESF/Evidence base",
  render: ({ slots, ...props }: any) => construct("EvidenceBase", props, slots),
};
export default meta;
type S = StoryObj;

/** The Solidus audit's opening, as of rev 26. */
export const Report: S = {
  args: {
    rows: [
      { label: "observed", pct: 59, n: 68 },
      { label: "web", pct: 26, n: 31 },
      { label: "stakeholder", pct: 10, n: 12 },
      { label: "inferred", pct: 5, n: 6 },
      { label: "assumed", pct: 0, n: 0, assumed: true },
    ],
    note: "Counted from the claims in the prose below, not authored — it cannot drift from what the document says.",
  },
};

/** The Ukrainian edition localizes the heading from the same construct. */
export const Ukrainian: S = {
  args: {
    lang: "uk",
    rows: [
      { label: "спостережено", pct: 59, n: 68 },
      { label: "припущено", pct: 0, n: 0, assumed: true },
    ],
  },
};
