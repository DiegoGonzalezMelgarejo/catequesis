# Catequesis PWA

MVP offline-first para gestion de catequesis, asistencia, actividades y notas.

## Stack

- React
- Vite
- TypeScript
- TailwindCSS
- shadcn/ui patterns + Radix UI
- Firebase Firestore
- React Router DOM
- React Hook Form + Zod
- Lucide React
- Context API
- vite-plugin-pwa

## Credenciales iniciales

- Usuario: `admin`
- Contrasena: `admin123`

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Firebase

- Proyecto configurado: `catequesis-db349`
- La app usa Firestore con cache offline del SDK web.
- El seed crea automaticamente el usuario `admin` y los sacramentos al primer arranque.

### Reglas actuales

Mientras el login siga siendo propio y no Firebase Auth, Firestore necesita reglas abiertas para que el cliente pueda leer y escribir.

Archivo incluido:

- `firestore.rules`

Si tienes Firebase CLI autenticado, puedes aplicar las reglas con:

```bash
firebase deploy --only firestore:rules
```

## Funcionalidades incluidas

- Login local por rol leyendo usuarios desde Firestore
- Dashboard ADMIN
- Dashboard CATECHIST
- CRUD de catequistas
- CRUD de grupos
- CRUD de alumnos
- Asignacion catequista-grupo
- Sacramentos por alumno
- Uno o dos acudientes por alumno
- Toma de asistencia offline
- Actividades y notas
- Historial de alumno
- Reportes
- Alertas
- Exportacion CSV
- Seed inicial de admin y sacramentos en Firestore

## Instalacion como PWA

### Android

1. Abre la app en Chrome.
2. Toca `Instalar aplicacion` o el banner del navegador.
3. Confirma la instalacion.
4. La app quedara en pantalla principal y abrira en modo app.

### iPhone

1. Abre la app en Safari.
2. Toca `Compartir`.
3. Selecciona `Agregar a pantalla de inicio`.
4. Confirma el nombre y toca `Agregar`.

## Offline

- Los datos viven en Firestore.
- Firestore mantiene cache offline local en el navegador.
- La app precachea recursos con service worker.
- Puede abrirse y usarse sin conexion.
- La estructura ya esta conectada a Firebase Firestore.

## Estructura principal

```text
src/
  app/
  components/
  database/
  features/
  hooks/
  layouts/
  pages/
  routes/
  services/
  store/
  theme/
  types/
  utils/
```
