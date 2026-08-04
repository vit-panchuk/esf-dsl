import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Table",
  render: ({ slots, ...props }: any) => construct("Table", props, slots),
};
export default meta;
type S = StoryObj;

/** Scroll containment on phones — a wide table must scroll inside its own
 *  container, never push the page sideways. */

export const Scrolling: S = {
  args: {
    slots: {
      default:
        "<caption>Duplicated subsystems</caption><thead><tr><th>Subsystem</th>" +
        '<th>Old</th><th>New</th><th class="num">Cycles</th></tr></thead><tbody>' +
        '<tr><td>Admin</td><td>solidus_backend</td><td>solidus_admin</td><td class="num">14</td></tr>' +
        '<tr><td>Promotions</td><td>core</td><td>solidus_promotions</td><td class="num">9</td></tr></tbody>',
    },
  },
};
