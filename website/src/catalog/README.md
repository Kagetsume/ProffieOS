# Catalog (static JSON)

Curated data shipped with the app — not fetched from a server. Update when firmware pin maps, color names, or style catalogs change.

## Files

| File | Purpose |
|------|---------|
| `board-profiles.json` | Board presets with default `BladeDefinition[]` (Proffie V3 five-blade layout) |
| `pin-options.json` | **Power** FET names (`bladePowerPin1`–`6`) and **data/Free** pins with silkscreen labels |
| `named-styles.json` | Layer style catalog: id, human label, argument schema, groups (base/overlay/texture/…) |
| `colors.json` | Color groups: Standard (firmware names), Extended (Fett263 menu), Vivid (OS 8) |
| `config-styles.json` | Starter **recipes** insertable from the Styles page library (`smoke_blade`, …) |

## Pin lists

**Power pins** — six dedicated blade FET pins for NeoPixel `power_pin` dropdowns. Firmware also defines `bladePowerPin7`–`11` as alternate mappings; use **Custom** in the picker for those.

**Data pins** — names from [`common/blade_config_pin_names.h`](../../../common/blade_config_pin_names.h) / [`config/proffieboard_v3_config.h`](../../../config/proffieboard_v3_config.h): `bladePin`, `blade2Pin`–`blade9Pin`, `bladeIdentifyPin`. Labels match board silkscreen (e.g. “Free 1 / accent PWM”).

## Style / color catalogs

- **named-styles.json** — `id` is the INI/firmware keyword; `label` is the UI display name. Used in **Add layer** dropdowns on the Styles page.
- **config-styles.json** — full `[section]` recipes (vars + layer stack). INI equivalents and use cases: [BLADE_STYLES.md](../../BLADE_STYLES.md).
- **colors.json** — Standard colors export as names; extended/vivid export as `r,g,b` via `exportColorToken()` in `model/colors.ts`.

## Maintenance

When firmware adds pins or styles, update the relevant JSON and corresponding model tests. A sync script for named styles may be added later (`scripts/sync-named-styles.mjs`).
