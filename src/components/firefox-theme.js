/**
 * This Class will
 */
const CARD_DARKEN_INTENSITY = 20;

export class FirefoxThemeImporter extends HTMLElement {
  // Not every theme set's all variables.
  // We will depend on some CSS variables beeing set
  // if the theme does not set them, we will fall back
  // to the default DARK / LIGHT theme colors
  static EXPECTED_KEYS = ["popup", "toolbar_text"];

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
      this.importAccentColors(null, isDarkMode);
      this.importColors(isDarkMode ? DEFAULT_DARK : DEFAULT_LIGHT);
      return;
    }
    this.importColors(theme.colors);
    this.importAccentColors(theme.colors, isDarkMode);
  }

  importColors(colors, prefix = "firefox") {
    requestAnimationFrame(() => {
      /** @type {HTMLHtmlElement} */
      var r = document.querySelector(":root");
      Object.values(r)
        .filter((e) => e.startsWith(`--${prefix}`))
        .forEach((e) => {
          r.style.removeProperty(e);
        });
      Object.entries(colors).forEach(([key, value]) => {
        if (!value) {
          return;
        }
        r.style.setProperty(`--${prefix}-${key}`, value);
      });
    });
  }
  /**
   *
   * @param {*} colors - The theme colors.
   * @param {*} isDarkMode - True if the theme is dark mode, false otherwise.
   */
  importAccentColors(colors, isDarkMode) {
    const fallback = {
      "card-background": "#321c64",
      "card-text-color": "#ffffff",
      "accent-color": isDarkMode ? "#00ddff" : "#0060df",
    };
    if (colors == null) {
      this.importColors(fallback, "mz");
      return;
    }

    // For the Card we will select a subset of colors
    // that are always visible in the browser frame.
    const cardKeyColor = FirefoxThemeImporter.selectKeyColor(
      colors,
      FirefoxThemeImporter.CARD_ACCENT_KEYS
    );
    if (!cardKeyColor) {
      this.importColors(fallback, "mz");
      return;
    }
    // The Accent Color (for buttons and active state), that can be selected
    // from any color in the theme.
    const accentKeyColor = FirefoxThemeImporter.selectKeyColor(colors, []);
    const cardCompareColor = cardKeyColor.hslColor;
    cardCompareColor.l = cardCompareColor.l - CARD_DARKEN_INTENSITY;
    const textColor = FirefoxThemeImporter.selectHighestContrastTextColor(
      colors,
      cardCompareColor
    );

    //Check the text contrast to cardCompare, use white dark if the contrast is not enough

    const textContrast = Math.abs(textColor.hslColor.l - cardCompareColor.l);
    const cardText = `var(--firefox-${textColor.key})`;
    if (textContrast < 40) {
      cardCompareColor.l > 50 ? (cardText = "white") : (cardText = "black");
    }

    const darken = (variable, intensity = CARD_DARKEN_INTENSITY) => {
      return `lch(from var(--firefox-${variable}) calc(l - ${intensity})  c h )`;
    };

    this.importColors(
      {
        "card-background": darken(cardKeyColor.key),
        "card-text-color": cardText,
        "accent-color": `var(--firefox-${accentKeyColor.key})`,
      },
      "mz"
    );
  }

  /**
   * Selects a key color from the provided colors.
   * The selected color should be a good accent color and have enough contrast with the background.
   */
  static selectKeyColor(colors, allowedKeys = null) {
    // First Check the Background color.
    const background = FirefoxThemeImporter.parseCssColorToHsl(colors["popup"]);
    if (!background) {
      return null;
    }
    const hasEnoughContrast = (hslColor) => {
      // Check if the color is sufficiently different from the background
      const contrast = Math.abs(
        hslColor.l - CARD_DARKEN_INTENSITY - background.l
      );
      return contrast > 20;
    };

    const mappedColors = Object.entries(colors)
      // Only consider the colors that are in ACCENT_KEYS
      .filter(([key, value]) => {
        const keys = allowedKeys;
        if (keys == null || keys.length == 0) {
          return true;
        }
        return keys.includes(key) && value != null;
      })
      // Parse the color to HSL
      .map(([key, value]) => {
        const hslColor = FirefoxThemeImporter.parseCssColorToHsl(value);
        return { key, value, hslColor };
      })
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
    if (selectedColor) {
      console.log("Selected color:", selectedColor.key);
      console.log(`Other Colors: ${mappedColors.map((c) => c.key).join(", ")}`);
    }
    return selectedColor;
  }

  static selectHighestContrastTextColor(colorList, hslColor) {
    const mappedColors = Object.entries(colorList)
      .filter(([key, value]) => {
        // the key should contain "text"
        return key.includes("text") && value != null;
      })
      // Parse the color to HSL
      .map(([key, value]) => {
        const hslColor = FirefoxThemeImporter.parseCssColorToHsl(value);
        return { key, value, hslColor };
      })
      // Sort by who has the most contrast to hslColor
      .sort((a, b) => {
        const contrastA = Math.abs(a.hslColor.l - hslColor.l);
        const contrastB = Math.abs(b.hslColor.l - hslColor.l);
        return contrastB - contrastA;
      });
    // Return the first element or null
    const selectedColor = mappedColors.length > 0 ? mappedColors[0] : null;
    console.log("Selected text color:", selectedColor.key);
    return selectedColor;
  }

  /**
   * Parses a CSS color string into its HSL components.
   * Supports HSL, RGB, and Hex color formats.
   * @param {string | null | undefined} colorString The CSS color string.
   * @returns {{h: number, s: number, l: number} | null} An object with h, s, l components, or null if parsing fails.
   */
  static parseCssColorToHsl(colorString) {
    if (!colorString || typeof colorString !== "string") {
      return null;
    }

    try {
      // Create a proper OffscreenCanvas
      const canvas = new OffscreenCanvas(1, 1);
      const ctx = canvas.getContext("2d");

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

    return { h, s, l };
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
   * @param {*} colors - The theme colors.
   * @returns {boolean} True if the theme is valid, false otherwise.
   */
  isValidTheme(colors) {
    if (!colors) {
      return false;
    }
    const hasAllRequiredKeys = FirefoxThemeImporter.EXPECTED_KEYS.every(
      (key) => {
        return colors[key] != null;
      }
    );
    return hasAllRequiredKeys;
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
