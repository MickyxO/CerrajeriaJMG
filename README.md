# CerrajeriaJMG
Software de control y organización diseñado para la Cerrajeria JMG.

## Levantar proyecto en local

### 1) Crear rama para pruebas

```bash
git checkout -b chore/setup-local-dev
```

### 2) Instalar dependencias

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 3) Configurar variables de entorno

Backend:

```bash
copy backend\\.env.example backend\\.env
```

Completa al menos `DATABASE_URL` con tu conexión de Neon/PostgreSQL.

Frontend:

```bash
copy frontend\\.env.example frontend\\.env
```

Por defecto apunta al backend local: `VITE_API_URL=http://localhost:3000`.

### 4) Ejecutar en modo desarrollo

En una terminal:

```bash
npm --prefix backend run dev
```

En otra terminal:

```bash
npm --prefix frontend run dev
```

### 5) Verificación rápida

- Backend health: `http://localhost:3000/health`
- Swagger (si `ENABLE_SWAGGER=true`): `http://localhost:3000/api-docs`
- Frontend (Vite): `http://localhost:5173`
