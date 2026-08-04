import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Decision",
  render: ({ slots, ...props }: any) => construct("Decision", props, slots),
};
export default meta;
type S = StoryObj;

/** Reserve vocabulary — the decision-log entry. Most entries in an honest
 *  log are struck through. */

export const Superseded: S = {
  args: {
    id: "D-07",
    status: "superseded",
    rev: 11,
    was: "Rank the absent security policy as the report's top risk.",
    slots: { default: "Withdrawn. The project publishes a security policy; I had looked in the wrong place." },
  },
};
export const Standing: S = {
  args: { id: "D-12", status: "standing", rev: 19, slots: { default: "Treat the fork cost as the primary risk." } },
};
