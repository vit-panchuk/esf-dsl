import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Figure",
  render: ({ slots, ...props }: any) => construct("Figure", props, slots),
};
export default meta;
type S = StoryObj;

/** Plate + caption. Imagery is always captioned with a claim — a picture
 *  that asserts nothing is decoration. */

export const WithCaption: S = {
  args: { alt: "Paddock, 2025", caption: "Two plates, screened at 5px." },
};
