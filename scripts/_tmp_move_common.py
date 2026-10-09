import re
import subprocess
from pathlib import Path

root = Path(r"D:\projects\ProffieOS")
moved = [
    "blade_config_file.h",
    "blade_config_file_defs.h",
    "blade_config_led_types.h",
    "blade_config_pin_names.h",
    "board_config_file.h",
    "board_config_file_defs.h",
    "compiled_style_metadata.h",
    "compiled_style_to_config.h",
    "debug_preset_cycle_flash.h",
    "features_config_file.h",
    "font_search_path.h",
    "help_text.h",
    "opacity_scale.h",
    "sd_blade_runtime.h",
    "sd_boot_style_warm.h",
    "sd_config.h",
    "sd_config_defs.h",
    "sd_config_files.h",
    "sd_style_hold.h",
    "style_config_boot_log.h",
    "style_config_cache.h",
    "style_config_file.h",
]
moved_set = set(moved)
dest = root / "common" / "composition"
dest.mkdir(exist_ok=True)

for name in moved:
    src = root / "common" / name
    if src.exists():
        subprocess.check_call(["git", "mv", f"common/{name}", f"common/composition/{name}"], cwd=root)

inc_re = re.compile(r'#include "([^"]+)"')

def rewrite_moved(text):
    def repl(m):
        inc = m.group(1)
        m1 = re.match(r"\.\./common/(.+)$", inc)
        if m1:
            name = m1.group(1)
            if name in moved_set:
                return f'#include "{name}"'
            return f'#include "../{name}"'
        if inc.startswith("../"):
            return f'#include "../{inc}"'
        if inc in moved_set:
            return f'#include "{inc}"'
        return f'#include "../{inc}"'
    return inc_re.sub(repl, text)

for name in moved:
    p = dest / name
    p.write_text(rewrite_moved(p.read_text(encoding="utf-8")), encoding="utf-8", newline="\n")

def rewrite_external(text, in_common_root):
    def repl(m):
        inc = m.group(1)
        if "/composition/" in inc or inc.startswith("composition/"):
            return m.group(0)
        m0 = re.match(r"common/(.+)$", inc)
        if m0 and m0.group(1) in moved_set:
            return f'#include "common/composition/{m0.group(1)}"'
        m1 = re.match(r"(\.\./)+common/(.+)$", inc)
        if m1 and m1.group(2) in moved_set:
            return f'#include "{m1.group(1)}common/composition/{m1.group(2)}"'
        if in_common_root and inc in moved_set:
            return f'#include "composition/{inc}"'
        return m.group(0)
    return inc_re.sub(repl, text)

for p in root.rglob("*"):
    if not p.is_file() or p.suffix not in {".h", ".cpp", ".ino"}:
        continue
    if dest in p.parents or p.parent == dest:
        continue
    text = p.read_text(encoding="utf-8", errors="replace")
    if "#include" not in text:
        continue
    rel = p.relative_to(root)
    in_common = rel.parts[0] == "common" and "composition" not in rel.parts
    new = rewrite_external(text, in_common)
    if new != text:
        p.write_text(new, encoding="utf-8", newline="\n")
        print("includes", rel)

# Comment and tool paths: common/NAME -> common/composition/NAME
path_re = re.compile(r"(?<!composition/)common/(" + "|".join(re.escape(n) for n in moved) + r")")
for p in root.rglob("*"):
    if not p.is_file():
        continue
    if p.suffix.lower() not in {".h", ".cpp", ".ino", ".md", ".js", ".ps1", ".py", ".mdc"}:
        continue
    if dest in p.parents:
        continue
    text = p.read_text(encoding="utf-8", errors="replace")
    new = path_re.sub(r"common/composition/\1", text)
    if new != text:
        p.write_text(new, encoding="utf-8", newline="\n")
        print("paths", p.relative_to(root))

print("moved", len(moved))
