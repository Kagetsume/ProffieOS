# ProffieOS

The open source operating system. Proffie OS is supported on various platforms ranging from Teensy 3.2 development boards to its own dedicated ProffieBoard reference hardware.

Proffie OS supports:
- :fire: SmoothSwing V1/V2 Algorithm
- :fire: NEC styled lightsaber sound fonts (polyphonic)
- :fire: Plecter styled lightsaber sound fonts ( monophonic)
- :fire: Driving Adressable LED strips
- :fire: Driving Segmented LED strips
- :fire: Quad/Tri LED stars.

### Getting started  
* ProffieOS Documentation: https://pod.hubbe.net/
* ProffieOS: https://fredrik.hubbe.net/lightsaber/proffieos.html
* Proffieboard v1.5: https://fredrik.hubbe.net/lightsaber/v4
* Proffieboard v2.2: https://fredrik.hubbe.net/lightsaber/v5
* Proffieboard v3.9: https://fredrik.hubbe.net/lightsaber/v6
* TeensySaber: http://fredrik.hubbe.net/lightsaber/v3/
* Support forum: http://crucible.hubbe.net

### LayerBlade — SD card config

Edit blade effects on the SD card without recompiling:

* **Layer recipes:** [`doc/blade_styles_config.md`](doc/blade_styles_config.md) — `config/blade_styles.ini` format and composable layer catalog
* **Quick reference:** [`doc/README_blade_styles_config.md`](doc/README_blade_styles_config.md)
* **Presets:** [`doc/sd_config.md`](doc/sd_config.md) — `config/presets.ini`
* **Blade wiring:** [`doc/blade_config.md`](doc/blade_config.md) — `config/blades.ini`
* **Examples:** [`examples/config/`](examples/config/) — copy-ready SD layout; capstone demo **`composable_checklist`**
* **LayerBlade editor** (separate repo) — browser/desktop app for SD config (`blade_styles.ini`, presets, wiring); see `website/README.md` and `website/BLADES.md` / `website/BLADE_STYLES.md` in LayerBlade
* **Builder guide:** [`examples/config-layers-user-guide.md`](examples/config-layers-user-guide.md) — layer recipes, strip column BMPs, named colors (76 SD tokens)