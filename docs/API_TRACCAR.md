# API de datos de flota (Traccar) — Guía de integración

> **Para quién es este documento:** desarrolladores que necesitan leer desde su
> aplicación los datos de los camiones (posición GPS, viajes, paradas, tacógrafo…).
>
> **Cómo usarlo:** sigue el [Inicio rápido](#1-inicio-rápido-5-minutos) y luego
> consulta solo el endpoint que necesites. Si tienes dudas, pásale este fichero
> completo a tu asistente de IA. La [sección 9](#9-instrucciones-para-asistentes-de-ia)
> está escrita para él.

---

## Índice

0. [Datos que te tienen que dar](#0-datos-que-te-tienen-que-dar)
1. [Inicio rápido (5 minutos)](#1-inicio-rápido-5-minutos)
2. [Autenticación](#2-autenticación)
3. [Convenciones: fechas, unidades y parámetros](#3-convenciones-fechas-unidades-y-parámetros)
4. [Endpoints](#4-endpoints)
   - 4.1 [Camiones (`/devices`)](#41-camiones--get-apidevices)
   - 4.2 [Posiciones (`/positions`)](#42-posiciones--get-apipositions)
   - 4.3 [Conductores (`/drivers`)](#43-conductores--get-apidrivers)
   - 4.4 [Grupos (`/groups`)](#44-grupos--get-apigroups)
   - 4.5 [Geocercas (`/geofences`)](#45-geocercas--get-apigeofences)
   - 4.6 [Informe de ruta (`/reports/route`)](#46-informe-de-ruta--get-apireportsroute)
   - 4.7 [Informe de viajes (`/reports/trips`)](#47-informe-de-viajes--get-apireportstrips)
   - 4.8 [Informe de paradas (`/reports/stops`)](#48-informe-de-paradas--get-apireportsstops)
   - 4.9 [Informe resumen (`/reports/summary`)](#49-informe-resumen--get-apireportssummary)
   - 4.10 [Informe de eventos (`/reports/events`)](#410-informe-de-eventos--get-apireportsevents)
   - 4.11 [Informe de geocercas (`/reports/geofences`)](#411-informe-de-geocercas--get-apireportsgeofences)
   - 4.12 [Informe combinado (`/reports/combined`)](#412-informe-combinado--get-apireportscombined)
   - 4.13 [Exportar a Excel (`/reports/{tipo}/xlsx`)](#413-exportar-a-excel)
   - 4.14 [Exportar posiciones a CSV / GPX / KML](#414-exportar-posiciones-a-csv--gpx--kml)
   - 4.15 [Un evento concreto (`/events/{id}`)](#415-un-evento-concreto--get-apieventsid)
   - 4.16 [Dirección a partir de coordenadas (`/server/geocode`)](#416-dirección-a-partir-de-coordenadas--get-apiservergeocode)
   - 4.17 [Información del servidor y salud (`/server`, `/health`)](#417-información-del-servidor-y-salud)
   - 4.18 [Sesión actual (`/session`)](#418-sesión-actual--get-apisession)
5. [Tiempo real: WebSocket (`/api/socket`)](#5-tiempo-real-websocket-apisocket)
6. [Datos del tacógrafo (Teltonika FMC650)](#6-datos-del-tacógrafo-teltonika-fmc650)
7. [Recetas habituales](#7-recetas-habituales)
8. [Errores y solución de problemas](#8-errores-y-solución-de-problemas)
9. [Instrucciones para asistentes de IA](#9-instrucciones-para-asistentes-de-ia)
10. [Referencias](#10-referencias)

---

## 0. Datos que te tienen que dar

| Dato | Ejemplo | Para qué |
|---|---|---|
| **URL base** | `https://TU-SERVIDOR/api` | Todas las peticiones van contra esta URL |
| **Token** | `RzBFAiEA…` (cadena larga) | Autenticación. **Es secreto.** |
| **IDs de camiones** | `12`, `15`… | Se obtienen con `GET /api/devices` (no hace falta pedirlos) |

En los ejemplos se usan estas variables de entorno:

```bash
export TRACCAR_URL="https://TU-SERVIDOR/api"
export TRACCAR_TOKEN="pega-aqui-el-token"
```

> ⚠️ El token **solo** debe estar en el backend (servidor). Si lo pones en el
> JavaScript del navegador, cualquiera puede verlo y leer los datos de la flota.

---

## 1. Inicio rápido (5 minutos)

**Paso 1: comprobar que el token funciona.** Esto devuelve tu usuario.

```bash
curl -s -H "Authorization: Bearer $TRACCAR_TOKEN" "$TRACCAR_URL/session"
```

**Paso 2: listar los camiones a los que tienes acceso.**

```bash
curl -s -H "Authorization: Bearer $TRACCAR_TOKEN" "$TRACCAR_URL/devices"
```

**Paso 3: ver la última posición de todos los camiones.**

```bash
curl -s -H "Authorization: Bearer $TRACCAR_TOKEN" "$TRACCAR_URL/positions"
```

**Paso 4: ver los viajes de ayer de un camión** (cambia `12` por un `id` del paso 2).

```bash
curl -s -G -H "Authorization: Bearer $TRACCAR_TOKEN" -H "Accept: application/json" \
  "$TRACCAR_URL/reports/trips" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z"
```

Si los cuatro pasos te devuelven JSON, ya está todo listo.

**Lo mismo en código:**

<details>
<summary>JavaScript / Node.js 18+ (fetch nativo)</summary>

```js
const BASE = process.env.TRACCAR_URL;      // https://TU-SERVIDOR/api
const TOKEN = process.env.TRACCAR_TOKEN;

async function traccar(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    // Los parámetros repetibles (deviceId, groupId, id) se pasan como array
    (Array.isArray(v) ? v : [v]).forEach((x) => url.searchParams.append(k, x));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
}

const devices = await traccar('/devices');
const lastPositions = await traccar('/positions');
const trips = await traccar('/reports/trips', {
  deviceId: [12, 15],
  from: '2026-10-06T00:00:00Z',
  to: '2026-10-07T00:00:00Z',
});
```
</details>

<details>
<summary>Python 3 (requests)</summary>

```python
import os, requests

BASE = os.environ["TRACCAR_URL"]          # https://TU-SERVIDOR/api
s = requests.Session()
s.headers.update({
    "Authorization": f"Bearer {os.environ['TRACCAR_TOKEN']}",
    "Accept": "application/json",
})

def traccar(path, **params):
    r = s.get(BASE + path, params=params, timeout=30)  # listas -> deviceId=1&deviceId=2
    r.raise_for_status()
    return r.json()

devices = traccar("/devices")
last_positions = traccar("/positions")
trips = traccar("/reports/trips", deviceId=[12, 15],
                **{"from": "2026-10-06T00:00:00Z", "to": "2026-10-07T00:00:00Z"})
```
</details>

<details>
<summary>PHP (cURL)</summary>

```php
<?php
function traccar(string $path, array $params = []) {
    $base  = getenv('TRACCAR_URL');
    $token = getenv('TRACCAR_TOKEN');
    // http_build_query genera deviceId[0]=1; Traccar necesita deviceId=1&deviceId=2
    $qs = preg_replace('/%5B\d+%5D=/', '=', http_build_query($params));
    $ch = curl_init($base . $path . ($qs ? "?$qs" : ''));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token", 'Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 400) throw new Exception("HTTP $code: $body");
    return json_decode($body, true, 512, JSON_BIGINT_AS_STRING);
}

$trips = traccar('/reports/trips', [
    'deviceId' => [12, 15],
    'from' => '2026-10-06T00:00:00Z',
    'to'   => '2026-10-07T00:00:00Z',
]);
```
</details>

---

## 2. Autenticación

### 2.1 Token Bearer (el método recomendado)

En **todas** las peticiones manda esta cabecera:

```
Authorization: Bearer <TOKEN>
```

- El token va asociado a un usuario de **solo lectura** que solo ve los camiones asignados.
- Puede tener fecha de caducidad. Cuando caduca, la API devuelve `401` y hay que pedir uno nuevo.
- Si se filtra, se puede revocar al momento sin afectar a nadie más.

### 2.2 Otros métodos (solo como referencia)

| Método | Cómo | Cuándo usarlo |
|---|---|---|
| Basic Auth | `Authorization: Basic base64(email:password)` | Pruebas rápidas. **No** en producción. |
| Cookie de sesión | `POST /api/session` con `email` y `password` (form-urlencoded) → cookie `JSESSIONID` | Lo usa la web de Traccar. Lo necesitas para el WebSocket ([sección 5](#5-tiempo-real-websocket-apisocket)). |
| Token → cookie | `GET /api/session?token=<TOKEN>` → cookie `JSESSIONID` | Para abrir el WebSocket usando el token |

### 2.3 Gestión del token (lo hace el administrador)

```bash
# Generar un token (con sesión iniciada como el usuario de la integración).
# "expiration" es opcional; sin ella el token no caduca.
curl -s -u "usuario@novare.es:CONTRASEÑA" -X POST "$TRACCAR_URL/session/token" \
  --data-urlencode "expiration=2027-10-01T00:00:00Z"
# → devuelve el token en texto plano

# Revocar un token
curl -s -u "usuario@novare.es:CONTRASEÑA" -X POST "$TRACCAR_URL/session/token/revoke" \
  --data-urlencode "token=EL_TOKEN_A_REVOCAR"
# → 204 No Content
```

---

## 3. Convenciones: fechas, unidades y parámetros

### 3.1 Fechas

- **Formato:** ISO 8601, por ejemplo `2026-10-06T00:00:00Z`. **Usa siempre UTC con `Z`.**
- Si mandas un desfase horario (`+02:00`), **codifica el `+` en la URL** (`%2B`). Si no, el servidor lo lee como un espacio y da error `400`. Lo más cómodo es usar `--data-urlencode` en curl, o `URLSearchParams` / `params=` en código.
- **España está en UTC+1 (invierno) o UTC+2 (verano).** "Hoy desde las 00:00 en Madrid" en verano es `…T22:00:00Z` del día anterior. Calcula los límites del día con una librería de zonas horarias (`Europe/Madrid`).
- Las fechas que devuelve la API también están en UTC.

En cada posición hay tres fechas:

| Campo | Significado | ¿Cuál usar? |
|---|---|---|
| `fixTime` | Momento en que el GPS calculó la posición | **Esta.** Es la "hora de la posición". |
| `deviceTime` | Hora del reloj del equipo | Casi igual que `fixTime` |
| `serverTime` | Momento en que llegó al servidor | Para detectar retrasos o datos almacenados que llegan tarde |

### 3.2 Unidades (¡cuidado!)

| Dato | Unidad en la API | Conversión habitual |
|---|---|---|
| `speed`, `maxSpeed`, `averageSpeed` | **nudos** | km/h = nudos × **1.852** |
| `distance`, `totalDistance` | **metros** | km = m / 1000 |
| `attributes.hours`, `engineHours` | **milisegundos** | horas = ms / 3 600 000 |
| `duration` (viajes, paradas) | **milisegundos** | minutos = ms / 60 000 |
| `altitude`, `accuracy` | metros | — |
| `course` | grados (0 = norte, 90 = este) | — |
| `spentFuel` | litros | — |
| `power`, `battery` | voltios | — |
| Tiempos del tacógrafo (`io56`, `io105xx`) | **minutos** | ver [sección 6](#6-datos-del-tacógrafo-teltonika-fmc650) |

> La especificación oficial dice que `duration` está "en segundos", pero el
> servidor la devuelve en **milisegundos** (la web de Traccar la trata así).
> Compruébalo con un viaje conocido: 1 hora = `3600000`.

### 3.3 Parámetros repetibles

`deviceId`, `groupId` e `id` se repiten para pedir varios a la vez:

```
/api/reports/trips?deviceId=12&deviceId=15&from=…&to=…
```

**No** uses `deviceId=12,15` ni `deviceId[]=12`.

### 3.4 Formato de respuesta

- Por defecto es JSON. En los `/reports/*` manda **siempre** `Accept: application/json`. Sin esa cabecera, algunos clientes reciben otro formato.
- Las listas son arrays JSON (`[...]`). Una lista vacía (`[]`) **no es un error**: simplemente no hay datos en ese periodo.

### 3.5 Paginación (solo en listas como `/devices`, `/drivers`, `/geofences`, `/groups`)

`limit=50&offset=0` y luego `offset=50`… Para filtrar por texto: `keyword=LYN`.
Los informes y `/positions` **no** se paginan: limita con el rango de fechas.

---

## 4. Endpoints

Todos los ejemplos dan por hecho las cabeceras `Authorization: Bearer $TRACCAR_TOKEN`
y `Accept: application/json`. En curl, para abreviar:

```bash
alias tc='curl -s -G -H "Authorization: Bearer $TRACCAR_TOKEN" -H "Accept: application/json"'
```

Los valores de las respuestas son **ilustrativos**. La estructura es la real.

---

### 4.1 Camiones — `GET /api/devices`

**Qué hace:** devuelve los camiones (dispositivos GPS) a los que tienes acceso.

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | int (repetible) | no | Solo esos camiones |
| `uniqueId` | string (repetible) | no | Buscar por IMEI del equipo |
| `keyword` | string | no | Busca en nombre, IMEI, teléfono, modelo y contacto |
| `excludeAttributes` | bool | no | `true` = no incluir `attributes` (respuesta más ligera) |
| `limit`, `offset` | int | no | Paginación |

```bash
tc "$TRACCAR_URL/devices"
tc "$TRACCAR_URL/devices" --data-urlencode "id=12"
tc "$TRACCAR_URL/devices" --data-urlencode "keyword=6079"
```

**Respuesta:**

```json
[
  {
    "id": 12,
    "name": "6079LYN",
    "uniqueId": "350612345678901",
    "status": "online",
    "disabled": false,
    "lastUpdate": "2026-10-07T07:58:12Z",
    "positionId": 9876543,
    "groupId": 3,
    "phone": null,
    "model": "FMC650",
    "contact": null,
    "category": "truck",
    "attributes": {}
  }
]
```

| Campo | Significado |
|---|---|
| `id` | **Identificador interno.** Es el que se usa como `deviceId` en el resto de endpoints. |
| `name` | Nombre visible (normalmente la matrícula) |
| `uniqueId` | IMEI del equipo GPS |
| `status` | `online` (conectado ahora), `offline` (sin conexión) o `unknown` |
| `lastUpdate` | Última vez que el equipo envió algo |
| `positionId` | ID de su última posición |
| `groupId` | Grupo al que pertenece (ver 4.4) |

---

### 4.2 Posiciones — `GET /api/positions`

**Qué hace:** devuelve posiciones GPS **con todos los datos del camión**, también los del tacógrafo (en `attributes`). Es el endpoint más importante.

Tiene tres modos:

| Modo | Llamada | Devuelve |
|---|---|---|
| **Última posición de todos** | `GET /positions` (sin parámetros) | 1 posición por camión, la más reciente |
| **Histórico de un camión** | `GET /positions?deviceId=12&from=…&to=…` | Todas las posiciones del periodo, de la más antigua a la más reciente |
| **Posiciones concretas** | `GET /positions?id=9876543&id=9876544` | Esas posiciones |

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `deviceId` | int | no | Si lo pones, **también** son obligatorios `from` y `to` |
| `from`, `to` | ISO 8601 | con `deviceId` | Rango de fechas |
| `id` | int (repetible) | no | IDs concretos (no necesita fechas) |

```bash
# Última posición de cada camión
tc "$TRACCAR_URL/positions"

# Histórico de un día
tc "$TRACCAR_URL/positions" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z"
```

**Respuesta (una posición de un camión con tacógrafo):**

```json
[
  {
    "id": 9876543,
    "deviceId": 12,
    "protocol": "teltonika",
    "serverTime": "2026-10-07T07:58:13Z",
    "deviceTime": "2026-10-07T07:58:10Z",
    "fixTime":    "2026-10-07T07:58:10Z",
    "valid": true,
    "latitude": 40.416775,
    "longitude": -3.703790,
    "altitude": 655.0,
    "speed": 46.4,
    "course": 182.0,
    "address": null,
    "accuracy": 0.0,
    "network": null,
    "geofenceIds": [5],
    "attributes": {
      "priority": 0,
      "sat": 14,
      "event": 0,
      "ignition": true,
      "motion": true,
      "rssi": 4,
      "hdop": 0.7,
      "power": 27.84,
      "battery": 4.05,
      "io184": 3,
      "io187": 1,
      "io56": 125,
      "io195": 3544392854706862128,
      "io196": 3472328296227680305,
      "io10528": 45,
      "io10530": 1820,
      "io10532": 145,
      "io10534": 900,
      "distance": 25.3,
      "totalDistance": 123456789.0,
      "hours": 15839000000
    }
  }
]
```

**Campos principales:**

| Campo | Significado |
|---|---|
| `latitude`, `longitude` | Coordenadas en grados decimales (WGS84) |
| `speed` | Velocidad en **nudos** (× 1.852 = km/h). En el ejemplo, 46.4 kn ≈ 86 km/h |
| `course` | Rumbo en grados |
| `valid` | `false` = el GPS no tenía cobertura buena (posición poco fiable) |
| `address` | Normalmente `null`. Usa `/server/geocode` (4.16) para obtener la dirección |
| `geofenceIds` | Geocercas en las que está el camión en ese momento |
| `attributes.ignition` | Contacto puesto (`true`) o quitado (`false`) |
| `attributes.motion` | ⚠️ **No es fiable en estos equipos** (marca `true` con el camión parado). Usa `speed` o `io184` |
| `attributes.sat` | Número de satélites |
| `attributes.hdop` | Precisión GPS: ≤1 muy buena, ≤2 buena, ≤5 regular, >5 mala |
| `attributes.rssi` | Cobertura móvil, de 0 a 5 |
| `attributes.power` | Voltaje de la batería del camión (V) |
| `attributes.battery` | Voltaje de la batería interna del GPS (V) |
| `attributes.distance` | Metros recorridos desde la posición anterior |
| `attributes.totalDistance` | Odómetro acumulado en **metros** |
| `attributes.hours` | Horas de motor acumuladas, en **milisegundos** |
| `attributes.io*` | Datos del tacógrafo y CAN → ver [sección 6](#6-datos-del-tacógrafo-teltonika-fmc650) |

> **Atributos variables:** cada camión o firmware puede mandar atributos distintos,
> y no todos llegan en todas las posiciones. Trata **todos** los `attributes` como
> opcionales.

> **Volumen:** un camión manda una posición cada pocos segundos o minutos. Un día
> pueden ser miles. Pide rangos de **1 día como máximo** por petición y camión. Si
> solo quieres pintar el recorrido, usa `/reports/combined` (4.12), que devuelve
> la ruta simplificada.

> **Tiempo real:** **no** consultes `/positions` cada pocos segundos. Usa el
> WebSocket ([sección 5](#5-tiempo-real-websocket-apisocket)) o, como mucho,
> consulta cada 30–60 s.

---

### 4.3 Conductores — `GET /api/drivers`

**Qué hace:** devuelve los conductores dados de alta, con su número de tarjeta de tacógrafo.

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `deviceId` | int | no | Conductores vinculados a ese camión |
| `groupId` | int | no | Conductores vinculados a ese grupo |
| `keyword`, `limit`, `offset` | | no | Búsqueda y paginación |

```bash
tc "$TRACCAR_URL/drivers"
```

```json
[
  { "id": 4, "name": "Juan Pérez García", "uniqueId": "E12345678901234", "attributes": {} }
]
```

`uniqueId` es el **número de tarjeta de conductor**. Se cruza con la tarjeta que
lleva insertada el camión (`io195` + `io196`, ver [6.3](#63-identificar-al-conductor-io195--io196)).
Si una tarjeta no está dada de alta, no tendrás su nombre, solo el número.

---

### 4.4 Grupos — `GET /api/groups`

**Qué hace:** devuelve los grupos de camiones (por ejemplo, por delegación o cliente).
Sirve para pedir informes de un grupo entero con `groupId=` en lugar de listar cada `deviceId`.

```bash
tc "$TRACCAR_URL/groups"
```

```json
[ { "id": 3, "name": "Madrid", "groupId": 0, "attributes": {} } ]
```

`groupId` dentro de un grupo indica su grupo padre (0 = ninguno).

---

### 4.5 Geocercas — `GET /api/geofences`

**Qué hace:** devuelve las zonas definidas en el mapa (naves, clientes, puertos…).

| Parámetro | Descripción |
|---|---|
| `deviceId` / `groupId` | Solo las vinculadas a ese camión o grupo |

```bash
tc "$TRACCAR_URL/geofences"
```

```json
[
  {
    "id": 5,
    "name": "Nave Coslada",
    "description": "Base principal",
    "area": "CIRCLE (40.4237 -3.5613, 250)",
    "calendarId": 0,
    "attributes": {}
  }
]
```

`area` está en formato WKT con orden **latitud longitud**, al revés que el WKT estándar:
- Círculo: `CIRCLE (lat lon, radio_en_metros)`
- Polígono: `POLYGON ((lat1 lon1, lat2 lon2, …, lat1 lon1))`
- Línea: `LINESTRING (lat1 lon1, lat2 lon2, …)`

---

### 4.6 Informe de ruta — `GET /api/reports/route`

**Qué hace:** devuelve todas las posiciones de uno o varios camiones en un periodo.
Es como `/positions` con histórico, pero acepta **varios camiones y grupos**.

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `deviceId` | int (repetible) | uno de los dos | Camiones |
| `groupId` | int (repetible) | uno de los dos | Grupos |
| `from`, `to` | ISO 8601 | **sí** | Periodo |

```bash
tc "$TRACCAR_URL/reports/route" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z"
```

**Respuesta:** un array de objetos `Position`, con el mismo formato que en 4.2.

---

### 4.7 Informe de viajes — `GET /api/reports/trips`

**Qué hace:** divide la actividad en **viajes**: desde que el camión arranca hasta
que se para un tiempo. Para cada viaje da origen, destino, distancia, duración y
velocidades. Es lo ideal para un listado de "rutas del día".

Parámetros: los mismos que en 4.6 (`deviceId`/`groupId` + `from` + `to`).

```bash
tc "$TRACCAR_URL/reports/trips" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z"
```

```json
[
  {
    "deviceId": 12,
    "deviceName": "6079LYN",
    "maxSpeed": 49.1,
    "averageSpeed": 38.7,
    "distance": 187340.5,
    "spentFuel": 0.0,
    "duration": 9120000,
    "startTime": "2026-10-06T05:12:40Z",
    "startAddress": null,
    "startLat": 40.4237,
    "startLon": -3.5613,
    "startPositionId": 9870001,
    "endTime": "2026-10-06T07:44:40Z",
    "endAddress": null,
    "endLat": 39.4699,
    "endLon": -0.3763,
    "endPositionId": 9871234,
    "driverUniqueId": null,
    "driverName": null
  }
]
```

| Campo | Significado |
|---|---|
| `distance` | Metros recorridos en el viaje |
| `duration` | Duración en **ms** (9120000 = 2 h 32 min) |
| `maxSpeed`, `averageSpeed` | En nudos |
| `startLat/Lon`, `endLat/Lon` | Origen y destino |
| `startAddress`, `endAddress` | Solo vienen rellenos si el servidor tiene la geocodificación activada. Si son `null`, usa 4.16 |
| `spentFuel` | Litros. Si es `0`, el equipo no manda datos de combustible |
| `driverUniqueId`, `driverName` | Suelen venir vacíos. El conductor real se obtiene del tacógrafo (sección 6) |

---

### 4.8 Informe de paradas — `GET /api/reports/stops`

**Qué hace:** devuelve los periodos en los que el camión estuvo **parado**: dónde,
desde cuándo, hasta cuándo y cuánto tiempo.

Parámetros: los mismos que en 4.6.

```bash
tc "$TRACCAR_URL/reports/stops" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z"
```

```json
[
  {
    "deviceId": 12,
    "deviceName": "6079LYN",
    "duration": 2700000,
    "startTime": "2026-10-06T07:44:40Z",
    "endTime": "2026-10-06T08:29:40Z",
    "address": null,
    "latitude": 39.4699,
    "longitude": -0.3763,
    "positionId": 9871234,
    "spentFuel": 0.0,
    "engineHours": 0
  }
]
```

`duration` en ms (2700000 = 45 min). `engineHours` son ms con el motor encendido durante la parada (ralentí).

> La especificación oficial llama `lat` y `lon` a las coordenadas, pero el servidor
> actual devuelve `latitude` y `longitude`. Lee las dos variantes por si acaso.

---

### 4.9 Informe resumen — `GET /api/reports/summary`

**Qué hace:** devuelve los **totales** del periodo por camión: km, velocidad media y
máxima, horas de motor y combustible. Ideal para cuadros de mando.

Parámetros: los mismos que en 4.6, más `daily=true` (opcional) para recibir **una fila por día**.

```bash
tc "$TRACCAR_URL/reports/summary" \
  --data-urlencode "groupId=3" \
  --data-urlencode "from=2026-09-29T00:00:00Z" \
  --data-urlencode "to=2026-10-06T00:00:00Z" \
  --data-urlencode "daily=true"
```

```json
[
  {
    "deviceId": 12,
    "deviceName": "6079LYN",
    "startTime": "2026-09-29T00:00:00Z",
    "endTime": "2026-09-30T00:00:00Z",
    "distance": 612450.0,
    "averageSpeed": 37.2,
    "maxSpeed": 49.6,
    "engineHours": 34200000,
    "startOdometer": 122844339.0,
    "endOdometer": 123456789.0,
    "spentFuel": 0.0
  }
]
```

`distance` en metros (612 km). `engineHours` en ms (9 h 30 min). `startOdometer`/`endOdometer` en metros.

---

### 4.10 Informe de eventos — `GET /api/reports/events`

**Qué hace:** devuelve los **eventos** del periodo: encendido o apagado del motor,
exceso de velocidad, entrada o salida de geocercas, alarmas, conexión o desconexión…

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `deviceId` / `groupId` | int (repetible) | uno de los dos | |
| `from`, `to` | ISO 8601 | **sí** | |
| `type` | string (repetible) | no | Filtrar por tipo (tabla de abajo). Sin él, salen todos |

```bash
tc "$TRACCAR_URL/reports/events" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "type=geofenceEnter" \
  --data-urlencode "type=geofenceExit" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z"
```

```json
[
  {
    "id": 55501,
    "type": "geofenceEnter",
    "eventTime": "2026-10-06T16:02:11Z",
    "deviceId": 12,
    "positionId": 9874001,
    "geofenceId": 5,
    "maintenanceId": 0,
    "attributes": {}
  }
]
```

**Tipos de evento (`type`) más habituales:**

| `type` | Significado | Datos extra |
|---|---|---|
| `ignitionOn` / `ignitionOff` | Contacto puesto / quitado | — |
| `deviceMoving` / `deviceStopped` | Empieza a moverse / se para | — |
| `deviceOverspeed` | Exceso de velocidad | `attributes.speed`, `attributes.speedLimit` (nudos) |
| `geofenceEnter` / `geofenceExit` | Entra / sale de una geocerca | `geofenceId` |
| `deviceOnline` / `deviceOffline` / `deviceUnknown` | Cambio de conexión del equipo | — |
| `alarm` | Alarma del equipo | `attributes.alarm` (p. ej. `powerCut`, `sos`, `lowBattery`) |
| `driverChanged` | Cambio de conductor | `attributes.driverUniqueId` |
| `deviceFuelDrop` / `deviceFuelIncrease` | Bajada / subida brusca de combustible | — |
| `maintenance` | Toca mantenimiento | `maintenanceId` |
| `commandResult` | Respuesta a un comando | `attributes.result` |

Qué eventos aparecen depende de cómo esté configurado el servidor. Si un tipo no sale nunca, puede que no esté activado.

Para saber **dónde** ocurrió un evento, pide su posición: `GET /positions?id={positionId}`.

---

### 4.11 Informe de geocercas — `GET /api/reports/geofences`

**Qué hace:** devuelve los intervalos de **entrada y salida** de cada geocerca
(cuánto tiempo estuvo el camión dentro de cada zona).

| Parámetro | Descripción |
|---|---|
| `deviceId` / `groupId` | Uno de los dos, obligatorio |
| `geofenceId` | (repetible, opcional) Solo esas geocercas |
| `from`, `to` | Obligatorios |

```bash
tc "$TRACCAR_URL/reports/geofences" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "geofenceId=5" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z"
```

```json
[
  {
    "deviceId": 12,
    "deviceName": "6079LYN",
    "geofenceId": 5,
    "startTime": "2026-10-06T16:02:11Z",
    "endTime": "2026-10-06T18:40:03Z"
  }
]
```

---

### 4.12 Informe combinado — `GET /api/reports/combined`

**Qué hace:** en una sola llamada devuelve, por camión, la **ruta simplificada**
(para pintar la línea en un mapa), los **eventos** y las **posiciones** en las que
ocurrieron. Es lo más eficiente para una pantalla de "recorrido del día en el mapa".

Parámetros: los mismos que en 4.6.

```bash
tc "$TRACCAR_URL/reports/combined" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z"
```

```json
[
  {
    "deviceId": 12,
    "route": [[-3.5613, 40.4237], [-3.5520, 40.4198], [-0.3763, 39.4699]],
    "events": [ { "id": 55501, "type": "ignitionOn", "eventTime": "…", "positionId": 9870001 } ],
    "positions": [ { "id": 9870001, "latitude": 40.4237, "longitude": -3.5613, "…": "…" } ]
  }
]
```

⚠️ En `route` cada punto es `[longitud, latitud]`, el orden de GeoJSON (Mapbox, MapLibre, Leaflet con GeoJSON). Es al revés que en las posiciones.

---

### 4.13 Exportar a Excel

Cada informe tiene una versión que **descarga un .xlsx**, añadiendo `/xlsx` a la ruta:

| Endpoint | Contenido |
|---|---|
| `GET /api/reports/route/xlsx` | Posiciones |
| `GET /api/reports/trips/xlsx` | Viajes |
| `GET /api/reports/stops/xlsx` | Paradas |
| `GET /api/reports/summary/xlsx` | Resumen (acepta `daily=true`) |
| `GET /api/reports/events/xlsx` | Eventos |
| `GET /api/reports/devices/xlsx` | Listado de camiones (sin fechas) |

Parámetros: los mismos que la versión JSON.

```bash
curl -s -G -H "Authorization: Bearer $TRACCAR_TOKEN" "$TRACCAR_URL/reports/trips/xlsx" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z" \
  -o viajes.xlsx
```

Si cambias `/xlsx` por `/mail`, el informe se **envía por email** al usuario del token (respuesta `204`).

---

### 4.14 Exportar posiciones a CSV / GPX / KML

| Endpoint | Formato |
|---|---|
| `GET /api/positions/csv?deviceId=…&from=…&to=…` | CSV (acepta `geofenceId` para filtrar) |
| `GET /api/positions/gpx?deviceId=…&from=…&to=…` | GPX (Garmin, Strava…) |
| `GET /api/positions/kml?deviceId=…&from=…&to=…` | KML (Google Earth) |

En los tres, `deviceId`, `from` y `to` son obligatorios.

```bash
curl -s -G -H "Authorization: Bearer $TRACCAR_TOKEN" "$TRACCAR_URL/positions/gpx" \
  --data-urlencode "deviceId=12" \
  --data-urlencode "from=2026-10-06T00:00:00Z" \
  --data-urlencode "to=2026-10-07T00:00:00Z" -o ruta.gpx
```

---

### 4.15 Un evento concreto — `GET /api/events/{id}`

**Qué hace:** devuelve un evento por su ID. Es útil cuando te llega un evento por WebSocket y quieres releerlo.

```bash
tc "$TRACCAR_URL/events/55501"
```

Respuesta: un objeto `Event` con el formato de 4.10.

---

### 4.16 Dirección a partir de coordenadas — `GET /api/server/geocode`

**Qué hace:** convierte unas coordenadas en una dirección postal (geocodificación inversa).
Devuelve **texto plano**, no JSON.

| Parámetro | Obligatorio |
|---|---|
| `latitude`, `longitude` | **sí** |

```bash
curl -s -G -H "Authorization: Bearer $TRACCAR_TOKEN" "$TRACCAR_URL/server/geocode" \
  --data-urlencode "latitude=40.416775" --data-urlencode "longitude=-3.703790"
# → Puerta del Sol, 28013 Madrid, España
```

> Usa un proveedor externo con límites de uso. **Guarda en caché** el resultado
> (por ejemplo, con las coordenadas redondeadas a 4 decimales, unos 11 m) y no lo
> llames por cada posición, solo para lo que muestres al usuario.

---

### 4.17 Información del servidor y salud

```bash
# Configuración pública y versión del servidor
tc "$TRACCAR_URL/server"
# → { "id": 1, "version": "6.x", "readonly": false, "map": "...", "attributes": {...}, ... }

# Comprobación de que el servidor está vivo (para monitorización). Devuelve "OK".
curl -s "$TRACCAR_URL/health"
```

---

### 4.18 Sesión actual — `GET /api/session`

**Qué hace:** devuelve el usuario asociado al token. Sirve para comprobar que el token es válido.

```bash
tc "$TRACCAR_URL/session"
```

```json
{
  "id": 7,
  "name": "Integración Novare",
  "email": "api-novare@…",
  "readonly": true,
  "administrator": false,
  "expirationTime": null,
  "attributes": {}
}
```

`404` o `401` = token no válido o caducado.

---

### Endpoints que **no** necesitas

La API tiene también endpoints para **crear, modificar o borrar** (camiones,
usuarios, geocercas, comandos al equipo…). El usuario de la integración es de
**solo lectura**, así que te devolverán error. Si alguna vez necesitas escribir
algo, pídelo antes.

---

## 5. Tiempo real: WebSocket (`/api/socket`)

Para un mapa en vivo, en lugar de consultar `/positions` cada X segundos, abre un
WebSocket y el servidor te **empuja** cada novedad.

**Conexión** (el WebSocket necesita la cookie de sesión, no acepta la cabecera Bearer):

1. `GET /api/session?token=<TOKEN>` → la respuesta trae `Set-Cookie: JSESSIONID=…`.
2. Abre `wss://TU-SERVIDOR/api/socket` enviando esa cookie.

**Mensajes que llegan** (JSON). Cada uno trae una o varias de estas claves:

```json
{ "positions": [ { "id": 9876544, "deviceId": 12, "latitude": 40.41, "...": "..." } ] }
{ "devices":   [ { "id": 12, "status": "online", "lastUpdate": "…", "...": "..." } ] }
{ "events":    [ { "id": 55502, "type": "ignitionOff", "deviceId": 12, "...": "..." } ] }
{}
```

- Nada más conectar recibes el estado actual (última posición de cada camión).
- `{}` es un *keep-alive*: ignóralo.
- Si se cae la conexión, **reconecta con espera progresiva** (1 s, 2 s, 5 s, 10 s…). Si la reconexión falla con `401`, repite el paso 1.

**Ejemplo en Node.js (backend)** con el paquete `ws`:

```js
import WebSocket from 'ws';

const HOST = 'TU-SERVIDOR';
const TOKEN = process.env.TRACCAR_TOKEN;

async function connect() {
  const res = await fetch(`https://${HOST}/api/session?token=${encodeURIComponent(TOKEN)}`);
  if (!res.ok) throw new Error(`Token no válido: ${res.status}`);
  const cookie = res.headers.get('set-cookie').split(';')[0]; // "JSESSIONID=..."

  const ws = new WebSocket(`wss://${HOST}/api/socket`, { headers: { Cookie: cookie } });
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    msg.positions?.forEach((p) => console.log('posición', p.deviceId, p.latitude, p.longitude));
    msg.devices?.forEach((d) => console.log('estado', d.id, d.status));
    msg.events?.forEach((e) => console.log('evento', e.deviceId, e.type));
  });
  ws.on('close', () => setTimeout(connect, 5000));
  ws.on('error', () => ws.close());
}
connect();
```

> **Arquitectura recomendada para una web:** que **vuestro backend** mantenga el
> WebSocket con Traccar y reenvíe los datos a vuestros navegadores (por vuestro
> propio WebSocket o SSE). Así el token nunca llega al navegador.

---

## 6. Datos del tacógrafo (Teltonika FMC650)

Los camiones llevan un equipo **Teltonika FMC650** conectado al **tacógrafo digital**.
Sus datos llegan en `attributes` de cada posición como claves `ioNNN`, donde NNN es el
número de AVL ID de Teltonika.

Este mapeo está **validado con datos reales** (camión 6079LYN) y es el que usa nuestra
propia web.

### 6.1 Tabla de atributos

| Atributo | Nombre Teltonika | Valores / unidad | Uso |
|---|---|---|---|
| `io184` | Driver 1 Working State | `0` Descanso · `1` Disponible · `2` Trabajo · `3` Conduciendo | **Actividad actual del conductor** |
| `io187` | Driver 1 Card Presence | `0` = sin tarjeta · `>0` = tarjeta insertada | ¿Hay conductor identificado? |
| `io56` | Driver 1 Continuous Driving Time | **minutos** | Conducción continua sin pausa |
| `io195` | Driver 1 ID (MSB) | entero de 64 bits | 1ª mitad del nº de tarjeta (ver 6.3) |
| `io196` | Driver 1 ID (LSB) | entero de 64 bits | 2ª mitad del nº de tarjeta (ver 6.3) |
| `io10532` | Remaining Time Until Next Break or Rest | **minutos** | Tiempo hasta la próxima pausa obligatoria |
| `io10528` | Duration of Next Break / Rest | **minutos** | Cuánto debe durar la próxima pausa (normalmente 45) |
| `io10530` | Current weekly driving time | **minutos** | Conducción acumulada en la semana |
| `io10534` | Remaining driving time of current week | **minutos** | Conducción que le queda en la semana |

- **Si `io184` no viene** (`undefined`, `null` o `""`), el camión no tiene tacógrafo conectado o no hay tarjeta. **No lo trates como `0`**: `0` significa "Descansando".
- Los valores pueden llegar como número o como texto. Conviértelos siempre con `Number(...)`.
- No todas las posiciones traen todos los `io`. Usa el último valor conocido.

### 6.2 ¿Está circulando el camión?

| Pregunta | Cómo saberlo | ❌ No uses |
|---|---|---|
| ¿Está conduciendo? | `io184 === 3` | `attributes.motion` (da `true` con el camión parado) |
| ¿Se está moviendo? | `speed > 0` | `io187` (es presencia de tarjeta, no movimiento) |
| ¿Motor encendido? | `attributes.ignition === true` | — |

Esta es la lógica de colores que usamos en nuestro mapa, por si queréis la misma:

| Estado | Condición | Marcador |
|---|---|---|
| Conduciendo | `io184 = 3` | Flecha azul girada según `course` |
| Trabajando | `io184 = 2` | Cuadrado naranja |
| Descanso / disponible | `io184 = 0` o `1` | Cuadrado verde |
| Sin datos | sin `io184` | Cuadrado gris |

### 6.3 Identificar al conductor (`io195` + `io196`)

El número de tarjeta (16 caracteres) llega partido en dos enteros de 64 bits. Cada
uno contiene **8 caracteres ASCII** en orden *big-endian*. Para decodificarlo:
pasa cada número a 8 bytes big-endian, quédate con los bytes imprimibles (32–126),
convierte a texto, concatena MSB + LSB y quita los espacios.

El resultado se compara con `uniqueId` de `/api/drivers` para obtener el nombre.

> ⚠️ **Precisión numérica en JavaScript:** estos números son mayores que 2^53.
> `JSON.parse` / `res.json()` **los redondean y se corrompen los últimos
> caracteres**. En JS, parsea la respuesta con un parser que respete los
> enteros grandes (por ejemplo `json-bigint`, o `JSON.parse` con `reviver` y
> `context.source` en Node 21+). En Python y en PHP (con `JSON_BIGINT_AS_STRING`)
> no hay problema.

**Python:**

```python
def decode_driver_id(msb, lsb):
    if msb is None and lsb is None:
        return None
    def to_ascii(n):
        if n is None:
            return ""
        b = int(n).to_bytes(8, "big", signed=int(n) < 0)
        return "".join(chr(c) for c in b if 32 <= c < 127)
    card = (to_ascii(msb) + to_ascii(lsb)).strip()
    return card or None

attrs = position["attributes"]
card = decode_driver_id(attrs.get("io195"), attrs.get("io196"))
drivers = {d["uniqueId"]: d for d in traccar("/drivers")}
nombre = drivers.get(card, {}).get("name", card)  # si no está dado de alta, el nº de tarjeta
```

**JavaScript (con el valor ya leído como string o BigInt, sin pérdida):**

```js
import JSONbig from 'json-bigint';
const parse = JSONbig({ storeAsString: true }).parse;

function decodeDriverId(msb, lsb) {
  if (msb == null && lsb == null) return null;
  const toAscii = (n) => {
    if (n == null) return '';
    let v = BigInt.asUintN(64, BigInt(n)), s = '';
    for (let i = 0; i < 8; i++) {
      const c = Number(v & 0xffn); v >>= 8n;
      if (c >= 32 && c < 127) s = String.fromCharCode(c) + s;
    }
    return s;
  };
  return (toAscii(msb) + toAscii(lsb)).trim() || null;
}

const positions = parse(await (await fetch(url, { headers })).text());
const card = decodeDriverId(positions[0].attributes.io195, positions[0].attributes.io196);
```

### 6.4 Alertas de conducción (las que usamos en nuestra web)

| Condición | Nivel | Mensaje |
|---|---|---|
| `io10532 <= 0` | 🔴 | Debe hacer la pausa ya |
| `0 < io10532 < 60` | 🟠 | Menos de 1 h hasta la pausa |
| `io56 > 270` (4 h 30 min) | 🔴 | Conducción continua superada |
| `io56 > 240` (4 h) | 🟠 | Pausa pronto |

### 6.5 Tiempos de conducción del día o de la semana

El tacógrafo no manda un total "conducido hoy" fiable, pero se calcula fácilmente
con el histórico de `io184`:

1. Pide `GET /positions?deviceId=…&from=<lunes 00:00 Europe/Madrid en UTC>&to=<ahora>`.
2. Ordena por `fixTime` y recorre las posiciones de dos en dos.
3. Suma `fixTime[i+1] − fixTime[i]` al estado `io184` de la posición `i`.
4. Si entre dos posiciones hay un hueco grande (> 15 min, equipo sin cobertura), no lo cuentes, o cuéntalo como "sin datos".

```python
from collections import defaultdict
from datetime import datetime

def tiempos_por_estado(positions, max_gap_s=900):
    t = defaultdict(float)  # segundos por estado
    pts = sorted(positions, key=lambda p: p["fixTime"])
    for a, b in zip(pts, pts[1:]):
        s = a["attributes"].get("io184")
        if s in (None, ""):
            continue
        dt = (datetime.fromisoformat(b["fixTime"].replace("Z", "+00:00"))
              - datetime.fromisoformat(a["fixTime"].replace("Z", "+00:00"))).total_seconds()
        if 0 < dt <= max_gap_s:
            t[int(s)] += dt
    nombres = {0: "descanso", 1: "disponible", 2: "trabajo", 3: "conduccion"}
    return {nombres.get(k, k): round(v / 60) for k, v in t.items()}  # minutos

# → {'conduccion': 412, 'trabajo': 63, 'descanso': 95, 'disponible': 10}
```

---

## 7. Recetas habituales

| Quiero… | Llamada(s) |
|---|---|
| Lista de camiones con su estado | `GET /devices` |
| Mapa con la posición actual de toda la flota | `GET /devices` + `GET /positions`, cruzando `position.deviceId` con `device.id`. En vivo: WebSocket (sección 5) |
| Ficha de un camión: dónde está, qué hace y quién lo conduce | `GET /positions` (filtra por `deviceId`) + `GET /drivers` + decodificar `io195/io196` (6.3) + `io184` (6.1) |
| Recorrido de un día en el mapa | `GET /reports/combined?deviceId=…&from=…&to=…` → pinta `route` |
| Listado de viajes del día | `GET /reports/trips` |
| Dónde paró y cuánto tiempo | `GET /reports/stops` |
| Km por camión y día (cuadro de mando) | `GET /reports/summary?groupId=…&daily=true` |
| Cuándo entró o salió de un cliente | `GET /reports/geofences` o `GET /reports/events?type=geofenceEnter&type=geofenceExit` |
| Excesos de velocidad | `GET /reports/events?type=deviceOverspeed` |
| Horas de conducción del conductor hoy o esta semana | Histórico de `/positions` + cálculo 6.5, o `io10530` para la semanal |
| Dirección legible de una posición | `GET /server/geocode?latitude=…&longitude=…` (con caché) |
| Descargar un Excel para el cliente | `GET /reports/{trips\|stops\|summary\|route\|events}/xlsx` |

**Ejemplo completo: "estado actual de la flota"** (Python):

```python
ACT = {0: "Descansando", 1: "Disponible", 2: "Trabajando", 3: "Conduciendo"}

devices   = {d["id"]: d for d in traccar("/devices")}
drivers   = {d["uniqueId"]: d["name"] for d in traccar("/drivers")}
positions = traccar("/positions")

for p in positions:
    d, a = devices.get(p["deviceId"]), p["attributes"]
    if not d:
        continue
    io184 = a.get("io184")
    card  = decode_driver_id(a.get("io195"), a.get("io196"))
    print({
        "camion":      d["name"],
        "conexion":    d["status"],
        "hora":        p["fixTime"],
        "lat":         p["latitude"],
        "lon":         p["longitude"],
        "kmh":         round(p["speed"] * 1.852),
        "contacto":    a.get("ignition"),
        "actividad":   ACT.get(int(io184)) if io184 not in (None, "") else "Sin tacógrafo/tarjeta",
        "conductor":   drivers.get(card, card),
        "min_hasta_pausa": a.get("io10532"),
        "odometro_km": round(a.get("totalDistance", 0) / 1000),
    })
```

---

## 8. Errores y solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `401 Unauthorized` | Falta la cabecera, el token está mal copiado o ha caducado | Comprueba `Authorization: Bearer <token>` (con espacio). Prueba `GET /session`. Pide un token nuevo si ha caducado |
| `400 Bad Request` en informes | Falta `from`/`to`, o no hay ningún `deviceId`/`groupId` | Los informes exigen fechas **y** al menos un camión o grupo |
| `400` con fechas que parecen bien | El `+` del desfase horario no está codificado | Usa UTC con `Z`, o codifica `+` como `%2B` |
| `400` en `/positions?deviceId=…` | Falta `from`/`to` | Con `deviceId` las fechas son obligatorias |
| `403` o `400` "Device access denied" | Ese camión no está asignado al usuario del token | Pide que te lo asignen |
| `[]` (lista vacía) | No hay datos en ese periodo, o el camión no estaba emitiendo | No es un error. Amplía el rango o revisa `device.lastUpdate` |
| Respuesta en Excel o binario en vez de JSON | Falta `Accept: application/json` en `/reports/*` | Añade la cabecera |
| Velocidades raras (muy bajas) | Están en nudos | × 1.852 |
| Duraciones enormes | Están en milisegundos | ÷ 60000 = minutos |
| Nº de tarjeta con caracteres incorrectos al final | Pérdida de precisión de los enteros grandes en JS | Ver aviso de 6.3 (`json-bigint`) |
| `motion: true` con el camión parado | Comportamiento conocido de estos equipos | Usa `speed` o `io184` |
| Falta `io184` en un camión | Sin tacógrafo, sin tarjeta o sin datos CAN | Muéstralo como "Sin datos", no como "Descansando" |
| Petición de histórico muy lenta | Rango demasiado grande | Trocea por días |
| WebSocket se cierra al conectar | No se envió la cookie `JSESSIONID` | Haz antes `GET /session?token=…` y reenvía la cookie |
| `GET /health` no responde | El servidor está caído | Avisa al administrador |

---

## 9. Instrucciones para asistentes de IA

> **Esta sección es para el asistente de IA (Claude, ChatGPT, Copilot…) del
> desarrollador.** Si eres una persona, puedes saltártela.

Estás ayudando a integrar una aplicación con la **API REST de un servidor Traccar**
(plataforma open-source de seguimiento GPS, versión 6.x) que gestiona una flota de
camiones con equipos **Teltonika FMC650** conectados al tacógrafo digital.
Este documento es la fuente de verdad. Además:

**Contexto fijo:**
- URL base: `https://TU-SERVIDOR/api` (la proporciona el usuario; nunca la inventes).
- Autenticación: cabecera `Authorization: Bearer <token>`. El token es de un usuario **de solo lectura**. No sugieras endpoints POST/PUT/DELETE salvo `/session/token*`, que es del administrador.
- Especificación OpenAPI oficial y completa: <https://raw.githubusercontent.com/traccar/traccar/master/openapi.yaml> (documentación navegable en <https://www.traccar.org/api-reference/>). Consúltala si necesitas un endpoint o campo que no esté aquí.

**Reglas que debes aplicar siempre:**
1. Fechas en ISO 8601 UTC con `Z`. Calcula los límites de día y semana en `Europe/Madrid` y conviértelos a UTC.
2. `speed` está en nudos (× 1.852 = km/h). Distancias en metros. `hours`, `engineHours` y `duration` en **milisegundos**.
3. Parámetros repetibles: `deviceId=1&deviceId=2`, nunca `1,2` ni `deviceId[]`.
4. En `/reports/*` envía siempre `Accept: application/json`. Al menos un `deviceId` o `groupId`, y `from` + `to` obligatorios.
5. `/positions` sin parámetros = última posición de cada camión. Con `deviceId` exige `from` y `to`.
6. Todos los `attributes` son opcionales. Nunca des por hecho que existen.
7. Actividad del conductor = `attributes.io184` (0 Descanso, 1 Disponible, 2 Trabajo, 3 Conduciendo). Si falta, es "sin datos", **no** 0. **Nunca** uses `attributes.motion` para saber si se mueve: usa `speed > 0` o `io184 == 3`.
8. Tarjeta del conductor = decodificar `io195` (MSB) + `io196` (LSB) como 8+8 bytes ASCII big-endian (código en 6.3) y cruzar con `/drivers[].uniqueId`. En JavaScript, parsea con soporte de enteros grandes (`json-bigint`), porque superan 2^53.
9. Tiempos del tacógrafo (`io56`, `io10528`, `io10530`, `io10532`, `io10534`) en **minutos**.
10. El token va **solo en el backend**. Para tiempo real, el backend abre el WebSocket `/api/socket` (cookie `JSESSIONID` obtenida con `GET /api/session?token=…`) y reenvía los datos al frontend.
11. No hagas polling agresivo. Usa el WebSocket, o un intervalo de 30 s o más. Trocea los históricos por días. Cachea `/server/geocode`.
12. En `/reports/combined`, `route` es `[lon, lat]`. En las geocercas, el WKT es `lat lon`.
13. Si un campo de la respuesta real no coincide con este documento (por ejemplo, `lat`/`lon` frente a `latitude`/`longitude` en las paradas), haz que el código acepte las dos variantes y avisa al desarrollador.

**Para depurar:** primero `GET /session` (¿token válido?), luego `GET /devices` (¿qué camiones ve?) y después la llamada concreta con `curl -v`. La tabla de la [sección 8](#8-errores-y-solución-de-problemas) cubre los errores habituales.

**Escala al humano** (David, responsable del servidor) solo si: hace falta un token nuevo o con otros permisos; falta un camión o conductor en `/devices` o `/drivers`; `/health` no responde; o un atributo `io*` da valores que no tienen sentido.

---

## 10. Referencias

- Especificación OpenAPI oficial (YAML): <https://raw.githubusercontent.com/traccar/traccar/master/openapi.yaml>
- Referencia de la API navegable: <https://www.traccar.org/api-reference/>
- Documentación general de la API de Traccar (WebSocket, autenticación): <https://www.traccar.org/traccar-api/>
- Lista de AVL IDs de Teltonika FMC650: <https://wiki.teltonika-gps.com/view/FMC650_Teltonika_Data_Sending_Parameters_ID>
- Normativa de tiempos de conducción y descanso (Reglamento CE 561/2006): <https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32006R0561>
