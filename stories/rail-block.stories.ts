import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Rail block",
  render: ({ slots, ...props }: any) => construct("RailBlock", props, slots),
};
export default meta;
type S = StoryObj;

/** One key/value pair in the rail. */

export const Plain: S = { args: { k: "UPDATED" }, slots: { default: "2026-07-25" } };
/** `live` is the only rail value that earns orange — an unfinished report
 *  is exactly the uncertainty the accent exists to mark. */
export const Live: S = {
  args: { k: "REVISION", live: true , slots: { default: "rev. 23 · live" } },
};
