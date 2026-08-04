/**
 * Entry headings get their token as their anchor: "#### F1 — A definition
 * of finished existed" anchors at #f1, "#### Role A — Steward the
 * installed base" at #role-a. This is what lets a <Ref> point at an entry
 * with the token alone — the slug is derived from the id the author
 * already wrote, so the two cannot drift.
 */
import { visit } from "unist-util-visit";

const TOKEN = /^\s*(Role [A-Z]|Step \d+|[A-Z]{1,2}\d+)\b/;

const textOf = (node) => {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
};

export default function rehypeEntryIds() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (!/^h[3-6]$/.test(node.tagName)) return;
      const m = textOf(node).match(TOKEN);
      if (m) node.properties.id = m[1].toLowerCase().replace(/\s+/g, "-");
    });
  };
}
