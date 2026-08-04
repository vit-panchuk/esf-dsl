import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/AxisPlot",
  render: ({ slots, ...props }: any) => construct("AxisPlot", props, slots),
};
export default meta;
type S = StoryObj;

/** A quadrant plot whose props are the plot: dots, legend and the
 *  markdown quadrantChart all derive from one set of points. */

export const RiskExposure: S = {
  args: {
    title: "Risk exposure",
    x: "Likelihood inside twelve months",
    y: "Impact if it lands",
    quadrants: ["Plan & monitor", "Act now", "Watchlist", "Contingency"],
    hot: "tr",
    points: [
      { id: "R3", x: 90, y: 82, tip: "The stalled admin — the silence is the finding", at: "left under" },
      { id: "R2", x: 50, y: 75, tip: "Contributor concentration", at: "under" },
      { id: "R5", x: 90, y: 44, tip: "Extension breakage on major upgrades", at: "left" },
      { id: "R1", x: 50, y: 33, tip: "Routine dependency drift" },
    ],
  },
};
