import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Spark",
  render: ({ slots, ...props }: any) => construct("Spark", props, slots),
};
export default meta;
type S = StoryObj;

/** A trend inside a sentence — earns its place only when the shape is the
 *  point and the number is already in the prose. */

export const Falling: S = { args: { points: "0,3 12,5 24,4 36,9 48,12 60,13" } };
export const Flat: S = { args: { points: "0,8 12,7 24,9 36,8 48,8 60,7" } };
