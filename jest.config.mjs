export default {
  moduleFileExtensions: [
    "mjs",
    // must include "js" to pass validation https://github.com/facebook/jest/issues/12116
    "js",
  ],
  testRegex: `test\.mjs$`,

  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!**/node_modules/**",
    "!**/vendor/**",
  ],
  collectCoverage: true,
  reporters: ["<rootDir>/tests/reporter.js"],
};
