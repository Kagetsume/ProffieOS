# Named color catalog (firmware)

`colors.json` here is the ProffieOS copy used by `tools/generate-parse-color-names.js` when the LayerBlade repo is not checked out beside this tree.

Canonical editor catalog: **LayerBlade** → `website/src/catalog/colors.json`. After changing colors there, copy the file here (or set `LAYERBLADE_ROOT` / `LAYERBLADE_COLORS_JSON`) and run:

```bash
node tools/generate-parse-color-names.js
```

Commit the updated `styles/composition/parse_color_arg_table.generated.h`.
