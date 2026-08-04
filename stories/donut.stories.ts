import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Donut",
  render: ({ slots, ...props }: any) => construct("Donut", props, slots),
};
export default meta;
type S = StoryObj;

/** One composition, four parts at most — a fifth is a build error. */

export const ClaimsByProvenance: S = {
  args: {
    title: "Claims in this report by provenance",
    parts: [
      { label: "observed", pct: 69 },
      { label: "web", pct: 18 },
      { label: "inferred", pct: 10 },
      { label: "assumed", pct: 3, signal: true },
    ],
  },
};
