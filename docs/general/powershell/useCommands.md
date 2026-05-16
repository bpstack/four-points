# PowerShell - Comandos Útiles para Desarrollo

> Colección de comandos PowerShell para buscar, analizar y trabajar con el código del proyecto Four-Points.

---

## Índice

1. [Búsqueda en Código](#1-búsqueda-en-código)
2. [Gestión de Archivos](#2-gestión-de-archivos)
3. [Git](#3-git)
4. [Node.js y pnpm](#4-nodejs-y-pnpm)
5. [Base de Datos MySQL](#5-base-de-datos-mysql)
6. [Navegación y作业](#6-navegación-y-utilidades)
7. [Frontend Next.js](#7-frontend-nextjs)
8. [Backend Express](#8-backend-express)

---

## 1. Búsqueda en Código

### Búsqueda básica en archivos

```powershell
# Buscar texto en todos los archivos JS/TS (excluye node_modules y dist)
Get-ChildItem -Recurse -Include *.js,*.ts -Exclude node_modules,dist | Select-String "texto_a_buscar"

# Buscar en archivos específicos
Select-String -Path "*.ts" -Pattern "funcion_buscar"

# Buscar recursivamente en una carpeta
Get-ChildItem -Path "C:\ruta\a\carpeta" -Recurse -Filter "*.ts" | Select-String "patron"

# Buscar y mostrar número de línea
Select-String -Path "*.ts" -Pattern "pattern" | Format-List

# Buscar en múltiples extensiones
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Select-String "search_term"
```

### Búsqueda avanzada

```powershell
# Buscar y mostrar solo nombres de archivos con coincidencias
Select-String -Path "*.ts" -Pattern "pattern" -List | Select-Object -Unique Path

# Contar ocurrencias
(Get-ChildItem -Recurse -Include *.ts | Select-String -Pattern "pattern").Count

# Buscar con expresión regular
Select-String -Path "*.ts" -Pattern "import\s+.*from\s+['\"]@"

# Buscar en archivos específicos de un módulo
Get-ChildItem -Recurse -Path "frontend\app\lib" -Include *.ts | Select-String "API_URL"

# Buscar variable de entorno
Get-ChildItem -Recurse -Include *.ts -Exclude node_modules | Select-String "process.env"

# Buscar imports de un módulo específico
Get-ChildItem -Recurse -Include *.ts | Select-String "from '@tanstack/react-query'"

# Buscar todos los console.log (útil para cleanup)
Get-ChildItem -Recurse -Include *.ts,*.tsx | Select-String "console.log"
```

### Búsqueda por tipo de archivo

```powershell
# Solo archivos TypeScript
Get-ChildItem -Recurse -Include *.ts | Select-String "pattern"

# Archivos TypeScript React (TSX)
Get-ChildItem -Recurse -Include *.tsx | Select-String "pattern"

# Archivos de configuración
Get-ChildItem -Recurse -Include *.json,*.yaml,*.yml | Select-String "pattern"

# Archivos SQL
Get-ChildItem -Recurse -Include *.sql | Select-String "pattern"

# Archivos Markdown
Get-ChildItem -Recurse -Include *.md | Select-String "pattern"
```

---

## 2. Gestión de Archivos

### Listar y explorar

```powershell
# Listar archivos en directorio actual
Get-ChildItem

# Listar con detalles
Get-ChildItem | Format-Table Name, Length, LastWriteTime

# Listar recursivamente
Get-ChildItem -Recurse

# Listar solo directorios
Get-ChildItem -Directory

# Listar solo archivos
Get-ChildItem -File

# Filtrar por extensión
Get-ChildItem -Filter *.ts

# Listar archivos grandes (>1MB)
Get-ChildItem -Recurse | Where-Object { $_.Length -gt 1MB }

# Ver estructura de directorios (tree)
Get-ChildItem -Recurse -Depth 3 | Format-Table FullName
```

### Copiar, mover, eliminar

```powershell
# Copiar archivo
Copy-Item "origen.txt" "destino.txt"

# Copiar con overwrite
Copy-Item "origen.txt" "destino.txt" -Force

# Copiar directorio completo
Copy-Item "carpeta_origen" "carpeta_destino" -Recurse

# Mover archivo
Move-Item "origen.txt" "destino.txt"

# Renombrar archivo
Rename-Item "archivo_viejo.txt" "archivo_nuevo.txt"

# Eliminar archivo
Remove-Item "archivo.txt"

# Eliminar directorio con contenido
Remove-Item "carpeta" -Recurse -Force

# Eliminar archivos por patrón
Get-ChildItem -Include *.log -Recurse | Remove-Item
```

### Crear y modificar

```powershell
# Crear directorio
New-Item -ItemType Directory -Path "nueva_carpeta"

# Crear archivo vacío
New-Item -ItemType File -Path "archivo.txt"

# Crear con contenido
"contenido" | Out-File -FilePath "archivo.txt"

# Añadir contenido a archivo
"nueva linea" | Out-File -FilePath "archivo.txt" -Append

# Ver contenido de archivo
Get-Content "archivo.txt"

# Ver primeras líneas
Get-Content "archivo.txt" -TotalCount 10

# Ver últimas líneas
Get-Content "archivo.txt" -Tail 10
```

---

## 3. Git

### Estado y cambios

```powershell
# Ver estado del repositorio
git status

# Ver cambios en staging
git diff --cached

# Ver todos los cambios
git diff

# Ver historial de commits
git log --oneline -20

# Ver branches
git branch -a

# Ver branch actual
git rev-parse --abbrev-ref HEAD

# Ver archivos modificados
git diff --name-only

# Ver cambios en archivo específico
git diff "ruta/archivo.txt"
```

### Operaciones básicas

```powershell
# Añadir archivos
git add .

# Commit
git commit -m "mensaje del commit"

# Push
git push origin main

# Pull
git pull origin main

# Crear branch
git checkout -b nombre_branch

# Cambiar de branch
git checkout nombre_branch

# Ver stash
git stash list

# Aplicar stash
git stash pop
```

### Búsqueda en Git

```powershell
# Buscar en historial de commits
git log --all --oneline --grep="palabra"

# Buscar en contenido de commits
git log -S "palabra_buscar" --oneline

# Buscar en archivos
git log -p -- "*.ts" | Select-String "pattern"

# Ver who changed what
git blame "archivo.txt"

# Buscar en todos los branches
git log --all --oneline | Select-String "pattern"
```

---

## 4. Node.js y pnpm

### Gestión de dependencias

```powershell
# Instalar dependencias
pnpm install

# Instalar dependencia específica
pnpm add nombre_paquete

# Instalar como dev dependency
pnpm add -D nombre_paquete

# Desinstalar paquete
pnpm remove nombre_paquete

# Actualizar paquetes
pnpm update

# Ver paquetes obsoletos
pnpm outdated

# Ver árbol de dependencias
pnpm why nombre_paquete
```

### Scripts y ejecución

```powershell
# Ver scripts disponibles
pnpm run

# Ejecutar script
pnpm run nombre_script

# Ejecutar en modo desarrollo
pnpm dev

# Ejecutar build
pnpm build

# Ejecutar linter
pnpm lint

# Ejecutar tests
pnpm test

# Verificar tipos TypeScript
pnpm typecheck
```

### Información del entorno

```powershell
# Ver versión de Node
node --version

# Ver versión de pnpm
pnpm --version

# Ver versión de npm
npm --version

# Ver ruta de node
where node

# Ver variables de entorno de Node
node -e "console.log(process.version)"
```

---

## 5. Base de Datos MySQL

### Conexión y consultas

```powershell
# Conectar a MySQL local
mysql -u root -p

# Conectar a base de datos específica
mysql -u root -p hotel_db

# Conectar a MySQL remoto (Aiven)
mysql -u usuario -h host_aiven -p hotel_db -P 3306 --ssl-ca=ca-certificate.pem

# Ejecutar script SQL
mysql -u root -p hotel_db < script.sql

# Exportar base de datos
mysqldump -u root -p hotel_db > backup.sql

# Exportar solo estructura
mysqldump -u root -p --no-data hotel_db > estructura.sql

# Exportar solo datos
mysqldump -u root -p --no-create-info hotel_db > datos.sql
```

### Consultas rápidas desde PowerShell

```powershell
# Ver tablas
mysql -u root -p -e "SHOW TABLES;" hotel_db

# Describir tabla
mysql -u root -p -e "DESCRIBE usuarios;" hotel_db

# Contar registros
mysql -u root -p -e "SELECT COUNT(*) FROM usuarios;" hotel_db

# Ver estructura de base de datos
mysql -u root -p -e "SHOW CREATE TABLE nombre_tabla;" hotel_db
```

### Utilidades MySQL

```powershell
# Ver procesos activos
mysql -u root -p -e "SHOW PROCESSLIST;"

# Ver estado de conexiones
mysql -u root -p -e "SHOW STATUS LIKE 'Threads%';"

# Ver variables del servidor
mysql -u root -p -e "SHOW VARIABLES LIKE 'version%';"

# Optimizar tablas
mysql -u root -p -e "OPTIMIZE TABLE nombre_tabla;" hotel_db
```

---

## 6. Navegación y Utilidades

### Cambiar directorio

```powershell
# Ir a directorio
Set-Location "C:\ruta\a\carpeta"

# Ir al directorio del proyecto Four-Points
Set-Location "C:\Users\dz\projects\Four-Points"

# Ir al backend
Set-Location ".\backend"

# Ir al frontend
Set-Location ".\frontend"

# Ir al directorio anterior
Set-Location ..

# Ir al directorio raíz
Set-Location \
```

### Variables de entorno

```powershell
# Ver variable específica
$env:PATH

# Ver todas las variables
Get-ChildItem Env:

# Establecer variable temporal
$env:NODE_ENV = "development"

# Ver variable temporal
$env:DB_HOST

# Ver variable de Next.js
$env:NEXT_PUBLIC_API_URL
```

### Información del sistema

```powershell
# Ver IP local
Get-NetIPAddress | Where-Object {$_.AddressFamily -eq 'IPv4'}

# Ver procesos activos
Get-Process | Where-Object {$_.Name -match 'node|next'}

# Ver uso de memoria
Get-Process | Sort-Object WS -Descending | Select-Object -First 10

# Ver espacio en disco
Get-PSDrive C

# Ver fecha y hora
Get-Date
```

---

## 7. Frontend Next.js

### Comandos principales

```powershell
# Desarrollo con Turbopack
pnpm dev

# Build de producción
pnpm build

# Start producción
pnpm start

# Linting
pnpm lint

# Format con Prettier
pnpm format

# TypeScript check
pnpm typecheck

# Tests
pnpm test
```

### Búsqueda específica en frontend

```powershell
# Buscar componentes React
Get-ChildItem -Recurse -Include *.tsx -Path ".\frontend\app" | Select-String "useState"

# Buscar hooks personalizados
Get-ChildItem -Recurse -Include *.ts -Path ".\frontend\app\lib" | Select-String "useQuery"

# Buscar llamadas API
Get-ChildItem -Recurse -Include *.ts -Path ".\frontend\app" | Select-String "fetch("

# Buscar imports de NextUI
Get-ChildItem -Recurse -Include *.tsx | Select-String "from '@nextui"

# Buscar traducciones
Get-ChildItem -Recurse -Include *.ts -Path ".\frontend\messages" | Select-String "pattern"

# Buscar estilos Tailwind
Get-ChildItem -Recurse -Include *.tsx | Select-String "className=.*tw"
```

### Análisis del frontend

```powershell
# Ver tamaño del build
Get-ChildItem -Recurse -Path ".\frontend\.next" -File | Measure-Object -Sum Length

# Ver dependencias del package.json
Get-Content ".\frontend\package.json" | ConvertFrom-Json | Select-Object -ExpandProperty dependencies

# Ver devDependencies
Get-Content ".\frontend\package.json" | ConvertFrom-Json | Select-Object -ExpandProperty devDependencies

# Buscar componentes con errores
Get-ChildItem -Recurse -Include *.tsx -Path ".\frontend\app" | Select-String "ErrorBoundary"
```

---

## 8. Backend Express

### Comandos principales

```powershell
# Desarrollo local
pnpm dev:local

# Desarrollo con Aiven
pnpm dev:aiven

# Desarrollo estándar
pnpm dev

# Start producción
pnpm start

# TypeScript check
pnpm typecheck

# Tests
pnpm test
```

### Búsqueda específica en backend

```powershell
# Buscar controllers
Get-ChildItem -Recurse -Include *.ts -Path ".\backend\controllers" | Select-String "function"

# Buscar routes
Get-ChildItem -Recurse -Include *.ts -Path ".\backend\routes" | Select-String "router"

# Buscar middlewares
Get-ChildItem -Recurse -Include *.ts -Path ".\backend\middlewares" | Select-String "next"

# Buscar servicios
Get-ChildItem -Recurse -Include *.ts -Path ".\backend\services" | Select-String "async"

# Buscar repositories
Get-ChildItem -Recurse -Include *.ts -Path ".\backend\repositories" | Select-String "SELECT"

# Buscar validaciones Zod
Get-ChildItem -Recurse -Include *.ts -Path ".\backend\validations" | Select-String "z.object"

# Buscar endpoints API
Get-ChildItem -Recurse -Include *.ts -Path ".\backend\routes" | Select-String "api/"
```

### Análisis del backend

```powershell
# Ver configuración de BD
Get-Content ".\backend\config\config.ts" | Select-String "DB_"

# Ver modelos
Get-ChildItem -Recurse -Include *.ts -Path ".\backend\models" | Select-String "interface|type"

# Buscar consultas SQL
Get-ChildItem -Recurse -Include *.ts | Select-String "FROM|JOIN|WHERE"

# Ver dependencias del package.json
Get-Content ".\backend\package.json" | ConvertFrom-Json | Select-Object -ExpandProperty dependencies

# Ver scripts disponibles
Get-Content ".\backend\package.json" | ConvertFrom-Json | Select-Object -ExpandProperty scripts
```

---

## Atajos Útiles

### Combinar comandos

```powershell
# Buscar y abrir en VS Code
Select-String -Path "*.ts" -Pattern "pattern" | ForEach-Object { code $_.Path }

# Buscar y contar por archivo
Select-String -Path "*.ts" -Pattern "pattern" | Group-Object Path | Select-Object Count, Name

# Ver archivos más recientes
Get-ChildItem -Recurse -Include *.ts | Sort-Object LastWriteTime -Descending | Select-Object -First 20

# Ver archivos modificados hoy
Get-ChildItem -Recurse -Include *.ts | Where-Object { $_.LastWriteTime.Date -eq (Get-Date).Date }
```

### Alias útiles (añadir a tu perfil)

```powershell
# Añadir al perfil de PowerShell
notepad $PROFILE

# Alias de ejemplo
Set-Alias ll Get-ChildItem
Set-Alias grep Select-String
Set-Alias .. Set-Location ..
Set-Alias ... Set-Location ../..
```

---

## Documentación Relacionada

- [Variables de Entorno](../backend/enviroments/environment-variables.md) - Configuración de entornos
- [Configuración de Base de Datos](../backend/database/database-configuration.md) - MySQL local y Aiven
- [Arquitectura del Backend](../backend/README.md) - Estructura Express

---

> **Nota:** Estos comandos están optimizados para el proyecto Four-Points. Ajusta las rutas según tu estructura de directororios.
