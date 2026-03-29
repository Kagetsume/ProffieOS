# Board and features configuration files

Board and feature config files on the SD card let you set **hardware** (buttons, OLED) and **feature toggles** (gesture, twist on/off) without recompiling. They are split so **contest-specific** setups can override only features (e.g. **config/features.ini**) and leave hardware (e.g. **config/board.ini**) unchanged.

## Config file layout (config/ on SD)

| File | Purpose | Use for contests |
|------|---------|------------------|
| **config/blades.ini** | Blade wiring (data_pin, pixels, power_pin per blade) | Same hardware; rarely changed per contest. |
| **config/board.ini** | Board hardware: **buttons** (1/2/3), **oled** (on/off), **bluetooth** (on/off). May also contain gesture/twist (overridden by features.ini when present). | One file per board type; keep stable. |
| **config/features.ini** | Feature toggles: **gesture**, **twist_on**, **twist_off**. Overwrites those from board.ini when present. | **Contest-specific:** drop in a features.ini per contest (e.g. gesture on, twist off) without touching board.ini. |
| **config/blade_styles.ini** | Style layers ([section], layer = style string) for **config &lt;name&gt;** presets. | Contest-specific styles if needed. |
| **config/presets.ini** | Preset list (font, style, name, etc.) when using SD presets. | Contest-specific presets. |

**Recommendation:** Put **hardware** in **config/board.ini** (buttons, oled) and **feature toggles** in **config/features.ini** (gesture, twist_on, twist_off). For a contest, copy only **config/features.ini** (and optionally blade_styles.ini, presets.ini) so management is easier and board wiring stays the same.

**Memory:** These config files use negligible RAM (one small struct for board + features). The only config that can use a lot of RAM is **config/presets.ini** (heap for every preset’s font, track, name, and style strings). See **sd_config.md** for details and recommendations.

---

## Board hardware: config/board.ini

- Path: **`config/board.ini`** in the **root** of the SD card (same level as `Fonts`, `tracks`, `config/blades.ini`, `config/presets.ini`).
- Create the **`config`** folder if it does not exist.
- **board.ini** is loaded first; **config/features.ini** is loaded next and overwrites **gesture**, **twist_on**, **twist_off** when present.

## Format

INI-style: one variable per line. **Whitespace** (spaces, tabs, blank lines) is ignored. Lines starting with **`#`** or **`;`** are comments. **Malformed lines are ignored** and do not cause a crash.

| Variable    | Values        | Meaning | File |
|------------|----------------|---------|------|
| **buttons** | 1, 2, or 3 | Effective number of buttons. | board.ini |
| **oled** | on, off, 1, 0, true, false | Enable or disable OLED display. | board.ini |
| **bluetooth** | on, off, 1, 0, true, false | Enable or disable Bluetooth serial (Serial3) when built with **ENABLE_SERIAL**. | board.ini |
| **gesture** | on, off, 1, 0, true, false | Enable or disable gesture ignition. | board.ini or **features.ini** (overrides) |
| **twist_on** | on, off, 1, 0, true, false | Enable or disable twist-to-turn-on. | board.ini or **features.ini** (overrides) |
| **twist_off** | on, off, 1, 0, true, false | Enable or disable twist-to-turn-off. | board.ini or **features.ini** (overrides) |

Values are case-insensitive for **on** / **off** / **true** / **false**.

## Example `config/board.ini`

```ini
# Gesture and twist
gesture = on
twist_on = on
twist_off = on

# OLED display
oled = on

# Bluetooth serial (Serial3) when ENABLE_SERIAL is defined
bluetooth = on

# Number of buttons (1, 2, or 3)
buttons = 2
```

Minimal (twist and OLED off, two buttons):

```ini
twist_on = off
twist_off = off
oled = off
buttons = 2
```

## Features: config/features.ini

- Path: **`config/features.ini`** (same **config/** folder as board.ini).
- **Load order:** **board.ini** is loaded first, then **features.ini**. Any **gesture**, **twist_on**, or **twist_off** in features.ini **overwrites** the value from board.ini. So you can keep board.ini for hardware only and use features.ini for contest-specific gesture/twist.
- **Format:** Same as board.ini (variable=value, # and ; comments). Only **gesture**, **twist_on**, **twist_off** are read; other variables are ignored.
- **Example:** For a contest that disables twist-off:
  ```ini
  gesture = on
  twist_on = on
  twist_off = off
  ```

## When the files are used

- **board.ini** and **features.ini** are read at startup when SD is enabled, **before** prop setup, so gesture/twist can be applied in Fett263 or BC Setup().
- If **config/board.ini** is missing, all options keep their compile-time or prop-specific defaults. If **config/features.ini** is missing, gesture/twist from board.ini (if any) are used.
- If the file is present but a variable is omitted or invalid, that option is left as “not set” and the default is used.
- **saber_BC_buttons:** **twist_on** and **twist_off** from the config disable those gestures at runtime when set to off.
- **saber_fett263_buttons:** **gesture**, **twist_on**, **twist_off** (from board.ini or features.ini) are applied at boot to **saved_gesture_control**. Fett263’s “Toggle Gesture Sleep” and the gesture file still apply after that. **buttons=1|2|3** is available via **BoardConfigNumButtons()**.

## API

- **LoadBoardConfigFile()** (common/board_config_file.h) — Loads `config/board.ini` if present (buttons, oled, and optionally gesture/twist). Called at startup before prop setup.
- **LoadFeaturesConfigFile()** (common/features_config_file.h) — Loads `config/features.ini` if present and overwrites **gesture**, **twist_on**, **twist_off** in the same struct. Call after LoadBoardConfigFile().
- **UseBoardConfigFile()** — True if **board.ini** was found and loaded.
- **BoardConfigGesture()**, **BoardConfigTwistOn()**, **BoardConfigTwistOff()**, **BoardConfigOled()**, **BoardConfigBluetooth()**, **BoardConfigButtons()** — Raw values: 1/0 for on/off, 1/2/3 for buttons, -1 = not set.
- **BoardConfigGestureEnabled()**, **BoardConfigTwistOnEnabled()**, **BoardConfigTwistOffEnabled()**, **BoardConfigOledEnabled()** — True only when the file was found and the option is explicitly **on** (1).
- **BoardConfigBluetoothEnabled()** — True when Bluetooth serial (Serial3) should run: no board file = on; file present and **bluetooth=off** = false; otherwise true. Used by serial adapter so **bluetooth=off** in board.ini disables Serial3 at startup.
- **BoardConfigNumButtons()** — 1, 2, or 3 when set in the file; otherwise -1 (use compiled `NUM_BUTTONS`).

## Notes

- **SD required:** The file is only read when SD is enabled. Without SD, all options use compile-time defaults.
- **Buttons:** The firmware is built with a fixed `NUM_BUTTONS` (e.g. 2). Setting **buttons=1** or **buttons=3** in the file is stored and available via **BoardConfigNumButtons()**; the prop/button code must use it to ignore extra buttons or to limit which buttons are active. When not set, **BoardConfigNumButtons()** returns -1 and compiled **NUM_BUTTONS** applies.
- **OLED:** Similarly, the display is typically compiled in or out. When **oled=off** is set and the code checks **BoardConfigOledEnabled()**, the display can be turned off at runtime; when **oled=on** or not set, compiled behavior applies.
- **Bluetooth:** When the build has **ENABLE_SERIAL** (Serial3 / Bluetooth serial), **bluetooth=off** in board.ini disables Serial3 at startup so the Bluetooth serial port is not started. When the board file is absent or **bluetooth** is not set, Serial3 is started as before.
- **Gesture / twist:** Build with the desired compile-time defaults (e.g. `BC_TWIST_ON`, `BC_TWIST_OFF`). The file can then turn them **off** at runtime by setting **twist_on=off** or **twist_off=off**; the saber code checks the board config when the file is present.

## Parser hardening

The board config parser is hardened so malformed content does not crash the board:

- **Bounds:** Variable name is read with `readVariable(variable[33])` (max 32 chars + null). On/off words in **ParseOnOffValue** are capped at 15 chars + null. **buttons** is read as a single digit (1, 2, or 3) only to avoid integer overflow; any other value is ignored.
- **Malformed lines:** Lines without `=`, unknown variable names, or empty variable names are skipped. Comment lines (`#`, `;`) are skipped. Invalid on/off or button values are ignored (that option left unset).
- **Runaway:** Parsing stops after **SD_BOARD_CONFIG_MAX_LINES** (512) lines so a corrupt or huge file does not hang.
- **No crash:** Missing file or open failure leaves all options unset and returns without overwriting or dereferencing invalid pointers.

**features.ini** uses the same style (variable=value, bounded reads, comment skip). Parsing stops after **SD_FEATURES_CONFIG_MAX_LINES** (128) lines.

## Fett263 prop and button/control definition

**Fett263’s prop** (`saber_fett263_buttons.h`) is a good reference for button definition and controls:

- **1 / 2 / 3 buttons:** The prop supports **NUM_BUTTONS** 1, 2, or 3 with separate, documented control layouts for each (see the header comments). **config/board.ini** **buttons=1|2|3** aligns with that; the value is available via **BoardConfigNumButtons()**.
- **Gesture / twist:** Fett263 uses **saved_gesture_control** (gesture file) with `gestureon`, `twiston`, `twistoff`, plus optional “Gesture Sleep” toggle and **FETT263_SAVE_GESTURE_OFF**. **config/board.ini** **gesture**, **twist_on**, **twist_off** are applied at boot to **saved_gesture_control**, so the board file sets initial state without recompile.
- **Naming:** **twist_on** / **twist_off** in the board file map to Fett263’s **twiston** / **twistoff**; **gesture** maps to **gestureon**.

So the board config file and Fett263’s prop are aligned: use **config/board.ini** for initial gesture/twist/button settings; Fett263’s runtime toggles and gesture file still apply after boot.

## See also

- **blade_config.md** — Blade hardware (config/blades.ini).
- **blade_styles_config.md** — Blade style layers (config/blade_styles.ini).
- **saber_fett263_buttons.h** — Fett263 prop: 1/2/3 button controls, gesture/twist defines, saved_gesture_control.
