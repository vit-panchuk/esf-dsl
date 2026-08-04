import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Horizon",
  render: ({ slots, ...props }: any) => construct("Horizon", props, slots),
};
export default meta;
type S = StoryObj;

/** Ordinal time — never dated. An empty cell is an em dash, because the
 *  emptiness is the point of a horizon chart. */

export const Sequenced: S = {
  args: {
    heads: [
      { label: "Now", note: "weeks", now: true },
      { label: "Next", note: "a quarter" },
      { label: "Horizon 2", note: "3 years" },
    ],
    lanes: [
      { label: "Delivery machine", cells: [["Harness"], ["Coverage bar"], []] },
      { label: "Product", cells: [[], ["Admin cutover"], ["Storefront"]] },
    ],
  },
};
