// Initialize WebGL context
const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");
gl.viewport(0, 0, canvas.width, canvas.height);

// Enable blending for transparency
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// Set clear color to transparent
gl.clearColor(0.0, 0.0, 0.0, 0.0);

// Rectangle data: x, y, width, height
const rectangle = [0, 0, canvas.width, canvas.height];

// Compile shaders and link program
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

const fsSource = `#version 300 es
precision mediump float;

out vec4 outColor;

// Uniforms
uniform vec2 u_center;    // Center of the rectangle (in normalized screen space)
uniform float u_time;     // Time for animation
uniform vec2 u_frag_resolution; // Canvas resolution

// Constants
const float radiusStartFadeOut = 0.2;     // Start fading out
const float maxRadius = 0.4;             // Fully faded out
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
    if (distance < radiusStartFadeOut) {
        return 0.9; // Fully visible
    }
    if (distance > maxRadius) {
        return 0.0; // Fully transparent
    }
    // Linear fade between radiusStartFadeOut and maxRadius
    return 0.9 - (distance - radiusStartFadeOut) / (maxRadius - radiusStartFadeOut);
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
    float baseStrokeWidth = 0.015;
    float strokeWidth = calculateThinning(centerDistance, baseStrokeWidth);
    float minRadius = 0.0;
    float maxRadiusInner = 0.5; // Inner logic for rings

    // Animated progress
    float animationProgress = mod(u_time * 0.5, maxRadiusInner);

    // Compute ring radii
    float ringRadius1 = calcRingRadius(minRadius, maxRadiusInner, animationProgress, 0.0);
    float ring1 = composeRing(centerDistance, strokeWidth, ringRadius1);

    float ringRadius2 = calcRingRadius(minRadius, maxRadiusInner, animationProgress, 0.33);
    float ring2 = composeRing(centerDistance, strokeWidth, ringRadius2);

    float ringRadius3 = calcRingRadius(minRadius, maxRadiusInner, animationProgress, 0.66);
    float ring3 = composeRing(centerDistance, strokeWidth, ringRadius3);

    // Combine rings
    float rings = ring1 + ring2 + ring3;

    // Apply fade based on distance
    float fade = calculateFade(centerDistance);

    // Use ring intensity for color and transparency
    outColor = vec4(vec3(rings), rings * fade);
}
`;

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

gl.useProgram(program);

const aRectangleLocation = gl.getAttribLocation(program, "a_rectangle");
gl.vertexAttrib4fv(aRectangleLocation, rectangle);

const uResolutionLocation = gl.getUniformLocation(program, "u_resolution");
gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);

const uTimeLocation = gl.getUniformLocation(program, "u_time");
const uCenterLocation = gl.getUniformLocation(program, "u_center");
const uFragResolutionLocation = gl.getUniformLocation(program, "u_frag_resolution");
gl.uniform2f(uFragResolutionLocation, canvas.width, canvas.height);

// Calculate the center of the rectangle
const centerX = rectangle[0] + rectangle[2] / 2;
const centerY = rectangle[1] + rectangle[3] / 2;

const normalizedCenterX = centerX / canvas.width;
const normalizedCenterY = (canvas.height - centerY) / canvas.height; // Invert Y-axis

gl.uniform2f(uCenterLocation, normalizedCenterX, normalizedCenterY);

function render(time) {
    const timeInSeconds = time * 0.0001;
    gl.uniform1f(uTimeLocation, timeInSeconds);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
