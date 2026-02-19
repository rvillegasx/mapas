
# Socket-Server

## Desarrollo local (sin Docker)

Reconstruir módulos de Node
```bash
npm install
```

Generar el DIST
```bash
tsc -w
```

Levantar servidor
```bash
node dist/
```

## Docker

### Construir y publicar la imagen

Desde el directorio `server/`, construir y subir a Docker Hub:

```bash
# Construir la imagen
docker build -t <tu-usuario>/mapas-server:latest .

# Iniciar sesion en Docker Hub (solo la primera vez)
docker login

# Subir la imagen
docker push <tu-usuario>/mapas-server:latest
```

Para publicar una version especifica:

```bash
docker build -t <tu-usuario>/mapas-server:1.0.0 -t <tu-usuario>/mapas-server:latest .
docker push <tu-usuario>/mapas-server:1.0.0
docker push <tu-usuario>/mapas-server:latest
```

### Bind mounts

| Mount | Host | Contenedor | Descripcion |
|---|---|---|---|
| SSL | `/etc/letsencrypt/live/api.appsmx.tech/` | `/etc/letsencrypt/live/api.appsmx.tech/` | Certificados Let's Encrypt (solo lectura) |
| Data | `./server-data/` | `/app/dist/data/` | Persistencia del archivo `geo-cache.json` |

- El mount de SSL es **solo lectura** (`:ro`) porque el servidor solo lee los certificados.
- El mount de data asegura que `geo-cache.json` persista aunque se destruya y recree el contenedor.

### Variable de entorno

El puerto se puede cambiar con la variable `PORT` (default: `3000`):

```bash
docker run -d \
  --name mapas-server \
  -p 8080:8080 \
  -e PORT=8080 \
  -v /etc/letsencrypt/live/api.appsmx.tech:/etc/letsencrypt/live/api.appsmx.tech:ro \
  -v ./server-data:/app/dist/data \
  <tu-usuario>/mapas-server
```

### Despliegue en un VPS

No se necesita clonar el repositorio. Solo Docker instalado en el VPS.

1. Crear el directorio para persistencia de datos:
   ```bash
   mkdir -p ~/mapas/server-data
   ```

2. Asegurar que los certificados SSL existan en `/etc/letsencrypt/live/api.appsmx.tech/` (generados con certbot o similar).

3. Descargar y ejecutar:
   ```bash
   docker run -d \
     --name mapas-server \
     --restart unless-stopped \
     -p 3000:3000 \
     -v /etc/letsencrypt/live/api.appsmx.tech:/etc/letsencrypt/live/api.appsmx.tech:ro \
     -v ~/mapas/server-data:/app/dist/data \
     <tu-usuario>/mapas-server
   ```

   Docker descargara la imagen automaticamente de Docker Hub si no existe localmente.

4. Verificar que esta corriendo:
   ```bash
   docker ps
   docker logs mapas-server
   ```

### Actualizar en el VPS

Cuando se publique una nueva version de la imagen:

```bash
docker pull <tu-usuario>/mapas-server:latest
docker rm -f mapas-server
docker run -d \
  --name mapas-server \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /etc/letsencrypt/live/api.appsmx.tech:/etc/letsencrypt/live/api.appsmx.tech:ro \
  -v ~/mapas/server-data:/app/dist/data \
  <tu-usuario>/mapas-server
```

### Comandos utiles

```bash
# Ver logs en tiempo real
docker logs -f mapas-server

# Detener el contenedor
docker stop mapas-server

# Eliminar el contenedor
docker rm mapas-server
```
