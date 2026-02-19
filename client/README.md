# Mapas - Client

App Angular 7.2 que se conecta al backend via WebSocket para manejo colaborativo de marcadores en Google Maps.

## Requisitos

- Node.js
- npm

## Configuracion

Antes de hacer el build, configurar la URL del servidor backend y la API key de Google Maps en el archivo de environment de produccion:

**`src/environments/environment.prod.ts`**

```typescript
export const environment = {
  production: true,
  serverUrl: 'https://tu-dominio.com:3000',
  googleMapsApiKey: 'TU_API_KEY'
};
```

Este archivo esta excluido de git. Debe crearse manualmente.

## Build de produccion

```bash
cd client
npm install
npm run build -- --prod
```

Los archivos generados quedan en `client/dist/mapas/`.

## Subir al hosting

Copiar todo el contenido de `dist/mapas/` al directorio raiz del hosting:

```
dist/mapas/
├── index.html
├── favicon.ico
├── main.*.js
├── polyfills.*.js
├── runtime.*.js
├── styles.*.css
└── assets/
```

### SPA routing

Angular usa rutas del lado del cliente. Si el hosting es Apache, agregar un `.htaccess` en la raiz:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

Si es Nginx, agregar en la configuracion del server block:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Esto asegura que todas las rutas resuelvan a `index.html` y Angular maneje la navegacion.
