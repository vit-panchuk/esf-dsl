import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Pull quote",
  render: ({ slots, ...props }: any) => construct("PullQuote", props, slots),
};
export default meta;
type S = StoryObj;

/** At most one per document. */

export const WithCite: S = {
  args: {
    cite: "ESF v0.5 · §on revision",
    slots: { default: "A report that never embarrasses its author is a report that stopped checking." },
  },
};
