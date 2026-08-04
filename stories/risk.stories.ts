import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Risk",
  render: ({ slots, ...props }: any) => construct("Risk", props, slots),
};
export default meta;
type S = StoryObj;

/** Ranked by damage × likelihood × how likely you'd notice × cost to
 *  recover. The falsifier is the load-bearing field. */

export const HardToDetect: S = {
  args: {
    id: "R3",
    title: "The half-built admin becomes a permanent third state",
    flag: "hard to detect",
    happens: "The primary evaluation surface for new adopters stays broken",
    likelihood: "High — it is the current trajectory",
    notice: "No. Every signal a maintainer looks at is green",
    cost: "High and rising as the old admin ages",
    falsifier: "Version 1.0 becoming the default — or a recorded decision to cancel it",
    slots: { default: "Three years, version 0.4, and the architecture actively hides the problem." },
  },
};
export const Downgraded: S = {
  args: {
    id: "R1",
    title: "Routine dependency drift",
    flag: "downgraded",
    falsifier: "A Renovate config landing, which would close this entirely",
    slots: { default: "Narrower than a repository-only reading suggests." },
  },
};
