# Styles

Style templates go in this directory. Styles are used to calculate the color for each pixel on the blade.
Note that most styles takes other styles as arguments, and even basic colors like "RED" are really
style templates. This means that colors can easily be replaced with much more complicated and dynamic
effects.

## SD card composable layers

Named styles registered in **`style_parser.h`** can be stacked in **`config/blade_styles.ini`**
(layer recipes referenced as **`style = config <section>`** in presets). Composable texture
headers are aggregated in **`texture_layers.h`**. User docs:

* [`doc/blade_styles_config.md`](../doc/blade_styles_config.md) — layer catalog and grammar
* [`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini) — **`[composable_checklist]`** capstone demo
* [`examples/README.md`](../examples/README.md) — composable vs monolithic guidance

Each style template needs at least two functions:

# void run(BladeBase* blade);

Called to start a frame.
It's ok to put semi-complicated calculations here, but not in getColor.

# OverDriveColor getColor(int led)

Called once per LED on the blade to calculate the color for that led.
Generally it's best to avoid complicated calculations in getColor since
it will be called thousands of times per second.
