# Blade configuration file

A **blade configuration file** on the SD card defines which **data line** controls which blade, how many **pixels** are in that blade, and which **FET/power lines** are mapped to that blade.

## Location and name

- Path: **`config/blades.ini`** in the **root** of the SD card (same level as `Fonts`, `tracks`, `config/presets.ini`, etc.).
- Create the **`config`** folder if it does not exist.

## Format

INI-style: one variable per line, **whitespace is ignored** (spaces, tabs, blank lines). **Malformed lines are ignored** and do not cause a crash.

- **`blade=N`** – Start definition for blade index **N** (0-based). The following lines apply to this blade until the next `blade=M` or `end`.
- **`data_pin=P`** – Data line (GPIO pin number or name) that drives this blade’s LED data.
- **`pixels=N`** – Number of LEDs (pixels) in this blade (1–65535).
- **`power_pin=P`** – Single FET/power pin for this blade. Can appear multiple times; each value is assigned to the next power slot (power_pin1, power_pin2, …).
- **`power_pin1=P`** … **`power_pin6=P`** – Explicit FET/power pins 1–6 for this blade. Use -1 or omit for unused.
- **`end`** – End of the file (optional; end of file also stops parsing).

**Pin values** for `data_pin` and `power_pin` / `power_pin1`–`power_pin6` can be:

- **Numeric** – GPIO pin number (e.g. `20`, `21`).
- **Text constants** – Board pin names from your config’s pin map, for easier mapping. Examples: `bladePin`, `blade2Pin`, `bladePowerPin1`, `bladePowerPin2`, … `bladePowerPin11`, `bladeIdentifyPin`, `blade3Pin` … `blade9Pin`. Names are case-sensitive and must match the C enum names in your board config. Unknown names are ignored (no crash).

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

## How it is used

- **Loading:** At startup (when SD is present), the firmware tries to open **`config/blades.ini`**. If the file exists and parses correctly, blade definitions are stored (up to 16 blades, up to 6 power pins per blade).
- **When the file is present:** If **`config/blades.ini`** is present and valid, it **replaces** the compiled blade configuration. The firmware creates blade drivers from the file (data pin, pixel count, power pins) and uses them instead of the blades defined in your `CONFIG_FILE`. Presets and save_dir still come from the first compiled config.
- **When the file is absent:** Blade hardware is determined by the **compiled config** (your `CONFIG_FILE`) as before.
- **Platform:** Runtime blade creation from the file is implemented for **Proffieboard (STM32)** with **WS2811** enabled. On other boards or without WS2811, the file is loaded for reference but compiled blades are still used.

## Sub-blades

You can split one physical strip into multiple LED ranges (sub-blades) so each segment can be styled independently:

```ini
blade = 0
data_pin = bladePin
pixels = 144
power_pin = bladePowerPin1
sub_blade = 0, 99
sub_blade = 100, 143
```

- **sub_blade = first, last** — One LED range: `first` and `last` are inclusive indices (0-based). Add multiple lines for multiple segments. Up to **8** sub-blades per blade.
- When any `sub_blade` lines are present, the blade is built as a SubBlade chain (same as compiled `SubBlade(first, last, ...)`). Ranges must be within `0` … `pixels - 1`.
- When no sub_blade lines are given, the full strip is used as one blade.

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
