# 🎮 AulaPlay

<div align="center">

![Bun](https://img.shields.io/badge/Bun-1.2+-000000?style=for-the-badge&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-v4-E36002?style=for-the-badge&logo=hono&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-SQLite-C5F74F?style=for-the-badge&logo=sqlite&logoColor=black)
![License MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

**Plataforma Open-Source de Gamificación Educativa & Mecánicas en Vivo para el Aula**

[Características](#-características-principales) • [Modos de Uso](#-modos-de-operación) • [Instalación](#-instalación-y-puesta-en-marcha) • [Arquitectura](#-arquitectura-y-stack-tecnológico) • [Comandos](#-scripts-disponibles)

---

</div>

## 📖 Acerca de AulaPlay

**AulaPlay** es una plataforma web *open-source*, interactiva y autoalojada (*self-hosted*) diseñada para transformar la experiencia en las aulas de clase. A través de dinámicas de juego en tiempo real (**ruletas interactivas, batallas 1v1, retos asíncronos y trivias**), una interfaz moderna y fluida (*React 19 + Tailwind v4 + Motion*), y un motor inteligente de generación de contenido educativo con IA multi-proveedor, AulaPlay convierte cualquier clase tradicional en un entorno participativo de alto impacto.

La plataforma opera bajo una arquitectura **dual-mode** sobre la misma base de código: puede funcionar de forma instantánea en un aula sin internet (Modo Local con proyector) o como un campus institucional completo con cuentas de estudiantes, tareas, muro social y foros colaborativos (Modo Hosteado).

---

## ⚡ Modos de Operación

AulaPlay se adapta dinámicamente al entorno mediante la variable `MODE=local` o `MODE=hosted`:

| Característica | 🏫 Modo Local (Datashow / Proyector) | 🌐 Modo Hosteado (Campus / Multidispositivo) |
|---|---|---|
| **Público Objetivo** | Clases presenciales con proyector / laptop única | Instituciones, academias y colegios en red |
| **Acceso Alumnos** | Código PIN temporal sin registro | Cuenta propia con usuario/contraseña o PIN |
| **Configuración** | Cero configuración; SQLite embebido | SQLite / Base centralizada con copias de respaldo |
| **Administración** | Docente único con acceso directo | Panel Webmaster global con auditoría y aprobaciones |
| **Muro Social** | Deshabilitado | Habilitado (posts, comentarios, reacciones y moderación) |
| **Foro Docente** | Deshabilitado | Habilitado (intercambio comunitario con 1-Click Import) |
| **Credenciales Base** | `docente` / `docente123` | Generadas de forma segura durante el seed inicial |

---

## 🎮 Características Principales

### 🎯 1. Gamificación en Tiempo Real
- **Ruleta de Selección Aleatoria:** Giro interactivo con desaceleración física y selección de alumnos en vivo.
- **Batallas y Retos (Síncronos y Asíncronos):** Soporte para duelos 1v1 en vivo o contra grabaciones de partidas pasadas (*Ghost Replays*).
- **Podio y Efectos de Audio Sintetizados:** Celebración en vivo con Web Audio API sintetizado sin dependencias externas pesadas y explosión de confeti.
- **Sistema de Puntuación Justo (1x Cap):** Reglas anti-abuso de puntos con bonificación por velocidad y racha de aciertos (*Streak Flame*).

### 🤖 2. Motor de IA Multi-Proveedor (Agnóstico)
- **Soporte Universal de Proveedores:** Compatible con OpenAI, Groq, NVIDIA NIM, OpenRouter, DeepSeek, Google Gemini y cualquier endpoint compatible con OpenAI.
- **Seguridad Criptográfica:** Claves API de docentes cifradas en reposo con **AES-256-GCM**.
- **Generación Flexible de Ejercicios:** Preguntas de opción múltiple, verdadero/falso, completar espacios, ordenar secuencias y preguntas abiertas.
- **Protección Anti-SSRF:** Validación estricta que bloquea rangos de red locales, privadas y metadatos de nube (`169.254.169.254`, etc.).

### 📚 3. Gestión Pedagógica Integral
- **Constructor Manual de Ejercicios:** Permite crear y ajustar contenido sin depender de servicios de IA.
- **Tareas y Lecturas Asíncronas:** Asignación de lecturas interactivas, cuestionarios y foros de discusión guiados.
- **Cuaderno de Calificaciones Granular:** Monitoreo del progreso, tasas de acierto y estadísticas por estudiante y grupo.

### 💬 4. Muro Social & Comunidad
- **Muro de Clase:** Publicaciones, comentarios fijados y reacciones con moderación completa por parte del docente.
- **Foro Comunitario de Lecciones:** Publicación de paquetes de lecciones con sistema de valoraciones (rating 1-5 estrellas) e importación en 1 clic (*1-Click Import*).

---

## 🛠️ Arquitectura y Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React 19 SPA)                  │
│       Vite • Tailwind CSS v4 • Radix UI • Motion • i18n     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / WebSocket
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend API (Hono.js)                    │
│   Rate Limiting • Argon2 Auth • Session Cookies • Anti-SSRF │
├─────────────────────────────────────────────────────────────┤
│                    Capa de Servicios & Apps                 │
│  Auth • Clases • Lecciones • Juegos (WS) • IA Engine • Muro │
├─────────────────────────────────────────────────────────────┤
│                    Persistencia (Drizzle ORM)               │
│                  SQLite Embebido (WAL Mode)                 │
└─────────────────────────────────────────────────────────────┘
```

- **Runtime:** [Bun](https://bun.sh/) (alta velocidad y compatibilidad nativa con TypeScript).
- **Backend:** [Hono v4](https://hono.dev/) con arquitectura modular por sub-aplicaciones (`src/apps/*`).
- **Base de Datos:** SQLite nativo con [Drizzle ORM](https://orm.drizzle.team/).
- **Frontend:** [React 19](https://react.dev/) + [Vite](https://vite.dev/).
- **Estilos & UI:** [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/).
- **Animaciones & Visuales:** [Motion](https://motion.dev/) y [Canvas-Confetti](https://www.npmjs.com/package/canvas-confetti).
- **Internacionalización:** [i18next](https://www.i18next.com/) con soporte nativo para Español e Inglés.

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- Tener instalado [Bun](https://bun.sh/) (v1.2 o superior):
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

### 1. Clonar e Instalar Dependencias
```bash
# Instalar dependencias del proyecto
bun install
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo para crear tu entorno local:
```bash
cp .env.example .env
```

> **Nota:** En la mayoría de los casos de uso local, los valores predeterminados de `.env.example` funcionan de forma transparente sin requerir cambios.

### 3. Iniciar la Aplicación

#### Opción A: Lanzador Interactivo (Recomendado)
Ejecuta el script `./dev.sh` para seleccionar interactivamente entre **Modo Local** y **Modo Hosteado**:
```bash
./dev.sh
```

#### Opción B: Iniciar Directamente por Modo
```bash
# Iniciar en Modo Local (Docente / Proyector)
bun run dev:local

# Iniciar en Modo Hosteado (Campus / Multidispositivo)
bun run dev:hosted
```

La aplicación web estará disponible en: **`http://localhost:3000`** (o en el puerto configurado).

---

## 📂 Estructura del Proyecto

```
aulaplay/
├── apps/
│   └── web/                   # Aplicación Frontend (React 19 + Vite)
│       ├── src/
│       │   ├── components/    # Componentes modulares (game, ai, lessons, ui...)
│       │   ├── pages/         # Vistas principales (Dashboard, HostRoom, Forum...)
│       │   └── lib/           # Utilidades (API client, audio-synth, confetti, i18n)
│       └── vite.config.ts
├── shared/                    # Tipos y contratos compartidos (Zod schemas, i18n)
│   ├── contracts/             # Validación estricta de contratos de API
│   └── i18n/                  # Diccionarios de idiomas (es.json, en.json)
├── src/                       # Backend y API REST (Hono)
│   ├── apps/                  # Módulos de dominio (auth, games, lessons, ai...)
│   ├── core/                  # Infraestructura base (db, config, seguridad, errores)
│   └── entry.ts               # Punto de entrada del servidor
├── scripts/                   # Scripts de migración, seed y copias de respaldo
├── tests/                     # Suite de pruebas automatizadas (Unit & Integration)
├── dev.sh                     # Lanzador interactivo de desarrollo
├── package.json
└── tsconfig.json
```

---

## 💻 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `bun run dev` | Inicia el lanzador interactivo `./dev.sh` |
| `bun run dev:local` | Inicia la plataforma en Modo Local (Docente) |
| `bun run dev:hosted` | Inicia la plataforma en Modo Hosteado |
| `bun run start` | Aplica migraciones y arranca el servidor en producción |
| `bun run build` | Compila frontend y backend para despliegue |
| `bun run test` | Ejecuta todas las pruebas con reporte de cobertura |
| `bun run test:unit` | Ejecuta únicamente las pruebas unitarias |
| `bun run test:integration` | Ejecuta las pruebas de integración de extremo a extremo |
| `bun run lint` | Valida el formato y reglas con Biome |
| `bun run format` | Aplica correcciones automáticas de formato con Biome |
| `bun run typecheck` | Ejecuta la verificación estricta de TypeScript (`tsc --noEmit`) |
| `bun run db:migrate` | Ejecuta las migraciones pendientes en la base de datos |
| `bun run db:seed` | Llena la base de datos con datos de prueba realistas |
| `bun run db:backup` | Genera una copia de seguridad en caliente de la base de datos |
| `bun run db:restore` | Restaura la base de datos a partir de una copia de seguridad |

---

## ☁️ Desplegar en Render

El repositorio incluye un `Dockerfile` multi-stage y un `render.yaml` listos para
[Render Blueprint](https://render.com/docs/blueprint-spec). El servidor Hono sirve
tanto la API REST/WebSocket como los assets estáticos del front-end (construido
con Vite en `dist/web/`).

### Despliegue en 3 pasos

1. **Sube el repo a GitHub/GitLab** (rama `dev` o `main`).
2. En Render: **New → Blueprint**, conecta el repo, Render detecta `render.yaml`.
3. Antes del primer deploy, abre `aulaplay` → **Environment** y edita:
   - `BASE_URL` — pega la URL que Render asignó (ej. `https://aulaplay.onrender.com`).
   - (Opcional) AI provider keys en `AI_PROVIDER_*` si vas a usar generación IA.

Render construirá el Docker, ejecutará `bun run db:migrate` indirectamente al boot
vía `src/entry.ts`, auto-seed la base de datos en el primer arranque y expondrá:

| URL | Sirve |
|-----|-------|
| `/` | Front-end React (SPA) |
| `/assets/*` | Assets hasheados de Vite (cache 1 año) |
| `/api/*` | API REST + WebSocket en `/api/ws/game` |
| `/dashboard`, `/student`, `/admin`, `/login`, `/join`, `/play/:pin`, `/host/:sessionId`, `/forum` | Rutas React Router (caen en SPA fallback) |

### Logs y credenciales sembradas

El primer boot detecta DB vacía y corre el seed. Las contraseñas aleatorias
generadas se imprimen en **stdout** una sola vez. Para verlas:

- Render dashboard → `aulaplay` → **Logs**.
- Busca las líneas `[seed] Generated password for admin/docente/alumno: ...`.

> ⚠️ **Limitaciones del free tier de Render**: el disco es efímero. Cada redeploy
> borra uploads y base de datos. Solo apto para demos/showcase.
> Para producción real necesitas un Persistent Disk (Standard plan) **o**
> migrar a PostgreSQL gestionado + S3 para uploads.

### Variables de entorno clave

| Variable | Default | Notas |
|----------|---------|-------|
| `NODE_ENV` | `production` | Activa el servicio de assets estáticos y el modo producción |
| `MODE` | `hosted` | Habilita social wall, foro, admin |
| `PORT` | `3000` | Render lo inyecta automáticamente |
| `DATA_DIR` | `/var/data` | Volumen efímero. Para persistente usar Render Disk |
| `BASE_URL` | — | **Requerido**. URL pública del servicio (https://...) |
| `COOKIE_SECURE` | `true` | Necesario para HTTPS |
| `AI_KEYS_AES_AAD` | random | Generado por Render en primer deploy, mantener secreto |

### Build manual (alternativa sin Blueprint)

```bash
# Desde Render Dashboard → New → Web Service → Docker
Build Command: (usa Dockerfile — no necesitas definir)
Start Command: bun src/entry.ts
Health Check Path: /api/health
```

---

## 🌿 Estrategia de Ramas en Git

El proyecto sigue una convención organizada de ramas:

- **`main`**: Rama limpia reservada para *releases* estables etiquetados y despliegues productivos.
- **`dev`**: Rama principal de desarrollo donde convergen las características y el historial de trabajo activo.

Los mensajes de commit siguen el estándar de **Conventional Commits**:
- `feat(...)`: Nuevas funcionalidades del sistema.
- `fix(...)`: Corrección de errores.
- `docs(...)`: Mejoras en la documentación.
- `test(...)`: Incorporación o mejora de pruebas.
- `chore(...)`: Tareas de mantenimiento, tooling o dependencias.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.
