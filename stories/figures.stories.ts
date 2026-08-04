import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Figures",
  render: ({ slots, ...props }: any) => construct("Figures", props, slots),
};
export default meta;
type S = StoryObj;

/** The numbers a section hangs off, promoted out of the prose. */

export const KeyFigures: S = {
  args: {
    items: [
      { v: "60% → 0.8%", cap: "Nebulab's share of commits, 2023 → last 12 months" },
      { v: "$45,760", cap: "Already spent on the admin that never shipped" },
      { v: "3 yr 3 mo", cap: "Age of the new admin, still version 0.4" },
      { v: "$132,180", cap: "Cash held · nothing spent since July 2025" },
    ],
  },
};
