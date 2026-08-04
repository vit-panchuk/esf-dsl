import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Cause",
  render: ({ slots, ...props }: any) => construct("Cause", props, slots),
};
export default meta;
type S = StoryObj;

/** The mechanism behind a family of symptoms. `ensures` is the
 *  compounding one-liner — what the mechanism guarantees while it
 *  stands. */

export const RootCause: S = {
  args: {
    id: "RC2",
    title: "The steward changed in the code but not in the governance",
    ensures: "That one of the stalled migrations eventually stays stalled",
    slots: {
      default:
        "The project has a mechanism to transfer money and none to transfer sponsorship of unfinished work.",
    },
  },
};
