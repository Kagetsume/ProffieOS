# Proffieboard V3 pin names (ProffieOS reference)

**Proffieboard V3** hardware (including **V3.9**) uses the C symbols in `config/proffieboard_v3_config.h`. When you use SD **`config/blades.ini`**, only the **blade / power / identify** names listed in `common/blade_config_pin_names.h` are accepted as text tokens (not button, I2C, or audio pins).

Generated **2026-10-06** from those headers. Re-run `node examples/generate-pin-reference-card.js` after pin-map changes. Compact PDF: [`examples/config-layers-pin-card.md`](../examples/config-layers-pin-card.md).

## Quick wiring ↔ SD names

| Board role | Typical use | `blades.ini` token |
|------------|-------------|---------------------|
| Blade 1 (main) data | NeoPixel / WS2811 | `bladePin` |
| Blade 1 identify / FoC | Blade ID input | `bladeIdentifyPin` (not a strip data line) |
| Blade 2–4 data | Extra NeoPixel ports | `blade2Pin`, `blade3Pin`, `blade4Pin` |
| Free1–Free3 | Accent PWM or extra data | `blade5Pin`, `blade6Pin`, `blade7Pin` |
| UART / extra data | PC0 / PC1 | `blade8Pin`, `blade9Pin` |
| Blade power FET 1–6 | Main strip power | `bladePowerPin1` … `bladePowerPin6` |
| Free1–3 as FET/PWM | Same GPIO as Free lines | `bladePowerPin7` … `bladePowerPin9` |
| Data2 / Data3 as power | Shared with `blade2Pin` / `blade3Pin` | `bladePowerPin10`, `bladePowerPin11` |

**Important:** Values like `power_pin1 = 1` are **MCU GPIO 1**, not “FET slot 1”. Always use **`bladePowerPin1`** etc. See [`blade_config.md`](blade_config.md).

## Names valid in `config/blades.ini`

| C name | GPIO | Notes |
|--------|------|-------|
| `blade2Pin` | 2 | PA9 + PB4 |
| `blade3Pin` | 4 | PA10 + PB5 |
| `blade4Pin` | 6 | PA4 |
| `blade5Pin` | 7 | Free1 PB3 |
| `blade6Pin` | 8 | Free2 PB10 |
| `blade7Pin` | 9 | Free3 PB11 + PC2 |
| `blade8Pin` | 16 | also uart PC0 |
| `blade9Pin` | 17 | also uart PC1 |
| `bladeIdentifyPin` | 1 | blade identify input / FoC |
| `bladePin` | 0 | blade control, either WS2811 or PWM PA7+PA6 |
| `bladePowerPin1` | 20 | blade power control PA1 |
| `bladePowerPin10` | 2 | PA9 |
| `bladePowerPin11` | 4 | PA10 |
| `bladePowerPin2` | 21 | blade power control PB6 |
| `bladePowerPin3` | 22 | blade power control PC7 |
| `bladePowerPin4` | 23 | blade power control PB1 |
| `bladePowerPin5` | 24 | blade power control PC6 |
| `bladePowerPin6` | 25 | blade power control PB0 |
| `bladePowerPin7` | 7 | — |
| `bladePowerPin8` | 8 | — |
| `bladePowerPin9` | 9 | — |

## Full `SaberPins` map (Proffieboard V3 firmware)

These names exist in the board **`CONFIG_FILE`** for wiring, buttons, motion, and audio. Only the table above is parsed from SD **`blades.ini`** text fields.

### I2C

| C name | GPIO | Notes |
|--------|------|-------|
| `i2cDataPin` | 18 | I2C bus, Used by motion sensors  PB7 |
| `i2cClockPin` | 19 | I2C bus, Used by motion sensors   PB8 |

### Buttons

| C name | GPIO | Notes |
|--------|------|-------|
| `powerButtonPin` | 11 | power button  PB14 + PC5 |
| `auxPin` | 13 | AUX button    PB13 + PA2 |
| `aux2Pin` | 15 | AUX2 button   PB15 |

### Memory card now uses SDIO

| C name | GPIO | Notes |
|--------|------|-------|
| `sdCardSelectPin` | 255 | — |
| `amplifierPin` | 32 | Amplifier enable pin PH1 |
| `boosterPin` | 31 | Booster enable pin   PH0 |
| `motionSensorInterruptPin` | 30 | motion sensor interrupt PC13 |

### No fastled support yet

| C name | GPIO | Notes |
|--------|------|-------|
| `spiLedSelect` | -1 | — |
| `spiLedDataOut` | -1 | — |
| `spiLedClock` | -1 | — |

### Neopixel pins

| C name | GPIO | Notes |
|--------|------|-------|
| `bladePin` | 0 | blade control, either WS2811 or PWM PA7+PA6 · **SD blades.ini** |
| `bladeIdentifyPin` | 1 | blade identify input / FoC · **SD blades.ini** |
| `blade2Pin` | 2 | PA9 + PB4 · **SD blades.ini** |
| `blade3Pin` | 4 | PA10 + PB5 · **SD blades.ini** |
| `blade4Pin` | 6 | PA4 · **SD blades.ini** |
| `blade5Pin` | 7 | Free1 PB3 · **SD blades.ini** |
| `blade6Pin` | 8 | Free2 PB10 · **SD blades.ini** |
| `blade7Pin` | 9 | Free3 PB11 + PC2 · **SD blades.ini** |
| `blade8Pin` | 16 | also uart PC0 · **SD blades.ini** |
| `blade9Pin` | 17 | also uart PC1 · **SD blades.ini** |

### Blade power control

| C name | GPIO | Notes |
|--------|------|-------|
| `bladePowerPin1` | 20 | blade power control PA1 · **SD blades.ini** |
| `bladePowerPin2` | 21 | blade power control PB6 · **SD blades.ini** |
| `bladePowerPin3` | 22 | blade power control PC7 · **SD blades.ini** |
| `bladePowerPin4` | 23 | blade power control PB1 · **SD blades.ini** |
| `bladePowerPin5` | 24 | blade power control PC6 · **SD blades.ini** |
| `bladePowerPin6` | 25 | blade power control PB0 · **SD blades.ini** |

### hook up an external FET to drive more powerful LEDs

| C name | GPIO | Notes |
|--------|------|-------|
| `bladePowerPin7` | 7 | — · **SD blades.ini** |
| `bladePowerPin8` | 8 | — · **SD blades.ini** |
| `bladePowerPin9` | 9 | — · **SD blades.ini** |

### Status LED

| C name | GPIO | Notes |
|--------|------|-------|
| `statusLEDPin` | 26 | — |

### be possible at 800kHz.

| C name | GPIO | Notes |
|--------|------|-------|
| `bladePowerPin10` | 2 | PA9 · **SD blades.ini** |
| `bladePowerPin11` | 4 | PA10 · **SD blades.ini** |

### Analog pins

| C name | GPIO | Notes |
|--------|------|-------|
| `batteryLevelPin` | 29 | battery level input PC4 |
| `chargeDetectPin` | 27 | PA0 |

### UART

| C name | GPIO | Notes |
|--------|------|-------|
| `rxPin` | 16 | PC0 |
| `txPin` | 17 | PC1 |

### MiCOM setup

| C name | GPIO | Notes |
|--------|------|-------|
| `trigger1Pin` | 11 | power button |
| `trigger2Pin` | 13 | aux button |
| `trigger3Pin` | 15 | aux2 button |
| `trigger4Pin` | 7 | free1 |
| `trigger5Pin` | 8 | free2 |
| `trigger6Pin` | 9 | free3 |
| `trigger7Pin` | 2 | data2 |
| `trigger8Pin` | 4 | data3 |

## Bonded pins (do not use two roles at once)

V3 firmware marks these GPIO pairs as bonded in `proffieboard_v3_config.h` (`PROFFIEOS_BOND_PINS`): **(0,1), (2,3), (4,5), (9,10), (11,12), (13,14)** — same physical lines as blade data + identify, data2/3, Free3, buttons, etc. Plan **`blades.ini`** so you do not enable conflicting drivers on bonded pairs.

## Other Proffieboard revisions

**V1** and **V2** boards use different GPIO numbers for the **same symbol names** (`bladePin`, `bladePowerPin1`, …). Always match your Arduino **Tools → Board** selection and `CONFIG_FILE`; do not copy numeric GPIO from this V3 table onto V1/V2.

## See also

- [`blade_config.md`](blade_config.md) — SD blade file format
- [`board_config.md`](board_config.md) — SD board/features INI
- Hardware pinout: [`doc/V3-pinout.svg`](V3-pinout.svg)
