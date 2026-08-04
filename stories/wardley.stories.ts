import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Wardley",
  render: ({ slots, ...props }: any) => construct("Wardley", props, slots),
};
export default meta;
type S = StoryObj;

/** Filled is ours, hollow is somebody else's, orange is a guessed
 *  placement, and the dashed run is a forecast. */

export const ValueChain: S = {
  args: {
    nodes: [
      { label: "Buyer trust", visibility: 0.92, evolution: 0.3, own: true },
      { label: "The public report", visibility: 0.72, evolution: 0.38, own: true },
      { label: "Evidence tagging (ESF)", visibility: 0.52, evolution: 0.26, own: true, assumed: true, moveTo: 0.58 },
      { label: "Claim store", visibility: 0.34, evolution: 0.44, own: true, side: "below" },
      { label: "Typeface licence", visibility: 0.22, evolution: 0.68, assumed: true, side: "left" },
      { label: "Static hosting", visibility: 0.14, evolution: 0.88, side: "below" },
    ],
    links: [
      ["Buyer trust", "The public report"],
      ["The public report", "Evidence tagging (ESF)"],
      ["Evidence tagging (ESF)", "Claim store"],
      ["Claim store", "Static hosting"],
      ["The public report", "Typeface licence"],
    ],
  },
};
