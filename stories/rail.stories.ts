import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Rail",
  render: ({ slots, ...props }: any) => construct("Rail", props, slots),
};
export default meta;
type S = StoryObj;

/** The hanging metadata rail — a drawing's title block. */

export const WithBlocks: S = { args: { slots: {
    default:
      '<div class="rail-block"><span class="rail-k">MODE</span>' +
      '<span class="rail-v">existing-system audit</span></div>' +
      '<div class="rail-block"><span class="rail-k">REVISION</span>' +
      '<span class="rail-v row-live">rev. 23 · live</span></div>',
  } } };
