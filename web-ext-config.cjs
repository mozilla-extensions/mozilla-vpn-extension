const defaultConfig = {
  sourceDir: "./src/",
  artifactsDir: "./dist/",
  ignoreFiles: [".DS_Store" ],
  build: {
    overwriteDest: true,
  },
  run: {
    firefox: "nightly",
    browserConsole: true,
    startUrl: ["about:debugging#/runtime/this-firefox"],
  },
};

module.exports = defaultConfig;
