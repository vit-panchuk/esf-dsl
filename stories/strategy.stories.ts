import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Strategy",
  render: ({ slots, ...props }: any) => construct("Strategy", props, slots),
};
export default meta;
type S = StoryObj;

/** One strategy-in-force row: rule in the slot, state answers "written?",
 *  health answers "working?" — the graph node's own two properties. */

export const Ratified: S = {
  args: {
    id: "S2",
    state: "ratified",
    health: "Holding — at a cost nobody has priced",
    slots: { default: "Never break an existing store. Deprecate before removing; back-port fixes." },
  },
};
export const Unwritten: S = {
  args: {
    id: "S4",
    state: "nowhere",
    stateVerdict: "no",
    health: "Weakening — four official extensions dormant",
    slots: { default: "Core stays lean; capabilities live in separate extensions." },
  },
};
