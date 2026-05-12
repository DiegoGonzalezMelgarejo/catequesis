# OpenCode Session

## Estado actual

- Proyecto convertido a esquema multitenant por `parishId`.
- Existe rol `SUPER_ADMIN`.
- `SUPER_ADMIN` crea parroquias y admin inicial por parroquia.
- `ADMIN` crea periodos anuales.
- `CATECHIST` no puede crear periodos anuales.
- Si no existe el periodo anual en curso, no se puede seguir.
- Si el usuario tiene contraseña temporal, debe cambiarla antes de entrar.
- Contraseñas nuevas quedan hashadas.
- La app sigue siendo PWA en movil y web normal en PC.
- En escritorio ahora se ve como dashboard web con sidebar.
- El menu inferior movil ya se adapta al numero real de opciones.
- Se quito el remount forzado al cambiar de menu.
- Se dejo una transicion suave entre paginas sin recargar toda la vista.

## Credenciales seed actuales

- `superadmin / superadmin123`
- `admin / admin123`

Ambos quedan con cambio obligatorio de contraseña al iniciar.

## Archivos clave tocados

- `src/types/models.ts`
- `src/database/firestore.ts`
- `src/database/firestore-repository.ts`
- `src/database/seed.ts`
- `src/services/auth-service.ts`
- `src/services/session-service.ts`
- `src/services/parish-service.ts`
- `src/services/annual-period-service.ts`
- `src/services/user-service.ts`
- `src/store/auth-context.tsx`
- `src/layouts/app-layout.tsx`
- `src/components/app/password-change-gate.tsx`
- `src/components/app/active-year-gate.tsx`
- `src/components/app/desktop-sidebar.tsx`
- `src/components/app/mobile-bottom-navigation.tsx`
- `src/pages/parishes-page.tsx`
- `src/features/catechists/catechist-form.tsx`

## Reglas de comportamiento actuales

### Multitenant

- El scoping por parroquia se hace desde `firestore-repository.ts`.
- `SUPER_ADMIN` puede ver todas las parroquias.
- Los demas roles quedan filtrados por `parishId`.

### Password gate

- Si `user.mustChangePassword === true`, se muestra `PasswordChangeGate`.
- Hasta cambiarla, no entra al resto de la app.

### Periodo anual

- Los anos disponibles salen de `annualPeriods`.
- Ya no se crean anos automaticamente al cambiar el corte.
- Si falta el corte anual del ano en curso:
  - `ADMIN` debe crearlo para continuar.
  - `CATECHIST` queda bloqueado hasta que exista.

### PWA / Web

- Movil: instalable como PWA.
- PC: uso como app web normal.
- En escritorio no se muestra el boton de instalar.

## Seed por parroquia

- Al crear una parroquia se crea:
  - la parroquia
  - el admin inicial
  - los sacramentos base
- La rutina `ensureParishBaseCatalog()` ya esta preparada para meter tambien catalogos repetibles por parroquia como:
  - checklist base
  - documentos requisito base

Hoy esas listas base adicionales estan vacias en:

- `DEFAULT_CHECKLIST_CATALOG_ITEMS`
- `DEFAULT_DOCUMENT_REQUIREMENTS`

Si luego se definen, se sembraran automaticamente para cada parroquia nueva.

## Ajustes de cache ya hechos

- Firestore quedo `server-first` con fallback a cache.
- El cache local paso de persistente a memoria.
- Esto se hizo para evitar datos pegados entre sesiones.

## UI desktop / mobile ya ajustada

- Sidebar desktop agregado.
- Menu inferior solo en mobile.
- Menu mobile ahora usa columnas dinamicas segun cantidad de items.
- Etiquetas del menu mobile ya pueden partirse mejor.

## Cosas recomendadas para despues

1. Reforzar seguridad real en `firestore.rules`.
2. Agregar reset de contraseña por admin/superadmin.
3. Definir checklist base y documentos base por parroquia.
4. Mostrar nombre de parroquia actual para `ADMIN` y `CATECHIST`.
5. Revisar si el `service worker` debe dejar de usar `autoUpdate` para evitar sensacion de recarga en produccion.

## Verificacion mas reciente

- `npm run build` OK
