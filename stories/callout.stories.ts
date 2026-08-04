import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Callout",
  render: ({ slots, ...props }: any) => construct("Callout", props, slots),
};
export default meta;
type S = StoryObj;

/** `unknown` is the only orange variant — a callout that marks certainty
 *  would be using the accent as decoration. */

export const Unknown: S = {
  args: {
    kind: "unknown",
    label: "What would change this",
    slots: {
      default:
        "<p>A maintainer saying, on the record, which half of each pair is " +
        "scheduled for removal. Nothing in the repository can answer that.</p>",
    },
  },
};
export const Claim: S = {
  args: {
    kind: "claim",
    label: "Established",
    slots: { default: "<p>Commits landed four days before the audit.</p>" },
  },
};
