
/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  overrides: [
    {
      files: ["slides.md", "pages/*.md"],
      options: {
        parser: "slidev",
        plugins: ["prettier-plugin-slidev"],
      },
    },
  ],
};

export default config;