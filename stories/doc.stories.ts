import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Doc",
  render: ({ slots, ...props }: any) => construct("Doc", props, slots),
};
export default meta;
type S = StoryObj;

/** The rail layout. Composed of a masthead, a rail and a body. */

export const Empty: S = { args: { slots: {
    default:
      '<header class="doc-head"><p class="eyebrow">Report</p><h1 class="d2">Solidus</h1></header>' +
      '<aside class="rail"><div class="rail-block"><span class="rail-k">CLAIMS</span>' +
      '<span class="rail-v">20</span></div></aside>' +
      '<main><hr class="rule-firm"><p class="prose">The body sits at the measure.</p></main>',
  } } };
