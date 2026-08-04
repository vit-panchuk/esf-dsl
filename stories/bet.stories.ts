import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Bet",
  render: ({ slots, ...props }: any) => construct("Bet", props, slots),
};
export default meta;
type S = StoryObj;

/** One bet row: verdict verb carries the call, addresses slot carries the
 *  register entries it pays into. */

export const Do: S = {
  args: {
    id: "B5",
    verdict: "Do",
    cost: "free",
    slots: { default: "Name the release that removes legacy promotions — a policy statement, not labour" },
  },
};
export const Kill: S = {
  args: {
    id: "B7",
    verdict: "Kill",
    slots: { default: "Match Spree's React storefront" },
  },
};
