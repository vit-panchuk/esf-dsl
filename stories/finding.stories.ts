import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Finding",
  render: ({ slots, ...props }: any) => construct("Finding", props, slots),
};
export default meta;
type S = StoryObj;

/**
 * The selection marker. Budgets are enforced at build time — deck 14 words,
 * thread 240 chars — and overflow stops the build rather than truncating.
 *
 * It renders its slot, so every story has to supply one: a `<Finding>` with
 * no children is an empty blockquote.
 */

const text = "Excellent machine. No driver.";

/** Bare opt-in reuses the block's own text for both channels. */
export const BothChannels: S = {
  args: { deck: true, thread: true, tag: "observed" , slots: { default: text } },
};
/** A rewrite, because a slide line is a different register from a sentence. */
export const RewrittenForDeck: S = {
  args: { deck: "Excellent machine. No driver.", tag: "observed" , slots: { default: "The delivery machine is in the top decile and nothing is steering it." } },
};
/** Marked for nothing — prose, which no channel selects. */
export const Unmarked: S = { args: { slots: { default: text } } };
