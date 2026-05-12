---
marp: true
theme: default
paginate: true
style: |
  section {
    font-family: 'Segoe UI', sans-serif;
    background: #ffffff;
    color: #1a1a2e;
  }
  h1 { color: #1a1a2e; font-size: 1.8em; }
  h2 { color: #1a1a2e; border-bottom: 2px solid #3b82f6; padding-bottom: 0.2em; }
  ul { margin-top: 0.5em; }
  li { margin-bottom: 0.4em; }
  strong { color: inherit; }
  section.title {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4.4rem 5rem;
    text-align: left;
    overflow: hidden;
    background: #f8fafc;
    color: #1a1a2e;
  }
  section.title::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 0.55rem;
    height: 100%;
    background: #3b82f6;
    pointer-events: none;
  }
  section.title::after {
    display: none;
  }
  section.title h1 {
    position: relative;
    max-width: 11em;
    margin: 0;
    color: #1e3a5f;
    font-size: 2.65em;
    line-height: 1.08;
    font-weight: 700;
  }
  section.title h1 strong {
    color: #2563eb;
  }
  section.title p {
    position: relative;
    margin: 0;
    color: #475569;
  }
  .cover-kicker {
    position: relative;
    margin-bottom: 0.9rem !important;
    color: #2563eb !important;
    font-size: 0.62em !important;
    font-weight: 650;
    text-transform: uppercase;
  }
  .cover-subtitle {
    max-width: 38rem;
    margin-top: 1.15rem !important;
    font-size: 0.95em !important;
    line-height: 1.45;
  }
  .cover-authors {
    margin-top: 2.1rem !important;
    color: #334155 !important;
    font-size: 0.82em !important;
    font-weight: 600;
  }
  section.image-slide {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  section.image-slide img { max-height: 75vh; object-fit: contain; }
  .centered-media {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    margin: 0.5em auto 0;
  }
  .centered-media img {
    max-width: 90%;
    max-height: 62vh;
    object-fit: contain;
  }
  .mapping-media img {
    max-width: 62%;
    max-height: 31vh;
  }
  .mapping-source {
    display: block;
    margin-top: 0.15em;
    text-align: center;
    font-size: 0.5em;
    line-height: 1.2;
    color: #64748b;
  }
  .object-demo-media img {
    max-width: 56%;
    max-height: 32vh;
  }
  .planning-demo-media {
    margin-top: 0.45em;
  }
  .planning-demo-media img {
    max-width: 80%;
    max-height: 54vh;
  }
  .planning-note {
    width: 70%;
    margin: 0.5em auto 0;
    text-align: center !important;
    font-size: 0.90em;
    line-height: 1.35;
    color:black;
  }
  .scene-input-media img {
    max-width: 80%;
    max-height: 42vh;
  }
  .map-media img {
    max-width: 72%;
    max-height: 38vh;
    object-fit: contain;
  }
  .two-up-media {
    gap: 2em;
    height: 42vh;
    justify-content: center;
  }
  .two-up-media img {
    width: auto;
    max-width: calc(42% - 1em);
    height: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .side-by-side {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1.5em;
    width: 100%;
    flex: 1;
  }
  .side-by-side .text-col {
    flex: 0 0 38%;
  }
  .side-by-side .img-col {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 70vh;
  }
  .side-by-side .img-col img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  section.planning-slide h2 {
    margin-bottom: 0.35em;
  }
  section.planning-slide .side-by-side {
    align-items: flex-start;
    gap: 1.4em;
    min-height: 0;
    margin-top: 0;
  }
  section.planning-slide .text-col {
    flex: 0 0 32%;
    padding-top: 0;
    font-size: 0.9em;
    line-height: 1.38;
  }
  section.planning-slide .img-col {
    flex: 1 1 auto;
    min-width: 0;
    height: 50vh;
  }
  section.planning-slide .img-col img {
    width: 100%;
    max-width: 100%;
    max-height: 50vh;
  }
  section.scene-json p {
    font-size: 0.82em;
    margin: 0.25em 0 0.35em;
  }
  section.scene-json pre {
    font-size: 0.42em;
    line-height: 1.1;
    margin-top: 0.2em;
  }
  section.scene-json code {
    font-size: 0.92em;
  }
  pre { font-size: 0.6em; }
  code { font-size: 0.65em; }
  .about-cols {
    display: flex;
    flex-direction: row;
    gap: 4em;
    justify-content: center;
    align-items: flex-start;
    margin-top: 1.5em;
  }
  .about-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .about-col img {
    width: 160px;
    height: 160px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #3b82f6;
  }
  .about-name {
    margin-top: 0.7em !important;
    font-size: 1.05em !important;
    font-weight: 700;
    color: #1a1a2e !important;
  }
  .about-title {
    margin-top: 0.2em !important;
    font-size: 0.82em !important;
    color: #475569 !important;
    line-height: 1.4;
  }
  .about-qr {
    margin-top: 0.8em;
    width: 90px;
    height: 90px;
    border-radius: 0 !important;
    border: 2px solid #e2e8f0;
  }
---

<!-- _class: title -->

<p class="cover-kicker">Machine Learning Singapore</p>

# **RPG**: Robotic Planning with Gemini

<p class="cover-authors">Anurag Roy · Chaitanya Jadhav</p>

---

<!-- _class: about-slide -->

## About Us

<div class="about-cols">
  <div class="about-col">
    <img src="https://media.licdn.com/dms/image/v2/D4E03AQFm68OVLTdm1g/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1725515732279?e=1779926400&v=beta&t=V6IEDDHW8iJ1_3pRT28P0G_ZOQUo7B9Za6o4-AMm0xU" alt="Anurag Roy" />
    <p class="about-name">Anurag Roy</p>
    <p class="about-title">Autonomy Engineer<br/>Griffin Labs</p>
    <img class="about-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://www.linkedin.com/in/anurag-roy-ba2788208/" alt="Anurag LinkedIn QR" />
  </div>
  <div class="about-col">
    <img src="https://media.licdn.com/dms/image/v2/C5603AQH35MExRh0OBA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1660990405773?e=1779926400&v=beta&t=DvKlnreOqTZ5Yfubi3EPKHGz4VmXVJz4b4tLNyJp55o" alt="Chaitanya Jadhav" />
    <p class="about-name">Chaitanya Jadhav</p>
    <p class="about-title">AI Engineer<br/>PhillipCapital Pte Ltd</p>
    <img class="about-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://www.linkedin.com/in/chaitanya-jadhav-134392191/" alt="Chaitanya LinkedIn QR" />
  </div>
</div>

---

<!-- _class: planning-slide -->

## Why Tackle Planning?

<div class="centered-media planning-demo-media">
  <img src="fsm_example.svg" alt="FSM example" />
</div>

<div class="planning-note">
  Traditional approaches use state machines, which require explicit understanding of the environment and manual setting of waypoints.
</div>

---

## Why Mapping is an Important Part of Planning

- A planner needs to know what objects exist and where they are
- Map-building via LIDAR is computationally expensive
- Maps become stale quickly as objects move or rooms change
- Each new deployment environment requires a fresh mapping pass

<div class="centered-media mapping-media">
  <img src="https://figures.semanticscholar.org/579735c1e5b2b0ae7fb42fcb9e2433f3118afd20/6-Figure5-1.png" alt="LIDAR SLAM example" />
</div>

<small class="mapping-source">Source: Hess et al., Real-time loop closure in 2D LIDAR SLAM</small>

---

## How LLMs and VLAs Change the Game

- Models already understand rooms, objects, and spatial relationships
- This can be leveraged for dynamic mapping and planning 

<div class="centered-media object-demo-media">
  <img src="gemini-er-object-detection.gif" alt="Object detection demo" />
</div>
<small class="mapping-source">Source: Gemini Robotics-ER1.5 Demo</small>

---

## Our Approach

- Built on the Google AI Stack: Gemini 3, Nano Banana
- Input: sequential photographs from an indoor space
- Output: 
  1. Structured floor map
  2. Embodiment-aware task plans


---

## Stage 1: Scene Decomposition

<div class="centered-media scene-input-media">
  <img src="scene-decomposition-input.png" alt="Scene decomposition input" />
</div>

- Photos are sent as a single multimodal prompt to Gemini
- Model returns structured JSON for each image
---

## Stage 1: Scene Decomposition

From these inputs..
<div class="centered-media two-up-media">
  <img src="glass-cabinet.jpeg" alt="Glass cabinet" />
  <img src="exit-sign.jpeg" alt="Exit sign" />
</div>

---

<!-- _class: scene-json -->

## Stage 1: Scene Decomposition

We get this: 
```json
{
  "node_name": "Office Pantry and Coworking Area",
  "static_anchors": [
    {
      "anchor_id": "pantry_counter_cabinet",
      "type": "wooden pantry cabinet",
      "description": "A large floor-to-ceiling wooden cabinetry unit with glass-front upper sections."
    },
    ...
  ],
  "dynamic_objects": [
    {
      "object_id": "coffee_espresso_machine",
      "type": "coffee machine",
      "description": "A black professional espresso machine on the main pantry countertop."
    }
  ],
  "navigable_edges": [
    {
      "edge_id": "hallway_exit_path",
      "description": "A corridor leading away from the pantry towards restrooms and building exits.",
      "visual_cue": "Illuminated green EXIT sign and overhead restroom pictograms."
    }
  ]
}
```

---

## Stage 2: Layout Synthesis

- Step 1: Generate a text description of the room and all objects inside it 
- Step 2: Generate a floor plan with Nano Banana

<div class="centered-media map-media">
  <img src="map-office-pantry.png" alt="Office pantry floor map" />
</div>

---

## Stage 3: Object Localization
Create bounding boxes for identified objects for downstream planning tasks

```json
[
  { "object_id": "pantry_counter_cabinet", "ymin": 5,  "xmin": 35, "ymax": 30, "xmax": 95 },
  { "object_id": "oval_communal_table",    "ymin": 35, "xmin": 30, "ymax": 65, "xmax": 70 },
  { "object_id": "coffee_espresso_machine","ymin": 8,  "xmin": 60, "ymax": 20, "xmax": 75 }
]
```


---

## Embodiment-Aware Planning

- Goal: convert user intent into tasks that can be carried out by a robot
- Analogy: "Plan Mode" for Robots
  1. Generate sub-tasks to execute
  2. List affected objects
  3. List pre-requisite tasks
- Input: robot type, room entities and locations, user goal

<div class="centered-media">
  <img src="plan-input.png" alt="Planning input" />
</div>

---

## Embodiment-Aware Planning

Account for different action spaces by maintaining a list of "skills" for each embodiment

```python
ALLOWED_ACTIONS = {
    "humanoid": {
        "navigate", "move_to", "pick_up", "place", "grab", "carry", "open",
        "close", "push", "pull", "reach", "lift", "lower", "pour", "turn_on",
        # ... 70 actions
    },
    "quadruped": {
        "navigate", "move_to", "patrol", "inspect", "monitor", "push_low",
        "nudge", "follow", "guard", "detect", "sniff", "alert", "wait",
        # ... 25 actions
    },
    "mobile_base": {
        "navigate", "move_to", "sweep", "clean", "mop", "vacuum", "avoid",
        "patrol", "cover_area", "dock", "undock", "wait", "inspect_floor",
        # ... 21 actions
    },
}
```
---

## Output

<div class="centered-media planning-demo-media">
  <img src="plan-output.png" alt="Plan output demo" />
</div>

---

## Production Deployment & Evaluation

- We can think of plan generation as an extension of code generation tasks
- **Test-driven planning**: the planner re-runs until all constraints are satisfied
  - Constraints can be derived from robot's action space or physical limits
  - Examples: a quadruped cannot `pick_up`; a mobile base cannot `open` a door
- We are just evaluating plan generation - whether these plans can be executed is a different story

---

# Walkthrough