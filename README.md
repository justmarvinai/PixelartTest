# Pixel Meadow

A tiny top-down pixel-art scene in the spirit of Stardew Valley, built to show
what hand-authored-in-code pixel art can look like. There are **no image
files**: every sprite, tile and animation frame is drawn from JavaScript at
boot and rendered on a low-resolution canvas with integer scaling.

## What is in the scene

- A playable farmer with 4-direction walk cycles, idle breathing, blinking,
  running with dust, and tall grass that rustles underfoot
- A villager on a walking route (same rig, swapped palette) you can talk to
- Hens that wander, peck and scatter when you run at them, chicks that follow
  their mother, a mallard doing laps of the pond, a cat on the doorstep,
  butterflies
- A cottage with chimney smoke and windows that light up at dusk
- Trees whose canopies are re-rasterised for each of 8 wind frames, falling
  leaves and blossom petals
- A pond with lapping foam, drifting glints, ripples, lily pads and reeds
- A farm plot with crops, sunflowers, a scarecrow and auto-connecting fences
- A full day/night cycle with a dithered lightmap, lamp posts and fireflies
- Optional rain with splashes and pond ripples

## Controls

| Input               | Action                                   |
| ------------------- | ---------------------------------------- |
| WASD / arrow keys   | Move                                     |
| Shift               | Run                                      |
| Space / E / Enter   | Talk / interact (sign, villager, cat, hens), otherwise hop |
| G                   | Sprite gallery (all assets, animated)    |
| T                   | Skip to the next time of day             |
| R                   | Toggle rain                              |
| H                   | Toggle the controls hint                 |
| Touch               | Left thumb = stick, right thumb = hold to run, tap to talk / hop |

The Gallery button and the time badge in the corners are clickable too.

Handy URL parameters: `?gallery` opens the sprite gallery, `?t=0.8` starts at
night (0 to 1 is one full day), `?freeze` stops the clock, `?rain` starts in
the rain, `?scale=6` forces the pixel scale.

## Run locally

It is a static site with ES modules, so any static file server works:

```bash
npx serve .
```

```bash
python3 -m http.server 8000
```

## Deploy to Vercel

No build step and no dependencies. Import the repository in Vercel, keep the
framework preset on **Other**, leave the build command empty and deploy. Or
from the CLI:

```bash
npx vercel --prod
```

## How the art is made

| File                   | What it draws                                               |
| ---------------------- | ----------------------------------------------------------- |
| `js/palette.js`        | The shared hue-shifted colour ramps                         |
| `js/pixel.js`          | Sprite-from-text rasteriser, pixel buffer, noise helpers    |
| `js/art/character.js`  | Farmer / villager: head and body layers, walk frames        |
| `js/art/creatures.js`  | Hen, chick, duck, cat, butterflies                          |
| `js/art/props.js`      | Rocks, flowers, crops, lamp, sign, fence, scarecrow, ...    |
| `js/art/trees.js`      | Procedural leaf-clump canopies and tiered pines             |
| `js/art/house.js`      | The cottage (shingles, plaster, stonework, lit windows)     |
| `js/terrain.js`        | Per-pixel ground painter: grass, dirt paths, water, soil    |
| `js/fx.js`             | Particles, water animation, cloud shadows, night lighting   |
| `js/world.js`          | Scene layout                                                |
| `js/entities.js`       | Player, villager and animal behaviour                       |
| `js/ui.js`, `js/font.js`, `js/gallery.js` | HUD, bitmap font, sprite gallery         |
