import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* Args carried over from the component's own stories: worked examples
   written against real reports, which is what makes this a gallery rather
   than a swatch page. */
const meta: Meta = {
  title: "ESF/Diagram",
  render: ({ slots, ...props }: any) => construct("Diagram", props, slots),
};
export default meta;
type S = StoryObj;

/** A diagram whose props ARE the graph — which is what lets the markdown
 *  edition emit a real mermaid fence instead of a placeholder. */

export const Sequence: S = {
  args: {
    title: "Who answered whom",
    spec: {
      kind: "sequence",
      actors: ["Auditor", "Maintainers"],
      messages: [
        { from: "Auditor", to: "Maintainers", text: "Which half is scheduled for removal?" },
        { from: "Maintainers", to: "Auditor", text: "no reply", dashed: true },
      ],
    },
    caption: "The silence is the finding.",
  },
};
export const Flow: S = {
  args: {
    title: "Where the plan stalls",
    spec: {
      kind: "flow",
      dir: "LR",
      nodes: [
        { id: "spec", label: "Spec" },
        { id: "agents", label: "Agents", shape: "round" },
        { id: "accept", label: "Human accept", shape: "diamond" },
      ],
      edges: [
        { from: "spec", to: "agents" },
        { from: "agents", to: "accept", label: "the bottleneck" },
      ],
    },
  },
};
