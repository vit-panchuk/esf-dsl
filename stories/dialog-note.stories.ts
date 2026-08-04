import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Dialog note",
  render: ({ slots, ...props }: any) => construct("DialogNote", props, slots),
};
export default meta;
type S = StoryObj;

/** The author's gloss between quoted turns — never italic, so the reader
 *  sees where the quoting stops. */

export const Gloss: S = {
  args: { slots: { default: "Three weeks pass before anyone replies — the gap is the finding." } },
};
