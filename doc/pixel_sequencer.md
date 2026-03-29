# Pixel Sequencer Style

The **pixel_sequence** blade style acts like a pixel sequencer: you feed it a config string that defines a sequence of steps. Each step lights one or all pixels with a given color, brightness, and duration. **The sequence is a repeating pattern:** when the blade reaches the end of the set of pixel states it loops back to the beginning, so the same pattern repeats continuously.

## Style name

Use in presets or style strings:

- **pixel_sequence** \<config\>

## Config format

One argument: a list of **steps separated by `|`** (pipe). Each step is:

**pixel,r,g,b,brightness,ms**

- Use **`|`** to separate each pixel state (step) from the next. Commas separate the six fields within a step.
- **Whitespace is ignored**; only comma and `|` are delimiters (e.g. `0 , 255 , 0 , 0 , 100 , 50 | 1 , 0 , 255 , 0 , 80 , 100` is valid).
- Up to **16 steps** per sequence.

| Field       | Meaning              | Range / notes                          |
|------------|----------------------|----------------------------------------|
| pixel      | Which LED(s) to light| 0 to N−1 (LED index), or **255** = all LEDs |
| r, g, b    | Color                | 0–255 each                             |
| brightness | Intensity            | 0–100 (percent)                        |
| ms         | How long step is on  | 1–65535 milliseconds                   |

- Steps are played in order. **At the end of the last step the pattern loops back to the first step** and repeats.
- Any LED index ≥ number of LEDs is clamped to the last LED.

## Examples

**Single red pixel at 100% for 100 ms (repeating):**

```text
pixel_sequence 0,255,0,0,100,100
```

**Two pixels alternating (LED 0 red, LED 1 green, 200 ms each); pattern repeats:**

```text
pixel_sequence 0,255,0,0,100,200|1,0,255,0,100,200
```

**Three-step chase (red → green → blue on LED 0, 50 ms each); loops back to red:**

```text
pixel_sequence 0,255,0,0,100,50|0,0,255,0,100,50|0,0,0,255,100,50
```

**Flash all LEDs white at 50% for 100 ms, then off for 400 ms (repeating):**

```text
pixel_sequence 255,255,255,255,50,100|255,0,0,0,0,400
```

**Mixed: one pixel then all (LED 0 red 80% 150 ms, then all cyan 30% 300 ms); repeating pattern:**

```text
pixel_sequence 0,255,0,0,80,150|255,0,255,255,30,300
```

## In presets

In a compiled preset you’d use the style allocator with the config string. When using **SD config** (e.g. `config/presets.ini`), set the style line to something like:

```ini
style=pixel_sequence 0,255,0,0,100,100|1,0,255,0,80,100
```

Same format works in the serial style editor and other places that accept a style string with arguments.
