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

- Usuario: `superadmin`
- Contrasena: `superadmin123`

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
- La persistencia offline de Firestore esta desactivada temporalmente para simplificar el arranque y las consultas en PWA.
- El seed inicial de usuarios se ejecuta manualmente con un script aparte.

### Seed de usuarios

Ejecuta este comando antes del primer uso o durante el despliegue:

```bash
npm run seed:users
```

El script:

- crea la parroquia base si no existe
- crea `superadmin` solo si no existe
- no actualiza usuarios ya creados

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
- Seed inicial manual de usuarios en Firestore

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
- Firestore consulta directamente la red mientras la persistencia offline este desactivada.
- La app precachea recursos con service worker.
- Sin internet, la app no garantiza acceso a datos de Firestore mientras esta configuracion temporal siga activa.
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
