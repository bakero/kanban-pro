# Menu de funcionalidades

## Objetivo
Acceder desde un unico boton a las opciones de menu de la app.

## Funcionamiento
El boton se situa en la esquina superior izquierda, en la barra de titulo, y el menu aparece como un dropdown en primer termino sobre cualquier elemento en pantalla.
El icono del menu es la imagen del avatar del usuario conectado (maximo 50px x 50px); si no hay imagen, usar un avatar por defecto de la libreria o las iniciales del usuario.
Al pulsarlo se despliegan las opciones del menu en este orden: Perfil, Configuracion, Consola Empresa, Cerrar sesion.
El dropdown se cierra al seleccionar una opcion o al pulsar fuera, y las opciones tienen animacion al pasar el cursor por encima.

## Reglas de negocio
Perfil navega a la ruta interna /perfil (datos del usuario conectado).
Configuracion abre la pantalla de configuracion de la app.
Consola Empresa navega a la consola interna de empresa, pero solo se muestra si el usuario conectado es responsable (companies.owner_user_id == users.id).
Cerrar sesion hace logout y redirige a https://kanban-incrzyulw-kanban-pro.vercel.app/.

## Requisitos funcionales
- FR-001: El boton de menu debe abrir un dropdown con opciones del menu.
- FR-002: Cada opcion debe ejecutar su accion correspondiente (navegacion o logout).
- FR-003: Consola Empresa solo debe mostrarse a usuarios autorizados.

## Requisitos no funcionales
- NFR-001: El menu debe ser accesible con teclado (Tab, Enter, Esc, flechas).
- NFR-002: El dropdown debe mostrarse sobre cualquier elemento en pantalla (z-index alto).

## Componente principal afectado
- src/App.tsx (Header)

## Reutilizacion o creacion de componentes
- Reutilizar componente existente: menu en header actual dentro de src/App.tsx.
- Nuevo componente: por definir si se extrae un componente dedicado (pendiente).

## Ruta de pantalla (si aplica)
- N/A (no es una pantalla nueva).

## Carga de datos
- Tipo: sincrona.
- Indicador de carga: no aplica.

## Impacto en el usuario
Sin ocupar mucho espacio en la pantalla, el usuario tendra todas las opciones de menu centralizadas en un unico punto, siempre visible y accesible tambien con teclado.

## Criterios de aceptacion
- El boton de menu aparece en la esquina superior izquierda de la barra de titulo, con el avatar del usuario (maximo 50px x 50px) o un fallback (avatar por defecto o iniciales).
- Al abrir el dropdown, las opciones aparecen en este orden: Perfil, Configuracion, Consola Empresa, Cerrar sesion.
- El dropdown se cierra al hacer click fuera o al seleccionar una opcion.
- Consola Empresa solo se muestra si companies.owner_user_id coincide con users.id para la empresa actual; en caso contrario no se muestra.
- Cerrar sesion realiza logout y redirige a https://kanban-incrzyulw-kanban-pro.vercel.app/.
- El menu es usable con teclado (Tab para foco, Enter para abrir/seleccionar, Esc para cerrar, flechas para navegar).

## Pruebas
1. Iniciar sesion con un usuario autorizado (owner) y verificar que aparece Consola Empresa en el dropdown.
2. Iniciar sesion con un usuario no autorizado y verificar que Consola Empresa no aparece.
3. Abrir el dropdown, comprobar orden de opciones y cerrar con click fuera y con Esc.
4. Seleccionar cada opcion y verificar la navegacion/accion: /perfil, configuracion, consola empresa (si aplica) y logout con redireccion a https://kanban-incrzyulw-kanban-pro.vercel.app/.

## Resultado de pruebas (post-implementacion)
- Fecha: 2026-04-10
- Entorno: local
- Resumen: OK
- Detalle: Menu con avatar, orden de opciones, cierre, teclado y logout verificados.

## Documentacion (post-implementacion)
- Documentacion funcional actualizada en /docs-site: docs-site/src/content/docs/app/funcionalidades/14-menu-funcionalidades.mdx
- Documentacion tecnica actualizada en /docs-site: docs-site/src/content/docs/app/funcionalidades/14-menu-funcionalidades.mdx
- Ultimas pruebas de integracion en /docs-site: docs-site/src/content/docs/app/funcionalidades/14-menu-funcionalidades.mdx
- Enlace a la spec: .specify/specs/001-menu-funcionalidades/spec.md
