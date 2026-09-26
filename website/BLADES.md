# Blades configuration guide

This guide explains **`config/blades.ini`** — what it is for, the two blade types, how
they relate to presets, and copy-paste examples. The SD Config Editor **Blades** page
(`#/blades`) edits the same data and exports this file.

Firmware reference: [`doc/blade_config.md`](../doc/blade_config.md)  
Example file: [`examples/config/blades.ini`](../examples/config/blades.ini)

---

## Quick start — which setup do I need?

| Your build | Start with example | `NUM_BLADES` | Notes |
|------------|-------------------|--------------|-------|
| One NeoPixel strip only | [§1 Single main blade](#1-single-main-blade-beginner) | 1 | Simplest; one `style =` per preset |
| Main strip + crystal on same wire | [§2 Main + crystal sub-blade](#2-main--crystal-sub-blade-one-strip-two-styles) | 2 | Two styles, one `data_pin` |
| Main + second strip (e.g. pixel pommel) | [§3 Two NeoPixel strips](#3-two-neopixel-strips) | 2 | Two wiring entries |
| Main + Free1–3 accents (repo default) | [§4 Full four-blade saber](#4-full-four-blade-saber-example-repo-default) | 4 | Match `examples/config/blades.ini` |
| Main strip + one accent LED | [§5 NeoPixel + one accent](#5-neopixel-main--one-accent-only) | 2 | Drop unused Free pins |
| Motor / bar graph on a Free pin | [§6 Motor or sound-driven accent](#6-motor-or-sound-driven-accent) | 2+ | `type=simple` + `accent_on` or `accent_sound_on` |
| RGB LED star (no pixels) | [§7 RGB star (simple PWM)](#7-rgb-led-star-simple-pwm) | 1 | `pin1`…`pin3`, not NeoPixel |

**Rule of thumb:** `blades.ini` = **wiring** (pins, pixel count, segments). Colors and effects =
**presets** (`style =` lines) + optional **blade_styles.ini** recipes.

---

## What is `blades.ini` for?

`blades.ini` tells the saber **how hardware is wired**:

| Question | Answered by |
|----------|-------------|
| Which GPIO/data line drives this output? | `data_pin` |
| How many NeoPixels are on the strip? | `pixels` |
| Which FET(s) power the strip? | `power_pin` / `power_pin1`… |
| Is this a NeoPixel strip or a single PWM LED? | `type` (omit or `ws2811` vs `simple`) |
| Is one physical strip split into styled segments? | `sub_blade = first, last` |

It does **not** define colors or effects — that is **`config/presets.ini`** (`style =` per
blade index) and optionally **`config/blade_styles.ini`** (layer recipes — see
[BLADE_STYLES.md](./BLADE_STYLES.md)).

When `blades.ini` is present on the SD card (Proffieboard), it **replaces** the compiled
blade wiring from your firmware `CONFIG_FILE`. Presets and fonts still come from SD or
compiled defaults.

---

## Blade index vs logical blade

Each `blade = N` block in `blades.ini` is a **wiring entry** (one physical output path).

Each wiring entry maps to one or more **logical blades** for presets:

| Wiring | Logical blades | Preset `style =` lines |
|--------|----------------|------------------------|
| NeoPixel, no sub-blades | 1 | 1 line for that index |
| NeoPixel + 2 sub-blade ranges | 2 | 2 lines (see sub-blades below) |
| Simple PWM accent | 1 | 1 line (usually `accent_*`) |

**`NUM_BLADES`** in firmware must match the **total logical blade count** — the sum of
logical blades from every wiring entry. The editor shows this count at the bottom of the
Blades page.

Example: main strip + second strip + 3 accents → **5** logical blades → **5** `style =`
lines per preset in `presets.ini`.

---

## Blade types

### NeoPixel (`ws2811`) — LED strips

**Use for:** Main blade, secondary strips, pixel accents, crystal chambers on a data chain.

**Requires:** `data_pin`, `pixels`, at least one `power_pin` (FET) for high-current strips.

```ini
# ---- Main blade data (bladePin) ----
# Main blade — 144 LED strip
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1
```

**Multiple FETs** (e.g. long strip, dual FET for current):

```ini
blade = 1
data_pin = blade2Pin
pixels = 200
power_pin1 = bladePowerPin2
power_pin2 = bladePowerPin3
```

**When to use:** Any WS2811/NeoPixel chain where each LED can show a different color.

---

### Simple PWM (`type = simple`) — single LED or LED star

**Use for:** Free1–Free3 accent pins, bar graphs, motor indicators, single white/blue dies
without a pixel engine.

**Requires:** `type = simple`, `data_pin` (or `pin1`…`pin4` for multi-channel stars),
`led` type, `active_state`.

```ini
# ---- Free 1 / accent PWM (blade5Pin) ----
# Pulses with accent_pulse in presets
blade = 2
type = simple
data_pin = blade5Pin
led = CreeXPE2White
active_state = high
```

**Pair with presets** — one `style =` per accent index, e.g.:

```ini
style = accent_pulse 1500
style = accent_sound_on white 4096
style = accent_glow white
```

See [`examples/README.md`](../examples/README.md) for the full `accent_*` style list.

**`active_state`:**

| Value | Typical wiring |
|-------|----------------|
| `high` | GPIO → LED → GND (direct drive, most Free-pin accents) |
| `low` | Inverted / N-FET gate (same idea as blade power FETs) |

---

## Pin names vs numbers

Pin values can be **GPIO numbers** or **board names** from your config header:

| Name | Typical use (Proffie V3) |
|------|--------------------------|
| `bladePin` | Main blade data |
| `blade2Pin` … `blade4Pin` | Extra data lines |
| `blade5Pin` … `blade7Pin` | Free1–Free3 (often simple PWM accents) |
| `bladePowerPin1` … `bladePowerPin6` | NeoPixel FET power |
| `bladeIdentifyPin` | Blade ID resistor (special) |

The editor shows **Board pin (silkscreen)** read-only from the data pin catalog so you
can match the label printed on the board.

---

## Sub-blades — one strip, multiple styles

**Use for:** One physical NeoPixel chain where different LED ranges should have **different
styles** — e.g. main blade pixels 0–99 and crystal chamber pixels 100–143 on the same
data line.

Same idea as compiled `SubBlade(first, last, …)` in `blades/sub_blade.h`.

```ini
# ---- Main blade data (bladePin) ----
# Hilt + chamber on one 144-LED chain
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1
sub_blade = 0, 99
sub_blade = 100, 143
```

| Range | LEDs | Typical style role |
|-------|------|-------------------|
| `0, 99` | 100 | Main blade body |
| `100, 143` | 44 | Crystal chamber / accent segment |

Rules:

- Indices are **0-based** and **inclusive** (`0, 99` = 100 LEDs).
- Up to **8** `sub_blade` lines per strip.
- Ranges must fit inside `0 … pixels - 1`.
- Each range = **one** preset `style =` line (in order of `sub_blade` lines).
- Omit all `sub_blade` lines to treat the full strip as a single logical blade.

**Chained segments on one data line** (hilt PCB + crystal + accents — advanced):

```ini
blade = 0
data_pin = blade2Pin
pixels = 9
power_pin = bladePowerPin6
sub_blade = 0, 2
sub_blade = 3, 3
sub_blade = 4, 8
```

(Real pixel counts depend on your build; adjust `first`/`last` to match physical order.)

---

## Complete examples

### 1. Single main blade (beginner)

One strip, `NUM_BLADES` 1, one `style =` per preset.

```ini
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1

end
```

---

### 2. Main + crystal sub-blade (one strip, two styles)

`NUM_BLADES` 2 — two `style =` lines; both segments share one `blade = 0` wiring block
with two sub-blade ranges (firmware builds a SubBlade chain).

```ini
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1
sub_blade = 0, 119
sub_blade = 120, 143

end
```

---

### 3. Two NeoPixel strips

`NUM_BLADES` 2 — blade 0 and blade 1 each get their own `style =`.

```ini
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1

blade = 1
data_pin = blade2Pin
pixels = 60
power_pin1 = bladePowerPin2
power_pin2 = bladePowerPin3

end
```

---

### 4. Full four-blade saber (example repo default)

Matches [`examples/config/blades.ini`](../examples/config/blades.ini) and Proffie V3
**Reset to profile defaults** in the editor.

| Index | Type | Hardware | Typical preset style |
|-------|------|----------|----------------------|
| 0 | NeoPixel | Main 144 LED (power FETs 1–3) | `config …` or `standard …` |
| 1 | Simple | Free1 (`blade5Pin`) | `accent_pulse 1500` |
| 2 | Simple | Free2 (`blade6Pin`) | `accent_sound_on …` |
| 3 | Simple | Free3 (`blade7Pin`) | `accent_glow …` |

```ini
blade = 0
data_pin = bladePin
pixels = 144
power_pin1 = bladePowerPin1
power_pin2 = bladePowerPin2
power_pin3 = bladePowerPin3

blade = 1
type = simple
data_pin = blade5Pin
led = CreeXPE2White
active_state = high

blade = 2
type = simple
data_pin = blade6Pin
led = CreeXPE2White
active_state = high

blade = 3
type = simple
data_pin = blade7Pin
led = CreeXPE2White
active_state = high

end
```

**Important:** All four indices must appear in `blades.ini` when `NUM_BLADES` is 4.
Missing accent indices are **not** activated at boot even if `presets.ini` has styles for them.

For a **second NeoPixel strip** plus three accents, use `NUM_BLADES` 5 — see [§3 Two NeoPixel strips](#3-two-neopixel-strips) and add simple accents on indices 2–4.

---

### 5. NeoPixel main + one accent only

`NUM_BLADES` 2 — strip + one Free pin.

```ini
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1

blade = 1
type = simple
data_pin = blade5Pin
led = CreeXPE2White
active_state = high

end
```

Set firmware `NUM_BLADES` to **2** and use **two** `style =` lines per preset.

---

### 6. Motor or sound-driven accent

**Use for:** Hilt motors, bar graphs, or any single LED that should run while the blade is
out — or only while audio is playing (hum, swing, etc.).

`NUM_BLADES` 2 — main strip on index 0, motor on Free2 (index 1).

```ini
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1

blade = 1
type = simple
data_pin = blade6Pin
led = CreeXPE2White
active_state = high

end
```

**Preset pairing** (second `style =` line):

```ini
style = config my_main_blade
style = accent_on
```

Or sound-reactive (runs while speaker output is above threshold):

```ini
style = accent_sound_on white 4096
```

See [`examples/README.md`](../examples/README.md) for the full `accent_*` list.

---

### 7. RGB LED star (simple PWM)

**Use for:** Old-style RGB stars or discrete R/G/B dies on separate GPIO lines — **not** a
NeoPixel chain. One logical blade, three PWM channels.

```ini
blade = 0
type = simple
pin1 = bladePowerPin1
led1 = CreeXPE2Red
pin2 = bladePowerPin2
led2 = CreeXPE2Green
pin3 = bladePowerPin3
led3 = CreeXPE2Blue
active_state = high

end
```

Styles for multi-channel simple blades use the same preset system as NeoPixel blades
(one `style =` line). For accents you typically use solid or pulse styles rather than
full blade effects.

---

### 8. Pixel pommel on second data line

**Use for:** A short NeoPixel ring or bar on `blade2Pin` while the main blade stays on
`bladePin`. Each strip gets its own power FET(s).

`NUM_BLADES` 2.

```ini
blade = 0
data_pin = bladePin
pixels = 132
power_pin = bladePowerPin1

blade = 1
data_pin = blade2Pin
pixels = 12
power_pin = bladePowerPin2

end
```

Give each index a different `style =` in presets — e.g. main `config standard_blade` and
pommel `accent_glow white` or a short-strip rainbow.

---

## Compiled config vs SD `blades.ini`

| | Compiled (`CONFIG_FILE`) | SD `config/blades.ini` |
|--|--------------------------|-------------------------|
| **When used** | Always (fallback) | When file exists on SD (Proffieboard) |
| **Good for** | Shipping firmware, contests with fixed wiring | Iterating wiring without reflash |
| **Presets** | SD or compiled | SD or compiled (unchanged) |
| **Missing accent index** | Defined in C++ | Must appear in INI or that output stays dark |

If you edit wiring in this SD Config Editor, export `blades.ini` and copy it to
`config/` on the SD card. You do **not** need to change compiled blade arrays unless you
want the same wiring baked into firmware for SD-less boot.

---

## How presets connect (one preset, N logical blades)

Shipped **`examples/config/presets.ini`** assumes **`NUM_BLADES` 4** (main strip + three PWM accents).
Example when `NUM_BLADES` is 3 (main + crystal sub-blade + one accent):

```ini
new_preset
font = MyFont
track = tracks/hum.wav
style = config my_main_body
style = config crystal_chamber
style = accent_pulse 1500
name = Demo
variation = 0
end
```

| Line | Maps to | Defined in `blades.ini` by |
|------|---------|------------------------------|
| 1st `style =` | Logical blade 0 | `sub_blade = 0, 119` (or full strip) |
| 2nd `style =` | Logical blade 1 | `sub_blade = 120, 143` |
| 3rd `style =` | Logical blade 2 | `blade = 2`, `type = simple`, … |

Order matters: sub-blade ranges are counted **in file order**, then the next `blade = N`
block continues the logical index sequence.

---

## Comments in exported files

The editor exports two comment styles:

```ini
# ---- Main blade data (bladePin) ----
# Main blade — user note (optional)
blade = 0
...
```

| Comment | Source | Editable? |
|---------|--------|-----------|
| `# ---- … ----` | Board silkscreen label from data pin | No (derived) |
| `# …` on next line | Your **Note (optional)** field | Yes |

---

## Common mistakes

| Symptom | Likely cause |
|---------|----------------|
| Accent never lights | Blade index missing from `blades.ini` |
| Wrong strip length | `pixels` does not match physical LED count |
| Sub-blade segment dead | Range outside `0 … pixels-1` or wrong `first`/`last` |
| Style on wrong section | Sub-blade order does not match preset `style =` order |
| Pin conflict | Same data pin on two blades (editor disables duplicates) |
| Dark main blade, accents OK | `NUM_BLADES` / SD blade 0 init issue — check serial logs |

---

## Editor workflow

1. Open **Blades** (`#/blades`), pick **Board profile** or **Reset to profile defaults**.
2. For each blade card: set **Type**, **data_pin**, NeoPixel or simple fields.
3. NeoPixel: set **pixels**, **power pins**, optional **Sub-blades** ranges.
4. Add optional **Note** for your own documentation.
5. Check **logical blade count** in the page footer vs firmware `NUM_BLADES`.
6. **Export** → copy or download `blades.ini` to SD `config/`.

---

## Limits (firmware)

| Limit | Value |
|-------|-------|
| Wiring entries (`blade = N`) | 16 |
| Power pins per NeoPixel blade | 6 |
| Sub-blade ranges per strip | 8 |
| Pixels per strip | 1–65535 (also `maxLedsPerStrip` in config) |

---

## Related docs

- [BLADE_STYLES.md](./BLADE_STYLES.md) — layer recipes, blends, build-from examples
- [`doc/blade_config.md`](../doc/blade_config.md) — firmware parser grammar
