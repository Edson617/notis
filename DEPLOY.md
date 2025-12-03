# 🚀 Guía para subir NotiApp a Vercel

## Paso 1: Crear cuenta en Vercel (si no tienes)

1. Ve a [vercel.com](https://vercel.com)
2. Crea una cuenta (puedes usar GitHub)

---

## Paso 2: Instalar Vercel CLI

Abre la terminal y ejecuta:

```bash
npm install -g vercel
```

---

## Paso 3: Crear base de datos Vercel KV

⚠️ **IMPORTANTE**: Necesitas Vercel KV para guardar las suscripciones.

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Crea un nuevo proyecto o ve a uno existente
3. Ve a **Storage** → **Create Database** → **KV**
4. Nombra tu base de datos (ej: `notiapp-kv`)
5. Copia las variables de entorno que te da

---

## Paso 4: Login y Deploy

En la terminal, dentro de la carpeta del proyecto:

```bash
# Login en Vercel
vercel login

# Deploy
vercel
```

Te preguntará:
- **Set up and deploy?** → `Y`
- **Which scope?** → Selecciona tu cuenta
- **Link to existing project?** → `N` (si es nuevo)
- **Project name?** → `notiapp` (o el que quieras)
- **Directory?** → `./` (la actual)

---

## Paso 5: Configurar Variables de Entorno

### Opción A: Desde el Dashboard de Vercel

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega las variables de Vercel KV:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

### Opción B: Conectar KV automáticamente

1. Ve a **Storage** en tu proyecto
2. Conecta tu KV database al proyecto
3. Las variables se agregan automáticamente

---

## Paso 6: Re-deploy con las variables

```bash
vercel --prod
```

---

## ✅ ¡Listo!

Tu app estará disponible en:
- `https://tu-proyecto.vercel.app`

### URLs importantes:
- App principal: `https://tu-proyecto.vercel.app`
- Panel admin: `https://tu-proyecto.vercel.app/admin.html`
- Health check: `https://tu-proyecto.vercel.app/api/health`

---

## 🔧 Troubleshooting

### Error: KV not configured
Asegúrate de haber conectado Vercel KV a tu proyecto.

### Error: VAPID keys
Las claves VAPID ya están configuradas. Si quieres cambiarlas:
1. Genera nuevas: `npx web-push generate-vapid-keys`
2. Actualiza en:
   - `api/push/send.js`
   - `api/push/subscribe.js`
   - `api/push/vapid-key.js`
   - `js/push.js`

### Las notificaciones no llegan
- Verifica que estés en HTTPS (Vercel ya lo tiene)
- Revisa los logs en Vercel Dashboard → Functions

---

## 📱 Instalar como PWA

Una vez desplegado:
1. Abre `https://tu-proyecto.vercel.app` en Chrome
2. Verás opción de "Instalar" o icono de descarga
3. ¡Instala y disfruta!

