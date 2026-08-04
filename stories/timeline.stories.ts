import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Timeline",
  render: ({ slots, ...props }: any) => construct("Timeline", props, slots),
};
export default meta;
type S = StoryObj;

/** The report's spine when the argument is chronological. A gap is a
 *  recorded silence — absence rendered as content. */

export const WithGap: S = {
  args: {
    slots: {
      default:
        '<div class="tl-item"><span class="tl-when">2023-05</span>New admin started</div>' +
        '<div class="tl-gap"><span class="tl-when">gap</span>No releases, Oct 23 – Mar 24</div>' +
        '<div class="tl-item tl-item--open"><span class="tl-when">2026-06</span>Storefront added</div>',
    },
  },
};
