# Catalog (static JSON)

Curated data shipped with the app — not fetched from a server. Update when firmware pin maps or example layouts change.

## Files

| File | Purpose |
|------|---------|
| `board-profiles.json` | Board presets with default `BladeDefinition[]` (starts from `examples/config/blades.ini` layout) |
| `pin-options.json` | Proffie V3 **FET power pin** names (`bladePowerPin1`–`6`) for the wiring dropdown |

## Pin list scope

Only the six dedicated blade power FET pins are listed for pickers. The firmware enum also defines `bladePowerPin7`–`11` as alternate mappings to Free/data pins; those are available via **Custom (type pin name or number)** in the UI.

Source of truth: [`config/proffieboard_v3_config.h`](../../../config/proffieboard_v3_config.h).

## Future

Phase 3 may add `named-styles.json`, `colors.json` synced from `styles/style_parser.h` via `scripts/sync-named-styles.mjs`.
