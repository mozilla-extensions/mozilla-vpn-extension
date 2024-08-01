import { css } from "../vendor/lit-all.min.js";

/**
 * Removes most Paddings & Margins
 */
export const resetSizing = css`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  /* Remove default margin for body */
  body {
    margin: 0;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0;
    padding: 0;
  }
  p {
    margin: 0;
    padding: 0;
  }
  ul,
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  blockquote {
    margin: 0;
    padding: 0;
  }
  table {
    margin: 0;
    padding: 0;
    border-collapse: collapse;
  }

  th,
  td {
    margin: 0;
    padding: 0;
  }
  form {
    margin: 0;
    padding: 0;
  }

  input,
  button,
  textarea,
  select {
    margin: 0;
    padding: 0;
  }
  figure {
    margin: 0;
    padding: 0;
  }
  fieldset {
    margin: 0;
    padding: 0;
  }

  legend {
    margin: 0;
    padding: 0;
  }
  address {
    margin: 0;
    padding: 0;
  }
  pre {
    margin: 0;
    padding: 0;
  }
`;

export const fontSizing = css`
  * {
    font-family: var(--font-family);
  }
  h1 {
    font-weight: 600;
    font-size: 18px;
    line-height: 27px;
  }
  h2 {
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
  }
  h3 {
    font-weight: normal;
    font-size: 16px;
  }
  p,
  em,
  span {
    font-weight: 400;
    font-size: 14px;
    line-height: 21px;
  }
  .bold {
    font-weight: 600;
  }
`;
