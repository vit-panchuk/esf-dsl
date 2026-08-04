# esf-dsl

Report tooling for the **engineering-strategy-framework** skill: a typed
vocabulary for strategy reports, and the compiler that turns one source
into every deliverable an engagement owes.

The framework asks a report to do things prose cannot do on its own — tag
every claim with where it came from, keep a falsifier on every risk, open
with a trust meter counted rather than written, carry a decision log where
superseded entries stay struck rather than deleted. Doing that by hand
across a report, a deck, a summary and a set of structured claims produces
four artefacts that disagree with each other by the second revision.

So the document is written once, in a vocabulary that carries its own
semantics, and everything else is derived. Add a claim and the evidence
meter moves on the next run; it cannot drift from the text, which is the
only reason to trust it.

> **Status: pre-release.** The API moves without notice and the version is
> `0.1.0`. MIT, except the bundled typefaces — see Licence below.

## The engagement, in and out

An agent mid-engagement has a folder, not a website. That is the case this
package is built for:

```
<engagement>/
  report.mdx        the document (or the only .mdx in the folder)
  graph.cypher      optional — the WIP graph
  nodes/            optional — working memory, never published
  out/              written here
```

```bash
esf check  <dir>               # validate, and print the evidence meter
esf emit   <dir>               # markdown, JSON-LD, thread, deck selection
esf render <dir> --standalone  # the report as HTML, its deck, single-file copies
esf bar    <dir>               # just the meter, for pasting into a message
```

`esf` runs on **plain node**. `dist/cli.js` is a self-contained bundle — copy
it somewhere with no `node_modules` beside it and it still works, which is
what makes it shippable as an addon rather than a checkout.

`esf check` on a real report:

```
Evidence Base — 108 tagged claims
[observed]    █████████████████████░░░░░░░░░░░░░░░   57%  (61)
[web]         ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░   27%  (29)
[stakeholder] ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   10%  (11)
[inferred]    ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    6%  ( 7)
[assumed]     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    0%  ( 0)

ok — no problems found

solidus · report · rev 25 · 108 tagged claims · graph 282 nodes
```

`esf emit` writes `report.md`, `report.jsonld`, `thread.txt`, `deck.json`
and `evidence.txt`. **No browser, no build step, no website.**
That is the whole design constraint: an engagement has to be able to emit
its deliverables while it is still running, not only when something
publishes it.

An unpublished report is addressed `local:` rather than given a URL that
will 404. Pass `--origin` when it has a real address, and the canonical
links and the JSON-LD namespace follow.

`esf render` produces the channels that are documents you look at — the
report page, its deck, and with `--standalone` a copy of each folded into
one file that opens from disk with no server and no network.

Rendering is a function call. Each construct is a function from props to
markup, the page is assembled from the same syntax tree every other channel
reads, and the only thing written is the output directory — so it runs from
a read-only install, two renders can proceed at once, and there is no
framework to install at the other end.

The bare page shell is also the honest test of whether the language is
self-sufficient. It loads the theme and `esf.css` and nothing else, so a
construct that quietly depends on some consumer's stylesheet renders wrong
there — which is exactly how the document frame's CSS was found sitting in
a consuming site for a week.

### PDF

The PDF is the HTML through the print stylesheet, driven by a headless
browser — the same page, not a second rendering, so it cannot drift from
what you looked at. That costs a browser, which is a lot to ask of everyone
using a markdown pipeline, so Playwright is **not a dependency**. Install it
only if you want PDFs:

```bash
bun add -d playwright
bunx playwright install chromium

esf render <dir>                    # → out/html
esf pdf    <dir>/out/html           # → out/html/pdf
```

Decks print landscape, documents portrait, one slide per page. Margins come
from `@page` in the stylesheet rather than from flags, so there is one
place they are set. If Playwright is missing, `esf pdf` says so and tells
you these two lines; nothing else in the tool needs it.

`esf check` is a validator with opinions the framework holds:

- a declared selection with nothing marked is an **error**, not an empty deck
- **zero `[user]` claims is a warning**, because an artefact-only report is
  biased low and has to say so — a tool that stayed quiet would help hide
  the exact thing the evidence meter exists to expose
- a missing `graph.cypher` is a warning, because the WIP graph is
  default-on in this framework
- so are a missing `summary`, `framework` version, or `rev`

## The dictionary

There is one place a construct's meaning is written down, and every
renderer is checked against it.

```bash
esf dict                  # all 51, grouped, one line each
esf dict Risk             # props, and what it promises each channel
esf dict --group figure   # one group
esf dict --json           # the whole language, for a program to read
esf dict --check          # has anything drifted?
```

The failure this prevents is a quiet one. A construct gets added, the web
rendering looks right, and the markdown serializer never learns about it —
so it falls through to the default, keeps its words, loses its semantics,
and errors nowhere. The document simply says less in one channel than in
another, which is the exact drift the one-source design exists to prevent.

So each entry states what the construct owes the markdown channel, and
there are four ways to say it — the distinctions are the point:

| | meaning |
|---|---|
| `contract` | a promise, kept by a serializer of its own |
| `via` | the parent serializes it — an `<Event>` is a `<Timeline>` row |
| `plain` | the words survive as written; only treatment is lost |
| `drops` | carries nothing, and the reason is stated |

`drops` is what stops the check being satisfied by silence: without it,
"nobody wrote a serializer" and "deliberately renders nothing" look
identical. `bun run test` then holds every renderer to the entry — names,
prop signatures, markdown handlers, deck treatment, and a worked example
per construct. The first run of it found three serializers for constructs
the language no longer had, and two entries that described the code wrongly.

`esf dict` exists because the caller is usually an agent about to write a
report, and asking the language what it offers beats guessing at a
construct and finding out at build time.

## The fixture

`fixtures/foobar/` is a report that uses **all 43 ambient constructs** and
keeps a graph beside it. It says nothing true about anything; it exists so
that no construct can be added and quietly forget a backend.

The dictionary declares what each construct owes; the fixture makes every
one of them actually run. Both are needed, because a promise can be kept in
the dispatch table and still crash on real props — which is how an
`<Evidence />` authored the obvious way was found taking the whole render
down.

`bun run test` asserts the fixture covers every ambient name and that each
channel carries what it should; `bun run test:render` puts it through the
renderer under two themes. Between them they have already caught a
`<Table>` whose GFM pipe rows produced an empty deck exhibit, and an
`<Evidence />` that took the whole render down when authored the obvious way.

## What it produces

Four channels are **renderings**: complete, derived, no authoring input, and
a block missing from one of them is a bug in a serializer. Three are
**selections**: incomplete by definition, so what survives is an editorial
judgement marked in the source. A build that picks for you is guessing.

| Channel | Kind | Produced by |
|---|---|---|
| Markdown | rendering | `esf emit` |
| JSON-LD (+ the graph's registers and edges) | rendering | `esf emit` |
| Thread | selection | `esf emit` |
| Deck — the selection | selection | `esf emit` |
| Evidence meter | derived | `esf emit`, `esf bar` |
| Deck — the slides | selection | `esf render` |
| Web | rendering | `esf render` |
| Standalone HTML | rendering | `esf render --standalone` |
| PDF | rendering | `esf pdf` (needs Playwright) |

Selections are marked inline while writing — `<Finding deck thread>` — and
budget-checked: 14 words for a slide, 240 characters for a post. Overflow
names the block and stops the run, because a sentence cut at 240 characters
reads like a finished thought and is not one.

The deck comes out of `esf emit` as **JSON, not slides**: the selection is
the expensive, editorial half and it is fully determined offline, while
turning it into HTML needs a renderer. A consumer with one feeds the JSON
straight to `<Deck>`; a consumer without one still gets the answer to "what
would be on the slides", which is the part a human reviews.

## Layout

```
lib/         the language — plain TypeScript over unified/mdast
  dictionary.ts   what each construct means and owes (see below)
  html.ts         one emitter per construct: props in, markup out
  doc.ts          parses the document once; everything derives from that tree
  render-*.ts     the channels
styles/      esf.css (the language) + theme-vit-panchuk.css (the default theme)
stories/     a worked example of every construct
fixtures/    a report using all 43 ambient constructs, and two unalike themes
```

There is no framework here and no runtime beyond node. `bun run test:core`
proves the offline channels run in a plain process with nothing around
them, because the consumer this is built for is an agent with a directory,
not a site with a build.

A consumer that has its own component model wraps these functions rather
than reimplementing them — one call, `construct(name, props, slots)`, for
all 51. vit-panchuk.com is the reference consumer and does exactly that in
about forty lines.

## Library API

```ts
import { load, emit, check } from "esf-dsl/engagement";  // a folder in, deliverables out
import { analyse, toMarkdownDoc, thread, jsonld } from "esf-dsl/core";  // the pieces
import { documentOf } from "esf-dsl/document";           // front-matter → DocMeta
```

```ts
const e = await load("./engagements/solidus");
e.facts.total          // claims, counted from the chips
e.facts.counts.assumed // how much of it is still a guess
e.graph?.nodes.length  // the WIP graph, if one is kept beside the report
```

| Import | What it is |
|---|---|
| `esf-dsl/engagement` | a directory in, deliverables out — the CLI is a thin shell over this |
| `esf-dsl/dictionary` | the language itself: every construct, its props, its promises |
| `esf-dsl/document` | front-matter parsing, validation, and the framework's schema |
| `esf-dsl/core` | the whole offline pipeline |
| `esf-dsl/core/doc` | the semantic analyzer — parses once, counts the chips |
| `esf-dsl/core/render-md` · `/jsonld` · `/select` · `/graph` · `/markdown` | the backends |
| `esf-dsl/core/strings` | the language's own words, per locale |
| `esf-dsl/html` | `construct(name, props, slots)` — one construct to markup |
| `esf-dsl/document-html` | a parsed document to the whole content area |
| `esf-dsl/render` | an engagement to HTML and slides on disk |
| `esf-dsl/standalone` | fold a built report and its deck into one file each |
| `esf-dsl/pdf` | a render to PDF, if Playwright is installed |
| `esf-dsl/styles/esf.css` · `/theme-vit-panchuk.css` | the language's stylesheet, and the default theme |
| `esf-dsl/rehype-entry-ids` | anchors entry headings (F1, RC1, B6…) by their own token |

## The privacy boundary

The graph and the report have different trust levels, and the compiler
enforces the difference. **The graph is working memory** and legitimately
records private topology — local checkout URIs, session transcript
identifiers, node-file paths. **Every public projection is sanitized**:
working-state properties never leave, a `uri` survives only when it is
`https?://`, any value that still names local topology drops its property,
and `assertPublic` fails the run if a new leak shape gets past the
sanitizer.

This matters more here than it would in a website, because the thing
driving this is an agent with a transcript and a checkout. Redaction is a
compile step, not an authoring burden — the working graph stays fully
addressed.

## Grammar, in five rules

- **Announced, never inferred.** Semantics are declared where they hold —
  `legend` on a chip, `status` on a decision — never deduced from context.
  Every counting bug found so far lived where meaning was being inferred.
- **Counted, never authored.** The evidence meter is computed from the
  `<Chip>` elements in the prose.
- **Content vs treatment.** Hues, glyphs and strikethroughs come from the
  component; the words and the tags survive into every channel. Authoring a
  ✓ or a tag by hand is the error the DSL exists to prevent.
- **One namespace.** `R3` is the same address in prose, in the graph, in the
  page anchor, in the markdown edition and in the JSON-LD `@id`. Withdrawn
  items keep their numbers; the gap is information.
- **The graph is the model; prose is a view.** When they disagree, the
  derived rendering is the bug.

## Adding a construct

A new construct is a language change, not a component. It lands only with
all of: the framework rule it enforces, a dictionary entry stating what it
promises each channel, an emitter, a story, renderings in every channel it
can appear in, a graph node type with the same properties, and a test
pinning its semantics. `bun run test` fails until the dictionary and the
renderers agree, so most of that list is enforced rather than remembered.

The admission test for whether it belongs here at all is the `md` field: a
construct that owes a rendering to the channels is document vocabulary; one
that renders in no channel — a loading skeleton, a nav — is application UI
and belongs to the consumer. Two such handlers were found still sitting in
the markdown serializer when the dictionary was first checked against it.

## Theming

Only the rendered channels have a theme, and only a consumer that renders
them needs one. A theme is **one CSS file defining the token contract**,
plus its fonts; `esf.css` consumes those and hard-codes no colour, face or
step. `theme-vit-panchuk.css` is the default and the worked example.

```bash
esf render <dir> --theme ./my-theme.css
```

That is the whole wiring: one file, one flag. No component is touched and
no build step is involved.

Write one by copying `styles/theme-vit-panchuk.css` and changing the
values. It must define every property in `:root`:

| Group | Properties |
|---|---|
| ground and ink | `--paper` `--surface` `--ink` `--ink-muted` `--rule` `--rule-firm` |
| the one accent | `--signal` `--signal-ink` `--signal-wash` |
| provenance scale | `--tag-observed` `--tag-web` `--tag-user` `--tag-inferred` `--tag-assumed` |
| verdicts | `--verdict-yes` `--verdict-no` |
| code | `--code-wash` `--code-lit` `--code-key` `--code-str` `--code-num` |
| plates | `--plate-screen` `--plate-screen-ink` |
| type | `--display` `--body` `--mono`, and `--step--1` … `--step-5` |
| space | `--s1` … `--s9`, `--measure`, `--shell` |
| motion | `--dur-1` … `--dur-4`, `--ease-out` `--ease-in-out` `--ease-snap` |

Optionally a `@media (prefers-color-scheme: dark)` block and a
`:root[data-theme="paper"]` one, which the print stylesheet switches to.

### Custom fonts

Put `@font-face` in the theme file. Paths are relative to that file, and
nothing else needs configuring:

```css
@font-face {
  font-family: "Custom Face";
  src: url(fonts/CustomFace.woff2) format("woff2");
  font-display: swap;
}
:root { --display: "Custom Face", Georgia, serif; }
```

```bash
esf render <dir> --theme ./my-theme/theme.css --standalone
```

The face is hashed and emitted beside the HTML, the `url()` is rewritten to
point at it, and in the `--standalone` copy it is inlined as a data URI —
so the single file you hand somebody carries its own typeface and does not
fall back to a system face on their machine. `../` paths work too; the font
does not have to sit under the theme.

`fixtures/theme-webfont/` is exactly this, and `bun run test:render`
asserts all four halves of it: emitted once, url rewritten, inlined into
the standalone, and no asset url left behind.

`fixtures/theme-mono.css` is a second, deliberately unalike theme — serif
face, blue signal, tighter measure — and it exists to be run rather than
read. `bun run test:render` renders the fixture under both and asserts the
tokens and the type change while the document does not: same chips, same
registers, same slides. A contract that is only described is a contract
that has already drifted.

The theme cannot enforce the rule that matters most, so it is written down
instead: **`--signal` marks uncertainty, never decoration.** In
`theme-mono.css` it is blue, and it still marks only the guess.

Not themeable, on purpose: class names, the `data-evidence` /
`data-verdict` / `data-epistemic` attributes, the channel contracts, and
every `md` promise in the dictionary.

## Development

```bash
bun install
bun run test        # 65 pass, 2 skip — includes the dictionary checks
bun run test:core   # the offline channels, in a plain process
bun run check       # types
bun run test:render # the fixture through the renderer, under two themes
bun run storybook   # the gallery, port 6007
bun run esf -- dict # what the language offers
bun run esf -- check <dir>
```

The two skips are the graph tests that read a real engagement's
`graph.cypher` from beside the checkout, and stand down when there is none.

To develop against a consuming site before publication:

```bash
bun link                            # here
cd ../your-site && bun link esf-dsl
```

## Licence

MIT, with one exception that cannot be waived.

The three Fixel faces in `styles/fonts/` are **SIL OFL 1.1**, copyright
MacPaw Inc. Bundling them with software is explicitly permitted and this is
that; selling them on their own is not. They stay under the OFL — the
licence requires the Font Software be distributed entirely under the OFL
and no other — so they are not covered by the MIT grant above them and
`OFL.txt` has to travel with them wherever they go. The package therefore
declares `MIT AND OFL-1.1`, because saying only "MIT" would be wrong about
a third of the tarball.

A theme that names its own faces needs none of this: drop `--display` and
`--body` onto whatever you have a licence for, and the Fixel files go
unused.

## Known gaps

- **`dist/cli.js` is committed.** A build artefact in git is a real cost —
  it can drift from source. It is here because the whole point is an entry
  point that runs with no build step; rebuild it (`bun run build`) in any
  commit that touches `lib/` or `cli.ts`.
- `Lang` is `"en" | "uk"` rather than `string`.
- Prose claims and graph claims are not joined: the page numbers claims
  positionally (`claim-1…`) while the graph names them (`c007`). Until the
  ids align, claim→register `SUPPORTS` edges stay out of the JSON-LD.
- The graph→MDX direction is manual. Nothing generates prose scaffolding
  from the graph yet.
- Selections exist in MDX only; the graph does not record deck/thread marks.
- `.seq-arrow` and `.axis-range` are styled but no construct emits them.
- The reserve is held back for a reason: `<Claim>` renders on the web and
  in markdown, but the evidence counter reads `<Chip>` and only `<Chip>`,
  so a claim graded that way is never counted. `esf dict Claim` says so.
