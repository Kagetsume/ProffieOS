# Fork changes from base ProffieOS

This fork adds SD-card configuration (presets, blade wiring, board options, and composable blade styles) on top of ProffieOS. The list below is `git diff --name-status 41c8dd7577a8984d2335100a0e5a43f798f3dbc8 HEAD`. That commit is the upstream ProffieOS tree merged in `9646a73` (`profezzorn:master`). Files marked modified already existed there. Files marked added did not.

Upstream behavior stays in place when `ENABLE_SD_CONFIG_FILES` is off. The shipped profile `config/config-files-config.h` turns it on.

## Modified upstream files

### Boot and preset selection

| File | What changed and why |
| --- | --- |
| `ProffieOS.ino` | `CONFIG_FILE` points at `config/config-files-config.h`. Setup starts USB serial before the booster and SD mount, prints a boot line, and loads `board.ini`, `features.ini`, `presets.ini`, and `blades.ini` before `FindBlade()` so the first preset uses the SD wiring and styles. The style-section index is warmed at the same point. `GetPrimaryBlade` / `GetBladeNumber` return safely when `current_config` is still null. `optional_font_search_dirs_at_start` lets a preset scan an overlay font before the main font. With `MOUNT_SD_ALWAYS_ON`, the card can be exported to a PC after boot. |
| `common/current_preset.h` | Presets can come from `config/presets.ini` (`SetFromSD`, `GetNumPresets`) as well as the compiled `CONFIG_PRESETS` array. Each preset keeps `font`, `font_overlay`, and `voice`, then builds one search path (overlay, then font, then voice pack). Style strings may contain words, `key=value` overrides, and color names; the old checker only allowed digits, spaces, and commas, so normal lines such as `config section base=cyan` were rejected. Empty PWM accent slots get a default accent style instead of a copy of the pixel blade. Preset-file reads tolerate a missing file, blank values, and CR/LF line endings. |
| `common/blade_config.h` | Declares `GetSDBladeConfig()` and `InitSDBladeConfig()` so the prop can install the `blades.ini` blade array in place of the compiled one. |
| `props/prop_base.h` | `FindBlade` installs the SD blade config and activates every blade slot, including slots the INI left to the compiled fallback. `chdir` takes a count of optional leading font directories. A style that fails to parse is logged, and an accent slot falls back to `builtin 0 N` so a bad line does not leave that blade without a style. Blade and config pointers are checked before use. `DEBUG_PRESET_CYCLE_FLASH` can pulse the blade while presets change. |
| `props/saber_BC_buttons.h` | Twist-on and twist-off follow `config/board.ini` (`twist_on` / `twist_off`). `chdir` forwards the optional overlay-directory count. |
| `props/saber_fett263_buttons.h` | Gesture, twist-on, and twist-off are seeded from `board.ini` at boot. Color editing uses `ParseColorArg` (names and 0–255). Argument reads pass an explicit buffer length. `chdir` matches the `PropBase` signature. |
| `modes/style_option_modes.h` | The style-select menu counts presets with `GetNumPresets()`, so an SD preset list is the list you scroll. |

### SD reading, fonts, and serial

| File | What changed and why |
| --- | --- |
| `common/file_reader.h` | INI values accept LF, CRLF, and CR-only line endings, and a trailing CR is not stored in the string. SD file size is cached at open so a large `blade_styles.ini` does not seek to EOF on every `Available()` call. `readString()` stops at 512 bytes. `ScopedFileReader` closes the handle when a one-shot INI read returns. |
| `common/config_file.h` | The on-board save file skips a truncated or malformed line instead of aborting the whole read. An `installed` timestamp that does not match is ignored so the rest of the file still loads. |
| `common/sd_card.h` | When `MOUNT_SD_ALWAYS_ON` is set, unmounting the card for the saber re-enables USB export afterward. |
| `common/serial.h` | `Serial3` (Bluetooth) starts only when `board.ini` says Bluetooth is on. Connecting the serial monitor replays the style-config boot log that was printed before the host opened the port. |
| `common/strfun.h` | `SkipSpace`, `SkipWord`, `CountWords`, and `startswith` accept a null pointer. `Sprintf` / `Sscanf` require a single `%s` and copy the captured span. The old `Sscanf` copied the wrong number of bytes. |
| `common/arg_parser.h` | `FirstWord`, `GetArg`, and `Shift` return safely on a null string, which happens when a nested style parse has no argument parser. `GetArgParser` copies into a caller-sized buffer. |
| `sound/effect.h` | The first N font directories (the overlay) are optional. A missing overlay folder does not raise `font_directory_not_found`. |
| `sound/hybrid_font.h` | Paired and volume save keys are built with `snprintf` into a 64-byte buffer. Effect names no longer write past the old 32-byte stack array. |
| `common/string_piece.h` | Bugfix. The header calls `strlen` and `memcpy`. Upstream compiled only when an earlier include had already brought in `<string.h>`. |
| `common/lsfs.h` | Bugfix. The header calls `strlen`, `strcpy`, and `strcmp`, so it includes `<string.h>` itself. |
| `common/malloc_helper.h` | Bugfix. The heap checks use `uint32_t`, so the header includes `<stdint.h>`. |
| `common/tests.cpp` | Host checks for `font` + `font_overlay` + `voice` path composition (`/overlay;/font;/common`). |

### Blade drivers

| File | What changed and why |
| --- | --- |
| `blades/power_pin.h` | `RuntimePowerPins` drives up to six power FETs whose GPIO numbers come from `blades.ini` at boot, instead of a compile-time pin template. |
| `blades/pwm_pin.h` | `ApplySimplePWMPolarity` inverts PWM for an active-low load (a blade-power FET) and leaves it direct for an active-high GPIO LED. |
| `blades/simple_blade.h` | `SimplePin<pin, active_high>` carries polarity into `PWMPin`. Compiled `SimpleBladePtr(int pin, …)` still exists and stays active-high, which is how those pins behaved before. `StringBladePtr` uses active-low FET pins. |

### Styles and color arguments

| File | What changed and why |
| --- | --- |
| `styles/style_parser.h` | When `ENABLE_SD_CONFIG_FILES` is set, the named-style table includes the SD catalog and the `config` style (`config <section>` loads `[section]` from `blade_styles.ini`). Help blurbs are `NAMED_STYLE_DESC` and compile only with `ENABLE_CONFIG_FILE_HELP_TEXT`. `GetArgument` copies into a bounded buffer. Nested parses save and restore `CurrentArgParser`. `builtin` rejects a preset index past the compiled array. Classic unstable-idle templates live here so `unstable_layer` can reuse them. `ParseStyleStringForConfig` is the entry the INI loader calls. |
| `styles/style_ptr.h` | `runUpdate` advances a style without writing pixels, then `run` writes them. The layer compositor updates every layer, blends with `getLayerColor`, and writes the blade once. Color conversions keep straight alpha from `AlphaL` / `BlastL` instead of collapsing transparency when the result is an `OverDriveColor`. |
| `styles/blade_style.h` | Adds `runUpdate` (default: full `run`) and `getLayerColor` (default: the pixel color as straight-alpha `RGBA_um`). |
| `styles/legacy_styles.h` | `StyleNormalPtrX` and `StyleRainbowPtrX` use `InOutFuncAuto`, so an extend/retract argument of `-1` follows the ignition or retraction WAV length. `StyleSolidPtrX` is the color-only extend/retract base behind the `solid` named style. |
| `styles/rgb_arg.h` | `RgbArg` parses with `ParseColorArg` (color names and 0–255). Printed defaults are 0–255, matching what a preset author types. |
| `styles/fire.h` | `getColor` returns black when the heat buffer was not allocated, instead of indexing it. |
| `styles/show_color.h` | The color-menu preview saves and restores `CurrentArgParser` so it does not replace the parser the live style is using. |
| `functions/int_arg.h` | `OpacityScaleIntArg` and `Brightness65535ScaleIntArg` accept `55%`, a raw 0–32768 / 0–65535 value, or a bare number ≤ 100 as a percent. Layer `opacity` and multiply-mask brightness use these. `IntArg` no-ops when there is no argument parser. |
| `functions/sound_level.h` | Builds without `ENABLE_AUDIO` still provide `SmoothSoundLevel` (as `Int<0>`), which SD styles reference. |
| `modes/color_menues.h` | Reset-to-default reads the color through `ParseColorArg` and a sized argument buffer. |
| `modes/style_argument_helpers.h` | `GetArg` / `GetColorArg` use the sized `GetArgument` and `ParseColorArg`. |
| `common/color.h` | `RGBA_to_RGBA_um` and `RGBA_premul_to_overdrive` un-premultiply a stacked layer so transparency survives the compositor and the final `blade->set`. |
| `styles/tests.cpp` | Host tests for color parsing, opacity tokens, config layer lines, `{{var}}` expansion, strip-column BMP layout, texture masks, transitions, and OS7 factories. |

### Recorders and docs that already existed

| File | What changed and why |
| --- | --- |
| `scripts/clash_recorder.h` | Clash CSV names are built with `snprintf` into a 64-byte buffer. The recorder restores `CurrentArgParser` after it installs its style. |
| `scripts/motion_startup_recorder.h` | Same filename-buffer fix. The include guard was a copy of the clash recorder's guard (`SCRIPTS_CLASH_RECORDER_H`); it is now `SCRIPTS_MOTION_STARTUP_RECORDER_H`. |
| `README.md` | Links the SD config docs, the example `config/` tree, and the layer user guide. |
| `blades/README.md` | Links `doc/blade_config.md` for `config/blades.ini`. |
| `styles/README.md` | Links the composable layer catalog and the `[composable_checklist]` example. |

## Files added

These paths are new relative to `41c8dd75`. Fork-only headers live in `common/sd_config/` so the rest of `common/` stays the upstream directory.

### SD config firmware

| File | What it provides |
| --- | --- |
| `config/config-files-config.h` | The firmware profile this fork compiles: Proffieboard V3, 4 blade slots, `ENABLE_SD_CONFIG_FILES`, and compiled presets/blades used only when the SD files are missing. |
| `common/sd_config/sd_config_files.h` | The `ENABLE_SD_CONFIG_FILES` switch and the list of INI files the firmware reads. |
| `common/sd_config/sd_config.h` | Parser and on-demand storage for `config/presets.ini` (font, overlay, voice, track, styles, name, variation). |
| `common/sd_config/sd_config_defs.h` | Shared sizes and types for the preset parser. |
| `common/sd_config/style_config_file.h` | Parser for `config/blade_styles.ini`: sections, `layer` lines, `{{vars}}`, palettes, includes, and `transition` / `transition_in` / `transition_out`. |
| `common/sd_config/style_config_cache.h` | Section-offset index plus a heap cache of the layer text for the presets actually in use. |
| `common/sd_config/style_config_boot_log.h` | Buffers style-config boot messages and replays them when serial connects. |
| `common/sd_config/sd_boot_style_warm.h` | Boot-time index of `blade_styles.ini`, then seek-load of the sections the active preset needs. BMP media stays unread until the saber is on. |
| `common/sd_config/sd_style_hold.h` | Refcount so an open style file (a strip-column BMP) keeps the SD card mounted. |
| `common/sd_config/blade_config_file.h` | Parser for `config/blades.ini` (pixel strips and simple accents, pin names, LED type, length). |
| `common/sd_config/blade_config_file_defs.h` | Blade-definition struct and count shared by the parser and the runtime blade. |
| `common/sd_config/blade_config_pin_names.h` | Maps `bladePin`, `bladePowerPin1`–`bladePowerPin6`, `blade2Pin`, and the other board names to GPIO numbers. |
| `common/sd_config/blade_config_led_types.h` | Maps INI LED type names (`WS2812`, `SimpleWhite`, and the rest) onto the LED interfaces. |
| `common/sd_config/sd_blade_runtime.h` | Builds the live `BladeConfig` from `blades.ini`, including pixel strips and runtime simple blades. |
| `common/sd_config/board_config_file.h` | Parser for `config/board.ini` (buttons, OLED, Bluetooth, gesture, twist on/off). |
| `common/sd_config/board_config_file_defs.h` | The board-config struct those readers share. |
| `common/sd_config/features_config_file.h` | Parser for `config/features.ini`. Feature lines override the matching `board.ini` toggles when the file is present. |
| `common/sd_config/font_search_path.h` | Builds the semicolon-separated font search path: overlay, then primary font, then voice (`/common` when voice is omitted). |
| `common/sd_config/opacity_scale.h` | Parses `55%`, raw scale values, and implicit percents for layer opacity and mask brightness. |
| `common/sd_config/help_text.h` | Optional flash strings for `NAMED_STYLE_DESC`. Off unless `ENABLE_CONFIG_FILE_HELP_TEXT` is set. |
| `common/sd_config/compiled_style_metadata.h` | Reads comment metadata off a compiled style so it can be described or exported. |
| `common/sd_config/compiled_style_to_config.h` | Turns that metadata into a `blade_styles.ini` section (heuristic layers; template arguments are not recoverable). |
| `common/sd_config/debug_preset_cycle_flash.h` | Optional full-blade flash while stepping presets, for debugging preset changes. |
| `blades/runtime_simple_blade.h` | PWM simple blade whose pin, LED, color, and active-high/low polarity come from `blades.ini`. |

### Composable styles

| File | What it provides |
| --- | --- |
| `styles/composition/sd_style_catalog.h` | INI layer parser: blend, opacity, named style, transition grammar, and the factories that build a stack. |
| `styles/composition/sd_named_styles.h` | Named-style table entries for the SD catalog (`solid`, textures, OS7 layers, accents, and the rest). |
| `styles/composition/config_layers_style.h` | The stacked blade style. It runs each layer, paints one transition mask, and holds power for preon, postoff, and ignition flash. |
| `styles/composition/transition_config_shared.h` | Shared transition parse: behavior, times, spark, bend/linear, color, and direction. |
| `styles/composition/transitions/extension_mask.h` | The one wipe painted over a config stack after the layers. |
| `styles/composition/transitions/wipe_bend.h` | Bend extend/retract curve. |
| `styles/composition/transitions/wipe_linear.h` | Even extend/retract. |
| `styles/composition/transitions/wipe_split.h` | Split (open from the middle) and explode (grow from the middle). |
| `styles/composition/transitions/wipe_sputter.h` | Sputter ignition/retraction. |
| `styles/composition/transitions/wipe_flame.h` | Flame lip: hot head, dim tail, streaks toward the tip. |
| `styles/composition/transitions/wipe_bmp.h` | BMP column used as a wipe mask (row 0 through the last row on extend, backward on retract). |
| `styles/composition/transitions/bmp_wipe.h` | BMP wipe reader shared with the mask. |
| `styles/composition/parse_color_arg.h` | Color names and numeric colors for style arguments. |
| `styles/composition/parse_color_arg_table.generated.h` | Generated name → RGB table. Regenerated by `tools/generate-parse-color-names.js`. |
| `styles/composition/texture_layers.h` | Aggregates the composable texture masks (stripes, noise, waves, flicker, gradient, audio, pulse). |
| `styles/composition/waves_runtime.h` | Shared runtime for sine, saw, and hue waves. |
| `styles/composition/procedural_runtime.h` | Runtime for pulse train, chirp, smoothstep bands, value noise, fBm, moiré, and blade envelope. |
| `styles/composition/sine_waves.h` | `sine_waves` mask. |
| `styles/composition/sine_waves_swing.h` | Swing-driven sine waves. |
| `styles/composition/saw_waves.h` | `saw_waves` mask. |
| `styles/composition/hue_waves.h` | `hue_waves` mask. |
| `styles/composition/random_bands.h` | `random_bands` mask. |
| `styles/composition/pulse_train.h` | `pulse_train` mask. |
| `styles/composition/chirp.h` | `chirp` mask. |
| `styles/composition/smoothstep_bands.h` | `smoothstep_bands` mask. |
| `styles/composition/value_noise.h` | `value_noise` mask. |
| `styles/composition/fbm_noise.h` | `fbm_noise` mask. |
| `styles/composition/moire_mask.h` | `moire_mask`. |
| `styles/composition/blade_envelope.h` | `blade_envelope` mask. |
| `styles/composition/smoke_mask.h` | `smoke_flow` dual-band smoke texture. It does not take its own extend/retract; the section transition wipes it. |
| `styles/composition/strip_column.h` | `strip_column` named style: a 24-bit BMP played along the blade. |
| `styles/composition/strip_column_bmp.h` | BMP layout (`frames_y` / `frames_x`), row reads, and backward play during retract. |
| `styles/composition/strip_column_source.h` | SD file source for strip-column frames. Opened when the saber is on. |
| `styles/composition/strip_column_mask.h` | `strip_column_mask`: a grayscale BMP used as a multiply mask. |
| `styles/composition/strip_column_fallback.h` | Scrolling danger bands when the BMP is missing or invalid. |
| `styles/composition/pixel_sequencer.h` | `pixel_sequence` texture: a scripted per-LED pattern as a layer. |
| `styles/composition/real_clash.h` | `real_clash` localized clash. |
| `styles/composition/ignition_effects.h` | `ignition_flash` and related ignition overlays drawn after the wipe. |
| `styles/composition/accent_blink.h` | GPIO accent styles (`accent_glow`, `accent_pulse`, `accent_clash`, and the other accent names). |
| `styles/composition/bend_inout.h` | Bend in/out helper used by compositor bases that still need a curve inside the style template. |
| `styles/composition/delegating_idle_base.h` | Forwards `run` / `getColor` to a style built separately (OS7 monoliths, solid, classic bases). |
| `styles/composition/os7_monolith_common.h` | Shared pieces for the Fett263 OS7 extractions. |
| `styles/composition/os7_monolith_factories.h` | Factories for the OS7 monolith names and their `*_layer` textures. |
| `styles/composition/darksaber.h` | `darksaber_layer`. |
| `styles/composition/water_flow.h` | Water-blade flow. |
| `styles/composition/static_electricity.h` | Static-electricity idle. |
| `styles/composition/power_wave.h` | Power-wave idle. |
| `styles/composition/unstable_blades.h` | Unstable-blades idle (distinct from the classic `unstable` style). |
| `styles/composition/fallen_order.h` | Fallen Order idle. |
| `styles/composition/thunder_loop.h` | Thunderstorm idle loop. |
| `styles/composition/responsive_flame.h` | Angle-responsive flame. |
| `styles/composition/shimmer_blade.h` | Swing shimmer. |
| `styles/composition/rotoscope.h` | Rotoscope swing response. |
| `styles/composition/pulse_stripes.h` | Ignition / alt-sound pulse stripes. |
| `styles/composition/kinetic_charge.h` | Clash/lockup kinetic charge. |
| `styles/composition/rotating_pulse.h` | Rotating pulse stripes. |
| `styles/composition/trickle_blade.h` | Energy trickle idle. |
| `functions/composition/inout_ms.h` | Extend/retract argument: a positive millisecond value, or `-1` to use the ignition/retraction WAV length. |
| `functions/composition/breathing_pulse.h` | Slow brightness pulse used by accent and layer styles. |
| `functions/composition/uniform_brightness_overlay.h` | Full-blade brightness overlay. |
| `functions/composition/uniform_timed_flicker.h` | Timed full-blade flicker. |

### Documentation

| File | What it provides |
| --- | --- |
| `doc/sd_config.md` | How to lay out `config/` on the SD card and how presets are written. |
| `doc/blade_config.md` | `blades.ini` blade types, pins, and LED types. |
| `doc/pin_reference.md` | Pin names (`bladePin`, `bladePowerPin1`, …) versus raw GPIO numbers. |
| `doc/board_config.md` | `board.ini` and `features.ini`. |
| `doc/blade_styles_config.md` | Layer grammar, transition behaviors, and the named-style catalog. |
| `doc/README_blade_styles_config.md` | Short argument reference for the same catalog. |
| `doc/blade_styles_config_roadmap.md` | What the config style system is aiming at and what is already in the firmware. |
| `doc/sd_style_boot_order.md` | When the INI index, the layer cache, and BMP files are read. |
| `doc/pixel_sequencer.md` | `pixel_sequence` as a preset style and as a layer. |
| `doc/compiled_style_metadata.md` | How compiled styles are described and exported toward INI sections. |
| `doc/flash_measurement.md` | How flash size is measured for this profile. |
| `doc/flash_styleptr_profile.md` | Which style templates the SD parser still instantiates, and the flash cost. |

### SD config examples

Sample card layouts, bladepacks, and the printed guides live in `sd_config_examples/`. Copy `config/` from there onto the SD card; the card folder stays named `config`.

| File | What it provides |
| --- | --- |
| `sd_config_examples/README.md` | Index of the SD examples, layer styles, and bladepacks. |
| `sd_config_examples/config/presets.ini` | Sample preset list (`style = config …`, fonts, tracks). |
| `sd_config_examples/config/blades.ini` | Sample pixel blade plus simple accents, using pin names. |
| `sd_config_examples/config/board.ini` | Sample board options. |
| `sd_config_examples/config/features.ini` | Sample feature toggles. |
| `sd_config_examples/config/blade_styles.ini` | The layer catalog demos, including `[composable_checklist]`. |
| `sd_config_examples/config/blade_styles/palettes_extra.ini` | Extra palette include. |
| `sd_config_examples/config/blade_styles/strobe_overlay.ini` | Strobe overlay include. |
| `sd_config_examples/sd/animations/cyan-gold-plasma.bmp` | Strip-column demo frame. |
| `sd_config_examples/sd/animations/cyan-plasma.bmp` | Strip-column demo frame. |
| `sd_config_examples/sd/animations/plasma.bmp` | Strip-column demo frame. |
| `sd_config_examples/sd/animations/tiger-swirl-darkorange.bmp` | Strip-column demo frame. |
| `sd_config_examples/config-layers-user-guide.md` | Builder guide: layers, transitions, strip column, colors. |
| `sd_config_examples/config-layers-user-guide.css` | Print stylesheet for that guide. |
| `sd_config_examples/config-layers-user-guide.config.js` | md-to-pdf options for that guide. |
| `sd_config_examples/config-layers-user-guide.pdf` | Rendered copy of the guide. |
| `sd_config_examples/config-layers-color-card.md` | Named-color card (the 76 SD color tokens). |
| `sd_config_examples/config-layers-color-card.css` | Print stylesheet for the color card. |
| `sd_config_examples/config-layers-color-card.config.js` | md-to-pdf options for the color card. |
| `sd_config_examples/config-layers-color-card.pdf` | Rendered color card. |
| `sd_config_examples/config-layers-named-colors-appendix.md` | Generated color-name appendix. |
| `sd_config_examples/config-layers-pin-card.md` | Pin-name card. |
| `sd_config_examples/config-layers-pin-card.css` | Print stylesheet for the pin card. |
| `sd_config_examples/config-layers-pin-card.config.js` | md-to-pdf options for the pin card. |
| `sd_config_examples/config-layers-pin-card.pdf` | Rendered pin card. |
| `sd_config_examples/generate-named-colors-appendix.js` | Regenerates the color appendix from the firmware table. |
| `sd_config_examples/generate-pin-reference-card.js` | Regenerates the pin card. |
| `sd_config_examples/bladepacks/README.md` | How the bladepacks are laid out on a card. |
| `sd_config_examples/bladepacks/OST/README.md` | Original-trilogy pack: what each preset looks like. |
| `sd_config_examples/bladepacks/OST/config/presets.ini` | OST preset list. |
| `sd_config_examples/bladepacks/OST/config/blades.ini` | OST blade wiring. |
| `sd_config_examples/bladepacks/OST/config/blade_styles.ini` | OST layer recipe (`solid` plus the section transition). |
| `sd_config_examples/bladepacks/OST/font/README.md` | Which soundfonts the pack expects. |
| `sd_config_examples/bladepacks/OST/font/LukeANH/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/OST/font/LukeROTJ/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/OST/font/ObiWan/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/OST/font/TempleGuard/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/OST/font/Vader/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/OST/font/Windu/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/OST-Pulsing/README.md` | Same characters with a `pulse_layer` breathe. |
| `sd_config_examples/bladepacks/OST-Pulsing/config/presets.ini` | Pulsing-pack preset list. |
| `sd_config_examples/bladepacks/OST-Pulsing/config/blades.ini` | Pulsing-pack blade wiring. |
| `sd_config_examples/bladepacks/OST-Pulsing/config/blade_styles.ini` | Pulsing-pack layer recipe. |
| `sd_config_examples/bladepacks/OST-Pulsing/font/README.md` | Expected soundfonts. |
| `sd_config_examples/bladepacks/OST-Pulsing/font/LukeANH/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/OST-Pulsing/font/LukeROTJ/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/OST-Pulsing/font/ObiWan/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/OST-Pulsing/font/TempleGuard/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/OST-Pulsing/font/Vader/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/OST-Pulsing/font/Windu/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/Custom/README.md` | Worn aquamarine saber with preon and postoff sputter. |
| `sd_config_examples/bladepacks/Custom/config/presets.ini` | Custom pack preset list. |
| `sd_config_examples/bladepacks/Custom/config/blades.ini` | Custom pack blade wiring. |
| `sd_config_examples/bladepacks/Custom/config/blade_styles.ini` | Worn aquamarine layer recipe. |
| `sd_config_examples/bladepacks/Custom/font/README.md` | Expected soundfonts, including preon and pstoff. |
| `sd_config_examples/bladepacks/Custom/font/CenterBurst/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/Custom/font/CrystalGradient/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/Custom/font/FlameWipe/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/Custom/font/HumGlow/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/Custom/font/TipIgnite/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/Custom/font/WornAquamarine/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/FirstOrder/README.md` | Kylo / unstable-layer pack. |
| `sd_config_examples/bladepacks/FirstOrder/config/presets.ini` | First Order preset list. |
| `sd_config_examples/bladepacks/FirstOrder/config/blades.ini` | First Order blade wiring. |
| `sd_config_examples/bladepacks/FirstOrder/config/blade_styles.ini` | First Order layer recipe. |
| `sd_config_examples/bladepacks/FirstOrder/font/README.md` | Expected soundfonts. |
| `sd_config_examples/bladepacks/FirstOrder/font/KyloRen/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/FirstOrder/font/Rey/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/README.md` | Darksaber, water, static, power-wave, and related OS7 bases. |
| `sd_config_examples/bladepacks/ExtendedUniverse/config/presets.ini` | Extended Universe preset list. |
| `sd_config_examples/bladepacks/ExtendedUniverse/config/blades.ini` | Extended Universe blade wiring. |
| `sd_config_examples/bladepacks/ExtendedUniverse/config/blade_styles.ini` | Extended Universe layer recipes. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/README.md` | Expected soundfonts. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/AhsokaPadawan/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/AhsokaWhite/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/BaylanSkoll/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/CalKestis/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/DarkSaber/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/EUCrackle/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/MaraJade/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/MorganElsbeth/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/NomiSunrider/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/PowerWave/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/RevanPurple/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/RevanRed/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/Starkiller/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/StaticCharge/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/UnstableBlades/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/ExtendedUniverse/font/WaterBlade/font.wav` | Short voice prompt for that font folder. |
| `sd_config_examples/bladepacks/BMP/README.md` | Strip-column and BMP-wipe pack. |
| `sd_config_examples/bladepacks/BMP/config/presets.ini` | BMP-pack preset list. |
| `sd_config_examples/bladepacks/BMP/config/blades.ini` | BMP-pack blade wiring. |
| `sd_config_examples/bladepacks/BMP/config/blade_styles.ini` | BMP column styles and the ignition/retraction map wipe. |
| `sd_config_examples/bladepacks/BMP/font/README.md` | Expected soundfonts. |
| `sd_config_examples/bladepacks/BMP/animations/cyan-gold-plasma.bmp` | Column animation. |
| `sd_config_examples/bladepacks/BMP/animations/cyan-plasma.bmp` | Column animation. |
| `sd_config_examples/bladepacks/BMP/animations/fire-column.bmp` | Column animation. |
| `sd_config_examples/bladepacks/BMP/animations/ignition-retraction-plasma-map.bmp` | BMP wipe map (white lit, black covered). |
| `sd_config_examples/bladepacks/BMP/animations/lightning-column.bmp` | Column animation. |
| `sd_config_examples/bladepacks/BMP/animations/lightning-drain.bmp` | Lightning retraction mask. Last row is lit; row 0 is black. Played backward. |
| `sd_config_examples/bladepacks/BMP/animations/lightning-strike.bmp` | Lightning ignition mask. Bolt runs from the hilt to a fully open last row. |
| `sd_config_examples/bladepacks/BMP/animations/nebula-drift.bmp` | Column animation. |
| `sd_config_examples/bladepacks/BMP/animations/plasma-opacity-mask.bmp` | Grayscale multiply mask. |
| `sd_config_examples/bladepacks/BMP/animations/plasma.bmp` | Column animation. |
| `sd_config_examples/bladepacks/BMP/animations/tiger-swirl-darkorange.bmp` | Column animation. |
| `sd_config_examples/bladepacks/BMP/font/CrazyBlade/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/BMP/font/CyanGoldPlasma/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/BMP/font/CyanMaskOverlay/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/BMP/font/CyanPlasma/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/BMP/font/FireColumn/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/BMP/font/LightningColumn/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/BMP/font/NebulaDrift/font.wav` | Short voice prompt. |
| `sd_config_examples/bladepacks/BMP/font/TigerSwirl/font.wav` | Short voice prompt. |

### Scripts, catalog tools, and editor files

| File | What it provides |
| --- | --- |
| `scripts/check-blades-ini-pins.ps1` | Fails if an example `blades.ini` uses a raw GPIO number on `data_pin`, `power_pin*`, or `pin*`. |
| `scripts/check-fork-boundary.ps1` | Lists working-tree edits outside the SD-config allowlist. |
| `scripts/gate_named_style_desc.py` | Wraps catalog help strings so they compile only when help text is enabled. |
| `scripts/measure-flash.ps1` | Builds the profile and reports flash use. |
| `scripts/profile-styleptr-roots.ps1` | Reports which `StylePtr` roots the parser still instantiates. |
| `tools/catalog/README.md` | How the color catalog is generated. |
| `tools/catalog/colors.json` | Source list of named colors. |
| `tools/generate-parse-color-names.js` | Writes `parse_color_arg_table.generated.h` from that list. |
| `.gitignore` | Ignores local `website/` and `desktop/` trees, `node_modules`, and tool caches. Those live in the LayerBlade repo, not here. |
| `.cursor/rules/project-root.mdc` | Editor rule: this repo's root is `D:\projects\ProffieOS`. |
| `.cursor/rules/blades-ini-pin-names.mdc` | Editor rule: example `blades.ini` files use pin names, not GPIO numbers. |
| `.cursor/rules/sd-config-fork-boundary.mdc` | Editor rule: which paths this fork is allowed to change without touching the rest of ProffieOS. |
| `.vscode/settings.json` | Workspace editor settings. |
| `ProffieOS.code-workspace` | Multi-root workspace file for this repo. |
