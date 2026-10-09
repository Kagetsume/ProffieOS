# StylePtr root profile (post–OS7 migration)

Static inventory of remaining **`StylePtr<…>`** roots in `styles/style_parser.h` (`named_styles[]`), what duplicates in flash, and dedup strategies that keep **full** named-style behavior (no LITE catalog).

After the OS7 factory migration (~8 KB saved), **69** entries still use inline `StylePtr` vs **43** factory/`Style*PtrX` allocators (including OS7, waves, procedural, config, builtin, accents with factories).

## How to measure (dynamic profile)

1. Build once: `scripts/measure-flash.ps1` (note `build/flash-measure/ProffieOS.ino.elf`).
2. Run: `scripts/profile-styleptr-roots.ps1 -Elf build/flash-measure/ProffieOS.ino.elf`
3. Optional A/B: comment out one `named_styles[]` row, rebuild, compare `.text` — best ground truth for a single root.

Without an ELF, use the static tiers below.

---

## Tier A — High duplicate shells (same pattern as OS7)

**Status:** **Not used for classic blades** — a Tier A factory experiment **increased** flash on real builds and was reverted. Keep `delegating_idle_base.h` for **OS7 only** (many monoliths → one shared tree ≈ 8 KB saved). Classic dedup needs a **high reuse ratio** (same shared shell used by many named styles); with mostly one style per shell, you pay for two `Style<>` trees + `make()` + delegate forwarding without removing duplicate `.text`.

**Rule of thumb:** delegating monolith factories help when **N ≥ ~4** styles share the **exact same** wrapper template (arg layout included). Otherwise prefer a single monolithic `StylePtr<InOutHelperX<…>>` per named style.

### A1. Classic “EasyBlade” full blades (`InOutHelperX` + `SimpleClash` + `Lockup` + `Blast` + `AudioFlicker`)

| Named style | Base template | Notes |
|-------------|---------------|--------|
| `standard` | `RgbArg<1>` | via `StyleNormalPtrX` (already one helper) |
| `strobe` | `StrobeX<…>` | `StyleNormalPtrX` |
| `rainbow` | `Rainbow` | `StyleRainbowPtrX` |
| `gradient` | `Gradient<…>` | **inline** duplicate of same stack |
| `audio` | `AudioFlicker<…>` | inline |
| `flicker` | `BrownNoiseFlicker<…>` | inline |
| `cylon` | `Cylon<…>` | inline |
| `pulse_blade` | `PulsingX<…>` | could be `StyleNormalPtrX` (no savings alone) |

**Flash issue:** Each distinct `base_color` type reinstantiates the **entire** clash/lockup/blast/audio-flicker tree inside `Style<…>` (same failure mode OS7 had with per-blade `Os7BladeWithBendInOut<YourBase>`).

**Fix (OS7-style):**

- `DelegatingClassicIdleBase` + one shared  
  `ClassicMonolithSharedTree = InOutHelperX<SimpleClash<Lockup<Blast<Delegating…>, …>, …>, InOutFuncAuto<RgbArg/IntArg…>>`.
- Per-style factory: build `Style<IdleBase>` (layer equivalent), attach delegate, `make()` shared tree.
- Refactor `gradient` / `audio` / `flicker` / `cylon` to factories first (biggest inline copies); optionally fold `standard` / `strobe` / `rainbow` into the same shared shell so they don’t each carry a full combat stack type.

**Rough savings:** ~2–6 KB (fewer monoliths than OS7, but same per-tree cost). **Priority:** high if you still need flash; low user-config churn (examples mostly use `solid_bend` + layers, not these monoliths).

### A2. Bend vs linear in/out pairs

| Pair | Allocators |
|------|------------|
| `standard` / `standard_bend` | `StyleNormalPtrX` vs `StyleNormalBendPtrX` (`InOutTrBendAuto`) |
| `solid` / `solid_bend` | Color only (`SolidColorStyleFactory`). The stack transition mask is the wipe. `StyleSolidPtrX` / `StyleSolidBendPtrX` are no longer instantiated from the parser |

**Flash issue:** Two full `Style<…>` trees differing mostly in extend/retract transition.

**Fix:** One shared “blade body” delegate + in/out strategy (linear vs bend) selected at `make()` time, or bend wrapper around a shared `Style<SolidBase>` / `Style<AddClash>`.

**Rough savings:** ~0.5–2 KB. **Priority:** medium.

### A3. `sparkle_blade`

Uses `InOutHelperX<Layers<…, SimpleClashL, LockupL, BlastL>>` instead of nested `SimpleClash<Lockup<Blast<…>>>`. Same idea as legacy `StyleNormalPtr` `#if 0` **Layers** path in `legacy_styles.h` — one shared “composable overlay” in/out tree + delegating idle base could merge with A1 layer-style presets.

**Rough savings:** ~0.3–1 KB alone; more if combined with A1.

---

## Tier B — Transition / effect layers (`TransitionEffectConfigL<…>`)

**Implemented (low-risk dedup):** `styles/transition_config_shared.h` — one `Style<>` per glow/sputter **shape** + `EFFECT_*`. `preon_glow` / `accent_preon` share `StyleAllocatorPreonAudioGlow()`; same for postoff glow + accent; sputter pair shares transition typedef with `WavLen<>`. **Expected flash:** ~0.5–2 KB (two duplicate `Style<>` trees removed, no runtime factories). Wipe / ignition / blast_wave_random unchanged.

**10** roots share the same adapter class (`config_layers_style.h`); only the inner `TRANSITION` and `EFFECT_*` differ:

| Style | Effect |
|-------|--------|
| `blast_wave_random` | `EFFECT_BLAST` |
| `accent_preon`, `preon_glow`, `preon_wipe`, `preon_sputter` | `EFFECT_PREON` |
| `accent_postoff`, `postoff_glow`, `postoff_wipe`, `postoff_sputter` | `EFFECT_POSTOFF` |
| `ignition_flash` | `EFFECT_IGNITION` |
| `force_glow` | `EFFECT_FORCE` |

**Clusters for runtime factories:**

1. **Audio-reactive glow:** `preon_glow`, `postoff_glow`, `force_glow`, `accent_preon`, `accent_postoff` — same  
   `TrConcat<TrFadeX, AlphaL<RgbArg, SmoothSoundLevel>, TrDelayX<WavLen<EFFECT>>>` skeleton.
2. **Wipe / sputter:** `preon_wipe`, `postoff_wipe`, `preon_sputter`, `postoff_sputter` — two transition templates × two effects.
3. **Heavy one-offs:** `blast_wave_random`, `ignition_flash` — keep as `StylePtr` or separate factories.

**Rough savings:** ~1–3 KB if glow cluster + wipe/sputter are shared. **Priority:** medium (examples: ~14 preon/ignition/force layer lines in `examples/config/blade_styles.ini`; glow cluster is the best ROI).

---

## Tier C — Config overlay `*L` layers (33 `StylePtr` with `…L<` in parser)

One flash instance **per overlay type** (not per preset). Aggregate cost is the sum of all types you link.

| Weight | Styles | Dedup notes |
|--------|--------|-------------|
| Heavy | `real_clash` (`RealClashConfigL` + large `TrSelect` tree) | Single type; savings only if merged with other clash paths |
| Heavy | `blast_wave_random` | See Tier B |
| Medium | `responsive_lockup`, `responsive_blast`, `responsive_clash`, `drag`, `melt`, `lb` | Same pattern as OS7 layers: mostly `RgbArg<1>` — candidate for **color-arg runtime factories** later |
| Light | `clash`, `localized_clash`, `blast`, `sparkle`, `pulse`, `swing`, … | Small templates; factory overhead may eat gains |
| Texture | `fire_mask`, `smoke_up/down/flow`, `stripes`, `hard_stripes`, `random_bands`, `noise_flicker`, `base_flicker`, `pulse_layer`, `swing_layer`, … | Smoke is a plain texture. The stack wipe lives once in `ConfigLayersStyle`, not in each smoke `AlphaL` |

**Example config usage (layer lines):** `real_clash` ~62, `blast_wave_random` ~49, `solid_bend` ~46 — optimizing overlays matters for your shipped ini more than unused monoliths like `cycle`.

**Rough savings (overlay batch):** ~2–5 KB if you add runtime factories for the top 6–8 `*L` types + smoke mask; high engineering cost (like waves/procedural).

---

## Tier D — Low ROI / unique (keep as `StylePtr` unless desperate)

| Style | Why |
|-------|-----|
| `unstable` | Single mega-template (`LocalizedClash` + nested strobe/sparkle); no sibling monolith |
| `advanced` | Unique `OnSparkX` + multi-stop `Gradient` + custom blast timing |
| `cycle` | `ColorCycle` + `Layers<…>` state machine |
| `fire` | `StyleFirePtr` — already isolated helper |
| GPIO `accent_*` (except blink/sequence factories) | Small `InOutHelper<…,0,0>` trees; batch only if you need ~1 KB |
| `noise_flicker`, `rainbow_layer`, `gradient_layer` | One-off textures |

---

## Already optimized (reference)

- OS7 monoliths + `*_layer` → `os7_monolith_factories.h` (~8 KB measured).
- `sine_waves` / `saw_waves` / `hue_waves` / `sine_waves_swing` → `waves_runtime.h`.
- Procedural textures → `procedural_runtime.h`.
- `strip_column`, `pixel_sequence`, `accent_blink`, `accent_sequence`, `config`, `builtin` → factories.

---

## Recommended order of work

1. **A1** — Shared classic monolith tree + factories for `gradient`, `audio`, `flicker`, `cylon` (then optionally `standard`/`strobe`/`rainbow`).
2. **B** — Transition glow factory (`preon_glow` / `postoff_glow` / `force_glow` / accent variants).
3. **A2** — Bend/linear pair sharing for `solid*` / `standard*`.
4. **C** — Smoke in/out mask sharing; then consider runtime factory for `real_clash` only if still tight.
5. **D** — Defer unless profiling shows a surprise hog in the ELF.

---

## Maintenance

When adding a named style, prefer:

- `Style*PtrX<…>` if the tree is unique but args are standard, **or**
- A factory + shared tree if it repeats an existing shell (OS7 / classic / transition).

Re-run `scripts/profile-styleptr-roots.ps1` after major parser changes to keep the StylePtr count honest.
