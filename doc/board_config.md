# Board and features configuration files

Board and feature config files on the SD card let you set **hardware** (buttons, OLED) and **feature toggles** (gesture, twist on/off) without recompiling. They are split so **contest-specific** setups can override only features (e.g. **config/features.ini**) and leave hardware (e.g. **config/board.ini**) unchanged.

## Config file layout (config/ on SD)

| File | Purpose | Use for contests |
|------|---------|------------------|
| **config/blades.ini** | Blade wiring (`bladePin`, `bladePowerPin*`, pixels, accents) — **pin names**, not numeric GPIO | Same hardware; rarely changed per contest. |
| **config/board.ini** | Board hardware: **buttons** (1/2/3), **power** / **aux** / **aux2** pads, **oled**, **bluetooth**. May also contain gesture/twist (overridden by features.ini when present). | One file per board type; keep stable. |
| **config/features.ini** | Feature toggles: **gesture**, **swing_on**, **thrust_on**, **stab_on**, **twist_on**, **twist_off**. Overwrites those from board.ini when present. | **Contest-specific:** drop in a features.ini per contest without touching board.ini. |
| **config/blade_styles.ini** | Style layers ([section], layer = style string) for **config &lt;name&gt;** presets. | Contest-specific styles if needed. |
| **config/presets.ini** | Preset list (font, style, name, etc.) when using SD presets. | Contest-specific presets. |

**Recommendation:** Put **hardware** in **config/board.ini** (buttons, oled) and **feature toggles** in **config/features.ini** (gesture plus each ignition). For a contest, copy only **config/features.ini** (and optionally blade_styles.ini, presets.ini) so management is easier and board wiring stays the same.

**Memory:** These config files use negligible RAM (one small struct for board + features). The only config that can use a lot of RAM is **config/presets.ini** (heap for every preset’s font, track, name, and style strings). See **sd_config.md** for details and recommendations.

---

## Board hardware: config/board.ini

- Path: **`config/board.ini`** in the **root** of the SD card (same level as `Fonts`, `tracks`, `config/blades.ini`, `config/presets.ini`).
- Create the **`config`** folder if it does not exist.
- **board.ini** is loaded first; **config/features.ini** is loaded next and overwrites **gesture**, **swing_on**, **thrust_on**, **stab_on**, **twist_on**, and **twist_off** when present.

## Format

INI-style: one variable per line. **Whitespace** (spaces, tabs, blank lines) is ignored. Lines starting with **`#`** or **`;`** are comments. **Malformed lines are ignored** and do not cause a crash.

| Variable    | Values        | Meaning | File |
|------------|----------------|---------|------|
| **buttons** | 1, 2, or 3 | How many compiled buttons are scanned. Cannot exceed compiled `NUM_BUTTONS`. | board.ini |
| **power** | pin name | Pad for the power button. `powerButtonPin`, `auxPin`, `aux2Pin`, or another board pin name. | board.ini |
| **aux** | pin name | Pad for the aux button. Same names as **power**. | board.ini |
| **aux2** | pin name | Pad for the third button, when the firmware is built with `NUM_BUTTONS` 3. | board.ini |
| **oled** | on, off, 1, 0, true, false | Enable or disable OLED display. | board.ini |
| **bluetooth** | on, off, 1, 0, true, false | Enable or disable Bluetooth serial (Serial3) when built with **ENABLE_SERIAL**. | board.ini |
| **gesture** | on, off, 1, 0, true, false | Master switch for gesture ignition and twist-off. | board.ini or **features.ini** (overrides) |
| **swing_on** | on, off, 1, 0, true, false | Swing to ignite. | board.ini or **features.ini** (overrides) |
| **thrust_on** | on, off, 1, 0, true, false | Thrust to ignite. | board.ini or **features.ini** (overrides) |
| **stab_on** | on, off, 1, 0, true, false | Stab to ignite. | board.ini or **features.ini** (overrides) |
| **twist_on** | on, off, 1, 0, true, false | Twist to ignite. | board.ini or **features.ini** (overrides) |
| **twist_off** | on, off, 1, 0, true, false | Twist to retract. | board.ini or **features.ini** (overrides) |

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

# Number of buttons scanned. Omit power/aux to keep the compiled pads.
# To swap which pad is power and which is aux:
#   power = auxPin
#   aux = powerButtonPin
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
- **Load order:** **board.ini** is loaded first, then **features.ini**. Any gesture key in features.ini **overwrites** the same key from board.ini.
- **Format:** Same as board.ini (variable=value, # and ; comments). Read keys are **gesture**, **swing_on**, **thrust_on**, **stab_on**, **twist_on**, and **twist_off**.
- **gesture** is the master. **swing_on**, **thrust_on**, **stab_on**, and **twist_on** each control one way to ignite. **twist_off** controls twist retraction.
- **Example:** Gestures stay available, swing ignition is off:
  ```ini
  gesture = on
  swing_on = off
  thrust_on = on
  stab_on = on
  twist_on = on
  twist_off = on
  ```

## When the files are used

- **board.ini** and **features.ini** are read at startup when SD is enabled, **before** prop setup, so gesture/twist can be applied in Fett263 or BC Setup().
- If **config/board.ini** is missing, all options keep their compile-time or prop-specific defaults. If **config/features.ini** is missing, gesture/twist from board.ini (if any) are used.
- If the file is present but a variable is omitted or invalid, that option is left as “not set” and the default is used.
- **saber_BC_buttons:** **twist_on** and **twist_off** from the config disable those gestures at runtime when set to off.
- **saber_fett263_buttons:** When **ENABLE_SD_CONFIG_FILES** is set, **gesture**, **swing_on**, **thrust_on**, **stab_on**, **twist_on**, and **twist_off** are applied at boot to **saved_gesture_control** after the gesture file is read. A key left unset does not change that gesture. Without **ENABLE_SD_CONFIG_FILES**, this step is left out of the build. **buttons**, **power**, **aux**, and **aux2** are applied to the button objects before the first button scan.

## API

- **LoadBoardConfigFile()** (common/sd_config/board_config_file.h) — Loads `config/board.ini` if present (buttons, oled, and optionally gesture/twist). Called at startup before prop setup.
- **LoadFeaturesConfigFile()** (common/sd_config/features_config_file.h) — Loads `config/features.ini` if present and overwrites **gesture**, **twist_on**, **twist_off** in the same struct. Call after LoadBoardConfigFile().
- **UseBoardConfigFile()** — True if **board.ini** was found and loaded.
- **BoardConfigGesture()**, **BoardConfigTwistOn()**, **BoardConfigTwistOff()**, **BoardConfigOled()**, **BoardConfigBluetooth()**, **BoardConfigButtons()** — Raw values: 1/0 for on/off, 1/2/3 for buttons, -1 = not set.
- **BoardConfigGestureEnabled()**, **BoardConfigTwistOnEnabled()**, **BoardConfigTwistOffEnabled()**, **BoardConfigOledEnabled()** — True only when the file was found and the option is explicitly **on** (1).
- **BoardConfigBluetoothEnabled()** — True when Bluetooth serial (Serial3) should run: no board file = on; file present and **bluetooth=off** = false; otherwise true. Used by serial adapter so **bluetooth=off** in board.ini disables Serial3 at startup.
- **BoardConfigNumButtons()** — 1, 2, or 3 when set in the file; otherwise -1 (use compiled `NUM_BUTTONS`). **ApplyBoardButtonConfig()** uses that count, clamped to compiled `NUM_BUTTONS`, and moves each role onto the pin named by **power**, **aux**, or **aux2**. A missing pin line keeps the compiled pad.

## Notes

- **SD required:** The file is only read when SD is enabled. Without SD, all options use compile-time defaults.
- **Buttons:** Compiled `NUM_BUTTONS` is the ceiling (this profile is 2). **buttons=1** scans only power. **buttons=2** scans power and aux. **buttons=3** also scans aux2 when the firmware was built with three buttons. **power**, **aux**, and **aux2** select the pad (`powerButtonPin`, `auxPin`, `aux2Pin`). Omit a pin line and that role stays on its compiled pad.
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

- **1 / 2 / 3 buttons:** The prop's control layout follows compiled **NUM_BUTTONS**. **board.ini** **buttons** turns off buttons above that count, and **power** / **aux** / **aux2** choose the pad. A third button is scanned only when **NUM_BUTTONS** is 3.
- **Gesture / twist:** Fett263 uses **saved_gesture_control** (gesture file) with `gestureon`, `swingon`, `thruston`, `stabon`, `twiston`, `twistoff`, plus optional “Gesture Sleep” toggle and **FETT263_SAVE_GESTURE_OFF**. With **ENABLE_SD_CONFIG_FILES**, **config/features.ini** (and **board.ini**) keys are applied at boot after that file is read. A missing key leaves the saved value. Without **ENABLE_SD_CONFIG_FILES**, the prop does not read those keys.
- **Naming:** **twist_on** / **twist_off** map to Fett263’s **twiston** / **twistoff**. **gesture** maps to **gestureon**. **swing_on**, **thrust_on**, and **stab_on** match **swingon**, **thruston**, and **stabon**.

So the board config file and Fett263’s prop are aligned: use **config/board.ini** for initial gesture/twist/button settings; Fett263’s runtime toggles and gesture file still apply after boot.

## See also

- **blade_config.md** — Blade hardware (config/blades.ini).
- **pin_reference.md** — Proffieboard V3 (3.9) named pins (`SaberPins` + SD `blades.ini` tokens); pin card PDF via `sd_config_examples/generate-pin-reference-card.js`.
- **blade_styles_config.md** — Blade style layers (config/blade_styles.ini).
- **saber_fett263_buttons.h** — Fett263 prop: 1/2/3 button controls, gesture/twist defines, saved_gesture_control.
