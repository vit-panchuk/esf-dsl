import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Strategies",
  render: ({ slots, ...props }: any) => construct("Strategies", props, slots),
};
export default meta;
type S = StoryObj;

/** The Observed Strategy Inventory register — holds <Strategy> rows. */

export const Empty: S = { args: { slots: { default: "" } } };
