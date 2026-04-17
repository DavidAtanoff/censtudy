-- Demo Content for CenLearn
-- Run this after migrations to populate with example content

-- Create a demo course
INSERT INTO courses (id, title, description, created_by, created_at, updated_at)
VALUES (1, 'Introduction to Calculus', 'Master the fundamentals of calculus with interactive examples', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Create units
INSERT INTO units (id, course_id, title, order_index, created_at)
VALUES 
(1, 1, 'Limits and Continuity', 1, CURRENT_TIMESTAMP),
(2, 1, 'Derivatives', 2, CURRENT_TIMESTAMP),
(3, 1, 'Integrals', 3, CURRENT_TIMESTAMP);

-- Study Guide: Quadratic Functions with Interactive Graph
INSERT INTO content (id, unit_id, content_type, title, studyml_content, created_by, created_at, updated_at)
VALUES (1, 1, 'study-guide', 'Quadratic Functions', '# Quadratic Functions

## Introduction
A quadratic function is a polynomial function of degree 2, written as:
$$f(x) = ax^2 + bx + c$$

## Interactive Graph
:::interactive
<div id="graph-container" style="width: 100%; height: 400px; background: #f8f9fa; border-radius: 8px; padding: 20px;">
  <canvas id="quadratic-canvas" width="600" height="350"></canvas>
  <div style="margin-top: 10px;">
    <label>a: <input type="range" id="a-slider" min="-5" max="5" step="0.1" value="1"></label>
    <span id="a-value">1</span><br>
    <label>b: <input type="range" id="b-slider" min="-10" max="10" step="0.5" value="0"></label>
    <span id="b-value">0</span><br>
    <label>c: <input type="range" id="c-slider" min="-10" max="10" step="0.5" value="0"></label>
    <span id="c-value">0</span>
  </div>
</div>

<script>
const canvas = document.getElementById("quadratic-canvas");
const ctx = canvas.getContext("2d");
const aSlider = document.getElementById("a-slider");
const bSlider = document.getElementById("b-slider");
const cSlider = document.getElementById("c-slider");
const aValue = document.getElementById("a-value");
const bValue = document.getElementById("b-value");
const cValue = document.getElementById("c-value");

function drawGraph() {
  const a = parseFloat(aSlider.value);
  const b = parseFloat(bSlider.value);
  const c = parseFloat(cSlider.value);
  
  aValue.textContent = a;
  bValue.textContent = b;
  cValue.textContent = c;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw axes
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  
  // Draw quadratic
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  for (let x = -10; x <= 10; x += 0.1) {
    const y = a * x * x + b * x + c;
    const canvasX = (x + 10) * (canvas.width / 20);
    const canvasY = canvas.height / 2 - y * 15;
    
    if (x === -10) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  }
  ctx.stroke();
}

aSlider.addEventListener("input", drawGraph);
bSlider.addEventListener("input", drawGraph);
cSlider.addEventListener("input", drawGraph);
drawGraph();
</script>
:::

## Key Properties
- **Vertex**: The turning point of the parabola
- **Axis of Symmetry**: $x = -\\frac{b}{2a}$
- **Direction**: Opens up if $a > 0$, down if $a < 0$

## Practice
Try adjusting the sliders above to see how each coefficient affects the shape!', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Flashcard Deck: Calculus Basics
INSERT INTO content (id, unit_id, content_type, title, studyml_content, created_by, created_at, updated_at)
VALUES (2, 1, 'flashcard-deck', 'Limits Flashcards', ':::flashcard
Q: What is a limit?
A: A limit describes the value that a function approaches as the input approaches some value.
---
Q: What does $\\lim_{x \\to a} f(x) = L$ mean?
A: As x gets closer to a, f(x) gets closer to L.
---
Q: What is continuity?
A: A function is continuous at a point if the limit exists, the function is defined at that point, and they are equal.
---
Q: What is the limit of a constant?
A: $\\lim_{x \\to a} c = c$ (the limit of a constant is the constant itself)
---
Q: What is the sum rule for limits?
A: $\\lim_{x \\to a} [f(x) + g(x)] = \\lim_{x \\to a} f(x) + \\lim_{x \\to a} g(x)$
---
Q: What is an asymptote?
A: A line that a curve approaches but never touches.
---
Q: What is $\\lim_{x \\to 0} \\frac{\\sin x}{x}$?
A: 1 (this is a famous limit!)
---
Q: What does DNE mean?
A: Does Not Exist - when a limit cannot be determined.
:::', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Quiz: Limits
INSERT INTO content (id, unit_id, content_type, title, studyml_content, created_by, created_at, updated_at)
VALUES (3, 1, 'quiz', 'Limits Quiz', ':::quiz
Q: What is $\\lim_{x \\to 2} (3x + 1)$?
A: 7
TYPE: short-answer
KEYWORDS: 7, seven
---
Q: Is the function $f(x) = \\frac{1}{x}$ continuous at x = 0?
A: No
TYPE: multiple-choice
OPTIONS: Yes | No | Sometimes | Cannot determine
---
Q: What is $\\lim_{x \\to \\infty} \\frac{1}{x}$?
A: 0
TYPE: short-answer
KEYWORDS: 0, zero
---
Q: The limit $\\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3}$ equals:
A: 6
TYPE: multiple-choice
OPTIONS: 0 | 3 | 6 | Does not exist
---
Q: A function has a vertical asymptote when:
A: The denominator equals zero and the numerator does not
TYPE: short-answer
KEYWORDS: denominator, zero, undefined
:::', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Study Guide: Derivatives with Interactive Examples
INSERT INTO content (id, unit_id, content_type, title, studyml_content, created_by, created_at, updated_at)
VALUES (4, 2, 'study-guide', 'Introduction to Derivatives', '# Derivatives

## What is a Derivative?
The derivative measures the **rate of change** of a function. It tells us how fast something is changing at any given moment.

## Formal Definition
$$f''(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

## Interactive Slope Visualization
:::interactive
<style>
  .derivative-demo {
    width: 100%;
    max-width: 600px;
    margin: 20px auto;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  .controls {
    margin: 20px 0;
    text-align: center;
  }
  .controls input {
    width: 200px;
  }
</style>

<div class="derivative-demo">
  <canvas id="derivative-canvas" width="600" height="400"></canvas>
  <div class="controls">
    <label>Point x: <input type="range" id="x-slider" min="0" max="10" step="0.1" value="5"></label>
    <span id="x-value">5</span>
    <p style="margin-top: 10px;">Slope at this point: <strong id="slope-value">0</strong></p>
  </div>
</div>

<script>
const canvas = document.getElementById("derivative-canvas");
const ctx = canvas.getContext("2d");
const xSlider = document.getElementById("x-slider");
const xValue = document.getElementById("x-value");
const slopeValue = document.getElementById("slope-value");

function f(x) {
  return 0.1 * x * x - x + 5;
}

function derivative(x) {
  return 0.2 * x - 1;
}

function draw() {
  const x = parseFloat(xSlider.value);
  xValue.textContent = x.toFixed(1);
  const slope = derivative(x);
  slopeValue.textContent = slope.toFixed(2);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw axes
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.lineTo(600, 200);
  ctx.moveTo(50, 0);
  ctx.lineTo(50, 400);
  ctx.stroke();
  
  // Draw function
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 10; i += 0.1) {
    const px = 50 + i * 50;
    const py = 200 - f(i) * 20;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  
  // Draw tangent line
  const px = 50 + x * 50;
  const py = 200 - f(x) * 20;
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px - 100, py - slope * 100 * 20);
  ctx.lineTo(px + 100, py + slope * 100 * 20);
  ctx.stroke();
  
  // Draw point
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();
}

xSlider.addEventListener("input", draw);
draw();
</script>
:::

## Common Derivatives
- $\\frac{d}{dx}(x^n) = nx^{n-1}$ (Power Rule)
- $\\frac{d}{dx}(e^x) = e^x$
- $\\frac{d}{dx}(\\sin x) = \\cos x$
- $\\frac{d}{dx}(\\cos x) = -\\sin x$

## Applications
Derivatives are used in:
- Physics (velocity, acceleration)
- Economics (marginal cost, revenue)
- Optimization problems
- Finding maximum and minimum values', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Flashcard Deck: Derivatives
INSERT INTO content (id, unit_id, content_type, title, studyml_content, created_by, created_at, updated_at)
VALUES (5, 2, 'flashcard-deck', 'Derivative Rules', ':::flashcard
Q: What is the Power Rule?
A: $\\frac{d}{dx}(x^n) = nx^{n-1}$
---
Q: What is the derivative of a constant?
A: 0 (constants don''t change!)
---
Q: What is the Product Rule?
A: $(fg)'' = f''g + fg''$
---
Q: What is the Quotient Rule?
A: $(\\frac{f}{g})'' = \\frac{f''g - fg''}{g^2}$
---
Q: What is the Chain Rule?
A: $\\frac{d}{dx}[f(g(x))] = f''(g(x)) \\cdot g''(x)$
---
Q: What is $\\frac{d}{dx}(e^x)$?
A: $e^x$ (it''s its own derivative!)
---
Q: What is $\\frac{d}{dx}(\\ln x)$?
A: $\\frac{1}{x}$
---
Q: What is $\\frac{d}{dx}(\\sin x)$?
A: $\\cos x$
:::', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Quiz: Derivatives
INSERT INTO content (id, unit_id, content_type, title, studyml_content, created_by, created_at, updated_at)
VALUES (6, 2, 'quiz', 'Derivatives Practice', ':::quiz
Q: Find $\\frac{d}{dx}(x^3)$
A: 3x^2
TYPE: short-answer
KEYWORDS: 3x^2, 3x², 3 x^2
---
Q: What is $\\frac{d}{dx}(5)$?
A: 0
TYPE: multiple-choice
OPTIONS: 0 | 5 | 5x | undefined
---
Q: Find $\\frac{d}{dx}(2x^2 + 3x - 1)$
A: 4x + 3
TYPE: short-answer
KEYWORDS: 4x+3, 4x + 3
---
Q: The derivative represents:
A: The instantaneous rate of change
TYPE: multiple-choice
OPTIONS: The area under a curve | The instantaneous rate of change | The average value | The maximum value
---
Q: If $f(x) = x^2$, what is $f''(3)$?
A: 6
TYPE: short-answer
KEYWORDS: 6, six
:::', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add audit logs for demo content creation
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
VALUES 
(1, 'create', 'course', 1, 'Created demo course: Introduction to Calculus', CURRENT_TIMESTAMP),
(1, 'create', 'unit', 1, 'Created unit: Limits and Continuity', CURRENT_TIMESTAMP),
(1, 'create', 'unit', 2, 'Created unit: Derivatives', CURRENT_TIMESTAMP),
(1, 'create', 'unit', 3, 'Created unit: Integrals', CURRENT_TIMESTAMP),
(1, 'create', 'content', 1, 'Created study guide: Quadratic Functions', CURRENT_TIMESTAMP),
(1, 'create', 'content', 2, 'Created flashcard deck: Limits Flashcards', CURRENT_TIMESTAMP),
(1, 'create', 'content', 3, 'Created quiz: Limits Quiz', CURRENT_TIMESTAMP),
(1, 'create', 'content', 4, 'Created study guide: Introduction to Derivatives', CURRENT_TIMESTAMP),
(1, 'create', 'content', 5, 'Created flashcard deck: Derivative Rules', CURRENT_TIMESTAMP),
(1, 'create', 'content', 6, 'Created quiz: Derivatives Practice', CURRENT_TIMESTAMP);
