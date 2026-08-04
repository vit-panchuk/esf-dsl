import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Line plot",
  render: ({ slots, ...props }: any) => construct("LinePlot", props, slots),
};
export default meta;
type S = StoryObj;

/** A trend, and where it stops being known — the forecast tail is the
 *  only part not measured, and is drawn accordingly. */

export const MaintainersWithForecast: S = {
  args: {
    title: "Monthly active maintainers",
    series: [
      { points: "0,8 12,7 24,11 37,10 49,18 61,24 73,28 85,30" },
      { points: "0,26 12,24 24,25 37,22 49,23 61,21 73,22 85,20", muted: true },
    ],
    forecast: "85,30 100,36",
    xLabels: ["2023-Q1", "2024-Q1", "2025-Q1", "2026-Q3"],
    keyItems: [
      { label: "maintainers with ≥1 merge" },
      { label: "open issues (indexed)", tone: "muted" },
      { label: "extrapolation, not data", tone: "signal" },
    ],
  },
};
