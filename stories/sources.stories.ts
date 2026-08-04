import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Sources",
  render: ({ slots, ...props }: any) => construct("Sources", props, slots),
};
export default meta;
type S = StoryObj;

/** Numbered, linked back with a superscript — provenance is a round trip. */

export const Numbered: S = {
  args: {
    slots: {
      default:
        '<li id="src-1">Repository history, <code>solidus/solidus</code>, read 2026-07-21 through 2026-07-25.</li>' +
        "<li>Release notes and backport branches, v4.3 through v4.6.</li>",
    },
  },
};
