import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Verdict",
  render: ({ slots, ...props }: any) => construct("Verdict", props, slots),
};
export default meta;
type S = StoryObj;

/** Two hues and no amber: yes and no carry the binary, part stays muted
 *  and lets the sentence qualify itself. Never orange. */

export const Yes: S = { args: { value: "yes", slots: { default: "with OpenAPI specification" } } };
export const No: S = { args: { value: "no", slots: { default: "dormant since Oct 2023" } } };
export const Part: S = { args: { value: "part", slots: { default: "paid Enterprise" } } };

/** The bare edition — hue only, for cells where the value already is the
 *  verdict and a glyph would just repeat it. */
export const BareNo: S = { args: { value: "no", symbol: false, slots: { default: "$0" } } };
