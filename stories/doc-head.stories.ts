import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Doc head",
  render: ({ slots, ...props }: any) => construct("DocHead", props, slots),
};
export default meta;
type S = StoryObj;

/** A document masthead: eyebrow, title, standfirst. */

export const Report: S = {
  args: {
    eyebrow: "Report · Solidus, the Rails commerce framework",
    title: "Solidus",
    lede: "Technically healthy and strategically adrift.",
  },
};
/** An essay sets its standfirst in the oblique — the one italic per page. */
export const Essay: S = {
  args: {
    eyebrow: "Essay",
    title: "Your estimate is from before the agents",
    lede: "A coverage roadmap priced at two days ran in an hour",
    oblique: true,
  },
};
export const TitleOnly: S = { args: { eyebrow: "About", title: "Two fingers, face down" } };
