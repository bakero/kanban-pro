# Pagina empresa

## Objetivo
Mostrar de un vistazo toda la informacion relevante para el propietario y el resto de personas de una empresa.

## Funcionamiento
La pagina muestra la informacion general de la empresa y un dashboard con widgets de proyectos, espacios de trabajo (si existen), estado anual y objetivos.
Los listados de proyectos y espacios se muestran en widgets separados con paginacion y filtros en cabecera.
El panel lateral derecho permite al responsable anadir o quitar widgets.

## Reglas de negocio
Solo se puede ver la pagina de la propia empresa.
El responsable de la empresa y la persona informadora pueden acceder a la pagina; otros usuarios solo por invitacion del responsable.
El identificador unico de la empresa es alfanumerico de 10 caracteres, sin simbolos ni espacios, se define al crear la empresa y no puede cambiarse.
Solo el responsable de la empresa puede anadir o quitar widgets del dashboard (regla temporal hasta definir permisos avanzados).

## Requisitos funcionales
- FR-001: La pagina debe cargar por la ruta /empresa/:companyCode.
- FR-002: Debe mostrar informacion general de la empresa (nombre, company_code, numero de personas, numero de proyectos, numero de espacios si aplica).
- FR-003: Debe incluir widgets separados para proyectos y espacios de trabajo, con filtros y paginacion.
- FR-004: Debe mostrar un widget de estado de proyectos del ano en curso en grafico circular.
- FR-005: Debe mostrar un widget de objetivos con porcentaje de consecucion.
- FR-006: Solo el responsable puede gestionar widgets desde el panel lateral derecho.

## Requisitos no funcionales
- NFR-001: Los widgets con carga asincrona deben mostrar un indicador de carga visible.
- NFR-002: La pagina debe responder de forma fluida al cambiar filtros y paginacion.

## Componente principal afectado
- src/components/EmpresaPage.tsx

## Reutilizacion o creacion de componentes
- Reutilizar componente existente: por definir si se reaprovechan listados actuales (pendiente de revision).
- Nuevo componente: src/components/EmpresaPage.tsx.

## Ruta de pantalla (si aplica)
- /empresa/:companyCode

## Carga de datos
- Tipo: mixto (sincrona para datos basicos de empresa; asincrona para widgets de proyectos, espacios y objetivos).
- Indicador de carga: si, spinner para widgets asincronos.

## Impacto en el usuario
El usuario tiene una vista centralizada de su empresa con informacion clave y acceso rapido a proyectos y espacios.

## Criterios de aceptacion
- La ruta /empresa/:companyCode renderiza la pagina de empresa correcta segun companies.company_code.
- La informacion general muestra nombre, company_code, total de personas, total de proyectos y total de espacios (si existen).
- El widget de proyectos muestra paginacion de 15 elementos y filtros por ID, % avance, estado, responsable y titulo.
- El widget de espacios muestra paginacion de 15 elementos y filtros por ID, % avance, estado, responsable y titulo.
- El grafico circular representa el estado de proyectos del ano en curso.
- El widget de objetivos muestra el porcentaje desde un campo numerico.
- Solo el responsable puede anadir o quitar widgets en el panel lateral derecho.
- Los widgets asincronos muestran spinner mientras cargan.

## Pruebas
1. Abrir /empresa/:companyCode con un usuario responsable y verificar acceso y panel lateral de widgets.
2. Abrir /empresa/:companyCode con un usuario informador y verificar acceso sin permisos de edicion de widgets.
3. Verificar filtros y paginacion (15 por pagina) en widgets de proyectos y espacios.
4. Forzar carga de widgets y comprobar que aparece spinner hasta finalizar.

## Resultado de pruebas (post-implementacion)
- Fecha:
- Entorno:
- Resumen:
- Detalle:

## Documentacion (post-implementacion)
- Documentacion funcional actualizada en /docs-site: pendiente.
- Documentacion tecnica actualizada en /docs-site: pendiente.
- Ultimas pruebas de integracion en /docs-site: pendiente.
- Enlace a la spec: .specify/specs/002-pagina-empresa/spec.md

## Datos y permisos
- Responsable empresa: companies.owner_user_id.
- Informador empresa: companies.reporter_user_id.
- Codigo empresa: companies.company_code.
- Acceso por invitacion: usuarios invitados por el responsable.
