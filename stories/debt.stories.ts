import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Debt",
  render: ({ slots, ...props }: any) => construct("Debt", props, slots),
};
export default meta;
type S = StoryObj;

/** A cost already being paid, every single release — the red rule is the
 *  verdict "no", not the signal orange. */

export const Strategic: S = {
  args: {
    id: "D1",
    title: "Three unfinished rewrites",
    kind: "strategic",
    slots: { default: "Every change is designed twice, written twice, tested twice and released twice." },
  },
};
