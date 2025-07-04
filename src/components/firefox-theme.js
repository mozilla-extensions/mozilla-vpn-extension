/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

/**
 * This Class will
 */
const CARD_DARKEN_INTENSITY = 20;

/**
 * Represents a color in HSL and RGB format.
 */
class HSLRGBColor {
  /** The hue of the color */
  h;
  /** The saturation of the color */
  s;
  /** The lightness of the color */
  l;

  r;
  g;
  b;
}
class Color {
  /** @type {string} The key used in the theme */
  key;
  /** @type {string} the raw css value */
  value;
  /** @type {HSLRGBColor} the HSL color representation */
  hslColor;
}

export class FirefoxThemeImporter extends HTMLElement {
  // Not every theme set's all variables.
  // We will depend on some CSS variables beeing set
  // if the theme does not set them, we will fall back
  // to the default DARK / LIGHT theme colors
  static EXPECTED_KEYS = ["popup", "toolbar_text", "popup_text"];
  static OPTIONAL_KEYS = ["icons", "toolbar_text"];

  static IMPORT_KEYS = [
    ...FirefoxThemeImporter.EXPECTED_KEYS,
    ...FirefoxThemeImporter.OPTIONAL_KEYS,
  ];

  static CARD_ACCENT_KEYS = [
    "frame",
    "tab_selected",
    "ntp_card_background",
    "toolbar",
    "sidebar",
    "icons",
  ];

  connectedCallback() {
    this.update();
    // @ts-ignore
    browser.theme.onUpdated.addListener(() => {
      this.update();
    });
  }

  async update() {
    const colors = FirefoxThemeImporter.resolveColors(
      await browser.theme.getCurrent()
    );
    const isDarkMode =
      window.matchMedia &&
      !!window.matchMedia("(prefers-color-scheme:dark)").matches;

    const needsColor = (c) => FirefoxThemeImporter.IMPORT_KEYS.includes(c.key);

    if (!colors || !this.isValidTheme(colors)) {
      const defaultColors = FirefoxThemeImporter.resolveColors({
        //@ts-ignore
        colors: isDarkMode ? DEFAULT_DARK : DEFAULT_LIGHT,
      });
      if (!defaultColors) {
        throw new Error("Could not resolve default colors");
      }
      this.importColors(defaultColors.filter(needsColor));
      this.importColors(
        FirefoxThemeImporter.defaultAccentColor(isDarkMode),
        "mz"
      );
      return;
    }
    this.importColors(colors);
    this.importAccentColors(colors, isDarkMode);
  }

  /**
   * Benchmarks the update() method n times and logs the average runtime.
   * @param {number} n Number of times to run update()
   * @returns {Promise<void>}
   */
  async benchmarkUpdate(n = 10) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      const start = performance.now();
      await this.update();
      const end = performance.now();
      total += end - start;
    }
    const avg = total / n;
    console.log(
      `[firefox-theme] update() average over ${n} runs: ${avg.toFixed(2)} ms`
    );
  }

  /**
   * Imports the theme colors into the document.
   * @param {Array<{key:String, value:String}>} colors - The theme colors.
   * @param {string} prefix - The prefix to use for the CSS variables.
   */
  importColors(colors, prefix = "firefox") {
    if (!Array.isArray(colors)) {
      return;
    }
    /** @type {HTMLHtmlElement?} */
    var r = document.querySelector(":root");
    if (!r) {
      return;
    }
    // Remove all previous colors with the prefix
    Object.values(r)
      .filter((e) => e.startsWith(`--${prefix}`))
      .forEach((e) => {
        r?.style.removeProperty(e);
      });
    // Set the new colors
    colors.forEach(({ key, value }) => {
      if (!value) {
        return;
      }
      r?.style.setProperty(`--${prefix}-${key}`, value);
    });
  }
  /**
   * Returns the default accent color for the theme.
   * @param {boolean} isDarkMode
   */
  static defaultAccentColor(isDarkMode) {
    return [
      { key: "card-background", value: "#321c64" },
      { key: "card-text-color", value: "#ffffff" },
      { key: "accent-color", value: isDarkMode ? "#00ddff" : "#0060df" },
    ];
  }

  /**
   * Generator function that yields accent color objects for the theme.
   * @param {Array<Color>} colors - The theme colors.
   * @param {boolean} isDarkMode - True if dark mode is enabled.
   */
  *generateAccentColors(colors, isDarkMode) {
    if (colors == null) {
      return;
    }
    const background = colors.find(({ key }) => key === "popup");
    if (!background) {
      return;
    }
    const darken = (variable, intensity = CARD_DARKEN_INTENSITY) => {
      return `lch(from var(--firefox-${variable}) calc(l - ${intensity})  c h )`;
    };

    // For the Card we will select a subset of colors
    // that are always visible in the browser frame.
    const cardKeyColor = FirefoxThemeImporter.selectKeyColor(
      colors.filter(({ key }) =>
        FirefoxThemeImporter.CARD_ACCENT_KEYS.includes(key)
      ),
      background
    );
    if (cardKeyColor) {
      console.log(
        "Selected card key color:",
        cardKeyColor.key,
        cardKeyColor.value
      );
      yield { key: "card-background", value: darken(cardKeyColor.key) };
    }

    // The Accent Color (for buttons and active state), that can be selected
    // from any color in the theme.
    const accentKeyColor = FirefoxThemeImporter.selectKeyColor(
      colors,
      background
    );
    if (accentKeyColor) {
      console.log(
        "Selected accent key color:",
        accentKeyColor.key,
        accentKeyColor.value
      );
      yield {
        key: "accent-color",
        value: `var(--firefox-${accentKeyColor.key})`,
      };
    }

    if (cardKeyColor === null) {
      yield { key: "card-text-color", value: "white" };
      return; // We're using the default card color. so white text.
    }
    // @ts-ignore
    const cardCompareColor = cardKeyColor.hslColor;
    cardCompareColor.l = cardCompareColor.l - CARD_DARKEN_INTENSITY;
    const textColor = FirefoxThemeImporter.selectHighestContrastTextColor(
      colors,
      cardCompareColor
    );
    if (!textColor) {
      yield { key: "card-text-color", value: isDarkMode ? "white" : "black" };
      return;
    }
    const textContrast = Math.abs(textColor.hslColor.l - cardCompareColor.l);

    let cardText = `var(--firefox-${textColor.key})`;
    if (textContrast < 50) {
      console.warn(
        `Text color ${textColor.key} has not enough contrast to card color ${cardKeyColor.key}. Using white/black instead.`
      );
      const luminance = FirefoxThemeImporter.relativeLuminance(
        cardCompareColor.r,
        cardCompareColor.g,
        cardCompareColor.b
      );
      cardText = luminance > 0.5 ? "black" : "white";
    }
    console.log("Selected text color:", textColor.key, textColor.value);
    yield { key: "card-text-color", value: cardText };
  }

  /**
   * Calculates the relative luminance of an RGB color.
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {number} Relative luminance (0.0 - 1.0)
   */
  static relativeLuminance(r, g, b) {
    // Convert sRGB to linear values
    const srgbToLinear = (c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const R = srgbToLinear(r);
    const G = srgbToLinear(g);
    const B = srgbToLinear(b);
    // Calculate luminance
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  /**
   *
   * @param {Array<Color>} colors - The theme colors.
   * @param {boolean} isDarkMode - True if the theme is dark mode, false otherwise.
   */
  importAccentColors(colors, isDarkMode) {
    this.importColors(
      [
        ...FirefoxThemeImporter.defaultAccentColor(isDarkMode),
        ...Array.from(this.generateAccentColors(colors, isDarkMode)),
      ],
      "mz"
    );
  }

  /**
   * Resolves the theme colors into a more usable format.
   * @param {browser.theme.Theme} theme
   * @returns {Array<Color>?}
   */
  static resolveColors(theme) {
    if (!theme || !theme.colors) {
      return null;
    }
    return Object.entries(theme.colors)
      .filter(([_, value]) => {
        return value != null;
      })
      .map(([key, value]) => {
        const hslColor = FirefoxThemeImporter.parseCssColor(value.toString());
        if (!hslColor) {
          throw new Error(`Could not parse color: ${value}`);
        }
        return { key, value: value.toString(), hslColor };
      });
  }

  /**
   * Selects a key color from the provided colors.
   * The selected color should be a good accent color and have enough contrast with the background.
   *
   * @param {Array<Color>} colors - The theme colors.
   * @param {Color} background - The background color to consider for selection.
   * @returns {Color | null} The selected color or null if no suitable color is found.
   */
  static selectKeyColor(colors, background) {
    // First Check the Background color.
    if (!background) {
      return null;
    }
    /**
     * Checks if the color has enough contrast with the background.
     * @param {HSLRGBColor} hslColor
     * @returns {boolean}
     */
    const hasEnoughContrast = (hslColor) => {
      // Check if the color is sufficiently different from the background
      const contrast = Math.abs(
        hslColor.l -
          CARD_DARKEN_INTENSITY -
          /** @type {HSLRGBColor} */ (background.hslColor).l
      );
      return contrast > 20;
    };

    const mappedColors = colors
      // Filter out colors that couldn't be parsed or aren't good accent colors
      .filter(({ hslColor }) => {
        return (
          hslColor &&
          hasEnoughContrast(hslColor) &&
          FirefoxThemeImporter.isGoodAccentColor(hslColor)
        );
      })
      // Sort by a combined score of saturation and luminance (favoring mid-luminance)
      .sort((a, b) => {
        const score = (hsl) => hsl.s * (1 - Math.abs(hsl.l - 50) / 50);
        return score(b.hslColor) - score(a.hslColor);
      });

    // Return the first element or null
    const selectedColor = mappedColors.length > 0 ? mappedColors[0] : null;
    return selectedColor;
  }

  /**
   * Selects the text color with the highest contrast to the given HSL color.
   * @param {Array<Color>} colorList - The list of colors to choose from.
   * @param {HSLRGBColor} hslColor - The HSL color to compare against.
   * @returns {Color | null} The selected color or null if no suitable color is found.
   */
  static selectHighestContrastTextColor(colorList, hslColor) {
    const mappedColors = colorList
      .filter(({ key, value }) => {
        // the key should contain "text"
        return key.includes("text") && value != null;
      })
      // Sort by who has the most contrast to hslColor
      .sort((a, b) => {
        const contrastA = Math.abs(a.hslColor.l - hslColor.l);
        const contrastB = Math.abs(b.hslColor.l - hslColor.l);
        return contrastB - contrastA;
      });
    // Return the first element or null
    const selectedColor = mappedColors.length > 0 ? mappedColors[0] : null;
    console.log("Selected text color:", selectedColor?.key);
    return selectedColor;
  }

  /**
   * Parses a CSS color string into its HSL components.
   * Supports HSL, RGB, and Hex color formats.
   * @param {string | null | undefined} colorString The CSS color string.
   * @returns {{h: number, s: number, l: number, r:number, g:number, b:number} | null} An object with h, s, l components, or null if parsing fails.
   */
  static parseCssColor(colorString) {
    if (!colorString || typeof colorString !== "string") {
      return null;
    }

    try {
      // Create a proper OffscreenCanvas
      const canvas = new OffscreenCanvas(1, 1);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }

      // Clear canvas
      ctx.clearRect(0, 0, 1, 1);

      // Set the fill style to our color and draw a pixel
      ctx.fillStyle = colorString.trim();
      ctx.fillRect(0, 0, 1, 1);

      // Extract the RGB values from the pixel
      const imageData = ctx.getImageData(0, 0, 1, 1).data;
      const r = imageData[0];
      const g = imageData[1];
      const b = imageData[2];

      // Convert the RGB values to HSL
      return FirefoxThemeImporter.rsbgToHsl(r, g, b);
    } catch (e) {
      // If there's any error in parsing, return null
      return null;
    }
  }

  /**
   * Converts RGB values to HSL.
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {HSLRGBColor}
   */
  static rsbgToHsl(r, g, b) {
    const r_norm = r / 255;
    const g_norm = g / 255;
    const b_norm = b / 255;

    const cmax = Math.max(r_norm, g_norm, b_norm);
    const cmin = Math.min(r_norm, g_norm, b_norm);
    const delta = cmax - cmin;

    let h = 0;
    // Calculate Hue
    if (delta === 0) {
      h = 0;
    } else if (cmax === r_norm) {
      h = 60 * (((g_norm - b_norm) / delta) % 6);
    } else if (cmax === g_norm) {
      h = 60 * ((b_norm - r_norm) / delta + 2);
    } else {
      // cmax === b_norm
      h = 60 * ((r_norm - g_norm) / delta + 4);
    }
    if (h < 0) {
      h += 360;
    }
    h = Math.round(h);

    // Calculate Lightness
    let l = (cmax + cmin) / 2;

    // Calculate Saturation
    let s = 0;
    if (delta === 0) {
      s = 0;
    } else {
      s = delta / (1 - Math.abs(2 * l - 1));
    }
    s = Math.round(s * 100); // Convert to percentage
    l = Math.round(l * 100); // Convert to percentage

    return { h, s, l, r, g, b };
  }

  /**
   * Checks if a given CSS color string is suitable as an accent color.
   * A color is considered "good" if it's not monochrome (saturation > 20%).
   * @param {{h: number, s: number, l: number}} hslColor The HSL color representation.
   * @returns {boolean} True if the color is suitable, false otherwise.
   */
  static isGoodAccentColor(hslColor) {
    if (hslColor.l > 90) {
      // If the lightness is above 90, is a shade of white
      return false;
    }
    // If the lightness is below 10, it's a shade of black
    if (hslColor.l < 10) {
      return false;
    }

    return hslColor.s > 20;
  }

  /**
   * Checks if the theme provides all colors we need.
   * @param {Array<Color>} colors - The theme colors.
   * @returns {boolean} True if the theme is valid, false otherwise.
   */
  isValidTheme(colors) {
    if (!colors) {
      return false;
    }
    return FirefoxThemeImporter.EXPECTED_KEYS.every((key) => {
      return colors.find((color) => color.key === key) != null;
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
