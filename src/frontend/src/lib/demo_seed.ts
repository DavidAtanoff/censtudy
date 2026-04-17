import axios from 'axios';

const API_BASE = 'http://127.0.0.1:3000/api';

async function seed() {
    try {
        console.log('Seeding Calculus 101 demo...');

        // 1. Create Course
        const courseRes = await axios.post(`${API_BASE}/courses`, {
            title: 'Mathematics: Calculus I',
            description: 'A comprehensive introduction to limits, derivatives, and their applications.'
        });
        const courseId = courseRes.data.id;
        console.log(`Created course: ${courseRes.data.title} (ID: ${courseId})`);

        // 2. Create Unit
        const unitRes = await axios.post(`${API_BASE}/courses/${courseId}/units`, {
            title: 'Unit 1: The Essence of Calculus',
            order_index: 0
        });
        const unitId = unitRes.data.id;
        console.log(`Created unit: ${unitRes.data.title} (ID: ${unitId})`);

        // 3. Create Study Guide (with KaTeX and Sliders)
        const guideContent = `
# Principles of Differentiation

Differentiation is the process of finding the derivative, or rate of change, of a function.

## The Power Rule
The most fundamental rule for differentiation is the Power Rule:
$$ \\frac{d}{dx} x^n = nx^{n-1} $$

## Interactive Explorations
Watch how the derivative changes as we adjust the exponent.

::slider{min="0" max="5" default="2" unit="n"}
Adjust the exponent ($n$):
::

::note{type="info"}
When $n=1$, the derivative is always 1 (a constant slope).
::

## Calculus in Action
:::interactive
<div style="text-align: center;">
    <h3 style="color: var(--accent);">Derivative Visualizer</h3>
    <p>Function: $f(x) = x^n$</p>
    <div id="plot-area" style="height: 300px; background: #fafafa; border: 1px solid var(--border); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #666;">
        [Canvas Plot would be here in a real scenario]
    </div>
</div>
:::
`;
        await axios.post(`${API_BASE}/units/${unitId}/content`, {
            content_type: 'study-guide',
            title: 'Limits & Derivatives Overview',
            studyml_content: guideContent
        });

        // 4. Create Flashcards (properly tagged for backend parsing)
        const flashcardContent = `
::flashcard **Front**: What is the derivative of $x^2$? **Back**: $2x$ ::
::flashcard **Front**: What is the derivative of $\\sin(x)$? **Back**: $\\cos(x)$ ::
::flashcard **Front**: What is the derivative of $e^x$? **Back**: $e^x$ ::
::flashcard **Front**: What is the derivative of $\\ln(x)$? **Back**: $\\frac{1}{x}$ ::
::flashcard **Front**: State the Limit Definition of the Derivative. **Back**: $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$ ::
`;
        await axios.post(`${API_BASE}/units/${unitId}/content`, {
            content_type: 'flashcard-deck',
            title: 'Derivative Essentials',
            studyml_content: flashcardContent
        });

        // 5. Create Quiz
        const quizContent = `
::question{answer="15x^2" keywords="15,x,square" explanation="Using the power rule: multiply by the exponent and subtract one."} What is the derivative of $5x^3$? ::

::question{answer="0" keywords="zero,0" explanation="The derivative of any constant is zero."} Find the derivative of $f(x) = 10$. ::

::question{explanation="The derivative represents the instantaneous rate of change and the slope of the tangent line."} The slope of the tangent line to a curve at a point is given by:
- [ ] The Integral
- [x] The Derivative
- [ ] The Limit
- [ ] The Secant ::

::question{answer="-\\sin(x)" keywords="negative,sin,sine" explanation="The derivative of cos(x) is -sin(x)."} State the derivative of $\\cos(x)$. ::
`;
        await axios.post(`${API_BASE}/units/${unitId}/content`, {
            content_type: 'quiz',
            title: 'Calculus Fundamentals Quiz',
            studyml_content: quizContent
        });

        console.log('Seeding completed successfully!');
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Seeding failed:', error.response?.data || error.message);
        } else {
            console.error('Seeding failed:', error);
        }
    }
}

seed();
