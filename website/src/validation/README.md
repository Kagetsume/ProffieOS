# Validation limits

Constants mirrored from ProffieOS firmware caps. Used by UI (disable add buttons) and model helpers (slice arrays).

| Constant | Value | Firmware reference |
|----------|-------|-------------------|
| `MAX_BLADES` | 16 | SD blade definition limit |
| `MAX_POWER_PINS` | 6 | Up to six FET power pins per NeoPixel blade |

Phase 2+ may add warning helpers (blade count vs `NUM_BLADES`, contiguous indices) without blocking export.
