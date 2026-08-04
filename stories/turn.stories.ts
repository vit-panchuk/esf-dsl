import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Turn",
  render: ({ slots, ...props }: any) => construct("Turn", props, slots),
};
export default meta;
type S = StoryObj;

/** One voice in a Dialog. `silence` renders the reply that never came. */

export const Spoken: S = {
  args: {
    who: "Auditor",
    when: "2026-07-21",
    slots: { default: "Which half of each pair is scheduled for removal?" },
  },
};
export const Silence: S = { args: { who: "Maintainers", silence: true } };
