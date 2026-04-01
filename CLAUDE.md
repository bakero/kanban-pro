# Claude Code — Kanban Pro

## Aplicar mejoras pendientes

Cuando el usuario escriba **"aplica las mejoras pendientes"**, sigue estos pasos:

### 1. Verificar que existe el archivo de mejoras

Comprueba si existe `MEJORAS_PENDIENTES.md` en la raíz del proyecto.

**Si NO existe**, detente y muestra este mensaje de error:

> ❌ No se encontró el archivo `MEJORAS_PENDIENTES.md`.
> Para generarlo, ve a la pantalla **MEJORAS** de la aplicación, selecciona las mejoras pendientes y pulsa el botón **APLICAR**. El archivo se creará automáticamente en la raíz del proyecto.

**Si existe**, lee su contenido y continúa con los siguientes pasos.

### 2. Analizar y aplicar cambios

Por cada mejora:
- Entiende qué cambio de UI, lógica o datos es necesario
- Localiza los archivos afectados en `src/`
- Aplica el cambio mínimo necesario
- No refactorices código no relacionado

### 3. Marcar como aplicadas en Supabase

Construye un resumen de los cambios y ejecuta:

```bash
export $(grep -v '^#' .env.local 2>/dev/null || grep -v '^#' .env 2>/dev/null | xargs)
curl -s -X PATCH "${VITE_SUPABASE_URL}/rest/v1/improvements?status=eq.ai_pending" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"applied\",\"applied_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"ai_result\":\"[Resumen de los cambios aplicados]\"}"
```

Sustituye `[Resumen de los cambios aplicados]` por una descripción real de los cambios.

### 4. Limpiar (opcional)

Si existe `MEJORAS_PENDIENTES.md` en la raíz, elimínalo.

---

## Estructura del proyecto

```
src/
  App.tsx                        — Orquestador principal
  types.ts                       — Interfaces TypeScript
  constants.ts                   — Constantes globales
  hooks/useTheme.ts              — Tema reactivo (dark/light)
  lib/supabase.ts                — Cliente Supabase
  lib/db.ts                      — CRUD Supabase
  lib/utils.ts                   — Utilidades puras
  components/
    KCard.tsx                    — Tarjeta Kanban
    CardModal.tsx                — Modal de edición de tarjeta
    JustifyModal.tsx             — Modal de justificación
    UserModal.tsx                — Modal de nuevo usuario
    NewKanbanModal.tsx           — Modal de nuevo tablero
    ImprovementBtn.tsx           — Botón bombilla 💡
    ImprovementModal.tsx         — Modal para proponer mejora
    ImprovementsPage.tsx         — Página de gestión de mejoras
    settings/SettingsPage.tsx    — Página de configuración
    ui/                          — Componentes primitivos
```

## Tabla improvements en Supabase

Si la tabla `improvements` no existe aún, créala en el dashboard de Supabase:

```sql
CREATE TABLE improvements (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  description TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT 'board',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  ai_result TEXT
);
```
