# Measuring program flash (OS7 monolith spike)

Use the same board profile you ship with (`CONFIG_FILE`, e.g. `config/config-files-config.h`).

## Arduino CLI (Proffieboard V3 example)

From the repo root:

```powershell
cd D:\projects\ProffieOS
$FQBN = "proffieboard:stm32l4:ProffieboardV3-L452RE:usb=cdc,dosfs=sdmmc1,speed=80,opt=os"

# Baseline (checkout parent commit before spike)
git stash push -m "wip"
git checkout HEAD~1 -- styles/style_parser.h styles/os7_*.h 2>$null
arduino-cli compile --fqbn $FQBN --build-path build/flash-before ProffieOS.ino 2>&1 | Tee-Object build/flash-before.log
git stash pop

# After spike
arduino-cli compile --fqbn $FQBN --build-path build/flash-after ProffieOS.ino 2>&1 | Tee-Object build/flash-after.log
```

Read the **“Sketch uses … bytes”** line from each log, or from the IDE status bar after compile.

## Map file (finer detail)

If the build leaves an ELF under `build/flash-after`:

```powershell
arm-none-eabi-size -A build/flash-after/ProffieOS.ino.elf | Select-String "\.text"
```

Compare `.text` between before/after builds on the **same machine and core version**.

## OS7 monolith dedup (complete)

All Fett263 OS7 full blades and matching `*_layer` entries in `style_parser.h` use factories from `styles/os7_monolith_factories.h`:

- **Layer:** `Os7IdleBaseStyleFactory<XxxOs7Base>` → one `Style<XxxOs7Base>` per blade type (idle texture only).
- **Monolith:** `Os7MonolithFromBaseStyleFactory<XxxOs7Base>` (or `Os7MonolithFromBaseKineticFactory` for `kinetic_charge`) builds idle + **one shared** wrapper tree:
  - `Os7MonolithSharedTree = Os7BladeWithBendInOut<DelegatingOs7IdleBase, RgbArg<2>, IntArg<3,300>, IntArg<4,800>>`
  - `Os7MonolithKineticSharedTree` for kinetic (clash arg 3, ext/ret 4–5).

`unstable_blades` has monolith only (no layer). The OS7 combat/in/out + bend shell should appear **once** (plus the kinetic variant); per-style flash is mostly the idle `Style<BASE>` template.

Measure before/after with `scripts/measure-flash.ps1` on the same board/core. Unit smoke: `styles/tests` → `test_os7_monolith_factories()`.

For remaining `StylePtr` roots and dedup tiers, see **`doc/flash_styleptr_profile.md`** and run `scripts/profile-styleptr-roots.ps1` (optional `-Elf` after compile).

## Tier B — shared preon/postoff/force glow (transition_config_shared.h)

- **Before:** separate `StylePtr<TransitionEffectConfigL<…>>` for `preon_glow`, `accent_preon`, `postoff_glow`, `accent_postoff`, etc. (duplicate trees when only `RgbArg` defaults differed).
- **After:** `preon_audio_glow_style` shared by `preon_glow` + `accent_preon`; same for postoff; `force_audio_glow_style`; sputter pair shares one transition typedef per effect.
- **Expect:** ~0–2 KB vs a build that still had duplicate accent glow `Style<>` instantiations (often **0** if the linker already merged identical templates — still worth keeping for maintainability).

Record baseline **Sketch uses** bytes, rebuild, compare (e.g. baseline 409480).
