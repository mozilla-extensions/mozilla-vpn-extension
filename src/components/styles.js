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

export const fontStyling = css`
  * {
    font-family: var(--font-family);
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  p,
  span,
  button {
    font-weight: normal;
  }
  h1 {
    font-size: 18px;
    line-height: 27px;
    font-family: "Inter Semi Bold";
  }
  h2 {
    font-size: 14px;
    line-height: 21px;
    font-family: "Inter Semi Bold";
  }
  h3 {
    font-size: 16px;
  }
  p,
  em,
  span {
    font-size: 14px;
    line-height: 21px;
  }
  .bold {
    font-family: "Inter Semi Bold";
  }

  .text-secondary {
    color: var(--text-secondary-color);
  }
`;

export const ghostButtonStyles = css`
  button.ghost-btn {
    background-color: transparent;
    border: none;
    border-radius: var(--button-border-radius);
    outline: none !important;
    min-block-size: 40px;
  }

  .ghost-icon-btn {
    inline-size: 40px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .ghost-btn::before {
    content: " ";
    pointer-events: none;
    background: lch(from var(--button-ghost-bg-color) l c h / 0);
    transition: var(--button-transition);
    border-radius: var(--button-border-radius);
    position: absolute;
    inset: 0px;
  }

  .ghost-btn:hover::before {
    background: lch(from var(--button-ghost-bg-color) l c h / 0.1);
  }

  .ghost-btn:focus::before {
    border: 2px solid lch(from var(--button-ghost-bg-color) l c h / 0.5);
  }

  .ghost-btn:active::before {
    background: lch(from var(--button-ghost-bg-color) l c h / 0.15);
    border: none;
  }

  @media (prefers-color-scheme: dark) {
    .ghost-icon-btn img {
      filter: invert(1);
    }
  }
`;

export const positioner = css`
  .positioner {
    inline-size: 24px;
    block-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-inline-end: 8px;
    flex: 0 0 auto;
  }
`;

export const inUseLabel = css`
  .in-use {
    font-size: 11px;
    font-weight: bold;
    margin: 0px 10px;
    padding: 6px 10px;
    background: var(--main-card--pill-background);
    opacity: 0.9;
    border-radius: 6px;
    line-height: inherit;
  }

  .in-use-light {
    background-color: #e7e7e7;
  }
`;
