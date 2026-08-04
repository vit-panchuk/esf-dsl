import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Credit",
  render: ({ slots, ...props }: any) => construct("Credit", props, slots),
};
export default meta;
type S = StoryObj;

/** The asset side. An investment counts as real only once something
 *  actually reuses it — a projected entry keeps the red rule. */

export const Confirmed: S = {
  args: {
    id: "C2",
    title: "Deprecation build gate",
    slots: { default: "This is what makes the upgrade promise credible rather than aspirational." },
  },
};
export const Projected: S = {
  args: {
    id: "C9",
    title: "solidus_admin",
    status: "past the point of write-off",
    realized: false,
    slots: { default: "3 years 3 months in, still version 0.4." },
  },
};
