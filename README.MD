# Dashboard de Administrador con 2FA - Frontend


Panel de administración construido con **React + Vite + TypeScript** y componentes de **Mantine v9**.

## Backend
El back-end de este proyecto puede encontrarse a través del siguiente enlace:
- https://github.com/ignamosconi/admin-dashboard-2fa-back

## Funcionalidades principales

- **Login con flujo 2FA completo** - Primera vez: ingreso de credenciales → escaneo de QR → confirmación de código TOTP. Logins posteriores: credenciales → código TOTP. Todo manejado en una sola página con pasos progresivos.
- **Gestión de administradores** - Tabla con listado de admins, creación, edición y eliminación con confirmación.
- **Mi perfil** - El admin autenticado puede actualizar su nombre de usuario y contraseña, y resetear su autenticador 2FA confirmando su contraseña actual.
- **Navbar colapsable**
  - En **desktop**: ocupa espacio en el layout (push). Se expande (220px) o colapsa (60px) arrastrando o tocando el borde derecho.
  - En **mobile**: no desplaza el contenido. Al abrirse se superpone con un backdrop semitransparente; tocando fuera del navbar se cierra.
  - Colapsado muestra solo íconos con tooltips al hover. Expandido muestra íconos y etiquetas.
  - En pantallas pequeñas arranca colapsado; en desktop arranca expandido.
- **Modo claro / oscuro** - Toggle persistente accesible desde el pie del navbar en cualquier estado.
- **Rutas protegidas** - Las páginas del panel requieren sesión activa. Sin token válido redirige al login automáticamente.
- **Renovación automática de tokens** - El cliente renueva el access token usando el refresh token de forma transparente antes de que expire.

## Stack

| Tecnología | Uso |
|---|---|
| React 18 + Vite | Base del proyecto |
| TypeScript | Tipado estático |
| Mantine v9 | Componentes UI y theming |
| React Router v6 | Navegación y rutas protegidas |
| Zustand | Estado global de autenticación |
| Axios | Cliente HTTP con interceptors |
| `@mantine/hooks` | `useDisclosure`, `useMediaQuery` |

## Estructura

```
src
 ├── api/            # Clientes HTTP (adminApi, authApi)
 ├── components/
 │    ├── layout/    # AppShell, Navbar, ProtectedRoute
 │    └── ui/        # ThemeToggle
 ├── hooks/          # useAuth
 ├── pages/          # LoginPage, AdminsPage, MyProfilePage, DashboardPage
 ├── store/          # authStore (Zustand)
 └── types/          # Tipos compartidos de la API
```

## Variables de entorno

Copiá `.env.example` a `.env`:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend (ej: `http://localhost:3000`) |

## Instalación y ejecución

```bash
npm install
npm run dev    # desarrollo

npm run build  # producción
npm run preview #ejecutar build
```

## Páginas

| Ruta | Descripción |
|---|---|
| `/login` | Login con flujo 2FA (setup o validate según el estado del admin) |
| `/dashboard` | Página de inicio del panel |
| `/admins` | Listado y gestión de administradores |
| `/admins/me` | Perfil del admin autenticado (datos + reset 2FA) |

# SORTEOS