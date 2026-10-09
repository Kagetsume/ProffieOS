#!/usr/bin/env python3
"""Wrap named_styles[] description strings in NAMED_STYLE_DESC()."""
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "styles" / "style_parser.h"


def split_entries(block: str):
    entries = []
    i = 0
    n = len(block)
    depth = 0
    in_str = False
    start = None
    while i < n:
        c = block[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            i += 1
            continue
        if c == "{":
            if depth == 0:
                start = i
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0 and start is not None:
                j = i + 1
                while j < n and block[j] in " \t":
                    j += 1
                if j < n and block[j] == ",":
                    j += 1
                entries.append(block[start:j])
                start = None
                i = j
                continue
        i += 1
    return entries


def split_members(inner: str):
    members = []
    start = 0
    i = 0
    n = len(inner)
    paren = angle = brace = 0
    in_str = False
    while i < n:
        c = inner[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            i += 1
            continue
        if c == "(":
            paren += 1
        elif c == ")":
            paren -= 1
        elif c == "{":
            brace += 1
        elif c == "}":
            brace -= 1
        elif c == "<" and paren == 0:
            angle += 1
        elif c == ">" and paren == 0 and angle > 0:
            angle -= 1
        elif c == "," and paren == 0 and angle == 0 and brace == 0:
            members.append(inner[start:i])
            start = i + 1
        i += 1
    members.append(inner[start:])
    while members and members[-1].strip() == "":
        members.pop()
    return members


def split_leading_comments(text: str):
    """Keep // comments outside NAMED_STYLE_DESC(...)."""
    lines = text.splitlines(keepends=True)
    i = 0
    while i < len(lines):
        stripped = lines[i].lstrip()
        if stripped == "" or stripped.startswith("//"):
            i += 1
            continue
        break
    return "".join(lines[:i]), "".join(lines[i:])


def wrap_entry(entry: str) -> str:
    if "NAMED_STYLE_DESC(" in entry:
        return entry
    trailing = ""
    core = entry
    if core.rstrip().endswith(","):
        # trailing comma after '}'
        idx = core.rstrip()
        cut = len(core.rstrip()) - 1
        trailing = core[cut:]
        core = core[:cut]
    core = core.rstrip()
    assert core.startswith("{") and core.endswith("}")
    inner = core[1:-1]
    members = split_members(inner)
    if len(members) < 3:
        raise SystemExit(f"expected name, allocator, description:\n{entry[:200]}")
    last = members[-1]
    prefix, desc = split_leading_comments(last)
    desc_stripped = desc.strip()
    if not desc_stripped.startswith('"'):
        raise SystemExit(
            "last member is not a string:\n"
            f"members={len(members)} last={last!r}\n"
            f"entry={entry[:400]!r}"
        )
    # Drop a trailing comma inside the description member (initializer comma).
    if desc.rstrip().endswith(","):
        d = desc.rstrip()
        keep_nl = desc[len(d):]
        desc = d[:-1] + keep_nl
    wrapped = prefix + " NAMED_STYLE_DESC(" + desc.rstrip() + ")"
    new_members = members[:-1] + [wrapped]
    new_inner = ",".join(new_members)
    return "{" + new_inner + "}" + trailing


def main():
    src = PATH.read_text(encoding="utf-8")
    key = "NamedStyle named_styles[] = {"
    start = src.index(key) + len(key)
    end = src.index("\n};", start)
    body = src[start:end]
    entries = split_entries(body)
    rebuilt = []
    cursor = 0
    for e in entries:
        at = body.index(e, cursor)
        rebuilt.append(body[cursor:at])
        rebuilt.append(wrap_entry(e))
        cursor = at + len(e)
    rebuilt.append(body[cursor:])
    new_body = "".join(rebuilt)
    PATH.write_text(src[:start] + new_body + src[end:], encoding="utf-8")
    print(f"wrapped {len(entries)} named_styles entries")


def cleanup_formatting():
    src = PATH.read_text(encoding="utf-8")
    src = src.replace(" NAMED_STYLE_DESC(", "    NAMED_STYLE_DESC(")
    src = src.replace('")}', '")\n  }')
    PATH.write_text(src, encoding="utf-8")
    print("cleaned formatting")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
        cleanup_formatting()
    else:
        main()
