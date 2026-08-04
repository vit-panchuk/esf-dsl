import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/EasyWins",
  render: ({ slots, ...props }: any) => construct("EasyWins", props, slots),
};
export default meta;
type S = StoryObj;

/** The Easy Wins register — the fast lane; holds <EasyWin> rows. */

export const Empty: S = { args: { slots: { default: "" } } };
