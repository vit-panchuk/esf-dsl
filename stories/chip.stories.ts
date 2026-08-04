import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Chip",
  render: ({ slots, ...props }: any) => construct("Chip", props, slots),
};
export default meta;
type S = StoryObj;

/**
 * One component, both editions. The `lang` prop swaps the label; `kind` is
 * the canonical token everything machine-readable reads.
 */

export const Observed: S = { args: { kind: "observed", lang: "en" } };
export const Web: S = { args: { kind: "web", lang: "en" } };
export const User: S = { args: { kind: "user", lang: "en" } };
export const Inferred: S = { args: { kind: "inferred", lang: "en" } };
/** The only orange chip, and the only dashed one — the distinction has to
 *  survive greyscale printing and colour blindness. */
export const Assumed: S = { args: { kind: "assumed", lang: "en" } };
/** Same component, Ukrainian label. */
export const Ukrainian: S = { args: { kind: "observed", lang: "uk" } };
