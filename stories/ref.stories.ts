import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Ref",
  render: ({ slots, ...props }: any) => construct("Ref", props, slots),
};
export default meta;
type S = StoryObj;

/** An inline pointer to a register entry — hover or focus shows the memo,
 *  the click lands on the entry. */

export const RiskToken: S = {
  args: { id: "R3", memo: "The half-built admin becomes a permanent third state." },
};
