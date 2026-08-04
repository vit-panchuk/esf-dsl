import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Cols",
  render: ({ slots, ...props }: any) => construct("Cols", props, slots),
};
export default meta;
type S = StoryObj;

/** The same quantity over time. Orange is annualised/estimated; grey is a
 *  different definition; label the value, never the axis. */

export const CommitsPerYear: S = {
  args: {
    title: "Commits per year",
    cols: [
      { label: "2023", n: 1810, v: 100 },
      { label: "2024", n: 742, v: 41 },
      { label: "2025", n: 610, v: 34, muted: true },
      { label: "2026", n: "~520", v: 29, assumed: true },
    ],
    caption: "2026 is orange because it is annualised from seven months, not counted.",
  },
};
