# SavePixie Theme Worlds and Motion Language

## Theme structure

The chosen Pixie is not a cosmetic color toggle. It chooses the user's companion, palette, magical world, ambient effects, and motion personality. The choice is made during onboarding, stored with the profile, and can be changed later.

Four worlds bridge naturally into the existing WalletHabit visual families:

| Pixie | SavePixie world | WalletHabit bridge | Palette                                 | Motion personality                              |
| ----- | --------------- | ------------------ | --------------------------------------- | ----------------------------------------------- |
| Tide  | Classic Current | Classic            | Teal, coral, navy, sunlit gold          | Fluid ripples, bubbles, smooth arcs             |
| Grove | Growth Grove    | Growth             | Canopy green, fresh growth, warm yellow | Leaves, sprouts, patient organic easing         |
| Moon  | Linen Moon      | Linen              | Warm linen, sage, clay, soft cream      | Dust motes, paper petals, slow gentle drift     |
| Nova  | Midnight City   | Midnight           | Graphite, deep blue, electric sky, pink | Star trails, small orbits, precise quick motion |

Two additional worlds give SavePixie its own unlockable visual identity:

| Pixie  | SavePixie world | Palette                              | Motion personality                            |
| ------ | --------------- | ------------------------------------ | --------------------------------------------- |
| Ember  | Sunset City     | Terracotta, apricot, amber, burgundy | Ember motes, lantern glow, confident spring   |
| Aurora | Neon Bloom      | Mint, magenta, cyan, indigo          | Colour blooms, petals, playful elastic motion |

The four WalletHabit-linked themes do not need to look identical across products. They should feel like related places in the same universe.

## Motion hierarchy

Motion should communicate meaning before it decorates:

1. **Ambient** — the Pixie breathes or floats, tiny particles establish the chosen world, and the Pact place feels alive.
2. **Interaction** — presses compress, selected cards answer immediately, and navigation has clear spatial continuity.
3. **Progress** — a recorded deposit visibly travels from the action into the Pact and causes a persistent change.
4. **Celebration** — milestones earn a stronger Pixie reaction, sparkle burst, haptic beat, and world growth.
5. **Recovery** — missed progress uses slower settling motion and a calm rebuilding gesture, never a broken streak or punitive shake.

## Primary deposit animation

`12-save-celebration-motion-storyboard.png` defines the core animation:

| Time    | Beat   | Product meaning                                                                      |
| ------- | ------ | ------------------------------------------------------------------------------------ |
| 0 ms    | Tap    | The app immediately acknowledges the user's action.                                  |
| 120 ms  | Lift   | A glowing seed rises from “I saved something”.                                       |
| 360 ms  | Catch  | The Pixie catches the seed, tying the action to the companion.                       |
| 600 ms  | Burst  | A restrained sparkle and petal burst rewards the action.                             |
| 900 ms  | Grow   | The seed reaches the Pact world; the progress ring and environment improve together. |
| 1400 ms | Settle | Particles fade and the new saved amount remains clearly visible.                     |

Small deposits should use this compact 1.4-second sequence. A 25%, 50%, 75%, or 100% milestone can extend it with one additional world transformation. The final state must always remain visible after the animation.

## Implementation approach

- Build normal interface motion with CSS transforms, opacity, and the Web Animations API.
- Avoid animating layout properties during high-frequency interactions.
- Use a small canvas or WebGL overlay only for rare full-screen milestone effects.
- Keep generated visual assets optional. Adobe Firefly, the built-in image generator, or a motion tool can create transparent petals, glints, or special celebration layers, but navigation and core feedback must not depend on a downloaded video.
- If richer character animation is needed later, export a small Rive or Lottie state machine with idle, catch, celebrate, reassure, and sleep states.
- Test at 60 fps on a mid-range phone and cap particle counts on low-power devices.
- Pause ambient animation when the app is backgrounded or the element is off screen.
- Keep sound optional. Use one soft haptic for a deposit and a short two-beat haptic for a milestone.

## Accessibility and restraint

- Honour `prefers-reduced-motion`. Replace the deposit journey with a short crossfade and the same persistent progress update.
- Never require animation to understand a balance, contribution, or plan change.
- Avoid money explosions, slot-machine reels, near-miss effects, loss aversion, red failure states, and endless confetti.
- Keep ambient particles away from text and primary controls.
- Use celebration to reinforce a real saving action, not repeated app tapping.

## Stored theme data

The profile's `pixie_theme` remains the source of truth. The app maps it to:

- `world`
- `suiteBridge`
- `motionProfile`
- palette tokens
- mascot asset

The client may cache the selection for instant startup, while Supabase stores the durable account choice.

## Visual references

- `10-walletHabit-theme-bridge.png` — Tide, Grove, Moon, and Nova applied to the same Active Pact screen.
- `11-bonus-pixie-theme-worlds.png` — Ember Sunset City and Aurora Neon Bloom across the journey.
- `12-save-celebration-motion-storyboard.png` — the six-beat primary deposit animation.
