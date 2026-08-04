import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Mortem",
  render: ({ slots, ...props }: any) => construct("Mortem", props, slots),
};
export default meta;
type S = StoryObj;

/** One way the plan fails, imagined from a year out. Early warning and
 *  mitigation are mandatory — dread without a watch condition is not an
 *  entry. */

export const MostLikely: S = {
  args: {
    id: "P1",
    title: "The hard screen gets deferred for an easy one",
    note: "most likely",
    warning: "The first screen attempted is one already on the checklist",
    mitigation:
      "Name the screen before starting, in public, and treat a negative result as a successful outcome",
    slots: {
      default:
        "The path of least resistance is to port another settings page instead — which is exactly the decision that produced the current situation.",
    },
  },
};

export const Bare: S = {
  args: {
    id: "P4",
    title: "The funded migration is chosen by money, not readiness",
    warning: "A single-choice ballot",
    mitigation: "Multiple choice, producing a ranked list",
  },
};
