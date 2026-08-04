import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Event",
  render: ({ slots, ...props }: any) => construct("Event", props, slots),
};
export default meta;
type S = StoryObj;

/** One beat on a Timeline. `gap` renders a recorded silence; `open` marks
 *  something still running; `assumed` marks a dated guess. */

export const Dated: S = { args: { when: "2023-05", slots: { default: "New admin started" } } };
export const Gap: S = { args: { when: "gap", gap: true, slots: { default: "No releases, Oct 23 – Mar 24" } } };
export const Open: S = { args: { when: "2026-06", open: true, slots: { default: "Storefront extraction, ongoing" } } };
export const Assumed: S = { args: { when: "2024-01", assumed: true, slots: { default: "Roadmap quietly dropped" } } };
