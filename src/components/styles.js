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

export const inCopyLink = css`
  .in-copy-link{
    --in-copy-link-text-color-hover: lch(from var(--in-copy-link-text-color) l c h / 0.8);
    --in-copy-link-text-color-active: lch(from var(--in-copy-link-text-color) l c h / 0.6);
  }

  a.in-copy-link {
    margin-inline-start: 2px;
    color: var(--in-copy-link-text-color);
  }

  .in-copy-link:hover {
    color: var(--in-copy-link-text-color-hover);
  }

  .in-copy-link:active {
    color: var(--in-copy-link-text-color-active);
  }
`;

export const ghostButtonStyles = css`
  button.ghost-btn {
    background-color: transparent;
    border: none;
    border-radius: var(--button-border-radius);
    outline: none !important;
    min-block-size: 40px;
    position: relative;
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

  .ghost-btn:hover::before,
  #settingsList button:hover {
    background: lch(from var(--button-ghost-bg-color) l c h / 0.1);
  }

  .ghost-btn:focus-visible::before,
  #settingsList button:focus-visible {
    border: 2px solid lch(from var(--button-ghost-bg-color) l c h / 0.5);
  }

  .ghost-btn:active::before,
  #settingsList button:active {
    background: lch(from var(--button-ghost-bg-color) l c h / 0.15);
  }

`;

export const primaryBtn = css`
  .primarybtn {
    background-color: var(--action-button-color);
    color: rgba(255, 255, 255, 1);
    border-radius: var(--button-border-radius);
    block-size: 40px;
    border: none;
    margin-bottom: 8px;
    font-size: 16px !important;
    font-family: "Inter Regular";
    transition: var(--button-transition);
    inline-size: 100%;

    --color-enabled-hover: lch(from var(--action-button-color) l c h / 0.8);
    --color-enabled-active: lch(from var(--action-button-color) l c h / 0.6);
  }

  .primarybtn:hover {
    background-color: var(--color-enabled-hover);
  }

  .primarybtn:active {
    background-color: var(--color-enabled-active);
  }
  @media (prefers-color-scheme: dark) {
    .primarybtn {
      background: var(--action-button-color);
      color: black;
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

  @media (prefers-color-scheme: dark) {
    .in-use {
      background: var(--action-button-color);
      color: var(--text-color-invert);
    }
  }
`;
