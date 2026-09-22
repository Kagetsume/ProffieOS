# Blade configuration file

A **blade configuration file** on the SD card defines which **data line** controls which blade, how many **pixels** are in that blade, and which **FET/power lines** are mapped to that blade.

## What this file is for

| You want to… | Configure in `blades.ini` | Configure elsewhere |
|--------------|---------------------------|---------------------|
| Wire the main NeoPixel strip | `data_pin`, `pixels`, `power_pin` | — |
| Add PWM accents (Free1–3) | `type=simple`, `data_pin`, `led` | `style = accent_*` in `presets.ini` |
| Split one strip into hilt + chamber | `sub_blade = first, last` | One `style =` per range in `presets.ini` |
| Change blade colors/effects | — | `presets.ini`, `blade_styles.ini` |

**Blade index** (`blade=0`, `blade=1`, …) is the wiring slot in this file. Each index (or each
**sub_blade** range on a strip) needs a matching **`style =`** line in `presets.ini`. Set
**`NUM_BLADES`** in your compiled firmware config to the total logical blade count.

When this file is **missing**, the saber uses blade drivers compiled into your `CONFIG_FILE`.
When it is **present** (Proffieboard), it **replaces** that wiring at runtime.

Editor guide with more examples: [`website/BLADES.md`](../website/BLADES.md).

## Location and name

- Path: **`config/blades.ini`** in the **root** of the SD card (same level as `Fonts`, `tracks`, `config/presets.ini`, etc.).
- Create the **`config`** folder if it does not exist.

## Format

INI-style: one variable per line, **whitespace is ignored** (spaces, tabs, blank lines). **Malformed lines are ignored** and do not cause a crash.

- **`blade=N`** – Start definition for blade index **N** (0-based). The following lines apply to this blade until the next `blade=M` or `end`.
- **`data_pin=P`** – Data line (GPIO pin number or name) that drives this blade’s LED data.
- **`pixels=N`** – Number of LEDs (pixels) in this blade (1–65535). Not used for **simple** PWM blades.
- **`type=ws2811`** – NeoPixel / WS2811 strip (default when `pixels=` is set).
- **`type=simple`** – PWM LED star or single accent LED (uses `data_pin=` / `pin1=`…`pin4=` and `led=` / `led1=`…`led4=`; omit `pixels=`).
- **`pin=P`** or **`pin1=P`** … **`pin4=P`** – PWM GPIO pin(s) for a **simple** blade. `data_pin=` can be used instead of `pin1=` for a single LED.
- **`led=NAME`** or **`led1=NAME`** … **`led4=NAME`** – LED circuit type for each simple channel (see list below). Defaults to **CreeXPE2White** when a pin is set but `led=` is omitted.
- **`active_state=high|low`** – On-state pin level for all simple pins (`high` = pin HIGH when on, for N-FET gates / GPIO→load→GND; `low` = inverted). Default **high**.
- **`active_state1=high|low`** … **`active_state4=high|low`** – Per-pin on-state level. **`active_high=`** / **`active_high1=`**…**`active_high4=`** are accepted aliases.
- **`power_pin=P`** – Single FET/power pin for this blade. Can appear multiple times; each value is assigned to the next power slot (power_pin1, power_pin2, …).
- **`power_pin1=P`** … **`power_pin6=P`** – Explicit FET/power pins 1–6 for this blade. Use -1 or omit for unused.
- **`end`** – End of the file (optional; end of file also stops parsing).

**Pin values** for `data_pin` and `power_pin` / `power_pin1`–`power_pin6` can be:

- **Numeric** – GPIO pin number (e.g. `20`, `21`).
- **Text constants** – Board pin names from your config’s pin map, for easier mapping. Examples: `bladePin`, `blade2Pin`, `blade5Pin`, `bladePowerPin1`, `bladePowerPin2`, … `bladePowerPin11`, `bladeIdentifyPin`, `blade3Pin` … `blade9Pin`. Names are case-sensitive and must match the C enum names in your board config. Unknown names are ignored (no crash).

**Simple LED type names** for `led=` / `led1=`…`led4=` (must match exactly):

`NoLED`, `CreeXPE2White`, `CreeXPE2Blue`, `CreeXPE2Green`, `CreeXPE2Red`, `CreeXPE2Amber`, `CreeXPE2PCAmber`, `CreeXPE2RedOrange`, `CreeXPL`, `Blue3mmLED`, `Red8mmLED100`, `Blue8mmLED100`, `CH1LED`, `CH2LED`, `CH3LED`, `ServoSelector`

## Example `config/blades.ini`

```ini
# Blade 0: main blade on data pin 0, 144 LEDs, power on pin 20
blade=0
data_pin=0
pixels=144
power_pin=20

# Blade 1: second strip on data pin 2, 60 LEDs, power on pins 21 and 22
blade=1
data_pin=2
pixels=60
power_pin1=21
power_pin2=22

end
```

Using **text constants** (same result, easier to read and match to your board):

```ini
blade=0
data_pin=bladePin
pixels=144
power_pin=bladePowerPin1

blade=1
data_pin=blade2Pin
pixels=60
power_pin1=bladePowerPin2
power_pin2=bladePowerPin3

end
```

Or using repeated `power_pin=`:

```ini
blade=0
data_pin=0
pixels=97
power_pin=20
power_pin=21

blade=1
data_pin=2
pixels=144
power_pin=22

end
```

### Simple PWM LED (accent or LED star)

Single white accent on Free1:

```ini
blade=2
type=simple
data_pin=blade5Pin
led=CreeXPE2White
active_state=high
```

RGB LED star (three channels, one logical LED):

```ini
blade=0
type=simple
pin1=bladePowerPin1
led1=CreeXPE2White
pin2=bladePowerPin2
led2=CreeXPE2Blue
pin3=bladePowerPin3
led3=CreeXPE2Blue
```

Pair simple accents with **`accent_*`** named styles in `config/presets.ini` (e.g. `accent_sound_on`, `accent_on`, `accent_glow`, `accent_clash`, `accent_blast`, `accent_lockup`, `accent_swing`, `accent_drag`, `accent_melt`, `accent_blink`, `accent_sequence`, `accent_battery`, `accent_sparkle`, `accent_preon`, `accent_postoff`, …). Layered accents: **`style = config accent_combat`** from `blade_styles.ini`. See `examples/README.md` for a full list.

## How it is used

- **Loading:** At startup (when SD is present), the firmware tries to open **`config/blades.ini`**. If the file exists and parses correctly, blade definitions are stored (up to 16 blades, up to 6 power pins per NeoPixel blade).
- **When the file is present:** If **`config/blades.ini`** is present and valid, it **replaces** the compiled blade configuration. The firmware creates blade drivers from the file (NeoPixel or simple PWM) and uses them instead of the blades defined in your `CONFIG_FILE`. Presets and save_dir still come from the first compiled config. Blade indices omitted from the file keep their **compiled** drivers.
- **When the file is absent:** Blade hardware is determined by the **compiled config** (your `CONFIG_FILE`) as before.
- **Platform:** Runtime blade creation from the file is implemented for **Proffieboard (STM32)**. NeoPixel blades require **ENABLE_WS2811**; simple PWM blades work whenever SD blade config is enabled on Proffieboard.

## Sub-blades

You can split one physical strip into multiple LED ranges (sub-blades) so each segment can be styled independently. This matches compiled `SubBlade(first, last, ...)` in `blades/sub_blade.h`.

**Typical uses:**

| Layout | Example ranges | Why |
|--------|----------------|-----|
| Main + crystal on one chain | `0, 119` and `120, 143` | Different styles on body vs chamber |
| Hilt PCB + crystal + accents (one data line) | `0, 2`, `3, 3`, `4, 8` | One physical chain, multiple logical blades |
| Shorter “effective” main blade | `0, 99` only (rest unused) | Style only part of a long strip |

```ini
# Main body + crystal chamber — two preset style = lines for blade 0
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1
sub_blade = 0, 99
sub_blade = 100, 143
```

```ini
# Single strip, no sub-blades — entire 144 LEDs share one style
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1
```

- **sub_blade = first, last** — One LED range: `first` and `last` are inclusive indices (0-based). Add multiple lines for multiple segments. Up to **8** sub-blades per blade.
- When any `sub_blade` lines are present, the blade is built as a SubBlade chain. Ranges must be within `0` … `pixels - 1`.
- When no sub_blade lines are given, the full strip is used as one logical blade.

## Five-blade example (NeoPixel + accents)

Matches [`examples/config/blades.ini`](../examples/config/blades.ini) when `NUM_BLADES` is 5:

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

blade = 2
type = simple
data_pin = blade5Pin
led = CreeXPE2White
active_state = high

blade = 3
type = simple
data_pin = blade6Pin
led = CreeXPE2White
active_state = high

blade = 4
type = simple
data_pin = blade7Pin
led = CreeXPE2White
active_state = high

end
```

Indices 2–4 are **simple PWM** accents on Free1–Free3. Pair with `accent_pulse`, `accent_sound_on`, `accent_glow`, etc. in `presets.ini`.

## Limits

- **Blade definitions:** Up to **16** blades (indices 0–15). When the file is used at runtime, the number of blades is also limited by **NUM_BLADES** in your compiled config (only the first NUM_BLADES file entries are used).
- **Power pins per blade:** Up to **6** (power_pin1 … power_pin6, or multiple `power_pin=` lines).
- **Sub-blades per blade:** Up to **8** ranges (`sub_blade = first, last`).
- **Pixels:** 1–65535 per blade; invalid or missing values are ignored. Runtime blades use **maxLedsPerStrip** from your config as the maximum pixels per blade.

## Parser hardening

The blades.ini parser is hardened so malformed or hostile content does not crash or leak memory:

- **Line cap:** Parsing stops after **SD_BLADE_CONFIG_MAX_LINES** (512) lines.
- **Variable names:** Read with `readVariable(variable[33])` (max 32 chars + null).
- **Numeric values:** **blade** index: at most 2 digits (0–15). **pixels**: at most 5 digits (clamped to 1–65535). **data_pin** / **power_pin** numeric: at most 4 digits (or `-` + 3 digits) to avoid integer overflow.
- **Pin names:** Word buffer 33 chars; unknown names yield -1.
- **sub_blade:** Two integers (first, last), max 5 digits each; ranges validated (first ≤ last < pixels).
- **Malformed lines:** Missing `=`, unknown variable, or invalid value cause the line to be skipped.
- **File:** Open failure leaves blade count 0 and returns; file is closed on normal exit.

## Notes

- **Whitespace:** Spaces, tabs, and blank lines are allowed; only the variable names and values matter.
- **Malformed lines:** Lines that don’t match `variable=value` or that have invalid numbers are skipped; they do not crash the parser.
- **Missing file:** If **`config/blades.ini`** is missing or unreadable, blade config is simply not loaded; the board runs as before with only the compiled blade configuration.
