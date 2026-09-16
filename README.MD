# Sistema de Sorteos

Panel de administración e interfaz de sorteo en vivo construida con **React 18**, **Vite**, **TypeScript** y **Mantine v7**.
Si bien fue pensado para los Juegos Deportivos Tecnológicos, la aplicación fue planteada de forma genérica, lo que permite utilizarla en cualquier entorno.

## Repositorios
- **Front-end:** https://github.com/ignamosconi/sorteo-juegos-front
- **Back-end:** https://github.com/ignamosconi/sorteo-juegos-back

---

## Funcionalidades Principales

- **Visor Cilindro 3D de Sorteo en Vivo (`/sortear/:drawSlug`)**
  - Animación continua tipo tragaperras/ruleta 3D para el sorteo de equipos y grupos.
  - Selección de contexto por Deporte y Categoría.
  - Sorteo automático para categorías de grupo único.
  - Reversión instantánea (*Undo*) contextual por disciplina.
  - Modales informativos de confirmación y estado de grupos.

- **Tablas Públicas en Tiempo Real (`/s/:publicSlug`)**
  - Vista pública orientada a espectadores, transmisiones o pantallas gigantes.
  - Actualización automática mediante **Polling (5s)** e integración con **BroadcastChannel** y eventos personalizados.
  - Tablas intercaladas (*striped*) visibles y legibles tanto en Modo Claro como Modo Oscuro.
  - Organización por tarjetas de Deporte y Categoría con indicación de "Sorteo Finalizado".

- **Gestión de Sorteos y Torneos**
  - Configuración completa de sorteos, asignación de deportes, categorías, grupos y capacidad.
  - Carga e importación de equipos participantes desde el catálogo global.

- **Catálogos Maestros**
  - Administración de Deportes y Categorías por defecto.
  - Gestión de Equipos Globales (escudos, nombres y abreviaturas).

- **Personalización de Marca y Apariencia (`/configuracion`)**
  - Carga de logo/banner público, favicon dinámico y título de la pestaña del navegador.

- **Autenticación de Administradores con 2FA**
  - Flujo de inicio de sesión seguro con escaneo de código QR y validación TOTP.
  - Gestión de perfil de administrador y reseteo de autenticador 2FA.

---

## Stack Tecnológico

| Tecnología | Descripción |
|---|---|
| **React 18 + Vite** | Entorno de desarrollo rápido y biblioteca de UI |
| **TypeScript** | Tipado estático estricto |
| **Mantine v7** | Sistema de componentes UI, layout y theming |
| **Tabler Icons (`@tabler/icons-react`)** | Iconografía vectorizada |
| **React Router v6** | Enrutamiento cliente y rutas protegidas |
| **Zustand** | Gestión del estado global de autenticación |
| **Axios** | Cliente HTTP con interceptores para renovación automática de tokens |

---

## Estructura del Proyecto


```

src/
┣ api/          # Clientes HTTP (drawApi, raffleApi, sportApi, adminApi, etc.)
┣ components/   # Componentes reutilizables de UI y Layout (Navbar, ThemeToggle, ProtectedRoute)
┣ config/       # Variables de entorno centralizadas
┣ pages/        # Vistas principales (DrawPage, PublicRafflePage, RafflesPage, FaqsPage, etc.)
┣ store/        # Estado global con Zustand (authStore)
┣ types/        # Definición de interfaces TypeScript
┗ utils/        # Funciones auxiliares y formateadores

```

---

## Variables de Entorno

Copiá `.env.example` a `.env`:

```bash
cp .env.example .env

```

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME="Sorteo Juegos Universitarios"

```

---

## Instalación y Comandos

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar el build de producción
npm run preview

```

---

## Rutas Principales

| Ruta | Descripción | Acceso |
| --- | --- | --- |
| `/login` | Inicio de sesión con validación 2FA | Público |
| `/s/:publicSlug` | Resultados públicos en tiempo real | Público |
| `/sortear/:drawSlug` | Pantalla de ejecución del sorteo (Cilindro 3D) | Administrador |
| `/raffles` | Listado y administración de sorteos | Administrador |
| `/deportes-defecto` | Catálogo maestro de deportes | Administrador |
| `/equipos-globales` | Catálogo maestro de equipos e insignias | Administrador |
| `/configuracion` | Ajustes de marca, logo y favicon público | Administrador |
| `/faqs` | Preguntas frecuentes para administradores | Administrador |
