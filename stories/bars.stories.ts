import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Bars",
  render: ({ slots, ...props }: any) => construct("Bars", props, slots),
};
export default meta;
type S = StoryObj;

/** Quantities. An unverified upper bound becomes a range, so the
 *  uncertainty travels with the number. */

export const CyclesCarried: S = {
  args: {
    title: "Cycles carried since the replacement shipped",
    rows: [
      { label: "Frontend", v: 21, value: "21" },
      { label: "Admin", v: 14, value: "14" },
      { label: "Promotions", v: 9, value: "9" },
    ],
    caption: "Minor releases shipped with both halves still present.",
  },
};
export const WithUnverifiedRange: S = {
  args: {
    title: "Estimated agent wall-clock",
    rows: [
      { label: "Coverage backfill", v: 33, to: 92, value: "33–92", assumed: true },
      { label: "Codemod", v: 20, value: "20" },
    ],
    caption: "The range is an unverified upper bound.",
  },
};
