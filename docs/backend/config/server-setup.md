# 🏨 Four-Points - Backend Server Setup

**Proyecto:** Hotel Property Management System  
**Stack:** Node.js, Express, MySQL  
**Puerto:** 4000

---

## ⚙️ Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/tuusuario/for-points.git
cd for-points/backend
```

2. **Instalar dependencias**

```bash
pnpm install
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env
# Editar .env con las credenciales correspondientes
```

4. **Ejecutar**

```bash
# Desarrollo local (MySQL local)
pnpm run dev:local

# Desarrollo Aiven (MySQL cloud)
pnpm run dev:aiven

# Producción
pnpm start
```

---

## 📁 Estructura del Proyecto

```
backend/
├── config/
│   ├── config.ts         # Configuración general
│   ├── db.ts             # Conexión MySQL
│   └── certs/            # Certificados SSL (Aiven)
├── controllers/          # Controladores HTTP
├── middlewares/          # Middlewares Express
├── models/              # Modelos/Types
├── repositories/        # Acceso a datos
├── routes/              # Definición de rutas
├── services/            # Lógica de negocio
├── validations/         # Zod schemas
├── index.ts             # Entry point
└── package.json
```

---

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Desarrollo con tsx watch |
| `pnpm dev:local` | Desarrollo con MySQL local |
| `pnpm dev:aiven` | Desarrollo con MySQL Aiven |
| `pnpm start` | Producción |
| `pnpm typecheck` | Verificación TypeScript |
| `pnpm test` | Tests con Vitest |

---

## 📝 Variables de Entorno

Ver `environment/environment-variables.md` para configuración completa.


