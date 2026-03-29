# Compiled style metadata parser

A **compiled blade style** in ProffieOS is C++ template code (e.g. `StylePtr<Layers<...>>()`) plus an optional **comment block** that describes the style in plain text.

This parser **interprets only the comment block** (the `/* ... */` part). It does **not** execute or interpret the C++ template body.

## Why only the comment?

The template body (e.g. `StylePtr<Layers<Black,ColorChange<...>>,...>>()`) is **compiled C++**. It is not a runtime data format. Executing it at runtime would require a full interpreter for the style type system (dozens of template types and arguments). That is not implemented. The comment block, however, is plain text and can be parsed for metadata.

## What the parser extracts

From the comment block, the parser fills a **CompiledStyleMetadata** struct:

- **title** — First non-empty line (e.g. "copyright Fett263 CustomBlade (Primary Blade) OS7 Style").
- **version** — First token that looks like a version (e.g. "OS7.15" or "v3.215p").
- **single_style** — `true` if any line contains "Single Style".
- **multi_phase** — `true` if any line contains "Multi Phase".
- **effects_section** — The block of text from "--Effects Included--" (or "Effects Included") to the end of the comment (effect names and descriptions, e.g. "Blast Effect: Blast Wave (Random) [Color: BlastColorArg]").

## API (common/compiled_style_metadata.h)

- **GetCompiledStyleComment(full_definition, comment_out, comment_max)**  
  Extracts the text between `/*` and `*/` into `comment_out`. Returns length or 0.

- **ParseCompiledStyleMetadata(comment_text, out)**  
  Parses a comment string (no `/*`/`*/`) and fills `out` (title, version, single_style, multi_phase, effects_section).

- **ParseCompiledStyleDefinition(full_definition, out)**  
  One-shot: extracts the comment with GetCompiledStyleComment, then parses it with ParseCompiledStyleMetadata. Use this when you have the full definition string (comment + optional C++ code).

## Example

Input string (abbreviated):

```
/* copyright Fett263 CustomBlade (Primary Blade) OS7 Style
...
OS7.15 v3.215p
Single Style
Multi Phase ...
--Effects Included--
Ignition Effect: Standard Ignition [Color: IgnitionColorArg]
Blast Effect: Blast Wave (Random) [Color: BlastColorArg]
...
*/
StylePtr<Layers<Black,ColorChange<...>>,...>>(),
```

After **ParseCompiledStyleDefinition(input, &meta)**:

- `meta.title` — first line (e.g. "copyright Fett263 CustomBlade (Primary Blade) OS7 Style").
- `meta.version` — "OS7.15" or "v3.215p" (first version-like token).
- `meta.single_style` — true.
- `meta.multi_phase` — true.
- `meta.effects_section` — "Ignition Effect: ...\nBlast Effect: ...\n...".
- `meta.has_comment` — true.

The `StylePtr<...>()` part is ignored; it is not parsed or executed.

## Limits

- Comment block length: up to **COMPILED_STYLE_COMMENT_MAX** (1024) when extracting.
- Title length: **COMPILED_STYLE_TITLE_LEN** (128).
- Version length: **COMPILED_STYLE_VERSION_LEN** (48).
- Effects section length: **COMPILED_STYLE_EFFECTS_LEN** (512).

## Use cases

- **Display** — Show style name, version, and effect list from a compiled style file or string.
- **Search/catalog** — Build a list of styles and their metadata without compiling.
- **Tooling** — Offline or on-PC tools that read style definitions and produce summaries or config hints.

To **run** a style on the saber, use a preset style string (e.g. `rainbow 300 800`, `config my_effect`, or `builtin 0 1`) or a compiled preset that already includes the style; the metadata parser does not create a runnable style from the template body.

---

## Converter: compiled style → config/blade_styles.ini

A separate header **`common/compiled_style_to_config.h`** converts the parsed comment metadata into the **config blade style** format (the same format as **`config/blade_styles.ini`**): `[section_name]` and `layer = <style string>` lines.

- **ConvertCompiledStyleToConfigBladeStyle(meta, out_buf, out_max)**  
  Takes a filled **CompiledStyleMetadata** and writes an INI block into `out_buf` (e.g. `# Converted from compiled style\n[customblade]\nlayer = rainbow 300 800\nlayer = blast white 200 100 400\n`). Returns length written.

- **CompiledStyleDefinitionToConfigBladeStyle(full_definition, out_buf, out_max)**  
  One-shot: parses the full definition (comment + template) then converts to the config format.

- **CompiledStyleSectionNameFromTitle(title, section_out, section_max)**  
  Derives a section name from the comment title (e.g. "CustomBlade" from "copyright Fett263 CustomBlade (Primary Blade) OS7 Style"). Output is lowercased and alphanumeric + underscore only.

**Heuristics:** The converter uses the comment text (title + effects section) to choose layers with default parameters:

- **Base layer:** If "Unstable" or "Rage" → `unstable red orange yellow 100 200`; else if "Fire" → `fire red yellow`; else if "Cycle" → `cycle blue blue cyan red cyan`; else if "Standard" or "Clash" (and not "Rainbow") → `standard cyan white 300 800`; else → `rainbow 300 800`.
- **Blast:** If "Blast" appears in effects → add `layer = blast white 200 100 400`.
- **Strobe:** If "Strobe" or "Strobing" appears → add `layer = strobe black white 15 1 300 800`.

The C++ template is not parsed, so exact colors/timings are not available; the output is an approximation you can paste into **`config/blade_styles.ini`** and then edit. Use in presets as **`config <section_name>`** (e.g. `config customblade`).

## Hardening (malformed input)

The metadata parser and converter are hardened so malformed content does not crash the board:

- **Null/invalid pointers:** All entry points check for null `full_definition`, `comment_out`, `out`, `meta`, `out_buf` and return or no-op before any access.
- **Bounds:** Comment length is capped before `memcpy`; line length is capped (e.g. 4096) to avoid runaway; all copies into fixed buffers (title, version, effects_section) are length-limited; version and title trim loops are bounded.
- **No strstr on non-null-terminated data:** Lines are not null-terminated; substring checks use a bounded helper (`CompiledStyleLineContains`) instead of `strstr` so we never read past the line.
- **Converter:** `snprintf` is always called with a positive size; return value is checked and output length is capped so we never write past `out_buf`; section name is our own buffer (alnum + `_` only).
- **Negative length:** `GetCompiledStyleComment` rejects negative `len` if `close` were before `open + 2`.
