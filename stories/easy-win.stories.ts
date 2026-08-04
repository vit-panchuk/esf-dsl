import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/EasyWin",
  render: ({ slots, ...props }: any) => construct("EasyWin", props, slots),
};
export default meta;
type S = StoryObj;

/** One fast-lane row: `feeds` names the machine catalog item — the
 *  admission gate made visible; `status` is the Loop 2 sweep state. */

export const Queued: S = {
  args: {
    id: "E1",
    feeds: "dependency hygiene",
    day: "~0.5 agent-day",
    slots: { default: "Turn on Renovate with the shared preset" },
  },
};
export const Shipped: S = {
  args: {
    id: "E2",
    feeds: "agent harness",
    status: "shipped",
    slots: { default: "Commit AGENTS.md and the one-command dev loop" },
  },
};
export const Ejected: S = {
  args: {
    id: "E3",
    feeds: "verification",
    status: "ejected",
    slots: { default: "Coverage backfill blew its day — became D4" },
  },
};
