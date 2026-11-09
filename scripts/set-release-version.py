#!/usr/bin/env python3
"""Set the release version on every workspace package.

Usage: python3 scripts/set-release-version.py X.Y.Z

X.Y.Z has no v prefix. The same number is the release tag with a v prefix.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# How many times each package name is followed by its own version field.
EXPECTED_COUNTS = {
    "package.json": {"anka-actions": 1},
    "common/package.json": {"anka-actions-common": 1},
    "up/package.json": {"anka-actions-up": 1},
    "down/package.json": {"anka-actions-down": 1},
    "package-lock.json": {
        "anka-actions": 2,
        "anka-actions-common": 1,
        "anka-actions-up": 1,
        "anka-actions-down": 1,
    },
}

VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")


def replace_versions(text, package_name, version):
    marker = f'"name": "{package_name}"'
    pieces = []
    start = 0
    found = 0
    while True:
        index = text.find(marker, start)
        if index < 0:
            pieces.append(text[start:])
            break
        window_end = min(len(text), index + len(marker) + 80)
        window = text[index:window_end]
        match = re.search(r'"version": "([^"]*)"', window)
        if match is None:
            raise SystemExit(f"No version field within 80 characters of {package_name}.")
        value_start = index + match.start(1)
        value_end = index + match.end(1)
        pieces.append(text[start:value_start])
        pieces.append(version)
        start = value_end
        found += 1
    return "".join(pieces), found


def main():
    if len(sys.argv) != 2 or not VERSION_RE.fullmatch(sys.argv[1]):
        raise SystemExit("Usage: python3 scripts/set-release-version.py X.Y.Z")
    version = sys.argv[1]
    updated = []
    for relative, names in EXPECTED_COUNTS.items():
        path = ROOT / relative
        text = path.read_text()
        for package_name, expected in names.items():
            text, found = replace_versions(text, package_name, version)
            if found != expected:
                raise SystemExit(
                    f"{relative}: expected {expected} version field(s) for {package_name}, found {found}."
                )
        data = json.loads(text)
        if data["version"] != version:
            raise SystemExit(f"{relative} version is {data['version']}, expected {version}.")
        updated.append((path, text))
    for path, text in updated:
        path.write_text(text)
    lock = json.loads((ROOT / "package-lock.json").read_text())
    for key in ("common", "up", "down"):
        lock_version = lock["packages"][key]["version"]
        if lock_version != version:
            raise SystemExit(f"package-lock.json packages.{key}.version is {lock_version}.")
    if lock["packages"][""]["version"] != version or lock["version"] != version:
        raise SystemExit("package-lock.json root version was not updated.")


if __name__ == "__main__":
    main()
