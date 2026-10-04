## Appendix: Named colors

ProffieOS color names fall into **three scopes**, matching the LayerBlade editor catalog:

- **SD and layer tokens** (`styles/parse_color_arg_table.generated.h`, merged catalog + Fett263) — names you can type in `blade_styles.ini`, `layer =` lines, and `{{placeholder}}` overrides. Firmware resolves them with `ParseColorName` in `styles/parse_color_arg.h`. Regenerate the table with `node tools/generate-parse-color-names.js`.
- **Fett263 Edit Mode list** (`props/saber_fett263_buttons.h` `color_list_`) — the on-saber color picker when Fett263 props are enabled. Voice labels come from `ColorNumber` in `sound/sound_library.h`. Choosing a color **rewrites the preset as `r,g,b`**; many of the same colors also work as text names in Section A after you flash a build with the generated table.
- **Editor catalog extras** (Section C, if any) — names in `colors.json` extended + vivid that are **not** in the firmware table. Use `r,g,b` or `#hex` in INI for those; when Section C is empty, every catalog name is already in Section A.

You can always use `r,g,b` (channels **0–255**) or `#RRGGBB` / `#RGB` hex anywhere a color argument is accepted. Matching for SD names is **case-insensitive**.

Generated **2026-10-04** · Section A: 76 · Section B: 27 · Section C: 0. Re-run `node examples/generate-named-colors-appendix.js` and rebuild the PDFs after firmware or catalog changes.

### Section A — SD and layer tokens

Source: `styles/parse_color_arg_table.generated.h` (`ParseColorName`).

| Swatch | Name | Rgb (0–255) | Hex | Scope |
| --- | --- | --- | --- | --- |
| <span class="color-swatch" style="background-color:#ff0000;" title="#ff0000"></span> | `red` | 255, 0, 0 | #ff0000 | SD name |
| <span class="color-swatch" style="background-color:#00ff00;" title="#00ff00"></span> | `green` | 0, 255, 0 | #00ff00 | SD name |
| <span class="color-swatch" style="background-color:#0000ff;" title="#0000ff"></span> | `blue` | 0, 0, 255 | #0000ff | SD name |
| <span class="color-swatch" style="background-color:#00ffff;" title="#00ffff"></span> | `cyan` | 0, 255, 255 | #00ffff | SD name |
| <span class="color-swatch" style="background-color:#ffff00;" title="#ffff00"></span> | `yellow` | 255, 255, 0 | #ffff00 | SD name |
| <span class="color-swatch" style="background-color:#ff00ff;" title="#ff00ff"></span> | `magenta` | 255, 0, 255 | #ff00ff | SD name |
| <span class="color-swatch" style="background-color:#ffffff;" title="#ffffff"></span> | `white` | 255, 255, 255 | #ffffff | SD name |
| <span class="color-swatch" style="background-color:#000000;" title="#000000"></span> | `black` | 0, 0, 0 | #000000 | SD name |
| <span class="color-swatch" style="background-color:#ff8000;" title="#ff8000"></span> | `orange` | 255, 128, 0 | #ff8000 | SD name |
| <span class="color-swatch" style="background-color:#ff4400;" title="#ff4400"></span> | `darkorange` | 255, 68, 0 | #ff4400 | SD name |
| <span class="color-swatch" style="background-color:#ff004b;" title="#ff004b"></span> | `deeppink` | 255, 0, 75 | #ff004b | SD name |
| <span class="color-swatch" style="background-color:#0087ff;" title="#0087ff"></span> | `deepskyblue` | 0, 135, 255 | #0087ff | SD name |
| <span class="color-swatch" style="background-color:#0248ff;" title="#0248ff"></span> | `dodgerblue` | 2, 72, 255 | #0248ff | SD name |
| <span class="color-swatch" style="background-color:#ff2476;" title="#ff2476"></span> | `hotpink` | 255, 36, 118 | #ff2476 | SD name |
| <span class="color-swatch" style="background-color:#ff889a;" title="#ff889a"></span> | `pink` | 255, 136, 154 | #ff889a | SD name |
| <span class="color-swatch" style="background-color:#ff1f0f;" title="#ff1f0f"></span> | `tomato` | 255, 31, 15 | #ff1f0f | SD name |
| <span class="color-swatch" style="background-color:#ff3713;" title="#ff3713"></span> | `coral` | 255, 55, 19 | #ff3713 | SD name |
| <span class="color-swatch" style="background-color:#00ffff;" title="#00ffff"></span> | `aqua` | 0, 255, 255 | #00ffff | SD name |
| <span class="color-swatch" style="background-color:#00ff00;" title="#00ff00"></span> | `lime` | 0, 255, 0 | #00ff00 | SD name |
| <span class="color-swatch" style="background-color:#ff00ff;" title="#ff00ff"></span> | `fuchsia` | 255, 0, 255 | #ff00ff | SD name |
| <span class="color-swatch" style="background-color:#00ff37;" title="#00ff37"></span> | `springgreen` | 0, 255, 55 | #00ff37 | SD name |
| <span class="color-swatch" style="background-color:#0e3976;" title="#0e3976"></span> | `steelblue` | 14, 57, 118 | #0e3976 | SD name |
| <span class="color-swatch" style="background-color:#646496;" title="#646496"></span> | `silver` | 100, 100, 150 | #646496 | SD name |
| <span class="color-swatch" style="background-color:#6cff06;" title="#6cff06"></span> | `greenyellow` | 108, 255, 6 | #6cff06 | SD name |
| <span class="color-swatch" style="background-color:#37ff00;" title="#37ff00"></span> | `chartreuse` | 55, 255, 0 | #37ff00 | SD name |
| <span class="color-swatch" style="background-color:#ff0e00;" title="#ff0e00"></span> | `orangered` | 255, 14, 0 | #ff0e00 | SD name |
| <span class="color-swatch" style="background-color:#b48200;" title="#b48200"></span> | `gold` | 180, 130, 0 | #b48200 | SD name |
| <span class="color-swatch" style="background-color:#37ffa9;" title="#37ffa9"></span> | `aquamarine` | 55, 255, 169 | #37ffa9 | SD name |
| <span class="color-swatch" style="background-color:#1e3cc8;" title="#1e3cc8"></span> | `iceblue` | 30, 60, 200 | #1e3cc8 | SD name |
| <span class="color-swatch" style="background-color:#2b00d2;" title="#2b00d2"></span> | `indigo` | 43, 0, 210 | #2b00d2 | SD name |
| <span class="color-swatch" style="background-color:#5d00c5;" title="#5d00c5"></span> | `purple` | 93, 0, 197 | #5d00c5 | SD name |
| <span class="color-swatch" style="background-color:#7600c2;" title="#7600c2"></span> | `deeppurple` | 118, 0, 194 | #7600c2 | SD name |
| <span class="color-swatch" style="background-color:#5555c8;" title="#5555c8"></span> | `glacier` | 85, 85, 200 | #5555c8 | SD name |
| <span class="color-swatch" style="background-color:#b4b4ff;" title="#b4b4ff"></span> | `icewhite` | 180, 180, 255 | #b4b4ff | SD name |
| <span class="color-swatch" style="background-color:#bfffff;" title="#bfffff"></span> | `lightcyan` | 191, 255, 255 | #bfffff | SD name |
| <span class="color-swatch" style="background-color:#ffc777;" title="#ffc777"></span> | `moccasin` | 255, 199, 119 | #ffc777 | SD name |
| <span class="color-swatch" style="background-color:#fff49d;" title="#fff49d"></span> | `lemonchiffon` | 255, 244, 157 | #fff49d | SD name |
| <span class="color-swatch" style="background-color:#ffbb6c;" title="#ffbb6c"></span> | `navajowhite` | 255, 187, 108 | #ffbb6c | SD name |
| <span class="color-swatch" style="background-color:#7f00ff;" title="#7f00ff"></span> | `electricpurple` | 127, 0, 255 | #7f00ff | SD name |
| <span class="color-swatch" style="background-color:#4700ff;" title="#4700ff"></span> | `electricviolet` | 71, 0, 255 | #4700ff | SD name |
| <span class="color-swatch" style="background-color:#9cff00;" title="#9cff00"></span> | `electriclime` | 156, 255, 0 | #9cff00 | SD name |
| <span class="color-swatch" style="background-color:#ff8700;" title="#ff8700"></span> | `amber` | 255, 135, 0 | #ff8700 | SD name |
| <span class="color-swatch" style="background-color:#ffa800;" title="#ffa800"></span> | `cyberyellow` | 255, 168, 0 | #ffa800 | SD name |
| <span class="color-swatch" style="background-color:#ffdd00;" title="#ffdd00"></span> | `canaryyellow` | 255, 221, 0 | #ffdd00 | SD name |
| <span class="color-swatch" style="background-color:#1cff1c;" title="#1cff1c"></span> | `palegreen` | 28, 255, 28 | #1cff1c | SD name |
| <span class="color-swatch" style="background-color:#ff509a;" title="#ff509a"></span> | `flamingo` | 255, 80, 154 | #ff509a | SD name |
| <span class="color-swatch" style="background-color:#5a00ff;" title="#5a00ff"></span> | `vividviolet` | 90, 0, 255 | #5a00ff | SD name |
| <span class="color-swatch" style="background-color:#ba00ff;" title="#ba00ff"></span> | `psychedelicpurple` | 186, 0, 255 | #ba00ff | SD name |
| <span class="color-swatch" style="background-color:#ff009c;" title="#ff009c"></span> | `hotmagenta` | 255, 0, 156 | #ff009c | SD name |
| <span class="color-swatch" style="background-color:#ff0080;" title="#ff0080"></span> | `brutalpink` | 255, 0, 128 | #ff0080 | SD name |
| <span class="color-swatch" style="background-color:#ff0037;" title="#ff0037"></span> | `neonrose` | 255, 0, 55 | #ff0037 | SD name |
| <span class="color-swatch" style="background-color:#ff0026;" title="#ff0026"></span> | `vividraspberry` | 255, 0, 38 | #ff0026 | SD name |
| <span class="color-swatch" style="background-color:#ff0013;" title="#ff0013"></span> | `haltred` | 255, 0, 19 | #ff0013 | SD name |
| <span class="color-swatch" style="background-color:#ff1800;" title="#ff1800"></span> | `moltencore` | 255, 24, 0 | #ff1800 | SD name |
| <span class="color-swatch" style="background-color:#ff2100;" title="#ff2100"></span> | `safetyorange` | 255, 33, 0 | #ff2100 | SD name |
| <span class="color-swatch" style="background-color:#ff3700;" title="#ff3700"></span> | `orangejuice` | 255, 55, 0 | #ff3700 | SD name |
| <span class="color-swatch" style="background-color:#ff7300;" title="#ff7300"></span> | `imperialyellow` | 255, 115, 0 | #ff7300 | SD name |
| <span class="color-swatch" style="background-color:#ffb000;" title="#ffb000"></span> | `schoolbus` | 255, 176, 0 | #ffb000 | SD name |
| <span class="color-swatch" style="background-color:#ffba00;" title="#ffba00"></span> | `supersaiyan` | 255, 186, 0 | #ffba00 | SD name |
| <span class="color-swatch" style="background-color:#ffc900;" title="#ffc900"></span> | `star` | 255, 201, 0 | #ffc900 | SD name |
| <span class="color-swatch" style="background-color:#ffed00;" title="#ffed00"></span> | `lemon` | 255, 237, 0 | #ffed00 | SD name |
| <span class="color-swatch" style="background-color:#f6ff00;" title="#f6ff00"></span> | `electricbanana` | 246, 255, 0 | #f6ff00 | SD name |
| <span class="color-swatch" style="background-color:#e7ff00;" title="#e7ff00"></span> | `busybee` | 231, 255, 0 | #e7ff00 | SD name |
| <span class="color-swatch" style="background-color:#dbff00;" title="#dbff00"></span> | `zeusbolt` | 219, 255, 0 | #dbff00 | SD name |
| <span class="color-swatch" style="background-color:#baff00;" title="#baff00"></span> | `limezest` | 186, 255, 0 | #baff00 | SD name |
| <span class="color-swatch" style="background-color:#87ff00;" title="#87ff00"></span> | `limoncello` | 135, 255, 0 | #87ff00 | SD name |
| <span class="color-swatch" style="background-color:#00ff16;" title="#00ff16"></span> | `cathodegreen` | 0, 255, 22 | #00ff16 | SD name |
| <span class="color-swatch" style="background-color:#00ff80;" title="#00ff80"></span> | `mintyparadise` | 0, 255, 128 | #00ff80 | SD name |
| <span class="color-swatch" style="background-color:#00ff9c;" title="#00ff9c"></span> | `plungepool` | 0, 255, 156 | #00ff9c | SD name |
| <span class="color-swatch" style="background-color:#00ffc9;" title="#00ffc9"></span> | `vibrantmint` | 0, 255, 201 | #00ffc9 | SD name |
| <span class="color-swatch" style="background-color:#00ffdb;" title="#00ffdb"></span> | `masterswordblue` | 0, 255, 219 | #00ffdb | SD name |
| <span class="color-swatch" style="background-color:#00dbff;" title="#00dbff"></span> | `brainfreeze` | 0, 219, 255 | #00dbff | SD name |
| <span class="color-swatch" style="background-color:#0021ff;" title="#0021ff"></span> | `blueribbon` | 0, 33, 255 | #0021ff | SD name |
| <span class="color-swatch" style="background-color:#000dff;" title="#000dff"></span> | `rareblue` | 0, 13, 255 | #000dff | SD name |
| <span class="color-swatch" style="background-color:#0d00ff;" title="#0d00ff"></span> | `overdueblue` | 13, 0, 255 | #0d00ff | SD name |
| <span class="color-swatch" style="background-color:#3700ff;" title="#3700ff"></span> | `violentviolet` | 55, 0, 255 | #3700ff | SD name |

### Section B — Fett263 Edit Mode color list

Source: `props/saber_fett263_buttons.h` `color_list_` · voice: `sound_library.h` `ColorNumber` (`SayColor`).

| Swatch | # | Voice label | Rgb (0–255) | Hex | Scope |
| --- | --- | --- | --- | --- | --- |
| <span class="color-swatch" style="background-color:#ff0000;" title="#ff0000"></span> | 1 | Red | 255, 0, 0 | #ff0000 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ff0e00;" title="#ff0e00"></span> | 2 | OrangeRed | 255, 14, 0 | #ff0e00 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ff4400;" title="#ff4400"></span> | 3 | DarkOrange | 255, 68, 0 | #ff4400 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ff6100;" title="#ff6100"></span> | 4 | Orange | 255, 97, 0 | #ff6100 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#b48200;" title="#b48200"></span> | 5 | Gold | 180, 130, 0 | #b48200 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ffff00;" title="#ffff00"></span> | 6 | Yellow | 255, 255, 0 | #ffff00 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#6cff06;" title="#6cff06"></span> | 7 | GreenYellow | 108, 255, 6 | #6cff06 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#00ff00;" title="#00ff00"></span> | 8 | Green | 0, 255, 0 | #00ff00 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#37ffa9;" title="#37ffa9"></span> | 9 | AquaMarine | 55, 255, 169 | #37ffa9 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#00ffff;" title="#00ffff"></span> | 10 | Cyan | 0, 255, 255 | #00ffff | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#0087ff;" title="#0087ff"></span> | 11 | DeepSkyBlue | 0, 135, 255 | #0087ff | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#0248ff;" title="#0248ff"></span> | 12 | DodgerBlue | 2, 72, 255 | #0248ff | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#0000ff;" title="#0000ff"></span> | 13 | Blue | 0, 0, 255 | #0000ff | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#1e3cc8;" title="#1e3cc8"></span> | 14 | IceBlue | 30, 60, 200 | #1e3cc8 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#2b5cd2;" title="#2b5cd2"></span> | 15 | Indigo | 43, 92, 210 | #2b5cd2 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#5d00c5;" title="#5d00c5"></span> | 16 | Purple | 93, 0, 197 | #5d00c5 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#7600c2;" title="#7600c2"></span> | 17 | DeepPurple | 118, 0, 194 | #7600c2 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ff00ff;" title="#ff00ff"></span> | 18 | Magenta | 255, 0, 255 | #ff00ff | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ff004b;" title="#ff004b"></span> | 19 | DeepPink | 255, 0, 75 | #ff004b | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#646496;" title="#646496"></span> | 20 | Silver | 100, 100, 150 | #646496 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#5555c8;" title="#5555c8"></span> | 21 | Glacier | 85, 85, 200 | #5555c8 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#b4b4ff;" title="#b4b4ff"></span> | 22 | IceWhite | 180, 180, 255 | #b4b4ff | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#bfffff;" title="#bfffff"></span> | 23 | LightCyan | 191, 255, 255 | #bfffff | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ffc777;" title="#ffc777"></span> | 24 | Moccasin | 255, 199, 119 | #ffc777 | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#fff49d;" title="#fff49d"></span> | 25 | LemonChiffon | 255, 244, 157 | #fff49d | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ffbb6c;" title="#ffbb6c"></span> | 26 | NavajoWhite | 255, 187, 108 | #ffbb6c | Edit menu only; save as r,g,b on SD |
| <span class="color-swatch" style="background-color:#ffffff;" title="#ffffff"></span> | 27 | White | 255, 255, 255 | #ffffff | Edit menu only; save as r,g,b on SD |
