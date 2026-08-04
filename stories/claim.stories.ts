import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Claim",
  render: ({ slots, ...props }: any) => construct("Claim", props, slots),
};
export default meta;
type S = StoryObj;

/** Reserve vocabulary — not yet ambient (every ambient component owes a
 *  rendering to all seven channels first). A graded claim with an optional
 *  source shown on hover. */

export const Observed: S = {
  args: { tag: "observed", source: "git log --since=2026-07-21", slots: { default: "Commits landed four days ago" } },
};
export const Assumed: S = {
  args: { tag: "assumed", slots: { default: "The roadmap was quietly dropped" } },
};
