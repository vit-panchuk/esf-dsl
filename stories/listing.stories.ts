import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Listing",
  render: ({ slots, ...props }: any) => construct("Listing", props, slots),
};
export default meta;
type S = StoryObj;

/** Code with a file line and a caption that states the claim the code is
 *  evidence for. */

export const WithFileAndCaption: S = {
  args: {
    file: "solidus.gemspec",
    lang: "rb",
    caption: "The meta-gem still names the old admin.",
    slots: {
      "default": "spec.add_dependency \"solidus_backend\"\nfoo = Bar.new"
    },
  },
};
