import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Share",
  render: ({ slots, ...props }: any) => construct("Share", props, slots),
};
export default meta;
type S = StoryObj;

/** Parts of one whole. Beats a donut whenever two of them sit side by
 *  side. The signal segment is the unaccounted share. */

export const WhereTheMoneyWent: S = {
  args: {
    title: "Where the $132k went",
    segments: [
      { label: "admin rewrite", pct: 35 },
      { label: "core maintenance", pct: 26 },
      { label: "events", pct: 18 },
      { label: "infrastructure", pct: 9 },
      { label: "unaccounted", pct: 12, signal: true },
    ],
  },
};
