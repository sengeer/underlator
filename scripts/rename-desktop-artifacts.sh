#!/usr/bin/env bash
# Переименовывает/копирует артефакты Tauri release к каноническим именам атома 5.2.
#
# Канон (версия из tauri.conf или --version):
#   Underlator-<version>-linux-x86_64.AppImage
#   Underlator-<version>-macos-arm64.dmg
#   Underlator-<version>-win-x64-portable.zip
#
# DoD 5.2: AppImage / arm64 DMG / portable zip. .deb / MSI / NSIS не являются
# заменой канонических форматов — скрипт их не продвигает как DoD-артефакты.
#
# Пример (Linux, dry-run):
#   ./scripts/rename-desktop-artifacts.sh --dry-run
#
# Пример (после cargo tauri build --features desktop):
#   ./scripts/rename-desktop-artifacts.sh
#   → dist-desktop/Underlator-0.1.0-beta-linux-x86_64.AppImage

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="${ROOT}/crates/underlator-tauri/tauri.conf.json"
OUT_DIR="${ROOT}/dist-desktop"
DRY_RUN=0
VERSION=""
BUNDLE_ROOT=""

usage() {
  cat <<'EOF'
Usage: rename-desktop-artifacts.sh [options]

Options:
  --version <ver>     Override product version (default: from tauri.conf.json)
  --out <dir>         Output directory (default: <repo>/dist-desktop)
  --bundle-root <dir> Search root for Tauri bundle outputs (default: auto)
  --dry-run           Print planned copies without writing
  -h, --help          Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="${2:?}"
      shift 2
      ;;
    --out)
      OUT_DIR="${2:?}"
      shift 2
      ;;
    --bundle-root)
      BUNDLE_ROOT="${2:?}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${VERSION}" ]]; then
  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 required to read version from ${CONF}" >&2
    exit 1
  fi
  VERSION="$(python3 -c "import json; print(json.load(open('${CONF}'))['version'])")"
fi

if [[ -z "${BUNDLE_ROOT}" ]]; then
  # cargo tauri из crates/underlator-tauri → target рядом с crate или workspace target
  for candidate in \
    "${ROOT}/crates/underlator-tauri/target" \
    "${ROOT}/target"
  do
    if [[ -d "${candidate}" ]]; then
      BUNDLE_ROOT="${candidate}"
      break
    fi
  done
fi

linux_name="Underlator-${VERSION}-linux-x86_64.AppImage"
macos_name="Underlator-${VERSION}-macos-arm64.dmg"
win_name="Underlator-${VERSION}-win-x64-portable.zip"

if [[ -z "${BUNDLE_ROOT}" ]]; then
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "version=${VERSION}"
    echo "[dry-run] no target/ yet — planned canonical names:"
    echo "  ${OUT_DIR}/${linux_name}"
    echo "  ${OUT_DIR}/${macos_name}"
    echo "  ${OUT_DIR}/${win_name}"
    exit 0
  fi
  echo "No target/ directory found. Build first or pass --bundle-root." >&2
  exit 1
fi

copy_or_echo() {
  local src="$1"
  local dest="$2"
  if [[ ! -f "${src}" ]]; then
    return 1
  fi
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "[dry-run] ${src} → ${dest}"
    return 0
  fi
  mkdir -p "$(dirname "${dest}")"
  cp -f "${src}" "${dest}"
  echo "Wrote ${dest}"
}

find_newest() {
  # find_newest <glob pattern under BUNDLE_ROOT>
  local pattern="$1"
  # shellcheck disable=SC2086
  find "${BUNDLE_ROOT}" -type f -name ${pattern} 2>/dev/null | sort | tail -n 1
}

echo "version=${VERSION}"
echo "bundle-root=${BUNDLE_ROOT}"
echo "out=${OUT_DIR}"

# --- Linux AppImage ---
appimage="$(find_newest '*.AppImage')"
if [[ -n "${appimage}" ]]; then
  copy_or_echo "${appimage}" "${OUT_DIR}/${linux_name}" || true
else
  echo "skip: no AppImage under ${BUNDLE_ROOT}"
fi

# --- macOS DMG (arm64) ---
dmg="$(find_newest '*.dmg')"
if [[ -n "${dmg}" ]]; then
  copy_or_echo "${dmg}" "${OUT_DIR}/${macos_name}" || true
else
  echo "skip: no DMG under ${BUNDLE_ROOT}"
fi

# --- Windows portable zip (exe inside; not NSIS/MSI) ---
# Ищем release .exe host-бинаря; NSIS/MSI installer не берём как DoD.
win_exe=""
for candidate in \
  "$(find_newest 'underlator-tauri.exe')" \
  "$(find_newest 'Underlator.exe')"
do
  if [[ -n "${candidate}" && -f "${candidate}" ]]; then
    # предпочитаем release/ без nsis/msi в пути
    case "${candidate}" in
      */nsis/*|*/msi/*|*/wix/*) continue ;;
    esac
    win_exe="${candidate}"
    break
  fi
done

if [[ -n "${win_exe}" ]]; then
  dest_zip="${OUT_DIR}/${win_name}"
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "[dry-run] zip ${win_exe} → ${dest_zip}"
  else
    mkdir -p "${OUT_DIR}"
    tmp="$(mktemp -d)"
    cp -f "${win_exe}" "${tmp}/Underlator.exe"
    (
      cd "${tmp}"
      if command -v zip >/dev/null 2>&1; then
        zip -q -9 "${dest_zip}" Underlator.exe
      else
        # fallback без zip(1): tar → не канон; требуем zip
        echo "zip(1) required to create ${win_name}" >&2
        exit 1
      fi
    )
    rm -rf "${tmp}"
    echo "Wrote ${dest_zip}"
  fi
else
  echo "skip: no Windows .exe under ${BUNDLE_ROOT}"
fi

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "Canonical Linux example: ${OUT_DIR}/${linux_name}"
fi
