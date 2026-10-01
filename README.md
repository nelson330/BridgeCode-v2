# AulaPlay

Plataforma online de gamificación educativa con React, Hono, Bun y SQLite. El docente puede presentar una lección a su ritmo o abrir una partida en vivo para que el grupo responda desde sus dispositivos mediante PIN o QR.

## Empezar

Necesitas Bun 1.2 o posterior.

```bash
bun install
cp .env.example .env
bun run dev
```

Abre `http://localhost:5173`. El backend utiliza el puerto 3000 por defecto. Todas las funciones de cuentas, clases, tareas, foro, muro y administración están disponibles según el rol del usuario.

El docente de la demo se crea con usuario **`docente`** y contraseña **`docente123`**, tanto en desarrollo como en producción. Si esa cuenta ya existe, se conserva su contraseña actual.

En el primer arranque se imprimen **una sola vez** las credenciales de las cuentas nuevas. Las contraseñas de `webmaster` y los ocho estudiantes ficticios son aleatorias: guarda la tabla de la consola, porque se almacenan como hashes y no se pueden volver a consultar. Entre los estudiantes están `sofia.garcia` y `carlos.ruiz`.

## Probar la demo

1. Entra con usuario `docente` y contraseña `docente123` (o su contraseña actual si la cuenta ya existía).
2. Abre el grupo **Historia e Identidad Nacional** y la pestaña de lecciones.
3. Elige **Abrir lección** en una de las tres unidades.
4. Selecciona **Presentar** para navegar manualmente, revelar las respuestas y usar pantalla completa; o **Jugar en vivo** para crear una sala con PIN y QR.
5. En una partida, abre el QR o `/join` en dos dispositivos, escribe el PIN y un apodo, y comienza desde la pantalla del docente. Los participantes conectados y los resultados aparecen en vivo.

La demo incluye ocho estudiantes inscritos, tres lecciones publicadas, dieciocho ejercicios (cuatro de opción múltiple y dos de verdadero/falso por unidad), una tarea y un anuncio de bienvenida. Cada ejercicio dispone de explicación y 30 segundos para las partidas; en presentación el avance es manual y no hay puntuación. Recargar una presentación vuelve a la primera pregunta.

El contenido se basa en **INATEC, Manual del estudiante: Historia e Identidad Nacional, enero de 2025**. Las lecturas y explicaciones incluyen referencias a las páginas impresas del manual. Los resúmenes y ejercicios están incorporados en `scripts/demo/history-identity.ts`: no requieren claves de IA, descargar archivos ni tener el PDF al ejecutar la aplicación.

El PDF original de la raíz está excluido mediante `.gitignore` y `.dockerignore`. Se conserva como referencia local y no debe añadirse con `git add -f`.

## Inicialización y datos existentes

El arranque inicializa las tablas y ejecuta el seeder tanto en desarrollo como en producción. La inicialización es transaccional y guarda la marca `seed.history_identity.v1` en `app_settings` únicamente al completar todas las inserciones. Si falla, revierte los datos para permitir el siguiente intento.

En bases existentes agrega la demo una sola vez, conserva las cuentas iniciales, sus contraseñas y el contenido anterior. Los siguientes arranques no reponen ejercicios eliminados ni sobrescriben modificaciones. `bun run db:seed` utiliza la misma protección.

Las antiguas variables de modo ya no intervienen. Las API `/api/config` y `/api/health` no devuelven un campo `mode`; los modos de juego (trivia, carrera, equipos, batalla, ruleta y torneo) siguen disponibles. SQLite permanece como almacenamiento. Las columnas históricas relacionadas con el antiguo funcionamiento se conservan para mantener la compatibilidad de las bases existentes.

## Interfaz

Font Awesome gratuito y las fuentes están empaquetados con la aplicación. Se incluyen temas claro/oscuro, navegación móvil, estados de carga y error, notificaciones accesibles, confirmaciones de acciones, patrones de contraste y respeto por la preferencia de movimiento reducido. Las salas muestran el estado de conexión y desactivan sus acciones cuando se desconectan. El jugador puede volver a unirse mediante el PIN; una nueva incorporación empieza con una nueva puntuación.

## Comandos

| Comando | Uso |
| --- | --- |
| `bun run dev` | Backend y frontend de desarrollo |
| `bun run start` | Inicializar y ejecutar el servidor de producción |
| `bun run build` | Compilar frontend y backend |
| `bun run db:migrate` | Crear/actualizar tablas |
| `bun run db:seed` | Ejecutar la inicialización protegida |
| `bun run test` | Pruebas unitarias e integración con cobertura |
| `bun run typecheck` | Verificación TypeScript |
| `bun run lint` | Reglas y formato con Biome |
| `bun run test:production` | Verificar el bundle de producción sin PDF y sus credenciales iniciales |
| `bun run test:e2e` | Flujos de navegador y pruebas responsive |

Para las pruebas de navegador:

```bash
bun x --bun playwright install chromium
bun run build
bun run test:e2e
```

Playwright utiliza una base temporal independiente, el acceso docente por defecto y credenciales deterministas para las otras cuentas de pruebas. Cubre móvil, tablet, escritorio y proyector (320–1920 px), orientación horizontal, temas claro/oscuro y texto ampliado.

## Producción

```bash
bun run build
NODE_ENV=production bun run start
```

El backend sirve la SPA y la API desde el mismo origen, incluidas las rutas `/present/:classId/:lessonId`, `/host/:sessionId` y `/play/:pin`. Configura `BASE_URL` con tu URL pública y `COOKIE_SECURE=true` cuando uses HTTPS. El proyecto incluye Dockerfile y un Blueprint para Render con disco persistente de 1 GB.

Conserva `DATA_DIR` en almacenamiento persistente para mantener SQLite, las claves y los archivos subidos entre despliegues. Las credenciales iniciales se muestran en los logs del primer arranque.

## Licencia

El código se distribuye bajo [MIT](LICENSE). El manual autoriza reproducción y difusión para fines educativos o no comerciales con atribución de la fuente.
