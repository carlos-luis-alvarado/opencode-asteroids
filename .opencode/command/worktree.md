---
description: Crea un worktree de git en .worktrees a partir de un argumento libre. Usar como /worktree <descripción>.
agent: build
---

Recibes un argumento que describe el propósito del worktree ($ARGUMENTS) y
puede contener o no espacios. Deriva de él un nombre seguro para path:

1. Normaliza el argumento: minúsculas, recorta espacios iniciales/finales,
   convierte cada secuencia de espacios u otros separadores en un único guion
   y elimina caracteres no válidos para nombre de carpeta (mantén letras,
   dígitos, guiones, guiones bajos y puntos).
2. Ejecuta únicamente:
   git worktree add .worktrees/<nombre>
   donde <nombre> es el resultado del paso 1.
   No hagas nada más: no cambies de directorio, no hagas commits ni ningún
   otro comando. Si el argumento está vacío, indica que se requiere un nombre
   y no ejecutes nada.