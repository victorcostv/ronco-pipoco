#!/bin/sh
# Copia o site (raiz do repositório) para dentro do app, na pasta www.
# Roda em toda compilação (fase "Copiar o site" do Xcode): o app sempre leva o site como está no repositório.
set -eu
SITE="${SRCROOT}/.."
DEST="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/www"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SITE/css" "$SITE/js" "$SITE/img" "$SITE/icons" "$DEST/"
cp "$SITE/manifest.webmanifest" "$DEST/"
cp -R "$SRCROOT/fontes" "$DEST/fonts"
# fontes locais no lugar do Google Fonts (o app funciona sem internet) e sem zoom de pinça
sed -e '/fonts\.googleapis\.com/d' -e '/fonts\.gstatic\.com/d' \
    -e 's#<link rel="stylesheet" href="css/app.css">#<link rel="stylesheet" href="fonts/fonts.css"><link rel="stylesheet" href="css/app.css">#' \
    -e 's#viewport-fit=cover#viewport-fit=cover, maximum-scale=1, user-scalable=no#' \
    "$SITE/index.html" > "$DEST/index.html"
grep -q 'fonts/fonts.css' "$DEST/index.html" || { echo "error: o index.html mudou e as fontes locais não entraram"; exit 1; }
if grep -q 'fonts.googleapis' "$DEST/index.html"; then echo "error: sobrou Google Fonts no index.html"; exit 1; fi
echo "site copiado para $DEST"
