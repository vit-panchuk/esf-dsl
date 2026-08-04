import type { StorybookConfig } from "@storybook/html-vite";

/**
 * The language's gallery.
 *
 * The HTML renderer, because that is literally what this package produces:
 * a construct is a function from props to markup, so a story is a call and
 * nothing else. There is no component model to integrate with, which is
 * why there is no framework adapter here.
 *
 * What it is *for* is the same as before the rewrite: every construct
 * rendered on the theme and `esf.css` alone. A construct that only looks
 * right inside some consuming site is a construct this package cannot
 * ship, and this is where that shows up.
 */
const config: StorybookConfig = {
  framework: { name: "@storybook/html-vite", options: {} },
  stories: ["../stories/**/*.stories.ts"],
  addons: [],
};

export default config;
