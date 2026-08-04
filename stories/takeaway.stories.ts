import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Takeaway",
  render: ({ slots, ...props }: any) => construct("Takeaway", props, slots),
};
export default meta;
type S = StoryObj;

/** Reserve vocabulary — the marked beat lossy channels select from. On the
 *  page it reads as a pull-quote in the flow of the argument. */

export const Marked: S = {
  args: { slots: { default: "Excellent machine. No driver." } },
};
