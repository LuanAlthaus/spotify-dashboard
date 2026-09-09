# Panel Spotify

Un panel estilo "dashboard" para escritorio: reloj, fecha, lo que está sonando en Spotify en tiempo real, la temperatura de tu ciudad y el uso de CPU/RAM de tu computadora — todo en una pantalla minimalista en blanco y negro.

## Qué muestra

- **Reloj y fecha** en tiempo real
- **Now Playing de Spotify** — portada del álbum, canción, artista y barra de progreso
- **Temperatura** de la ciudad que configures (vía Open-Meteo, API gratuita, sin necesidad de clave)
- **Uso de CPU y RAM** de la computadora donde corre el panel
- Un vinilo animado en la esquina, que gira mientras suena una canción

## Requisitos previos

- [Node.js](https://nodejs.org/) versión 18 o más reciente
- Una cuenta de Spotify (gratuita o Premium, da igual — el panel solo *lee* lo que está sonando, no controla nada)

## Guía de instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone <url-de-tu-repositorio>
cd spotify-dashboard
```

### 2. Instalar las dependencias

```bash
npm install
```

### 3. Crear una app en el Spotify Developer Dashboard

El panel necesita tus propias credenciales para poder consultar "qué está sonando ahora" en tu cuenta.

1. Entra en https://developer.spotify.com/dashboard e inicia sesión con tu cuenta de Spotify
2. Haz clic en **Create app**
3. Completa:
   - **App name**: el nombre que quieras (ej: "Mi Panel")
   - **App description**: cualquier descripción
   - **Redirect URI**: `http://127.0.0.1:4123/callback`
     - ⚠️ Tiene que ser **exactamente** esa dirección (incluyendo el puerto `4123`). Si más adelante cambias el puerto en el `.env`, también hay que actualizarlo acá.
4. Marca la casilla de aceptación y haz clic en **Save**
5. Dentro de la app creada, entra en **Settings** y copia el **Client ID** y el **Client Secret**

### 4. Configurar las variables de entorno

```bash
cp .env.example .env
```

Abre el archivo `.env` en un editor de texto y completa con los datos que copiaste en el paso anterior:

```
SPOTIFY_CLIENT_ID=tu_client_id_aqui
SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4123/callback
PORT=4123
```

### 5. Personalizar el panel (nombre, ciudad y clima)

Abre el archivo `public/script.js` y edita el bloque `CONFIG` al principio:

```javascript
const CONFIG = {
  displayName: 'Tu Nombre',      // Nombre mostrado junto a la temperatura
  cityName: 'Tu Ciudad',         // Nombre de la ciudad mostrado en el panel
  latitude: -25.4284,            // Latitud de tu ciudad
  longitude: -49.2733,           // Longitud de tu ciudad
};
```

Para encontrar la latitud/longitud de tu ciudad, busca "[nombre de tu ciudad] coordenadas" en Google, o usa https://www.latlong.net/.

### 6. Ejecutar el panel

```bash
npm start
```

Verás en la terminal:

```
Painel rodando em http://localhost:4123
Se ainda não conectou o Spotify, acesse http://localhost:4123/login uma vez.
```

### 7. Conectar tu cuenta de Spotify (solo la primera vez)

Abre en el navegador: **http://127.0.0.1:4123/login**

Serás redirigido para autorizar la app en tu cuenta de Spotify. Después de autorizar, aparecerá un mensaje de éxito — puedes cerrar esa pestaña. Esto crea un archivo `tokens.json` en la carpeta del proyecto, que guarda tu autorización (no necesitas volver a iniciar sesión después de esto).

### 8. Abrir el panel

Entra en **http://127.0.0.1:4123** desde el navegador. Listo — el panel está funcionando.

## Estructura del proyecto

```
spotify-dashboard/
├── server.js              # Backend: autenticación con Spotify + API de now-playing y system stats
├── .env.example            # Modelo de las variables de entorno
├── package.json
└── public/
    ├── index.html           # Estructura de la página
    ├── style.css            # Estilo visual (colores, fuentes, animaciones)
    └── script.js            # Lógica: reloj, now-playing, clima, CPU/RAM, y el bloque CONFIG
```

## Personalización

- **Nombre, ciudad y coordenadas**: bloque `CONFIG` al principio de `public/script.js` (paso 5 más arriba)
- **Colores y fuentes**: variables `:root` al principio de `public/style.css` (`--ink`, `--void`, `--mid`, etc.)
- **Frecuencia de actualización**: los `setInterval(...)` al final de cada sección del `script.js` controlan cada cuánto se actualiza cada widget (now-playing cada 5s, clima cada 10min, CPU/RAM cada 5s)

## Ejecutar en pantalla completa (opcional)

Si querés dejar esto encendido en una pantalla dedicada (tipo un monitor extra o una tablet), abrí el navegador en modo kiosk/pantalla completa apuntando a `http://127.0.0.1:4123`. En Chrome/Chromium, esto se puede hacer con la flag `--kiosk`. Este modo de uso es opcional — el panel funciona normalmente como una pestaña común del navegador.

## Prevención de errores (Troubleshooting)

### "INVALID_CLIENT: Invalid redirect URI" al acceder a /login
La URL de redirección en el Spotify Dashboard (paso 3) tiene que ser **idéntica, carácter por carácter**, a la `SPOTIFY_REDIRECT_URI` de tu `.env`. Revisá que no sobre una `/` al final, que el puerto coincida, y que sea `http` (no `https`).

### El panel muestra "Silêncio no momento" aunque haya música sonando
- Confirmá que Spotify esté **realmente reproduciendo** en algún dispositivo (celular, PC, altavoz) — la API solo devuelve datos si hay reproducción activa
- Las sesiones privadas de Spotify (modo anónimo) no aparecen en la API
- Esperá unos segundos — el panel se actualiza cada 5 segundos

### Error "NOT_AUTHENTICATED" en la terminal
El archivo `tokens.json` no existe o es inválido. Entrá a `/login` de nuevo (paso 7) para generar uno nuevo.

### CPU y RAM siempre muestran "--%"
El backend (`server.js`) necesita estar corriendo la versión más reciente del código. A diferencia del frontend (que solo necesita F5 en la página), los cambios en `server.js` requieren **reiniciar el proceso de Node** (`Ctrl+C` y `npm start` de nuevo).

### La temperatura siempre muestra "--°C"
- Confirmá que `latitude` y `longitude` en el `CONFIG` (paso 5) estén completadas correctamente, con el signo menos cuando corresponda (ej: `-25.4284`, no `25.4284`)
- Confirmá que la computadora tenga acceso a internet — la API del clima (Open-Meteo) necesita conexión externa

### La temperatura mostrada difiere un poco de otras apps de clima
Esto es normal — cada servicio meteorológico usa modelos de predicción distintos, así que una diferencia de 1-2°C entre fuentes es esperable. No indica un error.

### Error "EADDRINUSE" o "puerto ya en uso" al ejecutar npm start
Algo más ya está usando el puerto 4123. Cerrá lo que esté usando ese puerto, o cambiá el valor de `PORT` en el `.env` (recordando actualizar también la `SPOTIFY_REDIRECT_URI` y el Redirect URI en el Spotify Dashboard para que coincidan con el nuevo puerto).

### npm install falla o da error de versión
Confirmá que estás usando Node.js 18 o más reciente: `node --version`. Versiones más antiguas pueden no soportar algunas funciones usadas en el proyecto.

## Licencia

Sentite libre de usar, modificar y distribuir este proyecto.
