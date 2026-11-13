#!/usr/bin/env bash
# Builds the demo-v2 prototype into a static folder (reference only; never part of the app).
# Usage (from anywhere):  bash reference/graveyard/prototype/demo-v2/build.sh /tmp/demo-out
# Then serve it:          cd /tmp/demo-out && python3 -m http.server 8790
# Assets come from web/public/assets (and ../demo for jumpscare-face.webp). Each .glb is wrapped as a base64
# ES module (assets/<name>.glb.js) because the Claude artifact host does not serve .glb; the demo loads that form.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../../.." && pwd)
OUT=${1:-/tmp/demo-out}
BUILD=$(mktemp -d)
mkdir -p "$OUT/assets"
cp "$HERE/main.js" "$HERE/lab.js" "$BUILD/"
( cd "$BUILD" && npm init -y >/dev/null && npm i --silent three@0.187.0 esbuild@0.24 >/dev/null )
for f in main lab; do "$BUILD/node_modules/.bin/esbuild" "$BUILD/$f.js" --bundle --format=esm --minify --target=es2022 --outfile="$OUT/$f.js" --log-level=warning; done
cp "$HERE/index.html" "$HERE/lab.html" "$OUT/"
while read -r name; do
  [ -z "$name" ] && continue
  if [[ "$name" == *.glb.js ]]; then
    base=${name%.js}
    src=$(find "$REPO/web/public/assets" -name "$base" | head -1)
    [ -z "$src" ] && { echo "missing $base"; continue; }
    printf 'export default "%s";\n' "$(base64 -w0 "$src")" > "$OUT/assets/$name"
  else
    src=$(find "$REPO/web/public/assets" "$REPO/reference/graveyard/prototype/demo" -name "$name" | head -1)
    [ -z "$src" ] && { echo "missing $name"; continue; }
    cp "$src" "$OUT/assets/$name"
  fi
done < "$HERE/assets.txt"
rm -rf "$BUILD"
echo "built $OUT ($(ls "$OUT/assets" | wc -l) assets)"
