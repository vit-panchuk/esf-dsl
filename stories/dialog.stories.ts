import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Dialog",
  render: ({ slots, ...props }: any) => construct("Dialog", props, slots),
};
export default meta;
type S = StoryObj;

/** Quoted exchange. A silence is a turn — the unanswered question is the
 *  evidence. */

export const WithSilence: S = {
  args: {
    slots: {
      default:
        '<div class="dialog-turn"><p class="dialog-who"><b>Auditor</b> · 2026-07-21</p>' +
        "<q>Which half of each pair is scheduled for removal?</q></div>" +
        '<div class="dialog-turn dialog-turn--silence"><p class="dialog-who"><b>Maintainers</b></p>' +
        "<q>no reply</q></div>",
    },
  },
};
