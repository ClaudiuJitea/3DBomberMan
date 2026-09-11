# BLAST GRID 💣⚡

A modern, high-octane 3D tactical bomb-arena browser game inspired by classic grid-based arena mechanics, built from scratch with **Three.js**, **TypeScript**, **Vite**, and **Blender MCP**.

---

## 🎮 Game Overview

**Blast Grid** places you in command of *Blast Bot*, an agile cybernetic operative deployed into a modular combat arena. Navigate grid corridors, tactically plant remote-fused plasma bombs, blast through destructible energy crates, harvest core upgrades, and eliminate rogue patrol drones (*Roller Scouts* and *Stalker Mechs*) before they trap you.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended, tested on Node v24)
- npm (v9 or newer)

### Installation
Clone or navigate to the project directory, then install dependencies:
```bash
npm install
```

### Running Locally
Start the development server:
```bash
npm run dev
```
Open the URL shown in the terminal (typically `http://localhost:5173/` or `http://localhost:5174/`) in any modern desktop or mobile browser.

### Production Build
To create an optimized production bundle:
```bash
npm run build
npm run preview
```

---

## 🕹️ Controls

| Action | Desktop Keys | Mobile / Touch |
| :--- | :--- | :--- |
| **Move Up / Forward** | <kbd>W</kbd> / <kbd>▲ Up Arrow</kbd> | Virtual D-Pad <kbd>▲</kbd> |
| **Move Down / Backward** | <kbd>S</kbd> / <kbd>▼ Down Arrow</kbd> | Virtual D-Pad <kbd>▼</kbd> |
| **Move Left** | <kbd>A</kbd> / <kbd>◀ Left Arrow</kbd> | Virtual D-Pad <kbd>◀</kbd> |
| **Move Right** | <kbd>D</kbd> / <kbd>▶ Right Arrow</kbd> | Virtual D-Pad <kbd>▶</kbd> |
| **Place Bomb** | <kbd>Space</kbd> | Touch Action Button <kbd>BOMB</kbd> |
| **Restart Level** | <kbd>R</kbd> | Modal Restart Button |
| **Pause / Resume** | <kbd>P</kbd> or <kbd>Escape</kbd> | Modal Resume Button |
| **Toggle Audio** | <kbd>M</kbd> | HUD Audio Button |

---

## 🏛️ Architecture & Gameplay Systems

The game is engineered with clean separation of concerns across logic, rendering, audio, and state:

```
project-root/
├── public/
│   └── assets/
│       └── models/                # 100% Blender MCP-authored 3D assets (.glb)
│           ├── player.glb
│           ├── enemy-scout.glb
│           ├── enemy-hunter.glb
│           ├── floor-tile.glb
│           ├── solid-wall.glb
│           ├── breakable-block.glb
│           ├── bomb.glb
│           ├── explosion-center.glb
│           ├── explosion-horizontal.glb
│           ├── explosion-vertical.glb
│           ├── powerup-bomb.glb
│           ├── powerup-range.glb
│           ├── powerup-speed.glb
│           └── props/
│               ├── prop-pillar.glb
│               ├── prop-crystal.glb
│               └── prop-terminal.glb
├── src/
│   ├── main.ts                    # Application bootstrapper
│   ├── style.css                  # Cyberpunk arcade responsive styling & HUD
│   ├── vite-env.d.ts              # Vite environment declarations
│   └── game/
│       ├── constants.ts           # Grid dimensions, speeds, timings, enums
│       ├── Grid.ts                # Authoritative 2D spatial matrix & coordinate mapper
│       ├── AssetLoader.ts         # GLTFLoader manager with deep cloning & progress
│       ├── AudioManager.ts        # Synthesized Web Audio API sound effects
│       ├── InputManager.ts        # Keyboard & virtual touch multi-input handling
│       ├── UIManager.ts           # HUD metrics, loading bar, pause/win/loss modals
│       ├── Player.ts              # Grid-aligned movement, corner assist, animation
│       ├── Enemy.ts               # Scout wander AI & Hunter line-of-sight tracking
│       ├── Bomb.ts                # Fuse timers, accelerating pulse, chain reaction
│       ├── Explosion.ts           # 4-way ray propagation, wall stops, block damage
│       ├── PowerUp.ts             # Floating/spinning pickups with stat boosters
│       ├── Arena.ts               # Map generator, debris physics, prop decorator
│       └── Game.ts                # Master loop, camera framing, screen shake, lighting
├── index.html                     # Semantic markup, HUD overlay, modals, touch D-Pad
├── package.json                   # Dependencies & build scripts
├── tsconfig.json                  # Strict TypeScript compiler options
└── README.md                      # Comprehensive documentation
```

### Core Systems Breakdown

1. **Multi-Level Themed Stages & Campaign Progression (`constants.ts`, `Arena.ts`, `Game.ts`)**:
   - **Stage 1: Cyber Grid (Cyberpunk Neon Core)**: High-tech obsidian platform with neon cyan conduits, glowing amber hazard crates, and perimeter beacons.
   - **Stage 2: Magma Core (Volcanic Foundry)**: Scorched basalt floor with flowing lava channels, obsidian fortress pillars, volcanic slag furnace crates, and geothermal magma vents.
   - **Stage 3: Toxic Foundry (Acid Bio-Reserve)**: Industrial steel floor grating over bubbling acid vats, chemical pillars with hazard warning stripes, corrosive biohazard drums, and bio-reactor tanks.
   - **Stage 4: Cryo Frost (Glacial Zero Zone)**: Glacial permafrost floor, frozen cryo-coil obelisks, packed ice-coolant crates, and spires of glacial ice crystals.
   - Dynamic stage atmosphere: scene background, exponential fog, ambient light, hemisphere sky/ground, and dual-tone rim lights seamlessly morph between stages.
   - Persistent power-up upgrades carried over across stages upon clearing sectors.

2. **Quad-Tier Enemy AI & Archetypes (`Enemy.ts`)**:
   - **Roller Scout (Enemy A)**: Compact spherical scout drone with cyclops optic eye. Employs random corridor traversal with turn decisions at four-way intersections and dead-ends.
   - **Stalker Mech (Enemy B)**: Menacing horned carapace drone with horizontal red optic visor. Checks line-of-sight down corridors to charge down the player; when out of sight, evaluates Manhattan distance heuristics.
   - **Blitz Drone (Enemy C)**: High-speed golden delta-wing interceptor jet (`speed: 4.4`). Blazes down open lanes and makes rapid perpendicular corner cuts.
   - **Phantom Specter (Enemy D)**: Ethereal hover specter with floating satellite energy orbs (`speed: 2.3`). Possesses the ability to **phase through destructible blocks**, hunting the player down through walls of crates!

3. **Dual Cartoon Enemy Death Animations (`Enemy.ts`, `AudioManager.ts`)**:
   - **Death Variant 1 (Cuckoo Clock & Surrender Placard - `enemy-death.glb`)**: Robot lid pops open, internal gears rattle and spin, elevator rack lifts a mechanical cuckoo bird that flaps and chirps, and a comic surrender sign unfurls.
   - **Death Variant 2 (Rocket Malfunction Pinwheel & Crash-Dive - `enemy-death-rocket.glb`)**: Robot top hatch pops open, an ACME cartoon rocket springs out with a sizzling fuse, ignites and spins the robot like a wild 1440-degree pinwheel, shoots high into the air, sputters and flips 180 degrees upside down, pauses in midair, plunges headfirst into the floor with a comical squash-and-stretch bounce, and twitches upside-down as a white surrender flag pops out!
   - Every enemy randomly selects between the two death animations upon destruction, each accompanied by multi-stage procedural Web Audio cartoon sound effects.

4. **Authoritative 2D Grid Engine (`Grid.ts`)**:
   - Manages a 13 × 11 coordinate matrix with deterministic mathematical conversions between discrete grid coordinates `(col, row)` and continuous 3D world space `(x, y, z)`.
   - Authoritative cell types (`EMPTY`, `WALL`, `BLOCK`, `BOMB`) prevent ghost collisions or mesh clipping.
   - Fire occupancy tracking ensures instantaneous and accurate damage detection.

5. **Snappy Grid Movement & Corner Smoothing (`Player.ts`)**:
   - Enforces corridor bounds with half-width collision radius.
   - Corner assistance: automatically slides the player along open perpendicular corridors when turning into tight passages, avoiding the frustrating "stuck on corner" feel.
   - Responsive character orientation and walking bounce animations.

6. **Tactical Bomb & Flame Propagation (`Bomb.ts`, `Explosion.ts`)**:
   - **Fuse System**: Bombs have a 2.4-second fuse with dynamic scale squash-and-stretch and pulsing emissive glow that accelerates as detonation nears.
   - **Ray Propagation**: Flame radiates in all 4 cardinal directions up to the current blast range.
   - **Indestructible Walls**: Pillars and boundary walls absorb flame and halt propagation along that axis.
   - **Destructible Blocks**: Absorbs and stops the flame, breaks into stage-themed 3D physics debris shards, and probabilistically spawns power-ups.
   - **Chain Reactions**: Flame contacting an active bomb triggers immediate detonation.

7. **Power-Up Economy (`PowerUp.ts`)**:
   - 💣 **Bomb Capacity**: Increases maximum concurrent active bombs (up to 6).
   - 💥 **Blast Range**: Increases flame reach across grid cells (up to 7).
   - ⚡ **Speed Boost**: Enhances player movement speed for quick tactical escapes.

8. **Procedural Web Audio Synthesizer (`AudioManager.ts`)**:
   - 100% self-contained synthesized retro-arcade sound effects using the native browser Web Audio API.
   - Zero audio file downloads; produces instant mechanical placement clacks, ticking fuse chirps, explosive blasts, pickup arpeggios, bottle rocket screams, pinwheel spins, cuckoo chirps, and victory fanfares.

---

## 🎨 Blender MCP Visual Asset Pipeline

Every single 3D visual asset in this game was created directly in **Blender 5.2.1 LTS** through the **Blender MCP (Model Context Protocol)** connection, using procedural Python geometry generation, soft beveled profiles, custom PBR materials (Base Color, Metallic, Roughness, and Emissive Color), keyframed skeletal/object animations, and exported as standalone binary GLB files.

### Complete List of Authored 3D Assets

| Model Filename | Asset Name | Description & Visual Details |
| :--- | :--- | :--- |
| `player.glb` | **Blast Bot** | Stylized low-poly hero with rounded cyan helmet, glowing cyan visor, top antenna with light orb, white torso plating, battery backpack with twin energy canisters, and chunky boots. |
| `enemy-scout.glb` | **Roller Scout** | Spherical drone with warning orange casing, dark charcoal collar, glowing yellow cyclops camera lens, twin side thruster pods, and spring antennae. |
| `enemy-hunter.glb` | **Stalker Mech** | Angular diamond hover mech with dark crimson carapace, twin forward-swept sharp horns, horizontal glowing red optic slit, and lower hover engine. |
| `enemy-blitz.glb` | **Blitz Drone** | Aerodynamic delta-wing speed interceptor with glowing amber cockpit visor, swept wings, and twin glowing plasma thrusters. |
| `enemy-phantom.glb` | **Phantom Specter** | Ethereal floating spectral combat bot with dark indigo cowl, glowing violet eyes, floating satellite energy orbs, and anti-grav vortex base. |
| `enemy-death.glb` | **Death Variant A (Cuckoo)** | Robot lid pops open, brass gears spin, elevator rack rises carrying a mechanical cuckoo bird and an unfurling surrender flag. |
| `enemy-death-rocket.glb` | **Death Variant B (Rocket)** | Robot lid opens, cartoon ACME rocket springs out, ignites with pinwheel spin, shoots up, flips upside-down, dives headfirst into the floor with squash-and-stretch recoil. |
| `floor-tile.glb` | **Cyber Floor Slab** | 2×2 modular floor slab with beveled edges, recessed tech tread plate, and glowing cyan corner studs. |
| `solid-wall.glb` | **Cyber Wall** | Heavy reinforced titanium pillar with beveled corner cutouts, heavy top cap, plinth base, and glowing cyan energy conduits inset on all four faces. |
| `breakable-block.glb` | **Cyber Crate** | Industrial hazard crate with warm amber panels, steel corner brackets, top hoist ring, and glowing internal power cell windows. |
| `floor-tile-magma.glb` | **Magma Floor Slab** | Scorched basalt slab with recessed glowing molten lava fissure channels and obsidian corner studs. |
| `solid-wall-magma.glb` | **Magma Fortress Wall** | Volcanic obsidian fortress pillar with beveled stone layers, bronze plinths, and blazing vertical lava conduits. |
| `breakable-block-magma.glb` | **Magma Furnace Crate** | Volcanic slag crate with cast-iron corner brackets and glowing internal furnace grates. |
| `props/prop-magma-vent.glb` | **Geothermal Vent** | Stepped volcanic chimney cone with glowing molten lava caldera mouth. |
| `floor-tile-toxic.glb` | **Toxic Grate Slab** | Heavy industrial steel floor grating positioned above a glowing bioluminescent acid pool with hazard corner pads. |
| `solid-wall-toxic.glb` | **Toxic Vat Pillar** | Octagonal reinforced steel column with hazard warning stripes and glowing emerald radioactive fluid indicator tubes. |
| `breakable-block-toxic.glb` | **Toxic Waste Drum** | Cylindrical chemical container with ribbed reinforcement rings, radioactive trefoil hub, and glowing ooze vents. |
| `props/prop-toxic-vat.glb` | **Bio-Reactor Vat** | Tall industrial glass containment tank filled with bubbling glowing green radioactive fluid and steel braces. |
| `floor-tile-ice.glb` | **Cryo Ice Slab** | Glacial permafrost slab with diamond frost lattice, glassy sheen, and cyan frost studs. |
| `solid-wall-ice.glb` | **Cryo Obelisk Wall** | Hexagonal glacial permafrost obelisk wrapped in glowing cryogenic frost coils and chilled titanium plating. |
| `breakable-block-ice.glb` | **Cryo Coolant Crate** | Dense permafrost crate encasing glowing cryogenic coolant canisters and frost metal corners. |
| `props/prop-cryo-crystal.glb` | **Cryo Crystal Spire** | Cluster of sharp hexagonal glacial ice crystal spires sprouting from a frost-covered rock base. |
| `bomb.glb` | **Plasma Bomb** | Classic cartoonish spherical bomb with flat bottom, brass hex cap, curved braided fuse cord, glowing spark ember tip, and pulsing hazard equator ring. |
| `explosion-center.glb` | **Explosion Center** | Multi-pointed 3D radial starburst with blazing white-yellow core and 9 outward fire spikes. |
| `explosion-horizontal.glb` | **Explosion Horizontal** | Bilateral 2-unit flame shockwave along the X axis with inner energy core and billowing low-poly fire clouds. |
| `explosion-vertical.glb` | **Explosion Vertical** | Bilateral 2-unit flame shockwave along the Z axis with inner energy core and billowing low-poly fire clouds. |
| `powerup-bomb.glb` | **Bomb Pickup** | Floating octagonal energy ring with miniature 3D bomb emblem in cyan/blue. |
| `powerup-range.glb` | **Range Pickup** | Floating octagonal energy ring with 4-way cardinal fire starburst emblem in fiery crimson/orange. |
| `powerup-speed.glb` | **Speed Pickup** | Floating octagonal energy ring with stylized dual lightning bolts in electric gold. |
| `props/prop-pillar.glb` | **Perimeter Beacon** | Tall octagonal perimeter pylon with three glowing neon rings and an apex beacon sphere. |
| `props/prop-crystal.glb` | **Power Crystals** | Cluster of glowing hexagonal cyan crystals sprouting from a low-poly rock base. |
| `props/prop-terminal.glb` | **Arcade Console** | Futuristic server terminal with slanted holographic display screen and keyboard deck. |
| `arena-base.glb` | **Arena Base Platform** | Floating cyberpunk platform chassis with stepped beveled ballast hull, glowing perimeter accent rail, and four corner fortress bastions. |

### How Each Asset Was Exported and Loaded
1. **Procedural Authoring**: Executed via Blender MCP (`execute_blender_code`), creating clean meshes with precise dimensions, sensible origins (`Z=0` at base), and named PBR materials.
2. **Transform Application**: All object transformations (location, rotation, scale) were baked into geometry (`bpy.ops.object.transform_apply`).
3. **GLB Binary Export**: Exported using Blender's built-in glTF 2.0 exporter (`bpy.ops.export_scene.gltf(export_format='GLB')`) directly into `public/assets/models/`.
4. **Three.js Ingestion**: Loaded in `AssetLoader.ts` using `GLTFLoader`, which configures shadow casting/receiving, ensures tone-mapped PBR materials, and enables fast deep-cloning with independent instance transforms.

---

## 🛡️ Asset Provenance Statement

> **CRITICAL ASSET PROVENANCE DECLARATION:**
>
> - **100% of all visible 3D assets in this project were created in Blender through the Blender MCP interface.**
> - **No external 3D models, downloaded GLTF/GLB files, texture packs, stock assets, image generators, or online asset repositories were used.**
> - **All audio feedback is procedurally synthesized in real time via the native Web Audio API with zero external audio samples or sound files.**
> - **No copyrighted names, logos, characters, or proprietary assets from any commercial Bomberman title are used.**

---

## ⚡ Technical Highlights

- **Dynamic Camera Shake**: Uses an exponential decay camera trauma model on bomb explosions for tactile physical feedback.
- **Dynamic Point Lighting**: Detonations trigger instantaneous point lights that illuminate walls, crates, and characters.
- **Object Lifecycle & Garbage Collection**: Complete disposal of Three.js geometries, materials, and scene graphs upon level restarts, preventing memory leaks or duplicate animation loops.
- **Mobile Touch Controls**: Automatic responsive virtual D-Pad and Bomb button with touch-action isolation for touch devices and smaller screens.

---

## 📋 Known Limitations

- **Shadow Map Resolution on Mobile**: Very low-end mobile devices without WebGL 2.0 shadow map extensions may experience reduced shadow precision.
- **Web Audio Gesture Requirement**: Per modern browser autoplay policies, audio begins playing upon the first user interaction (key press or screen tap).
