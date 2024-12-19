/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement, createRef, ref } from "../vendor/lit-all.min.js";
//#region shaders
// Vec Shader
// INPUTS:
// a rectangle = vec4 in pixelspace
// uniform resolution of the pixelspace
// Draws:
// A retangle in clipspace.
const vsSource = `#version 300 es
in vec4 a_rectangle;
uniform vec2 u_resolution;

void main() {
    vec2 cornerOffset;
    if (gl_VertexID == 0) {
        cornerOffset = vec2(0.0, 0.0); // Bottom-left
    } else if (gl_VertexID == 1) {
        cornerOffset = vec2(1.0, 0.0); // Bottom-right
    } else if (gl_VertexID == 2) {
        cornerOffset = vec2(0.0, 1.0); // Top-left
    } else {
        cornerOffset = vec2(1.0, 1.0); // Top-right
    }

    vec2 pixelPosition = a_rectangle.xy + cornerOffset * a_rectangle.zw;
    vec2 normalizedPosition = pixelPosition / u_resolution;
    vec2 clipSpacePosition = normalizedPosition * 2.0 - 1.0;
    clipSpacePosition.y = -clipSpacePosition.y;
    gl_Position = vec4(clipSpacePosition, 0.0, 1.0);
}`;

// A fragment shader drawing the VPN circle animation
const fsSource = `#version 300 es
precision mediump float;

out vec4 outColor;

// Uniforms
uniform vec2 u_center;    // Center of the rectangle (in normalized screen space)
uniform float u_time;     // Time for animation
uniform vec2 u_frag_resolution; // Canvas resolution

// Constants
const float ringCount = 5.0;
const float baseStrokeWidth = 0.010;
const float radiusMinimumFadeIn = 0.01;     // Start fading in
const float radiusStartFadeOut = 0.2;     // Start fading out
const float maxRadius = 0.5;             // Fully faded out
const float radiusStartThinning = 0.15;   // Start thinning stroke width

float drawCircle(float distance, float radius) {
    float antialias = 0.005;
    return smoothstep(radius, radius - antialias, distance);
}

float composeRing(float distance, float strokeWidth, float radius) {
    float circle1 = drawCircle(distance, radius);
    float circle2 = drawCircle(distance, radius - strokeWidth);
    return circle1 - circle2;
}

float calcRingRadius(float minRadius, float maxRadius, float currentRadius, float offset) {
    return mod(maxRadius * offset + currentRadius, maxRadius) + minRadius;
}

float calculateFade(float distance) {
    if (distance == 0.0) {
      return 1.0;
    }
    if (distance < radiusMinimumFadeIn) {
        return  0.0;
    }
    if (distance >= radiusMinimumFadeIn && distance < radiusStartFadeOut) {
        return  0.2*((distance - radiusMinimumFadeIn) / (maxRadius - radiusStartFadeOut-0.1));
    }
    if (distance > maxRadius) {
        return 0.0; // Fully transparent
    }
    // Linear fade between radiusStartFadeOut and maxRadius
    return 0.3 - (distance - radiusStartFadeOut) / (maxRadius - radiusStartFadeOut);
}

float calculateThinning(float distance, float originalStrokeWidth) {
    if (distance < radiusStartThinning) {
        return originalStrokeWidth; // No thinning before the threshold
    }
    if (distance > maxRadius) {
        return 0.0; // Stroke completely disappears at maxRadius
    }
    // Linearly reduce stroke width between radiusStartThinning and maxRadius
    return originalStrokeWidth * (1.0 - (distance - radiusStartThinning) / (maxRadius - radiusStartThinning));
}

void main() {
    // Calculate normalized fragment coordinates
    vec2 fragCoord = gl_FragCoord.xy / u_frag_resolution;

    // Calculate the distance from the center
    float centerDistance = length(fragCoord - u_center);

    // Ring properties
    float strokeWidth = calculateThinning(centerDistance, baseStrokeWidth);
    float minRadius = 0.0;
    float maxRadiusInner = maxRadius; // Inner logic for rings

    // Animated progress
    float animationProgress = mod(u_time * 0.5, maxRadiusInner);

    float rings = 0.0; 
    for(float rc =0.0; rc < ringCount; rc+=1.0 ){
      float radius = calcRingRadius(minRadius, maxRadiusInner, animationProgress, rc/ringCount);
      float ring = composeRing(centerDistance, strokeWidth, radius);
      rings += ring;
    }
    // Apply fade based on distance
    float fade = calculateFade(centerDistance);

    // Use ring intensity for color and transparency
    outColor = vec4(vec3(rings), rings * fade);
}
`;

/**
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} other
 */
const getCenterCoords = (aCanvas, aOther) => {
  const canvas = aCanvas.getBoundingClientRect();
  const other = aOther.getBoundingClientRect();

  // Calculate the center of the rectangle
  // 1: We need to normalize the coordinates, so lets
  // calulate the shield bounding box in relation to the canvas.
  const normOther = {
    width: other.width,
    height: other.height,
    x: other.x - canvas.x,
    y: other.y - canvas.y,
  };
  // Now we can calc the center of the box in pixelspace
  const center = {
    x: normOther.x + normOther.width / 2.0,
    y: normOther.y + normOther.height + 20,
  };
  // Now let's make those relative to the dimentions of the canvas (clipspace)
  const clipSpaceCenter = {
    x: center.x / canvas.width,
    y: center.y / canvas.width,
  };
  return clipSpaceCenter;
};

//#endregion

/**
 * `Rings`
 *
 * Creates a canvas and will spawn multiple rings, when the animation is turned on
 * Usage:
 * <mz-iconlink href="https://example.com" alt="Visit Example" icon="example-icon"></mz-iconlink>
 *
 */
export class Rings extends LitElement {
  static properties = {
    enabled: { attribute: false },
    targetElementRef: { attribute: false },
  };
  canvasElement = createRef();
  #running = false;

  constructor() {
    super();
    this.enabled = true;
    this.targetElementRef = createRef();
  }
  connectedCallback() {
    const rect = this.getBoundingClientRect();
    console.log(rect);
    this.width = rect.width;
    this.height = rect.height;
    super.connectedCallback();
  }
  render() {
    return html`
      <canvas
        width=${this.width}
        height=${this.height}
        ${ref(this.canvasElement)}
      ></canvas>
    `;
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    // Put this into an idle callback.
    // It's fine to delay the animation, as we ned to make sure the css layout is up
    // to date before we can properly start this.
    if (!this.enabled) {
      return;
    }
    requestIdleCallback(() => {
      this.maybeStartRender();
    });
  }

  maybeStartRender() {
    if (this.#running) {
      return;
    }
    const this_rect = this.getBoundingClientRect();

    /** @type {HTMLElement} */
    const shield = this.targetElementRef.value;
    const shieldBox = shield.getBoundingClientRect();

    /** @type {HTMLCanvasElement?} */
    const canvas = this.canvasElement.value;
    if (!canvas) {
      return;
    }
    canvas.height = this_rect.height;
    canvas.width = this_rect.width;

    const gl = canvas.getContext("webgl2");
    gl.viewport(0, 0, canvas.width, canvas.height);
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set clear color to transparent
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // Rectangle data: x, y, width, height
    const rectangle = [0, 0, canvas.width, canvas.height];

    // Compile both shaders, and link them into a programm
    function compileShader(gl, source, type) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    }

    const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
    }
    // Now lets draw with the programm!

    gl.useProgram(program);
    // Load the Arguments for the Vert Shader.
    const aRectangleLocation = gl.getAttribLocation(program, "a_rectangle");
    gl.vertexAttrib4fv(aRectangleLocation, rectangle);
    const uResolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(uResolutionLocation, canvas.height, canvas.height);

    const uTimeLocation = gl.getUniformLocation(program, "u_time");
    const uCenterLocation = gl.getUniformLocation(program, "u_center");
    const uFragResolutionLocation = gl.getUniformLocation(
      program,
      "u_frag_resolution"
    );
    gl.uniform2f(uFragResolutionLocation, canvas.width, canvas.width);

    let clipSpaceCenter = getCenterCoords(canvas, shield);
    console.log(clipSpaceCenter);
    gl.uniform2f(uCenterLocation, clipSpaceCenter.x, clipSpaceCenter.y);

    // The layout may be slower then we setup the renderer
    // So let's check after 500ms that the ref-points are still up
    // to date in case the layout changed
    setTimeout(() => {
      const clipSpaceCenter = getCenterCoords(canvas, shield);
      gl.uniform2f(uCenterLocation, clipSpaceCenter.x, clipSpaceCenter.y);
    }, 500);

    const render = (time) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!this.enabled) {
        this.#running = false;
        canvas.height = 0;
        this.requestUpdate();
        return;
      }
      const timeInSeconds = time * 0.0001;
      gl.uniform1f(uTimeLocation, timeInSeconds);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    };
    this.#running = true;
    requestAnimationFrame(render);
  }
}
customElements.define("mz-rings", Rings);
