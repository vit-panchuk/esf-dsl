import type { Preview } from "@storybook/html-vite";

/**
 * Two stylesheets and nothing else — the theme, then the language.
 *
 * Nothing here may depend on a consumer's CSS. If a story needs a rule
 * that lives in some website's stylesheet, the bug is in `esf.css`.
 */
import "../styles/theme-vit-panchuk.css";
import "../styles/esf.css";

const preview: Preview = {
  parameters: { backgrounds: { disable: true }, layout: "padded" },
  globalTypes: {
    theme: {
      description: "Theme variant — the tokens swap, the constructs do not.",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "paper", title: "Paper (print proof)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (story, context) => {
      document.documentElement.dataset.theme = context.globals.theme ?? "light";
      return story();
    },
  ],
};

export default preview;
