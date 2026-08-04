import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/State",
  render: ({ slots, ...props }: any) => construct("State", props, slots),
};
export default meta;
type S = StoryObj;

/** empty · error · unknown · inline — an absent result is content, not a
 *  blank space. */

export const Empty: S = {
  args: {
    kind: "empty",
    label: "No results",
    title: 'Nothing matches "graphql"',
    slots: { default: "<p>Try a broader term, or browse the reports index.</p>" },
  },
};
export const Error: S = {
  args: {
    kind: "error",
    label: "Failed",
    title: "The feed did not load",
    detail: "GET /rss.xml → 500",
    slots: { default: "<p>Reload, or read the reports index directly.</p>" },
  },
};
export const Unknown: S = {
  args: {
    kind: "unknown",
    label: "Not established",
    title: "Nobody who maintains it was reached",
    slots: { default: "<p>The zero in the user row is a limitation, not a rounding artifact.</p>" },
  },
};

/** Inline — inside a component that already draws a frame: no box in a
 *  box, one mono line, the kind label first. */
export const Inline: S = {
  args: {
    kind: "inline",
    label: "No data",
    slots: { default: "the commit feed returned zero rows for this window" },
  },
};

/** One primary action, a ghost second at most — never three. */
export const WithActions: S = {
  args: {
    kind: "error",
    label: "Failed · 500",
    title: "The search index did not answer",
    detail: "GET /api/search?q=graphql → 500 · req 8f3ac1",
    slots: {
      default: "<p>The page loaded; the index behind it did not. Reports are still readable directly.</p>",
      actions: '<a class="btn" href="#">Try again</a><a class="btn btn--ghost" href="#">Read the index instead</a>',
    },
  },
};
