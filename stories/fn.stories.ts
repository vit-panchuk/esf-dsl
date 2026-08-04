import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Footnote",
  render: ({ slots, ...props }: any) => construct("Fn", props, slots),
};
export default meta;
type S = StoryObj;

/** The superscript pointing into the sources list — follows the claim with
 *  no space, like a chip. */

export const Ref: S = { args: { n: 1, href: "#src-1" } };
