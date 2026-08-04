/**
 * The core — the half of the DSL that needs no browser and no build step.
 *
 * Everything re-exported here is plain TypeScript over unified/mdast. That
 * is not an accident of implementation, it is the point: four of the seven
 * channels (md, jsonld, thread, and the deck's *selection*) can be produced
 * from an .mdx file and a graph with nothing else installed, which is what
 * lets an engagement emit its deliverables mid-flight instead of only at
 * publish time.
 *
 * The rendered channels — web, pdf, standalone — live behind
 * `esf-dsl/render`. They need nothing more than these do; they are listed
 * apart only because they write files rather than return strings.
 */
export * from "./strings";
export * from "./document";
export * from "./engagement";
export * from "./doc";
export * from "./emit";
export * from "./select";
export * from "./markdown";
export * from "./render-md";
export * from "./jsonld";
export * from "./graph";
