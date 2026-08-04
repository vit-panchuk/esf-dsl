import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Plate",
  render: ({ slots, ...props }: any) => construct("Plate", props, slots),
};
export default meta;
type S = StoryObj;

/** Halftone imagery — one ink screened into dots, ink or signal orange.
 *  Without a src the plate renders its slot area as the screen. */

export const Ink: S = { args: { alt: "Paddock, 2025", tone: "ink" } };
export const Orange: S = { args: { alt: "Paddock, 2025", tone: "orange" } };
export const Band: S = { args: { alt: "Paddock, 2025", tone: "ink", band: true } };
