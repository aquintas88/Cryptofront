# Registro de auditorías de seguridad de Cryptofront

Índice oficial de las auditorías de seguridad y de las correcciones aplicadas. Mismo formato que el de InmoKira.

## Cómo se garantiza que el registro es fiable
- **Todo en el repositorio, con historial**: cada informe y cada corrección es un commit fechado en GitHub. El historial de `main` y `prepro` no se reescribe.
- **Etiqueta inmutable** `auditoria-AAAA-MM-DD` por auditoría, sobre el commit que contiene el informe.
- **Huella SHA-256** de cada informe: si el fichero cambiara, la huella dejaría de coincidir (`shasum -a 256 docs/seguridad/AAAA-MM-DD.md`).
- **Trazabilidad de correcciones**: cada hallazgo se enlaza con el commit que lo corrige y la fecha. La auditoría siguiente verifica y marca el hallazgo como «corregido (verificado)».
- **Conservación**: no se borran informes. Plazo mínimo recomendado: 5 años (confirmar con el asesor legal).

## Auditorías realizadas
| Fecha | Tipo | Commit auditado | Críticos / Altos / Medios / Bajos | Informe | SHA-256 del informe | Estado |
|---|---|---|---|---|---|---|
| 2026-11-23 | Línea base · revisión estática, comparación con la auditoría de InmoKira de 2026-11-05 y `npm audit` | `f5bb5b7` | 0 / 0 / 1 / 3 (+2 informativos) | [2026-11-23.md](2026-11-23.md) | `f6591b50a528494b5fef383952fc2b66b1662de7a8c9c0dfbcabea49c99a6059` | Medio y bajos corregidos en el commit de esta auditoría; riesgo aceptado en `uuid` (CF-05) |

## Otros controles
- Dependabot semanal (`.github/dependabot.yml`).
- Rutina de auditoría: pendiente de decidir (InmoKira la ejecuta cada dos semanas, en los viernes alternos).
- Checklist de infraestructura de PRO: pendiente (`docs/seguridad/checklist-infra-pro.md`).
