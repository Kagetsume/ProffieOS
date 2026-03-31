# ProffieOS config file examples

These are **example config files** for the SD card. Copy the entire **`config`** folder (or individual files) to the **root of your SD card** so the paths match what the firmware expects:

- SD root: `Fonts/`, `tracks/`, **`config/`**
- Config files: `config/board.ini`, `config/features.ini`, `config/blades.ini`, `config/blade_styles.ini`, `config/presets.ini`

You do **not** need to use every file. Only the files you put on the SD card are read. Omitted files are ignored and compile-time or default behavior is used.

The examples assume **`NUM_BLADES` 2** (see `config/config-files-config.h`): `blades.ini` defines blade 0 and 1, and `presets.ini` has **two** `style =` lines per preset. If you only have **one** physical strip, either set **`NUM_BLADES` 1** in your firmware config and use a **single-blade** `blades.ini` (blade 0 only) plus **one** `style =` per preset, or keep `NUM_BLADES` 2 and duplicate the same `style =` twice (the firmware maps the first working SD blade driver to the primary if blade 0 fails to init).

| File | Purpose |
|------|---------|
| **board.ini** | Board hardware: button count, OLED on/off, Bluetooth serial on/off. Optionally gesture/twist (overridden by features.ini if present). |
| **features.ini** | Feature toggles: gesture, twist-on, twist-off. Loaded after board.ini; use for contest-specific overrides without changing hardware. |
| **blades.ini** | Blade wiring: data pin, pixel count, power pins per blade. Replaces compiled blade config when present (platform-dependent). |
| **blade_styles.ini** | Named style "recipes" as layers. See table below for full feature list. |
| **blade_styles/palettes_extra.ini** | Example **`[palette_alt]`** pulled in by **`include =`** from **`blade_styles.ini`**. |
| **blade_styles/strobe_overlay.ini** | Example fragment merged by **`include =`** inside a **`[section]`**. |
| **presets.ini** | Preset list: font, track, style, name. Includes examples of **`config <section>`**, variable overrides, nested configs, preon/postoff, and direct named styles. |

## blade_styles.ini features

| Feature | Description |
|---------|-------------|
| **Layer styles** | `standard`, `fire`, `rainbow`, `unstable`, `strobe`, `blast`, `cycle`, `advanced` -- opaque blade styles composited as layers. |
| **Preon/postoff** | `preon_glow`, `preon_wipe`, `preon_sputter`, `postoff_glow`, `postoff_wipe`, `postoff_sputter` -- transparent transition layers that play before ignition or after retraction, with duration and intensity driven by sound files. See section below. |
| **Blend modes** | `normal`, `multiply`, `screen`, `add` -- control how layers combine. |
| **Opacity** | `opacity <0-32768>` -- per-layer transparency control. |
| **Variables** | `name = value` + `{{name}}` -- section-local variables with preset overrides (`config section key=value`). |
| **Palettes** | `[palette_<id>]` sections with `palette = <id>` -- shared variable sets across sections. |
| **Includes** | `include = path/file.ini` -- merge layers or palettes from external files. |
| **Structured layers** | `layer.<style>.<slot> = value` -- key-per-argument alternative to single-line format. |
| **Nesting** | `layer = config <other_section>` -- compose sections from other sections. |

## Preon and postoff configuration layers

This section explains how **preon** and **postoff** work when you use SD card **config** styles (`style = config <section>` in `presets.ini` and a matching `[section]` in `blade_styles.ini`). The same ideas apply to postoff; both are implemented as **transition layers** inside a multi-layer `ConfigLayersStyle`.

### What a “config layer” is

A preset that uses `style = config my_blade` does **not** embed the whole blade style in `presets.ini`. Instead, the firmware builds one composite style from the **`layer = ...` lines** in `[my_blade]` inside `config/blade_styles.ini`.

- Layers are evaluated **bottom to top** (first `layer =` is the base; each later line is drawn **on top**).
- Each layer can be a normal blade style (`standard`, `fire`, `rainbow`, …) or a special **preon/postoff** style (`preon_glow`, `postoff_wipe`, …).
- Colors are **composited** per LED using the layer’s blend mode and opacity (preon/postoff layers use **internal** transparency; you usually do **not** wrap them in `opacity` unless you know you want that).

Preon and postoff layers are **idle most of the time**: they contribute **fully transparent** pixels until their blade effect fires, play **one transition**, then go idle again.

### How preon/postoff hook into the saber (firmware behavior)

This is the sequence the **prop and font** drive; your config layers only **visualize** it.

**Preon (before main ignition)**

1. You activate the saber. The firmware fires **`EFFECT_PREON`** and, if the active font has **preon** sounds, plays a **preon** WAV.
2. While preon is active, the main blade style is still logically **off** (no full extension yet). Ignition of the main blade (extension + hum as you expect) is **delayed until the preon sound finishes** when preon files exist.
3. After preon audio ends, the main blade ignites as usual.

**Postoff (after main retraction)**

1. You deactivate the saber. The main blade **retracts** first.
2. When retraction is complete, the firmware fires **`EFFECT_POSTOFF`**. If the font has **pstoff** (post-off) sounds, those play now.
3. When postoff audio finishes, blade power can fully shut down.

So: **preon = startup delay + startup visuals tied to preon audio**; **postoff = after full retraction + visuals tied to pstoff audio**. Your `preon_*` / `postoff_*` layers should assume this order.

**Font sound folders (typical ProffieOS layout)**

- **Preon:** effect **`preon`** — WAVs usually live under a **`preon/`** folder in the font.
- **Post-off:** effect **`pstoff`** — WAVs usually live under a **`pstoff/`** folder (name is **`pstoff`**, not “postoff”, in the effect system).

If those sounds are missing, timing falls back to the prop’s default (often **no** preon delay and **no** postoff tail). The visual layers still **receive** the preon/postoff effect events when the prop fires them; audio-reactive layers tend to stay **transparent** when there is little or no signal.

### How the named preon/postoff layers are implemented (summary)

In firmware, these SD “named styles” are built from **`TransitionEffectConfigL`**: a thin adapter around **`TransitionEffectL`** so they work correctly **inside** `ConfigLayersStyle`.

- **While the transition runs**, the adapter sets an internal flag so **`ConfigLayersStyle` does not forward `allow_disable()`** from other layers. That keeps the blade **powered** even though the base layer thinks the saber is still “off” (preon) or has already retracted (postoff).
- **When idle**, the layer behaves like a no-op for power and produces **transparent** output so lower layers show through.

That is why preon/postoff work as **ordinary** `layer =` entries next to `standard` or `fire`: they do not need a separate wiring path beyond being listed in the section.

### Duration: `WavLen` matches the sound file

All six built-in preon/postoff styles use **`WavLen<EFFECT_PREON>`** or **`WavLen<EFFECT_POSTOFF>`** for their timed phases. In practice:

- **`WavLen`** reads the **length in milliseconds** of the WAV that was chosen for that effect (from the blade effect’s `sound_length`).
- Wipe animations (hilt→tip or tip→hilt) are stretched to that length.
- Hold phases (glow/sputter) stay active for that length.

You **do not** pass millisecond arguments for these styles in INI — only **`layer = preon_glow blue`** style **`<color>`**.

**Caveat:** `WavLen` is only meaningful when the effect has a real sound length. If there is no matching sound (or length is zero), behavior can be minimal or degenerate; pairing these layers with fonts that actually ship **preon** / **pstoff** WAVs gives the intended result.

### Audio reactivity: `SmoothSoundLevel`

**`preon_glow`**, **`postoff_glow`**, **`preon_sputter`**, and **`postoff_sputter`** use **`SmoothSoundLevel`**: a **smoothed envelope** of the audio output (roughly “how loud” the speaker is over time), not raw per-sample waveform.

- **Glow:** same brightness on every LED; scales with loudness.
- **Sputter:** each LED from hilt toward tip turns on when the envelope exceeds a position threshold — **loud → longer lit segment**, **quiet → shorter**, **silent → transparent**.

Because the envelope follows **what is playing**, during preon/pstoff it is dominated by those clips. Any other simultaneous audio could also influence the envelope slightly; that is expected.

### Layer order (recommended)

A practical default:

```ini
[my_blade]
layer = standard cyan white 300 800    ; base blade (opaque when on)
layer = blast white                     ; optional transparent overlay
layer = preon_glow blue                 ; on top when preon runs
layer = postoff_wipe red                ; on top when postoff runs
```

**Why this order**

- The **base** should be first so clash, lockup, and extension/retraction behave normally.
- **Blast** (and similar transparent overlays) usually sit above the base but below optional accents.
- **Preon/postoff** are normally **last** (or among the last) so their transition draws **on top** of the dark/off blade during startup and shutdown.

You can add **multiple** preon or postoff layers in one section; if they share the same trigger, they **all** start together when that effect fires.

### Structured layer syntax (preon/postoff)

The optional **`layer.<style>.<slot> = value`** form in `blade_styles.ini` is implemented only for **standard**, **fire**, **rainbow**, **strobe**, **cycle**, **unstable**, and **advanced** (see **doc/blade_styles_config.md**). **Preon and postoff named styles** are not wired into that path yet — use a single line per layer:

```ini
layer = preon_glow blue
layer = postoff_wipe red
```

### Available styles (reference)

| Style | Trigger | Effect | Arguments |
|-------|---------|--------|-----------|
| `preon_glow` | EFFECT_PREON | Uniform blade glow, brightness ≈ sound envelope | `<color>` |
| `preon_wipe` | EFFECT_PREON | Wipe color hilt-to-tip over sound duration | `<color>` |
| `preon_sputter` | EFFECT_PREON | Lit length from hilt follows sound envelope | `<color>` |
| `postoff_glow` | EFFECT_POSTOFF | Uniform blade glow, brightness ≈ sound envelope | `<color>` |
| `postoff_wipe` | EFFECT_POSTOFF | Wipe color tip-to-hilt over sound duration | `<color>` |
| `postoff_sputter` | EFFECT_POSTOFF | Lit length from hilt follows sound envelope | `<color>` |

### End-to-end timeline

```
Button press
  |-> EFFECT_PREON fires
  |-> Preon sound plays (if font has preon/)
  |-> Preon config layers run for the preon sound duration (WavLen)
  |     - glow: brightness tracks SmoothSoundLevel
  |     - wipe: color sweeps hilt-to-tip over that duration
  |     - sputter: lit length tracks SmoothSoundLevel
  |-> Preon sound ends -> main blade ignites
  |-> Normal operation (clash, lockup, blast, etc.)
  |
Button off
  |-> Main blade retracts
  |-> Blade fully retracted -> EFFECT_POSTOFF fires
  |-> Pstoff sound plays (if font has pstoff/)
  |-> Postoff config layers run for the pstoff sound duration (WavLen)
  |-> Pstoff sound ends -> LEDs power off
```

### Full minimal example

**presets.ini**

```ini
new_preset
font = MyFont
track = tracks/hum.wav
style = config my_blade
style = config my_blade
name = Preon demo
variation = 0
end
```

**blade_styles.ini**

```ini
[my_blade]
layer = standard cyan white 300 800
layer = blast white
layer = preon_glow blue
layer = postoff_wipe red
```

### Example sections in this repo

- **[mystic_awakening]** — `preon_glow` + `postoff_wipe` (Preset 10).
- **[spectral_gate]** — `preon_wipe` + `postoff_wipe` (Preset 11).
- **[inferno_ritual]** — `preon_glow` + `postoff_wipe` on a **fire** base (Preset 12).
- **[sputter_gate]** — `preon_sputter` + `postoff_sputter` (Preset 13).

### Tips

- Copy **`config/blade_styles.ini`** whenever you change layers; the saber reads it from the SD card.
- Rebuild and flash firmware when **named style definitions** in C++ change; INI-only edits need only the SD files.
- Use **glow** for a full-blade pulse, **sputter** for length that follows loudness, **wipe** for a clear directional sweep.
- Contrasting preon vs main blade color reads clearly on a dark blade before extension.

See **doc/board_config.md**, **doc/blade_config.md**, **doc/blade_styles_config.md**, **doc/README_blade_styles_config.md**, and **doc/sd_config.md** for full format and options.

Feature checklist and implementation history: **doc/blade_styles_config_roadmap.md**.
