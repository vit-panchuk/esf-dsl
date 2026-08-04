import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Evidence",
  render: ({ slots, ...props }: any) => construct("Evidence", props, slots),
};
export default meta;
type S = StoryObj;

/**
 * The provenance meter — the site's thesis as a shape. A zero row is never
 * omitted: the zero is usually the finding.
 *
 * Stories for vendored design-system components live here rather than in
 * the design system's spec cards, so a drifted implementation is visible
 * hand-edited.
 */

export const SolidusAudit: S = {
  args: {
    rows: [
      { label: "observed", pct: 60, n: 12 },
      { label: "web", pct: 10, n: 2 },
      { label: "user", pct: 0, n: 0 },
      { label: "inferred", pct: 10, n: 2 },
      { label: "assumed", pct: 20, n: 4, assumed: true },
    ],
    note: "The zero in the user row is the report's most important limitation.",
  },
};
export const NothingAssumed: S = {
  args: {
    rows: [
      { label: "observed", pct: 80, n: 8 },
      { label: "web", pct: 20, n: 2 },
      { label: "user", pct: 0, n: 0 },
      { label: "inferred", pct: 0, n: 0 },
      { label: "assumed", pct: 0, n: 0, assumed: true },
    ],
  },
};
