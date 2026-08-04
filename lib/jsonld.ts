import type { DocMeta } from './emit';
import { assertPublic, publicProjection, type Graph } from './graph';

/**
 * Who is publishing, and under whose vocabulary.
 *
 * The DSL has no opinion about either: it is a language, and a language
 * does not know which site is speaking it. Both were read straight off
 * this repo's `site.config.ts` until the extraction work — passing them
 * in is what lets a third party emit JSON-LD under their own namespace
 * without forking the serializer.
 */
export interface Identity {
  /** The origin the vocabulary namespace and the author URL derive from. */
  origin: string;
  /** The document's author, per edition — the Ukrainian rendering names
   *  its author in Ukrainian. */
  author: string;
}

const nsOf = (id: Identity) => `${id.origin}/ns#`;

/**
 * JSON-LD, and the one thing it is for here.
 *
 * Most sites emit schema.org to be indexed. This one emits it because the
 * evidence tags are structured data that happens to be sitting in prose: a
 * claim, its provenance, and whether anyone checked it. Written out, the
 * grading becomes machine-readable — a crawler, an agent, or a future
 * version of this site can ask "what did this report actually observe?"
 * without parsing English.
 *
 * So the mapping is deliberately narrow. Article metadata because it costs
 * nothing, then the claims. No breadcrumbs, no organisation boilerplate, no
 * aggregateRating on a document that nobody rated.
 */

const TYPE = { report: 'Report', note: 'Article', page: 'WebPage' } as const;

export interface ClaimNode {
  id: string;
  text: string;
  /** The evidence tag — the whole reason this file exists. */
  tag: 'observed' | 'user' | 'inferred' | 'web' | 'assumed';
  /** For web-sourced claims, where it came from. */
  source?: { url: string; title: string; retrieved?: string };
}

/**
 * `assumed` is not a weaker `observed`; it is the absence of evidence, and
 * flattening the two would misreport the document. schema.org has no
 * vocabulary for provenance grade, so the tag rides as a named property
 * under the site's own namespace and the standard fields stay honest:
 * `citation` only where there is something to cite.
 */
const claim = (c: ClaimNode, base: string, ns: string) => ({
  '@type': 'Claim',
  '@id': `${base}#${c.id}`,
  text: c.text,
  [`${ns}evidence`]: c.tag,
  ...(c.source
    ? {
        citation: {
          '@type': 'WebPage',
          url: c.source.url,
          name: c.source.title,
          ...(c.source.retrieved ? { dateAccessed: c.source.retrieved } : {}),
        },
      }
    : {}),
});

/**
 * The register projection — when the engagement keeps a WIP graph beside
 * the repo, the item registers (risks, debts, bets, decisions…) and the
 * edges between them derive from `graph.cypher` instead of being
 * re-extracted from prose. Node `@id`s are the page's own anchors, so a
 * consumer can join the structured register to the rendered entry.
 *
 * The projection is sanitized (see lib/graph.ts) and the emit re-asserts
 * it: the working graph legitimately records local topology — checkout
 * paths, session ids — and none of it may reach a public document.
 */
const registers = (graph: Graph, base: string) => {
  const g = publicProjection(graph);
  const out = {
    'ns#register': g.nodes.map((n) => {
      const { title, status, ...rest } = n.props;
      return {
        '@type': `ns#${n.type}`,
        '@id': `${base}#${n.id.toLowerCase()}`,
        'ns#code': n.id,
        ...(title !== undefined ? { name: title } : {}),
        ...(status !== undefined ? { 'ns#status': status } : {}),
        ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [`ns#${k}`, v])),
      };
    }),
    'ns#edge': g.edges.map((e) => ({
      'ns#from': `${base}#${e.from.toLowerCase()}`,
      'ns#rel': e.type,
      'ns#to': `${base}#${e.to.toLowerCase()}`,
    })),
  };
  assertPublic(JSON.stringify(out));
  return out;
};

export const jsonld = (
  meta: DocMeta,
  claims: ClaimNode[],
  o: { summary?: string; graph?: Graph; identity: Identity },
) => {
  const { summary, graph, identity } = o;
  const NS = nsOf(identity);
  const counts = claims.reduce<Record<string, number>>((a, c) => ((a[c.tag] = (a[c.tag] ?? 0) + 1), a), {});
  return {
    '@context': ['https://schema.org', { ns: NS }],
    '@type': TYPE[meta.kind],
    '@id': meta.canonical,
    url: meta.canonical,
    headline: meta.title,
    ...(meta.subtitle ? { alternativeHeadline: meta.subtitle } : {}),
    ...(summary ? { abstract: summary } : {}),
    dateModified: meta.updated,
    ...(meta.revision ? { version: String(meta.revision) } : {}),
    author: { '@type': 'Person', name: identity.author, url: identity.origin },
    inLanguage: meta.lang ?? 'en',
    /* The evidence meter, in the same numbers the page and the markdown
       show. Three renderings of one count is fine; three counts is not, so
       all of them read this. */
    'ns#evidence': { 'ns#total': claims.length, ...Object.fromEntries(Object.entries(counts).map(([k, v]) => [`ns#${k}`, v])) },
    ...(claims.length ? { 'ns#claim': claims.map((c) => claim(c, meta.canonical, NS)) } : {}),
    ...(graph ? registers(graph, meta.canonical) : {}),
  };
};
