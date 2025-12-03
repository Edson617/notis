# NotiApp - PWA con Notificaciones Push Personalizadas

Una Progressive Web App (PWA) completa con splash screen, funcionalidad offline, y notificaciones push personalizadas.

## ✨ Características

- **🎨 Splash Screen**: Pantalla de carga animada con efecto moderno
- **📴 Funcionalidad Offline**: 
  - Service Worker para caché de recursos
  - IndexedDB para almacenamiento de datos offline
  - Sincronización automática al recuperar conexión
- **🔔 Notificaciones Push Personalizadas**:
  - Cada suscriptor tiene su propio perfil
  - Preferencias de notificación personalizables
  - Mensajes personalizados con nombre del usuario
  - Filtrado por categorías de interés

## 🚀 Instalación

### 1. Clonar e instalar dependencias

```bash
cd noti
npm install
```

### 2. Generar tus propias claves VAPID (Importante para producción)

```bash
npm run generate-vapid
```

Copia las claves generadas y actualiza:
- `server/server.js` - VAPID_KEYS
- `js/push.js` - VAPID_PUBLIC_KEY

### 3. Iniciar el servidor

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Modo producción
npm start
```

### 4. Abrir la aplicación

Visita [http://localhost:3000](http://localhost:3000)

## 📱 Instalación como PWA

1. Abre la app en Chrome/Edge
2. Verás la opción "Instalar" en la barra de direcciones
3. Haz clic para instalar como aplicación

## 🏗️ Estructura del Proyecto

```
noti/
├── index.html          # Página principal con splash screen
├── manifest.json       # Configuración PWA
├── service-worker.js   # Cache y offline
├── styles.css          # Estilos modernos
├── js/
│   ├── app.js         # Lógica principal
│   ├── db.js          # IndexedDB manager
│   └── push.js        # Push notifications manager
├── server/
│   └── server.js      # Backend Node.js
├── icons/             # Iconos PWA (necesitas crearlos)
└── package.json
```

## 🔧 Configuración

### Personalización de notificaciones

Cada usuario puede elegir qué tipo de notificaciones recibir:
- 🛒 Ofertas y promociones
- 📰 Noticias y actualizaciones
- ⏰ Recordatorios personales
- 🚨 Alertas importantes

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del servidor |
| GET | `/api/push/vapid-key` | Obtener clave pública VAPID |
| POST | `/api/push/subscribe` | Suscribirse a notificaciones |
| POST | `/api/push/unsubscribe` | Cancelar suscripción |
| POST | `/api/push/send` | Enviar notificación a usuario específico |
| POST | `/api/push/broadcast` | Enviar a todos (con filtros opcionales) |
| GET | `/api/push/subscriptions` | Listar suscripciones (admin) |

### Ejemplo: Enviar notificación personalizada

```javascript
// Enviar a un usuario específico
fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: 'https://fcm.googleapis.com/...',
    notification: {
      title: '¡Oferta especial!',
      body: 'Descuento del 50% solo para ti',
      data: { url: '/ofertas' }
    }
  })
});

// Broadcast a usuarios con preferencia específica
fetch('/api/push/broadcast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notification: {
      title: 'Nueva noticia',
      body: 'Algo importante ha sucedido'
    },
    filter: { preference: 'noticias' }
  })
});
```

## 🎨 Iconos PWA

Necesitas crear los siguientes iconos en la carpeta `icons/`:

- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-192.png (192x192)
- icon-384.png (384x384)
- icon-512.png (512x512)

Puedes usar herramientas como [PWA Asset Generator](https://github.com/nicholaskoerfer/pwa-asset-generator) o [Favicon.io](https://favicon.io/).

## 🔐 Seguridad en Producción

1. **HTTPS obligatorio**: Las notificaciones push requieren HTTPS
2. **Genera nuevas claves VAPID**: No uses las claves de ejemplo
3. **Base de datos**: Reemplaza el almacenamiento en memoria por una base de datos real
4. **Autenticación**: Añade autenticación a los endpoints de admin
5. **Rate limiting**: Implementa límites de tasa para evitar abuso

## 📝 Licencia

MIT License

