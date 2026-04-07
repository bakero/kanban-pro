# Funcionalidades y registro de evolucion

## Funcionalidades disponibles actualmente
> Nota de gobernanza (2026-04-06):
> - Las funcionalidades se gestionan a nivel de empresa (no por proyecto ni por tablero).
> - No se permiten funcionalidades diferentes entre tableros del mismo proyecto.
> - La consola global es exclusiva para `bkasero@gmail.com`; la consola de empresa es activable y deja trazas.

### 1. Gestion de tableros Kanban
- Seleccion del tablero activo desde la cabecera.
- Creacion de nuevos tableros vacios.
- Creacion de nuevos tableros copiando la estructura del tablero actual.
- Generacion automatica del prefijo de proyecto para los identificadores de tarjetas.

### 2. Gestion de tarjetas
- Creacion de nuevas tarjetas con identificador secuencial por proyecto (formato `PROYECTO-SEQ`).
- Apertura de una tarjeta en modal de detalle.
- Edicion de titulo, descripcion, tipo, categoria, fecha de entrega, creador y estado.
- Marcado manual de tarjeta bloqueada.
- Guardado de cambios en Supabase.
- Historial automatico de cambios sobre la tarjeta.

### 3. Flujo Kanban y movimiento de trabajo
- Visualizacion de tarjetas por columnas.
- Movimiento de tarjetas entre columnas mediante drag and drop.
- Cambio de estado al mover una tarjeta a una columna compatible.
- Control de limites WIP por columna.
- Reapertura de tareas completadas con justificacion obligatoria.
- Descarte de tareas con justificacion obligatoria.
- Registro de fechas de completado y descarte.

### 4. Seguimiento y metricas
- Metricas minimas siempre activas:
  - Lead time medio.
  - Cycle time medio.
  - Throughput semanal.
  - Indicador global de carga WIP.
  - Seguimiento del tiempo acumulado por columna dentro de cada tarjeta.
- Metricas avanzadas activables:
  - Burnup chart.
  - Burndown chart.

### 5. Filtros de trabajo
- Filtro de "Mis tareas".
- Filtro de actividad reciente en las ultimas 24 horas.
- Filtro de tarjetas bloqueadas.
- Filtro de entregas vencidas.
- Combinacion de varios filtros simultaneamente.
- Opcion para limpiar todos los filtros activos.

### 6. Dependencias y contexto de tarjeta
- Gestion de tarjetas de las que depende una tarea.
- Gestion de tarjetas bloqueadas por la tarea actual.
- Busqueda de tarjetas para enlazarlas como dependencia.
- Acceso directo desde una dependencia a su tarjeta relacionada.
- Indicador visual de dependencias resueltas o pendientes.

### 7. Comentarios y archivos
- Anadir comentarios a una tarjeta.
- Visualizar historial de comentarios.
- Adjuntar archivos a nivel de nombre de fichero.
- Visualizar la lista de adjuntos registrados en la tarjeta.

### 8. Configuracion funcional del tablero
- Gestion de usuarios.
- Alta de usuarios con nombre, email y rol.
- Cambio de rol entre `MASTER` y `USER`.
- Eliminacion de usuarios.
- Gestion de estados del flujo.
- Alta, cambio de fase, reordenacion y eliminacion de estados.
- Gestion de columnas.
- Alta, edicion, reordenacion y eliminacion de columnas.
- Asignacion de estados a columnas.
- Configuracion de columna WIP y limite WIP.
- Gestion de categorias.
- Alta, reordenacion y eliminacion de categorias.
- Configuracion de campos visibles del modal de tarjeta.
- Configuracion de acceso publico y requisito de autenticacion.
- Configuracion para ocultar tareas completadas tras un numero de dias.

### 9. Sistema de mejoras por empresa
- Registro de propuestas de mejora desde el tablero, la configuracion y cada tarjeta.
- Persistencia de mejoras en la tabla `improvements` con `company_id`.
- Vista compartida de mejoras dentro de la empresa.
- Historial de mejoras ya aplicadas por empresa.
- Votacion positiva por usuario sobre mejoras pendientes.
- Un usuario solo puede votar una vez por mejora.
- Un usuario puede retirar su voto posteriormente.
- Filtros de orden por mas votadas y mas recientes.
- Los usuarios normales solo pueden proponer y votar mejoras.
- La aprobacion para implementacion se hace exclusivamente desde la consola central.
- Las mejoras aprobadas cambian a estado `ai_pending`.
- Generacion del archivo `MEJORAS_PENDIENTES.md` desde la aplicacion en entorno de desarrollo.
- Historial de mejoras ya aplicadas con resultado almacenado.

### 10. Consola de administracion multi-tenant
- Acceso exclusivo para `bkasero@gmail.com`.
- Endpoint separado para la consola administrativa en `/admin.html`.
- Gestion completa de empresas, usuarios, proyectos, tableros y trabajos.
- Vista de mejoras pendientes con aprobacion centralizada.
- Vista de logs por tablero con empresa y usuario responsable.
- Configuracion de retencion de logs y backups por empresa.
- Generacion manual de backups y listado de backups disponibles.
- Gestion del catalogo de funcionalidades global y overrides por empresa.

### 10.1. Consola de administracion por empresa (activable)
- Acceso restringido a usuarios autorizados del tenant.
- Gestion de datos propios de la empresa (usuarios, proyectos, tableros, mejoras, logs, backups).
- Toda accion administrativa deja trazas en el sistema.
- Algunas funciones siguen siendo exclusivas de `bkasero@gmail.com` (catalogo global, aprobaciones centrales).

### 11. Logs y backups por empresa
- Funcionalidad activable por empresa.
- Registro de cambios por tablero en `board_logs` con empresa, usuario, elemento, cambio y fecha.
- Retencion de logs configurable por empresa.
- Backups automaticos diarios (1AM Madrid) del estado de cada empresa.
- Backup manual bajo demanda desde Configuracion > Empresa (solo admins).
- Retencion de backups configurable, por defecto 10.

### 12. Integracion tecnica actual
- Persistencia principal en Supabase.
- Actualizacion en tiempo real de tarjetas mediante canal realtime de Supabase.
- Tema visual configurable por usuario en modo claro, oscuro o segun sistema.
- Interfaz visual unificada con paleta de bajo contraste, columnas suaves, tarjetas redondeadas y leyendas persistentes para facilitar la lectura rapida del tablero y de la consola de administracion.
- La consola tecnica global es exclusiva de `bkasero@gmail.com`.

### 13. Autenticacion y aislamiento por empresa
- Inicio de sesion con cuenta de Google mediante Supabase Auth.
- Registro automatico del usuario autenticado en la tabla `users`.
- Marcado del usuario con login Google activado.
- Registro de confirmacion de cuenta usando el email verificado del proveedor.
- Accion para reenviar email de activacion/confirmacion desde la aplicacion.
- Un usuario solo puede pertenecer a una empresa.
- Cada empresa solo ve sus proyectos, tableros, mejoras, logs y backups.
- El acceso a la consola central sigue reservado al email `bkasero@gmail.com`.
- `bkasero@gmail.com` puede usar tanto la app principal como la consola administrativa.
- La autenticacion y el aislamiento se gestionan por empresa (no existe modo sin empresa).

---

## Catalogo de funcionalidades (gobernanza)

### Obligatorias (siempre activas por empresa)
- Gestion de tableros.
- Gestion de tarjetas.
- Flujo Kanban y movimiento.
- Metricas minimas (lead time, cycle time, throughput, WIP global, tiempos por columna).
- Filtros de trabajo.
- Comentarios y archivos.
- Configuracion funcional del tablero.
- Sistema de mejoras por empresa.
- Redisenio visual con tema configurable.
- Arquitectura multi-tenant simplificada (Empresa -> Proyecto -> Tablero).

### Activables por empresa
- Metricas avanzadas (burnup, burndown).
- Dependencias y contexto de tarjeta.
- Tipos de tarjeta (epica/iniciativa/bug).
- Categorias.
- Workspaces (Empresa -> Workspace -> Proyecto).
- Consola de administracion por empresa (con trazas obligatorias).
- Logs y backups por empresa.
- Autenticacion y aislamiento por empresa (sin modo single-tenant).

### Exclusivas de super admin (`bkasero@gmail.com`)
- Consola global multi-tenant.
- Catalogo global de funcionalidades y aprobaciones centrales.
- Consola tecnica global (integracion tecnica).

## Registro de nuevas funcionalidades

Usa este bloque cada vez que se implemente una funcionalidad nueva. La idea es dejar claro:
- que se anadio,
- como se usa,
- que reglas funcionales tiene,
- y que archivos principales se tocaron.

---

## Plantilla de registro

### [Nombre de la funcionalidad]
- Estado: `pendiente` | `en desarrollo` | `implementada`
- Fecha:
- Objetivo:
- Pantalla o contexto:
- Tipo: `UI` | `logica` | `datos` | `integracion`
- Descripcion funcional:
- Funcionamiento:
- Reglas de negocio:
- Impacto en usuario:
- Archivos principales:
- Notas tecnicas:

---

### Paginas de configuracion por componente
- Estado: `implementada`
- Fecha: 2026-04-07
- Objetivo: garantizar que cada componente de negocio y cada componente UI reutilizable tenga su propia pagina de configuracion accesible por URL.
- Pantalla o contexto: rutas `/config/components` y `/config/components/:componentId` dentro de la app principal.
- Tipo: `UI` | `logica`
- Descripcion funcional: se publica un catalogo de componentes y una pagina de detalle por componente, con resumen, ruta de archivo y espacio de configuracion dedicado.
- Funcionamiento: la app detecta rutas de configuracion y muestra un listado de componentes (negocio y UI) con acceso a su pagina individual. Cada pagina muestra el detalle del componente y un bloque de configuracion base.
- Reglas de negocio: todas las entradas del catalogo tienen URL propia; si un componente no existe se muestra mensaje de no encontrado.
- Impacto en usuario: el equipo puede localizar rapidamente donde configurar o ampliar cada componente sin buscar en el codigo.
- Archivos principales: `src/components/settings/componentCatalog.ts`, `src/components/settings/ComponentSettingsListPage.tsx`, `src/components/settings/ComponentSettingsPage.tsx`, `src/router/AppRouter.tsx`, `src/App.tsx`.
- Notas tecnicas: las rutas se resuelven dentro de `App` para reutilizar autenticacion y tema.

---

### Internacionalizacion por usuario (ES/EN)
- Estado: `implementada`
- Fecha: 2026-04-06
- Objetivo: permitir que cada usuario trabaje en su idioma preferido, aplicando la traduccion en toda la app y consolas.
- Pantalla o contexto: app principal, consola de administracion y paginas publicas.
- Tipo: `UI` | `logica` | `datos`
- Descripcion funcional: toda cadena visible se resuelve por clave de traduccion y se muestra segun el idioma guardado en el perfil del usuario.
- Funcionamiento: `users.lang` almacena el idioma; al iniciar sesion se carga el idioma y se aplica via contexto. El usuario lo cambia desde el panel de perfil.
- Reglas de negocio: el idioma se gestiona por usuario y persiste entre dispositivos; los datos de negocio no se traducen, solo la interfaz.
- Impacto en usuario: la interfaz se adapta a Espanol (Espana) o Ingles segun la preferencia personal.
- Archivos principales: `src/i18n/es.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`, `src/App.tsx`, `src/AdminConsoleApp.tsx`, `src/components/**`.
- Notas tecnicas: las claves se tipan en TypeScript usando `TranslationKey`.

### Perfil de usuario con avatar e idioma
- Estado: `implementada`
- Fecha: 2026-04-06
- Objetivo: permitir que cada usuario edite su nombre, apellidos y avatar, y que el idioma se configure desde el perfil.
- Pantalla o contexto: panel de perfil del usuario conectado.
- Tipo: `UI` | `logica` | `datos` | `integracion`
- Descripcion funcional: el perfil muestra nombre, apellidos, email de solo lectura y avatar; permite subir una imagen ligera y guardar la preferencia de idioma.
- Funcionamiento: la imagen se sube a Supabase Storage en el bucket `avatars` y se guarda `users.avatar_url`; el idioma se guarda en `users.lang`.
- Reglas de negocio: el email nunca se puede modificar; la imagen debe ser ligera (JPG/PNG/WebP, max 512 KB).
- Impacto en usuario: cada persona ve su foto y nombre correcto en selectores y tarjetas.
- Archivos principales: `src/components/UserProfilePanel.tsx`, `src/components/ui/Avatar.tsx`, `src/lib/db.ts`, `docs/migrations/001_owners_codes_lang.sql`.
- Notas tecnicas: politicas RLS limitan subida/actualizacion al propietario del fichero.

### Enrutado por URL y codigos cortos
- Estado: `implementada`
- Fecha: 2026-04-06
- Objetivo: permitir acceso directo por URL a empresa, workspace, proyecto, tablero y tarea, con codigos cortos y IDs.
- Pantalla o contexto: navegacion y pegado de URLs.
- Tipo: `UI` | `logica` | `datos`
- Descripcion funcional: las rutas principales soportan `/app/{empresa}/{workspace?}/{proyecto}/{tablero}/{tarea?}` y `/app/{codigo}` para resolver entidades.
- Funcionamiento: `company_code` y `projects.prefix` son codigos cortos; `workspaces.numeric_id` y `boards.numeric_id` sirven para rutas cortas; `card_id` se compone como `PROYECTO-SEQ`.
- Reglas de negocio: el identificador de tarea es unico por proyecto; al pegar un codigo se resuelve y redirige a la entidad correspondiente.
- Impacto en usuario: se puede compartir una URL directa y abrir cualquier recurso desde la barra del navegador.
- Archivos principales: `src/router/AppRouter.tsx`, `src/router/SmartRedirect.tsx`, `src/lib/db.ts`, `src/App.tsx`, `docs/migrations/001_owners_codes_lang.sql`.
- Notas tecnicas: `cards.seq_id` se genera en BD y se sincroniza con `card_id`.

### Barra superior simplificada y barra secundaria configurable
- Estado: `implementada`
- Fecha: 2026-04-06
- Objetivo: clarificar la navegacion con menus y permitir que cada usuario configure la barra secundaria de acciones.
- Pantalla o contexto: cabecera de la app y vista de tablero.
- Tipo: `UI` | `logica`
- Descripcion funcional: la cabecera muestra menus claros para empresa, workspace, proyecto y tablero; la barra secundaria agrupa acciones de la vista de tablero y permite reordenar/ocultar botones.
- Funcionamiento: la barra secundaria lee/escribe `users.ui_config.secondaryBar`; incluye acciones como nueva tarjeta, nuevo tablero, metricas, filtros, mejoras y ajustes.
- Reglas de negocio: la configuracion es por usuario y se persiste en la BD.
- Impacto en usuario: la cabecera es mas clara y las acciones frecuentes quedan personalizadas.
- Archivos principales: `src/App.tsx`, `src/components/layout/SecondaryBar.tsx`, `src/components/layout/SecondaryBarEditor.tsx`, `src/lib/db.ts`, `src/i18n/es.ts`, `src/i18n/en.ts`.
- Notas tecnicas: el editor usa orden manual (subir/bajar) para evitar dependencias externas.

### Paginas legales publicas (placeholders)
- Estado: `implementada`
- Fecha: 2026-04-06
- Objetivo: disponer de aviso legal, politica de privacidad y cookies accesibles sin autenticacion.
- Pantalla o contexto: rutas publicas `/legal/*`.
- Tipo: `UI`
- Descripcion funcional: se crean paginas publicas con secciones legales y placeholders editables.
- Funcionamiento: las paginas se muestran con tema y traduccion, e incluyen referencias a cookies tecnicas (Supabase/Vercel) en forma de placeholder.
- Reglas de negocio: las paginas legales son siempre publicas.
- Impacto en usuario: transparencia legal desde cualquier dispositivo.
- Archivos principales: `src/components/legal/LegalPage.tsx`, `src/components/legal/LegalFooter.tsx`, `src/router/AppRouter.tsx`.
- Notas tecnicas: el contenido definitivo se completara por la empresa responsable.

## Entradas futuras

### Documentacion interactiva de funcionalidades y pruebas
- Estado: `implementada`
- Fecha: 2026-04-06
- Objetivo: disponer de un portal interactivo con arbol de funcionalidades, requisitos y escenarios de prueba, con enlaces a la ultima ejecucion.
- Pantalla o contexto: sitio de documentacion publicado en produccion y accesible desde la app principal y la consola de administracion.
- Tipo: `UI` | `integracion`
- Descripcion funcional: se crea un sitio de documentacion separado con navegacion lateral por funcionalidades de la app y la consola. Cada pagina incluye requisitos, escenarios de prueba y un bloque para el enlace a la ultima ejecucion.
- Funcionamiento: el sitio vive en `docs-site` y se despliega como sitio estatico. La app y la consola abren la documentacion en una nueva pestaña usando `VITE_DOCS_URL` y `VITE_ADMIN_DOCS_URL`.
- Reglas de negocio: la documentacion no debe bloquear la app; se abre en nueva pestaña; los enlaces a ejecuciones se actualizan con el ultimo run valido.
- Impacto en usuario: los equipos disponen de un punto unico de referencia para funcionalidades, requisitos y pruebas, con trazabilidad al ultimo run.
- Archivos principales: `docs-site/astro.config.mjs`, `docs-site/src/content/docs/index.mdx`, `docs-site/src/content/docs/app/funcionalidades/01-gestion-tableros.mdx`, `docs-site/src/content/docs/admin/funcionalidades/01-consola-global.mdx`, `src/App.tsx`, `src/admin/AdminConsolePage.tsx`, `src/constants.ts`, `src/i18n/es.ts`, `src/i18n/en.ts`
- Notas tecnicas: el despliegue se configura en Vercel apuntando a `docs-site` como root; el enlace se controla por variables de entorno.

### Login de usuarios con Google y tableros privados por propietario
- Estado: `implementada`
- Fecha: 2026-04-01
- Objetivo: permitir acceso autenticado con Google y garantizar que cada usuario solo vea sus tableros propios o los tableros a los que haya sido invitado.
- Pantalla o contexto: acceso inicial, cabecera principal, configuracion del tablero y carga de datos.
- Tipo: `UI` | `logica` | `datos` | `integracion`
- Descripcion funcional: la aplicacion muestra una pantalla de acceso con Google, crea o sincroniza el perfil del usuario autenticado, registra que el login por Google esta activado y limita la carga de tableros a los que el usuario posee o comparte por invitacion.
- Funcionamiento: tras autenticarse con Google, el usuario se sincroniza en `users`, se aceptan invitaciones pendientes por email, se crea un tablero personal si no tiene ninguno, y el selector de tableros solo muestra recursos accesibles para ese usuario. Desde configuracion se puede invitar por email a otros usuarios para compartir un tablero.
- Reglas de negocio: cada tablero tiene un propietario; un usuario no puede ver tableros ajenos salvo invitacion; las invitaciones se resuelven por email; el login Google queda registrado en el perfil; la confirmacion de cuenta se apoya en el email verificado por Google y existe accion de reenvio de email de activacion.
- Impacto en usuario: desaparece el acceso compartido global y cada persona trabaja con sus propios tableros, manteniendo colaboracion controlada por invitacion.
- Archivos principales: `src/App.tsx`, `src/lib/db.ts`, `src/types.ts`, `src/components/LoginPage.tsx`, `src/components/settings/SettingsPage.tsx`, `src/components/CardModal.tsx`
- Notas tecnicas: requiere habilitar Google Provider en Supabase y crear las tablas/campos adicionales de propiedad e invitaciones indicados en `docs/LOGIN_GOOGLE_SETUP.md`.

### Backlog de mejoras por empresa con votos y aprobacion restringida
- Estado: `implementada`
- Fecha: 2026-04-01
- Objetivo: convertir las mejoras en un backlog compartido por toda la aplicacion para priorizar por votos y reservar la aprobacion de implementacion al propietario de la app.
- Pantalla o contexto: pagina de mejoras y consola de administracion.
- Tipo: `UI` | `logica` | `datos`
- Descripcion funcional: todas las personas autenticadas pueden ver mejoras pendientes y el historial completo de mejoras aplicadas dentro de su empresa, votar mejoras pendientes con un unico voto por usuario y retirar ese voto cuando quieran. La aprobacion para implementacion ya no se hace en la pagina compartida de mejoras, sino en una consola central de administracion.
- Funcionamiento: la pagina de mejoras carga todas las mejoras de la empresa, calcula el numero de votos por mejora, permite ordenar por mas votadas o mas recientes y muestra un boton de voto. Solo `bkasero@gmail.com` puede abrir la consola central, revisar el backlog completo y marcar mejoras pendientes como `ai_pending`.
- Reglas de negocio: los votos son unicos por usuario y mejora; los votos pueden eliminarse; el historial es visible para los miembros de la empresa; los usuarios no administradores no pueden aprobar mejoras; la aprobacion para desarrollo depende del email del creador de la app y se concentra en la consola central.
- Impacto en usuario: las mejoras pasan a ser visibles y priorizables de forma colaborativa para toda la comunidad de usuarios, mientras que la decision de aprobacion queda centralizada en una unica vista administrativa.
- Archivos principales: `src/components/ImprovementsPage.tsx`, `src/admin/AdminConsolePage.tsx`, `src/lib/db.ts`, `src/App.tsx`, `src/types.ts`
- Notas tecnicas: requiere una tabla `improvement_votes` con restriccion unica por pareja `improvement_id,user_id`.

### Consola central de administracion multi-tenant
- Estado: `implementada`
- Fecha: 2026-04-01
- Objetivo: ofrecer a `bkasero@gmail.com` una consola independiente para gestionar empresas, usuarios, proyectos, tableros, trabajos, mejoras, logs y backups.
- Pantalla o contexto: endpoint separado `/admin.html`.
- Tipo: `UI` | `logica` | `datos`
- Descripcion funcional: la consola central muestra empresas, permite asignar usuarios (un usuario solo puede estar en una empresa), crear proyectos, revisar tableros y trabajos, aprobar mejoras y revisar logs y backups. Tambien permite configurar el catalogo de funcionalidades y los overrides por empresa.
- Funcionamiento: al entrar en la consola, se cargan empresas y se selecciona una por defecto; para cada empresa se muestran sus miembros, proyectos, tableros, mejoras, logs y backups. Las mejoras pendientes pueden aprobarse para IA desde esta vista.
- Reglas de negocio: solo `bkasero@gmail.com` accede; cada empresa es estanca; los datos mostrados siempre estan filtrados por empresa; la aprobacion de mejoras se centraliza aqui.
- Impacto en usuario: el administrador dispone de control central sobre toda la plataforma sin mezclar tareas administrativas con la app de uso diario.
- Archivos principales: `admin.html`, `src/admin-main.tsx`, `src/AdminConsoleApp.tsx`, `src/admin/AdminConsolePage.tsx`, `src/lib/db.ts`, `src/types.ts`
- Notas tecnicas: la consola vive en una entrada multipagina de Vite y aplica el modelo multi-tenant completo.

### Acceso controlado por empresa
- Estado: `implementada`
- Fecha: 2026-04-01
- Objetivo: garantizar que solo usuarios con empresa asignada accedan a la app y que cada usuario pertenezca a una sola empresa.
- Pantalla o contexto: arranque principal y autenticacion.
- Tipo: `logica` | `datos`
- Descripcion funcional: tras iniciar sesion con Google, la app valida la membresia del usuario. Si no tiene empresa asignada, muestra un mensaje de acceso.
- Funcionamiento: la app carga las empresas asociadas al usuario y selecciona una por defecto. La navegacion y los datos se filtran siempre por esa empresa.
- Reglas de negocio: un usuario solo puede pertenecer a una empresa; las empresas son estancas y no se cruzan datos.
- Impacto en usuario: se evita el acceso accidental a datos de otras empresas y se asegura el modelo multi-tenant.
- Archivos principales: `src/App.tsx`, `src/lib/db.ts`, `src/types.ts`
- Notas tecnicas: se fuerza la unicidad de `company_members.user_id` en la base de datos.

### Consola administrativa separada de la app principal
- Estado: `implementada`
- Fecha: 2026-04-01
- Objetivo: separar los archivos y el punto de entrada de la consola de administracion para simplificar el mantenimiento y evitar mezclar el flujo administrativo con la app de uso diario.
- Pantalla o contexto: acceso web y configuracion de la app.
- Tipo: `UI` | `logica`
- Descripcion funcional: la aplicacion principal sigue cargando desde `index.html`, mientras que la consola administrativa tiene su propia entrada web en `admin.html` y su propio bootstrap React. `bkasero@gmail.com` puede iniciar sesion en ambos entornos.
- Funcionamiento: la consola se levanta desde `src/admin-main.tsx` y `src/AdminConsoleApp.tsx`, reutiliza la autenticacion con Google y valida el email administrador antes de mostrar la consola. En la app principal ya no existe una ruta interna a la consola; en su lugar, la pantalla de configuracion muestra un enlace directo a `/admin.html` solo para `bkasero@gmail.com`.
- Reglas de negocio: el endpoint administrativo es independiente del endpoint principal; otros usuarios autenticados pueden usar la app normal pero no acceder a la consola; el administrador puede entrar tanto en la app principal como en la consola.
- Impacto en usuario: se reduce el acoplamiento entre la experiencia de trabajo habitual y las tareas de administracion, y el acceso a la consola queda mas claro y mantenible.
- Archivos principales: `admin.html`, `src/admin-main.tsx`, `src/AdminConsoleApp.tsx`, `src/App.tsx`
- Notas tecnicas: la consola usa una entrada multipagina de Vite sin depender de una ruta interna en el `App` principal.

### Confirmacion al cerrar una tarea con cambios sin guardar
- Estado: `implementada`
- Fecha: 2026-04-01
- Objetivo: evitar que el usuario pierda cambios al cerrar la modal de la tarea sin guardar.
- Pantalla o contexto: modal de tarea.
- Tipo: `UI` | `logica`
- Descripcion funcional: si hay cambios pendientes y el usuario pulsa cerrar, la app muestra un mensaje de confirmacion antes de salir.
- Funcionamiento: al pulsar el boton de cierre, se evalua si el formulario esta sucio; si lo esta, se lanza una confirmacion explicita y solo se cierra si el usuario acepta salir sin guardar.
- Reglas de negocio: la confirmacion solo aparece cuando existen cambios no guardados.
- Impacto en usuario: reduce perdida accidental de ediciones en tareas.
- Archivos principales: `src/components/CardModal.tsx`
- Notas tecnicas: usa una confirmacion directa del navegador para mantener el flujo simple y robusto.

### Arquitectura multi-tenant: Empresa / Espacio de trabajo / Proyecto
- Estado: `implementada`
- Fecha: 2026-04-01
- Objetivo: transformar la aplicacion en un SaaS multi-tenant donde cada empresa compra una licencia, organiza su trabajo en espacios y proyectos, y los administradores gestionan el acceso y las funcionalidades activas por empresa.
- Pantalla o contexto: toda la aplicacion — cabecera, configuracion, consola super admin.
- Tipo: `UI` | `logica` | `datos` | `integracion`
- Descripcion funcional: se introduce una jerarquia de cuatro niveles (Empresa → Espacio de trabajo → Proyecto → Tablero) sobre los tableros y tarjetas ya existentes. El super administrador (`bkasero@gmail.com`) crea empresas desde una consola dedicada y envia una invitacion al administrador de contacto. Cada empresa puede tener varios espacios de trabajo, y cada espacio puede contener varios proyectos. Los tableros ya no son la raiz del acceso: pertenecen a un proyecto. El acceso de usuarios se gestiona a nivel de proyecto con roles diferenciados. Las funcionalidades de la aplicacion se pueden activar o desactivar por proyecto; los datos siempre se recogen aunque la funcionalidad este desactivada.
- Funcionamiento:
  1. El super admin abre la consola ◈ Admin (solo visible para `bkasero@gmail.com`), crea una empresa e invita al email de contacto como `company_admin`.
  2. El `company_admin` accede, crea espacios de trabajo y proyectos dentro de ellos, invita a usuarios con roles y configura que funcionalidades estan activas en cada proyecto.
  3. Al iniciar sesion, la app carga la empresa del usuario, el primer espacio, el primer proyecto y el primer tablero de forma automatica. Los selectores de la cabecera permiten navegar entre espacios, proyectos y tableros.
  4. Si un proyecto no tiene tableros, se crea automaticamente un tablero semilla.
  5. Las funcionalidades activas se determinan combinando el catalogo global (default_on, is_mandatory) con los overrides de empresa. Las obligatorias no pueden desactivarse.
- Reglas de negocio:
  - Un tablero pertenece a exactamente un proyecto.
  - Un usuario solo ve los proyectos a los que esta asignado como miembro (o todos si es super admin).
  - Roles de empresa: `company_admin`, `project_manager`, `member`, `viewer`.
  - Roles de proyecto: `project_manager`, `member`, `viewer`.
  - El super admin no requiere pertenencia a ninguna empresa; ve todo.
  - Las funcionalidades desactivadas ocultan su UI pero sus datos siguen grabandose.
  - Las funcionalidades obligatorias (`is_mandatory = true`) siempre estan activas y no pueden desactivarse desde el proyecto.
- Impacto en usuario:
  - Por defecto la navegacion es Empresa / Proyecto / Tablero (version simplificada).
  - Si Workspaces esta activo, se habilita el breadcrumb Empresa / Espacio / Proyecto / Tablero.
  - La gestion de miembros se hace desde Configuracion > Miembros (por proyecto). Las funcionalidades se gestionan a nivel de empresa.
  - Los usuarios sin empresa asignada ven un mensaje claro indicandoles que contacten a su administrador.
- Archivos principales:
  - `docs/schema.sql` — esquema completo de la BD (nuevo)
  - `src/types.ts` — nuevas interfaces Company, Workspace, Project, ProjectMember, Feature, ProjectFeature, FeatureFlags; Board modificado (project_id)
  - `src/lib/db.ts` — funciones CRUD para toda la jerarquia y resolveFeatureFlags
  - `src/App.tsx` — navegacion en cascada de cuatro niveles y feature flags guards
  - `src/components/settings/SettingsPage.tsx` — seccion Miembros (reemplaza Usuarios) y seccion Funcionalidades
  - `src/components/admin/SuperAdminPage.tsx` — consola super admin nueva (reemplaza AdminConsolePage)
  - `src/constants.ts` — SUPER_ADMIN_EMAIL extraido como constante compartida
- Notas tecnicas: las tablas `board_members` y `board_invites` quedan obsoletas; la gestion de acceso pasa a `company_members`, `company_invites` y `project_members`. La funcion `resolveCompanyFeatureFlags` combina el catalogo con los overrides en una unica pasada y devuelve un Record<string, boolean> listo para usar en guardas de renderizado.
- Actualizacion (2026-04-06): las funcionalidades ahora se gestionan por empresa (no por proyecto), se registra `company_id` en tableros y mejoras, y la consola admin multi-tenant centraliza logs, backups y aprobacion de mejoras. Workspaces pasa a ser funcionalidad activable.

### Rediseño visual sobrio con tema configurable por usuario
- Estado: `implementada`
- Fecha: 2026-04-01
- Objetivo: modernizar la interfaz del tablero para que resulte mas clara, mas sobria y mas agradable en uso continuo, permitiendo ademas que cada usuario elija modo claro, modo oscuro o seguir el tema del sistema.
- Pantalla o contexto: login, tablero principal, tarjetas, mejoras, configuracion y consola de administracion.
- Tipo: `UI` | `logica`
- Descripcion funcional: la app adopta un lenguaje visual de bajo contraste luminoso con columnas suaves, tarjetas redondeadas, fondos menos agresivos, leyendas visibles y una jerarquia visual mas limpia. La consola de administracion utiliza el mismo sistema visual. El usuario puede cambiar su preferencia de tema desde la barra principal, la pantalla de login o la consola, y esa eleccion queda persistida en el navegador para su cuenta.
- Funcionamiento: al iniciar sesion, la app y la consola intentan cargar la preferencia visual asociada al email autenticado. Si no existe, usan el modo `system`. El usuario puede cambiar entre `system`, `light` y `dark`, y la interfaz recalcula colores, fondos, bordes, acentos, botones, tarjetas, tablas y overlays con el mismo sistema de tokens visuales.
- Reglas de negocio: se conservan los colores funcionales de fase (`pre` gris, `work` azul, `post` verde); la preferencia de tema se guarda por usuario en almacenamiento local del navegador; la leyenda de fases permanece visible para facilitar incorporacion y consulta rapida.
- Impacto en usuario: mejora la legibilidad del tablero durante jornadas largas, reduce fatiga visual y permite que cada persona adapte la interfaz a su entorno de trabajo sin perder coherencia visual entre pantallas.
- Archivos principales: `src/App.tsx`, `src/AdminConsoleApp.tsx`, `src/admin/AdminConsolePage.tsx`, `src/hooks/useTheme.ts`, `src/index.css`, `src/components/KCard.tsx`, `src/components/LoginPage.tsx`, `src/components/ImprovementsPage.tsx`, `src/components/CardModal.tsx`, `src/components/JustifyModal.tsx`, `src/components/ui/Btn.tsx`, `src/components/ui/Toggle.tsx`
- Notas tecnicas: la preferencia se persiste con una clave derivada del email del usuario; los componentes principales consumen un tema resuelto desde tokens compartidos para mantener consistencia entre modo claro y oscuro.

<!--
Copiar la plantilla anterior debajo de este bloque para cada funcionalidad nueva.
-->
