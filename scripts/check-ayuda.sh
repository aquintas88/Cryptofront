#!/bin/sh
# Impide subir una función nueva sin actualizar la ayuda.
# Si el rango añade entradas de tipo 'feature' a backend/src/datos/changelog.ts, debe cambiar
# también backend/src/datos/ayuda.ts. Excepciones: SKIP_AYUDA=1 en el entorno, o «[sin-ayuda]»
# en el mensaje de algún commit del rango.
# Uso: scripts/check-ayuda.sh <rango-git>   (p. ej. origin/prepro..HEAD)
RANGE="$1"
[ -z "$RANGE" ] && exit 0
[ -n "$SKIP_AYUDA" ] && exit 0
NUEVAS=$(git diff "$RANGE" -- backend/src/datos/changelog.ts 2>/dev/null | grep -cE "^\+.*tipo: 'feature'")
[ "${NUEVAS:-0}" -eq 0 ] && exit 0
git diff --name-only "$RANGE" 2>/dev/null | grep -q "^backend/src/datos/ayuda.ts$" && exit 0
git log --format=%B "$RANGE" 2>/dev/null | grep -q "\[sin-ayuda\]" && exit 0
echo "✗ Este cambio añade $NUEVAS función(es) nueva(s) en el changelog pero no actualiza la ayuda."
echo "  Actualiza backend/src/datos/ayuda.ts (artículo nuevo o ampliado) y vuelve a hacer commit."
echo "  Si de verdad no aplica: añade «[sin-ayuda]» al mensaje del commit o ejecuta con SKIP_AYUDA=1."
exit 1
