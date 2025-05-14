/**
 * This Class will
 */

export class FirefoxThemeImporter extends HTMLElement {
  // Not every theme set's all variables.
  // We will depend on some CSS variables beeing set
  // if the theme does not set them, we will fall back
  // to the default DARK / LIGHT theme colors
  static EXPECTED_KEYS = ["popup", "toolbar"];

  static FALLBACKS = {
    "color-accent-primary":
      "light-dark(var(--color-blue-50), var(--color-cyan-50))",
  };

  connectedCallback() {
    this.update();
    browser.theme.onUpdated.addListener(() => {
      this.update();
    });
  }
  async update() {
    const theme = await browser.theme.getCurrent();
    const isDarkMode =
      window.matchMedia &&
      !!window.matchMedia("(prefers-color-scheme:dark)").matches;

    if (!theme || !this.isValidTheme(theme.colors)) {
      this.importColors(isDarkMode ? DEFAULT_DARK : DEFAULT_LIGHT);
      return;
    }
    this.importColors(theme.colors);
  }
  importColors(colors) {
    requestAnimationFrame(() => {
      /** @type {HTMLHtmlElement} */
      var r = document.querySelector(":root");
      Object.values(r)
        .filter((e) => e.startsWith("--firefox"))
        .forEach((e) => {
          r.style.removeProperty(e);
        });
      Object.entries(colors).forEach(([key, value]) => {
        if (!value) {
          return;
        }
        r.style.setProperty(`--firefox-${key}`, value);
      });
    });
  }

  isValidTheme(colors) {
    if (!colors) {
      return false;
    }
    return Object.entries(colors).every(([key, value]) => {
      if (FirefoxThemeImporter.EXPECTED_KEYS.includes(key)) {
        return value != null;
      }
      return true;
    });
  }
}
customElements.define("firefox-theme", FirefoxThemeImporter);

/**
 * Those variables are exported from the Dark/Light Manifest.
 */
const DEFAULT_DARK = {
  accentcolor: null,
  bookmark_text: null,
  button_background_active: null,
  button_background_hover: null,
  frame: "rgb(28, 27, 34)",
  frame_inactive: "rgb(31, 30, 37)",
  icons: "rgb(251,251,254)",
  icons_attention: null,
  ntp_background: "rgb(43, 42, 51)",
  ntp_card_background: "rgb(66,65,77)",
  ntp_text: "rgb(251, 251, 254)",
  popup: "rgb(66,65,77)",
  popup_border: "rgb(82,82,94)",
  popup_highlight: "rgb(43,42,51)",
  popup_highlight_text: null,
  popup_text: "rgb(251,251,254)",
  sidebar: "rgb(28, 27, 34)",
  sidebar_border: "rgb(82, 82, 94)",
  sidebar_highlight: null,
  sidebar_highlight_text: null,
  sidebar_text: "rgb(249, 249, 250)",
  tab_background_separator: null,
  tab_background_text: "#fbfbfe",
  tab_line: "transparent",
  tab_loading: null,
  tab_selected: "rgba(106,106,120,0.7)",
  tab_text: "rgb(255,255,255)",
  textcolor: null,
  toolbar: "rgb(43,42,51)",
  toolbar_bottom_separator: "rgb(82, 82, 94)",
  toolbar_field: "rgba(0, 0, 0, .3)",
  toolbar_field_border: "transparent",
  toolbar_field_border_focus: null,
  toolbar_field_focus: "rgb(66,65,77)",
  toolbar_field_highlight: null,
  toolbar_field_highlight_text: null,
  toolbar_field_separator: null,
  toolbar_field_text: "rgb(251,251,254)",
  toolbar_field_text_focus: null,
  toolbar_text: "rgb(251, 251, 254)",
  toolbar_top_separator: "transparent",
  toolbar_vertical_separator: null,
  button: "rgba(0, 0, 0, .33)",
  button_hover: "rgba(207, 207, 216, .20)",
  button_active: "rgba(207, 207, 216, .40)",
  button_primary: "rgb(0, 221, 255)",
  button_primary_hover: "rgb(128, 235, 255)",
  button_primary_active: "rgb(170, 242, 255)",
  button_primary_color: "rgb(43, 42, 51)",
  input_background: "#42414D",
  input_color: "rgb(251,251,254)",
  urlbar_popup_separator: "rgb(82,82,94)",
};

const DEFAULT_LIGHT = {
  accentcolor: null,
  bookmark_text: null,
  button_background_active: null,
  button_background_hover: null,
  frame: "rgb(240, 240, 244)",
  frame_inactive: "rgb(235, 235, 239)",
  icons: "rgb(91,91,102)",
  icons_attention: null,
  ntp_background: "#F9F9FB",
  ntp_card_background: null,
  ntp_text: "rgb(21, 20, 26)",
  popup: "#fff",
  popup_border: "rgb(240,240,244)",
  popup_highlight: "#e0e0e6",
  popup_highlight_text: "#15141a",
  popup_text: "rgb(21,20,26)",
  sidebar: "rgb(255, 255, 255)",
  sidebar_border: "rgb(240, 240, 244)",
  sidebar_highlight: null,
  sidebar_highlight_text: null,
  sidebar_text: "rgb(21, 20, 26)",
  tab_background_separator: null,
  tab_background_text: "rgb(21,20,26)",
  tab_line: "transparent",
  tab_loading: null,
  tab_selected: "#fff",
  tab_text: "rgb(21,20,26)",
  textcolor: null,
  toolbar: "#f9f9fb",
  toolbar_bottom_separator: "rgb(240, 240, 244)",
  toolbar_field: "rgba(0, 0, 0, .05)",
  toolbar_field_border: "transparent",
  toolbar_field_border_focus: null,
  toolbar_field_focus: "white",
  toolbar_field_highlight: null,
  toolbar_field_highlight_text: null,
  toolbar_field_separator: null,
  toolbar_field_text: "rgb(21, 20, 26)",
  toolbar_field_text_focus: null,
  toolbar_text: "rgb(21,20,26)",
  toolbar_top_separator: "transparent",
  toolbar_vertical_separator: null,
  popup_action_color: "rgb(91,91,102)",
  button: "rgba(207,207,216,.33)",
  button_hover: "rgba(207,207,216,.66)",
  button_active: "rgb(207,207,216)",
  button_primary: "rgb(0, 97, 224)",
  button_primary_hover: "rgb(2, 80, 187)",
  button_primary_active: "rgb(5, 62, 148)",
  button_primary_color: "rgb(251, 251, 254)",
  input_color: "rgb(21,20,26)",
  input_background: "rgb(255,255,255)",
  urlbar_popup_hover: "rgb(240,240,244)",
  urlbar_popup_separator: "rgb(240,240,244)",
};
