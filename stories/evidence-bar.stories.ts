import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Evidence bar",
  render: ({ slots, ...props }: any) => construct("EvidenceBar", props, slots),
};
export default meta;
type S = StoryObj;

/** Reserve vocabulary — the meter fed by explicit counts rather than by
 *  `evidenceRows()`. The production meter is counted, never authored; this
 *  variant exists for contexts with no prose to count. */

export const Counted: S = {
  args: { observed: 12, web: 2, user: 0, inferred: 2, assumed: 4, note: "nobody spoke" },
};
