import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Toc",
  render: ({ slots, ...props }: any) => construct("Toc", props, slots),
};
export default meta;
type S = StoryObj;

/** Contents, with scroll-spy. */

export const Sections: S = {
  args: {
    label: "CONTENTS",
    sections: [
      { text: "What actually expired", slug: "what-actually-expired" },
      { text: "The symmetric error", slug: "the-symmetric-error" },
      { text: "Where the plan actually stalls", slug: "where-the-plan-actually-stalls" },
    ],
  },
};
export const Ukrainian: S = {
  args: {
    label: "ЗМІСТ",
    sections: [
      { text: "Що саме протухло", slug: "що-саме-протухло" },
      { text: "Симетрична помилка", slug: "симетрична-помилка" },
    ],
  },
};
/** One heading renders nothing — an index of one is furniture. */
export const TooFewToShow: S = {
  args: { label: "CONTENTS", sections: [{ text: "Only section", slug: "only" }] },
};
