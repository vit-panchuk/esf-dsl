/**
 * The DSL's own strings — every word the language itself prints, and
 * nothing the site says in its own voice.
 *
 * The split matters for extraction: a third party adopting the DSL needs
 * the register headers and the provenance labels, because those are part
 * of the language's rendering contract, and does not need this site's
 * navigation, footer or page copy. So this file travels with the package
 * and `src/lib/i18n.ts` keeps what stays behind, composing these in so the
 * site still reads one table.
 *
 * A translation of these is a translation of the *language*, not of a
 * document: `kind` on a chip stays the English token in every edition
 * because the counter, the JSON-LD provenance nodes and the thread tags
 * all read it — only the visible label resolves through here.
 *
 * Adding a locale is adding a key. `Lang` is a union today because the
 * site publishes exactly two editions; when the package ships, this
 * widens to `string` and the theme supplies the pack. That is the one
 * deliberate piece of not-yet-general in here, and it is recorded rather
 * than hidden.
 */

export type Lang = "en" | "uk";
export const LANGS: Lang[] = ["en", "uk"];

/**
 * The five provenance grades, in meter order — the language's most
 * load-bearing list, and now declared exactly once. `doc.ts` counts with
 * it, the chip renders it, the JSON-LD names it and the thread suffixes
 * it; it lived here *and* in doc.ts until the two files became siblings in
 * one package and the duplicate surfaced.
 *
 * The token is content and never localized; the label in `tags` below is
 * treatment and always is.
 */
export const TAGS = ["observed", "web", "user", "inferred", "assumed"] as const;
export type Tag = (typeof TAGS)[number];

/**
 * A counted noun. English needs two forms and Ukrainian three, so anything
 * printed after a number is a function of that number rather than a string
 * — "108 тверджень" is right and "21 тверджень" is not, and a language
 * whose own evidence meter miscounts its grammar is not making a good case
 * for counting things carefully.
 */
export type Counted = (n: number) => string;

/**
 * The East Slavic three-form rule: one for 1 (but not 11), few for 2–4
 * (but not 12–14), many for the rest. Exported because the site's own
 * counted nouns need exactly the same rule.
 */
export const plural = (n: number, one: string, few: string, many: string): string => {
  const t = n % 10;
  const h = n % 100;
  if (t === 1 && h !== 11) return one;
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return few;
  return many;
};

export interface DslStrings {
  /** Chip labels and evidence-meter row labels. */
  tags: Record<Tag, string>;
  /** Register table column headers — <Strategies>, <Bets>, <EasyWins>. */
  registers: {
    strategies: { code: string; rule: string; written: string; working: string };
    bets: { code: string; bet: string; verdict: string; addresses: string; cost: string };
    easyWins: { code: string; win: string; feeds: string; day: string; status: string };
  };
  /** The evidence meter's heading and the noun it counts. */
  evidenceHeading: string;
  taggedClaims: Counted;
  /** The revision short form, printed wherever a living document states it. */
  rev: string;
  /** The two document kinds of `DocMeta['kind']`, as words. */
  kind: { report: string; note: string };
  /** Labels the markdown rendering prints in its head line, plus the note
   *  the evidence table carries when the stakeholder row is a zero. */
  md: { updated: string; nobodySpoke: string };
  /** The document frame's own labels — the frame ships from here, so
   *  its words do too. */
  frame: { contents: string };
  /** The deck rendering. Every one of these was a hardcoded English
   *  string in the consuming site's slide template until the deck was
   *  packaged — a channel that cannot be translated is a channel only one
   *  edition can publish. */
  deck: {
    /** The line above the first slide: how many, and how to drive it. */
    hint: Counted;
    /** The evidence slide, which always precedes the conclusions. */
    evidenceEyebrow: string;
    evidenceNote: string;
    /** Every slide links back to the section it was selected from. */
    seeSection: (title: string) => string;
    seeReport: string;
  };
}

export const DSL: Record<Lang, DslStrings> = {
  en: {
    tags: {
      observed: "observed",
      web: "web",
      user: "stakeholder",
      inferred: "inferred",
      assumed: "assumed",
    },
    registers: {
      strategies: {
        code: "#",
        rule: "The rule, as if it had been written down",
        written: "Written?",
        working: "Working?",
      },
      bets: { code: "#", bet: "Bet", verdict: "Verdict", addresses: "Addresses", cost: "Cost" },
      easyWins: {
        code: "#",
        win: "Win",
        feeds: "Feeds the machine",
        day: "Agent-day",
        status: "Status",
      },
    },
    evidenceHeading: "Evidence Base",
    taggedClaims: (n) => (n === 1 ? "tagged claim" : "tagged claims"),
    rev: "rev.",
    kind: { report: "Report", note: "Note" },
    md: { updated: "updated", nobodySpoke: "nobody spoke" },
    frame: { contents: "CONTENTS" },
    deck: {
      hint: (n) => `${n} ${n === 1 ? "slide" : "slides"} · use ← → · built from the report`,
      evidenceEyebrow: "Before the conclusions",
      evidenceNote: "How much of what you just heard was actually observed.",
      seeSection: (title) => `See full: ${title} ↗`,
      seeReport: "See the full report ↗",
    },
  },
  uk: {
    tags: {
      observed: "знайдено",
      web: "веб",
      user: "стейкхолдер",
      inferred: "виведено",
      assumed: "припущено",
    },
    registers: {
      strategies: {
        code: "#",
        rule: "Правило, якби його записали",
        written: "Записано?",
        working: "Працює?",
      },
      bets: { code: "#", bet: "Ставка", verdict: "Вердикт", addresses: "Що закриває", cost: "Ціна" },
      easyWins: {
        code: "#",
        win: "Виграш",
        feeds: "Живить машину",
        day: "Агент-день",
        status: "Статус",
      },
    },
    evidenceHeading: "Доказова база",
    taggedClaims: (n) => plural(n, "твердження із джерелом", "твердження із джерелом", "тверджень із джерелом"),
    rev: "ред.",
    kind: { report: "Звіт", note: "Нотатка" },
    md: { updated: "оновлено", nobodySpoke: "ніхто не висловився" },
    frame: { contents: "ЗМІСТ" },
    deck: {
      hint: (n) =>
        `${n} ${plural(n, "слайд", "слайди", "слайдів")} · ← → · зібрано зі звіту`,
      evidenceEyebrow: "Перед висновками",
      evidenceNote: "Скільки з почутого справді знайдено в джерелах.",
      seeSection: (title) => `Повністю: ${title} ↗`,
      seeReport: "Повний звіт ↗",
    },
  },
};
