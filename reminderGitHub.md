Nueva rama backoffice sin subir a producción hasta que no esté totalmente tested.

**1. Primero, guarda tus cambios actuales en la rama nueva:**

```bash
# Crear rama y moverte a ella (con los cambios sin commit)
git checkout -b backoffice

# Ahora haz commit de todo lo del backoffice
git add .
git commit -m "WIP: backoffice invoice system"

# Opcional: súbela a remoto para tener backup
git push -u origin backoffice
```

**2. Volver a main limpio:**

```bash
git checkout main
# Ahora main está como antes, sin tus cambios de backoffice
```

**3. Flujo de trabajo diario:**

```bash
# Trabajar en backoffice
git checkout backoffice
# ... cambios ...
git add .
git commit -m "feat: pdf editor modal"

# Hotfix rápido en producción
git checkout main
# ... arreglo pequeño ...
git add .
git commit -m "fix: typo en login"
git push origin main

# Volver al backoffice
git checkout backoffice
```

**4. Mantener backoffice actualizado con main:**

```bash
# Desde backoffice, traer cambios de main
git checkout backoffice
git merge main
# o si prefieres historial lineal:
git rebase main
```

**Consejo:** Si tienes cambios sin commitear y quieres cambiar de rama rápido:

```bash
git stash                  # Guarda cambios temporalmente
git checkout main          # Cambias de rama
# ... haces el fix ...
git checkout backoffice
git stash pop              # Recuperas tus cambios
```
