# Revisión técnica: optimización y editabilidad por IA

Fecha: 2026-04-01

## Diagnóstico rápido

La aplicación funciona, pero concentra demasiada responsabilidad en `src/App.tsx` (carga inicial, realtime, métricas, filtros, DnD, navegación, modales y operaciones de persistencia). Esto hace que:

- cada cambio tenga más riesgo de efectos colaterales,
- sea más difícil para una IA ubicar dónde editar,
- sea costoso mantener y testear,
- aumente el trabajo de render y recálculo en cada interacción.

## Mejoras prioritarias (alto impacto)

### 1) Dividir `App.tsx` por dominios y hooks

**Objetivo:** reducir complejidad cognitiva y mejorar mantenibilidad.

**Propuesta de estructura:**

- `src/features/board/hooks/useBoardData.ts` (seed/load/realtime)
- `src/features/board/hooks/useBoardMetrics.ts` (lead/cycle/throughput)
- `src/features/board/hooks/useCardOps.ts` (save/new/drag-drop)
- `src/features/board/selectors.ts` (filtros/derivados puros)
- `src/features/board/BoardPage.tsx` (solo UI de tablero)

**Beneficio para IA:** archivos más pequeños, responsabilidades claras y cambios más predecibles.

---

### 2) Extraer lógica derivada a selectores puros + `useMemo`

Actualmente métricas y filtros se recalculan en cada render. Conviene:

- mover cálculos a funciones puras (`selectors.ts`),
- memoizar en hooks/containers,
- evitar objetos/arrays recreados por render si no cambian dependencias.

**Impacto esperado:** menor render cost en tableros medianos/grandes.

---

### 3) Crear capa de acceso a datos por agregado

En vez de llamar `supabase.from(...)` directamente desde varios lugares, centralizar:

- `src/data/boardsRepo.ts`
- `src/data/cardsRepo.ts`
- `src/data/improvementsRepo.ts`

Con contrato estable para CRUD + realtime.

**Beneficio para IA:** para cambios de persistencia se toca 1 archivo por agregado, no todo el árbol.

---

### 4) Tipado más fuerte en IDs y DTOs

Agregar tipos nominales o alias por entidad (`BoardId`, `CardId`, etc.) y DTOs explícitos para escritura/lectura.

**Resultado:** menos errores de mezcla de ids y mapeos más seguros.

---

### 5) Añadir suite mínima de tests de dominio

Priorizar tests puros (sin UI) para:

- cálculo de métricas,
- transiciones de estado,
- reglas de descarte/reapertura,
- validación de WIP limit.

Sugerencia: `vitest` + coverage básico.

---

## Mejoras de rendimiento (fase 2)

1. **Virtualización de tarjetas por columna** cuando superen un umbral (ej. 50+).
2. **Optimistic updates con rollback** para guardados críticos.
3. **Debounce/throttle** en eventos que mutan estado con alta frecuencia.
4. **Batch de escrituras** para operaciones múltiples (crear board con columnas/estados).
5. **Selector memoization** para evitar filtrados repetitivos.

## Mejoras de DX para edición asistida por IA

1. **Convenciones de arquitectura documentadas** (`docs/ARCHITECTURE.md`).
2. **Playbook de cambios** (`docs/AI_EDITING_GUIDE.md`) con “dónde tocar” por caso de uso.
3. **Comentarios de intención (no obvios)** en reglas de negocio complejas.
4. **Scripts de verificación estándar**:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run check` (pipeline local)
5. **Plantillas de PR** con checklist técnico y de regresión.

## Roadmap sugerido

### Sprint 1 (rápido, bajo riesgo)

- Añadir documentación de arquitectura y guía de edición IA.
- Añadir scripts `typecheck` y `check`.
- Extraer selectores de métricas/filtros sin cambiar UI.

### Sprint 2 (estructural)

- Dividir `App.tsx` en hooks + páginas por feature.
- Introducir repositorios de datos.
- Cubrir reglas críticas con tests de dominio.

### Sprint 3 (performance)

- Virtualización y optimizaciones de render.
- Mejorar estrategia realtime para minimizar renders redundantes.

## KPIs para validar mejora

- **Tiempo medio de cambio** (issue → PR) ↓
- **Líneas tocadas por cambio** ↓
- **Regresiones por release** ↓
- **Render time en tablero grande** ↓
- **Cobertura de reglas de negocio** ↑

## Riesgos si no se aborda

- Escalabilidad limitada del código.
- Mayor costo de onboarding (humano y IA).
- Fragilidad creciente en cambios aparentemente simples.
