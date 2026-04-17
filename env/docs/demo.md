::center
::font{size="44px" weight="800" color="#111827" family="Outfit" lh="1.02"}
FORCES, MOMENTUM, AND IMPULSE
::
::muted A compact physics guide built to teach first, test often, and stick longer. ::
::

::lead
Force changes motion. Momentum measures motion already in progress. Impulse explains how a force acting over time changes that momentum. If you understand how those three ideas connect, most first-pass mechanics problems stop feeling random.
::

::divider{label="Big Picture"} ::

::columns{count="3"}
::card
### Force
Force is an interaction that can change an object's velocity.
::
|||
::card
### Momentum
Momentum is mass times velocity, written as $p = mv$.
::
|||
::card
### Impulse
Impulse is force times time, written as $J = F\Delta t$.
::
::

::note{type="info" title="Golden Relationship"}
The key bridge is:

$$
J = \Delta p
$$

Impulse equals the change in momentum.
::

::question{explanation="Momentum depends on both how much matter is moving and how fast it is moving."}
# Which expression defines linear momentum?
* [x] $p = mv$
* $F = ma$
* $J = F / \Delta t$
* $p = m / v$
::

---

::divider{label="Newton's Laws In Plain English"} ::

::columns{count="2"}
::quote{cite="Newton's First Law in everyday language"}
Objects keep doing what they are already doing unless something external forces a change.
::
|||
::quote{cite="Newton's Second Law in everyday language"}
Acceleration happens when there is net force, and heavier objects need more force for the same acceleration.
::
::

::justify
Newton's Third Law is the easiest to say and the easiest to misuse. If skater A pushes skater B, then B pushes A with an equal force in the opposite direction. The forces are equal, but the accelerations do not need to be equal, because the masses can be different.
::

::note{type="warning" title="Common Mistake"}
Equal and opposite forces act on **different objects**. They do not cancel each other inside a single free-body diagram.
::

::columns{count="2"}
### Everyday Examples

- Seatbelt stopping your body
- Bat striking a baseball
- Rocket exhaust pushing downward
|||
### Questions To Ask

- What object am I analyzing?
- What external forces act on it?
- Is momentum conserved for the whole system?
::

::question{explanation="Action-reaction force pairs are equal in magnitude, opposite in direction, and act on different bodies."}
# Why do action-reaction forces not cancel each other in one object's free-body diagram?
* [x] Because each force acts on a different object
* Because they happen at different times
* Because one force is always larger
* Because only horizontal forces can be paired
::

---

::divider{label="Impulse And Collisions"} ::

::lead
If the same momentum change happens over a longer time, the average force gets smaller. That is why airbags, foam pits, and bent knees matter.
::

::card
### Exam Heuristic
When a collision problem mentions "same change in momentum" but different stopping times, compare the forces using time. More time means less average force.
::

::question{explanation="For a fixed change in momentum, increasing the collision time decreases the average force."}
# A car and a wall produce the same momentum change with and without an airbag. Why does the airbag reduce injury risk?
* [x] It increases stopping time, reducing average force
* It removes momentum completely
* It decreases the mass of the passenger
* It reverses Newton's Third Law
::

:::interactive
<div style="padding:24px;border:1px solid #dbe2ea;border-radius:20px;background:#ffffff;box-shadow:0 18px 38px -32px rgba(15,23,42,0.25);font-family:Manrope,system-ui,sans-serif;">
  <h3 style="margin:0 0 8px;font-size:20px;color:#111827;text-align:center;">Impulse Lab</h3>
  <p style="margin:0 0 18px;color:#4b5563;text-align:center;">Move the sliders and watch momentum and kinetic energy update together.</p>

  <div style="display:grid;gap:14px;grid-template-columns:1fr;">
    <label style="display:grid;gap:6px;color:#111827;font-weight:600;">
      Mass (kg)
      <input id="mass-slider" type="range" min="1" max="12" value="4" style="width:100%;">
    </label>
    <label style="display:grid;gap:6px;color:#111827;font-weight:600;">
      Velocity (m/s)
      <input id="velocity-slider" type="range" min="0" max="20" value="6" style="width:100%;">
    </label>
    <label style="display:grid;gap:6px;color:#111827;font-weight:600;">
      Collision Time (s)
      <input id="time-slider" type="range" min="0.1" max="2.0" step="0.1" value="0.5" style="width:100%;">
    </label>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:18px;">
    <div style="border:1px solid #e5e7eb;border-radius:16px;padding:14px;background:#f9fafb;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Momentum</div>
      <div id="momentum-output" style="margin-top:6px;font-size:24px;font-weight:800;color:#111827;">24 kg m/s</div>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:16px;padding:14px;background:#f9fafb;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Kinetic Energy</div>
      <div id="energy-output" style="margin-top:6px;font-size:24px;font-weight:800;color:#111827;">72 J</div>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:16px;padding:14px;background:#f9fafb;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Average Force To Stop</div>
      <div id="force-output" style="margin-top:6px;font-size:24px;font-weight:800;color:#111827;">48 N</div>
    </div>
  </div>

  <div style="margin-top:18px;border-radius:18px;background:linear-gradient(135deg,#eff6ff,#f8fafc);padding:16px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Interpretation</div>
    <p id="insight-output" style="margin:8px 0 0;color:#1f2937;line-height:1.7;">Doubling velocity increases momentum linearly, but kinetic energy rises much faster.</p>
  </div>
</div>

<script>
  const massSlider = document.getElementById('mass-slider');
  const velocitySlider = document.getElementById('velocity-slider');
  const timeSlider = document.getElementById('time-slider');

  const momentumOutput = document.getElementById('momentum-output');
  const energyOutput = document.getElementById('energy-output');
  const forceOutput = document.getElementById('force-output');
  const insightOutput = document.getElementById('insight-output');

  const render = () => {
    const mass = Number(massSlider.value);
    const velocity = Number(velocitySlider.value);
    const collisionTime = Number(timeSlider.value);

    const momentum = mass * velocity;
    const kineticEnergy = 0.5 * mass * velocity * velocity;
    const avgForce = collisionTime > 0 ? momentum / collisionTime : 0;

    momentumOutput.textContent = `${momentum.toFixed(1)} kg m/s`;
    energyOutput.textContent = `${kineticEnergy.toFixed(1)} J`;
    forceOutput.textContent = `${avgForce.toFixed(1)} N`;

    if (velocity >= 14) {
      insightOutput.textContent = 'High speed pushes kinetic energy up rapidly. That is why fast collisions become dangerous much faster than intuition expects.';
    } else if (collisionTime >= 1.2) {
      insightOutput.textContent = 'A longer stopping time lowers average force, even if the momentum change is the same.';
    } else {
      insightOutput.textContent = 'Momentum scales with mass and velocity, while kinetic energy depends especially strongly on velocity.';
    }
  };

  [massSlider, velocitySlider, timeSlider].forEach((slider) => {
    slider.addEventListener('input', render);
  });

  render();
</script>
:::

---

::divider{label="Rapid Review"} ::

::columns{count="2"}
::card
### If You See...

- momentum conserved
- isolated system
- explosion
- collision

think about **before/after system momentum**.
::
|||
::card
### If You See...

- safety device
- impact time
- crash cushion
- landing mat

think about **impulse and average force**.
::
::

::question{answer="Impulse equals change in momentum." keywords="impulse,change,momentum,delta p" explanation="The anchor idea is J = delta p."}
# State the relationship between impulse and momentum in one sentence.
::

::small
Author note: this demo intentionally mixes formatting, layout, embedded checks, and a live interactive block so it can serve as both a sample guide and a renderer regression test.
::
