import type { Meta, StoryObj } from "@storybook/html-vite";
import { construct } from "../lib/render-html";

/* The decided layer's unit — a standing rule, not a one-time bet. Worked
   examples follow the framework's Phase 5: kind from Larson's four, state
   born proposed until the human running the engagement accepts it. */
const meta: Meta = {
  title: "ESF/Policy",
  render: ({ slots, ...props }: any) => construct("Policy", props, slots),
};
export default meta;
type S = StoryObj;

/** An accepted direction policy, fully addressed: diagnosis codes in
 *  `addresses`, the inventory row it ratifies in `relation`, and the
 *  mechanism that makes it real in `operations`. */
export const AcceptedDirection: S = {
  args: {
    id: "PL1",
    title: "Measure before optimizing — no build change ships unmeasured",
    kind: "direction",
    state: "accepted",
    acceptedBy: "the release owner, 2026-08-06",
    executedBy: "CI gate: queue timings published per release",
    review: "2026-11",
    slots: {
      default:
        "The team keeps optimizing the build while the queue is the actual bottleneck — the digest of RC1 (nobody owns the schedule).",
      addresses:
        '<a class="ref" href="#r1">R1<span class="ref-tip">the queue is the real bottleneck</span></a>, <a class="ref" href="#rc1">RC1<span class="ref-tip">nobody owns the schedule</span></a>',
      relation:
        'ratifies <a class="ref" href="#s2">S2<span class="ref-tip">measure before optimizing — unwritten</span></a>',
      operations: "inspection — the queue dashboard at each release review; it cannot silently fail",
    },
  },
};

/** A proposed guidance policy — the state an agent-drafted policy is born
 *  in, and stays in until a human accepts it. No `state` prop on purpose:
 *  the default must be the honest one. */
export const ProposedGuidance: S = {
  args: {
    id: "PL2",
    title: "Prefer extending the monolith; take a service only with a named functional reason",
    kind: "guidance",
    review: "2027-02",
    slots: {
      default:
        "Recommendation awaiting acceptance — scored against the inventory, where the service-per-feature habit is an unwritten strategy-in-force.",
      addresses:
        '<a class="ref" href="#d2">D2<span class="ref-tip">four half-owned services on one hot path</span></a>',
      relation:
        'replaces <a class="ref" href="#s3">S3<span class="ref-tip">new code goes in a new service — unwritten</span></a>',
      operations: "nudge — a bot comment on PRs that add a service, linking the exception path",
    },
  },
};
