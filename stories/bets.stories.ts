import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Bets",
  render: ({ slots, ...props }: any) => construct("Bets", props, slots),
};
export default meta;
type S = StoryObj;

/** The Strategic Bets register — holds <Bet> rows. */

export const Empty: S = { args: { slots: { default: "" } } };
