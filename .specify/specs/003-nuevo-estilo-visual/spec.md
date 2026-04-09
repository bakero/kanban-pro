# Nuevo estilo visual

## Objetivo
Mejorar el estilo visual para que sea diferenciador de la competencia.

## Funcionamiento
Se adopta un sistema visual elegante, visual y tecnologico aplicado a toda la app (app principal y consola).
El layout base se estandariza con sidebar fijo y topbar en todas las pantallas.
Los tokens de color, tipografia y sombras se centralizan para mantener coherencia entre vistas.

## Reglas de negocio
La interfaz debe conservar accesibilidad WCAG AA y soporte completo de teclado.
El toggle de tema (claro/oscuro) se gestiona desde la configuracion del usuario.

## Requisitos funcionales
- FR-001: La app debe usar Inter como tipografia principal.
- FR-002: El color de acento principal es #1A6EFF.
- FR-003: El layout global incluye sidebar fijo y topbar en todas las pantallas.
- FR-004: Se define un sistema de tokens en un archivo dedicado y se aplica en toda la app.
- FR-005: Se mantiene un unico modo de densidad (balanceado).
- FR-006: Se aplican reglas tipograficas (tracking negativo en titulos, positivo en labels, line-height definido, truncados).

## Requisitos no funcionales
- NFR-001: Cumplir WCAG AA en contraste y accesibilidad.
- NFR-002: Soporte completo de teclado en interacciones.
- NFR-003: Preferencia por rendimiento (transiciones CSS, evitar animaciones pesadas).
- NFR-004: Ajustar tokens de color cuando sea necesario para cumplir WCAG AA, manteniendo el estilo del mockup.

## Componente principal afectado
- src/hooks/useTheme.ts (tema) y nuevo archivo de tokens.

## Reutilizacion o creacion de componentes
- Reutilizar componentes existentes adaptando estilos.
- Nuevo componente: src/theme/tokens.ts.

## Ruta de pantalla (si aplica)
- N/A (cambio global).

## Carga de datos
- Tipo: sincrona.
- Indicador de carga: no aplica.

## Impacto en el usuario
La interfaz gana coherencia, claridad visual y personalidad, manteniendo facilidad de uso.

## Criterios de aceptacion
- La app utiliza Inter en todas las pantallas.
- El acento principal es #1A6EFF en botones y elementos destacados.
- Sidebar fijo y topbar presentes en todas las pantallas.
- Tokens centralizados en src/theme/tokens.ts y aplicados globalmente.
- Se aplican reglas tipograficas del documento FlowBoard.
- Tema claro y oscuro disponibles desde configuracion del usuario.
- WCAG AA y navegacion por teclado garantizadas.

## Pruebas
1. Verificar tipografia Inter en app principal y consola.
2. Verificar color de acento #1A6EFF en botones primarios y estados activos.
3. Confirmar sidebar fijo y topbar en todas las pantallas.
4. Cambiar tema desde configuracion del usuario y validar claro/oscuro.
5. Probar navegacion por teclado en elementos interactivos.

## Resultado de pruebas (post-implementacion)
- Fecha:
- Entorno:
- Resumen:
- Detalle:

## Documentacion (post-implementacion)
- Documentacion funcional actualizada en /docs-site: pendiente.
- Documentacion tecnica actualizada en /docs-site: pendiente.
- Ultimas pruebas de integracion en /docs-site: pendiente.
- Enlace a la spec: .specify/specs/003-nuevo-estilo-visual/spec.md

## Diseno base (referencias)
- Mockup: C:\Users\Asus\Downloads\kanban-mockup.jsx
- Identidad: C:\Users\Asus\Downloads\flowboard-spec.docx
- Estudios de mercado: C:\Users\Asus\Downloads\document_pdf.pdf, document_pdf (1).pdf, document_pdf (2).pdf
