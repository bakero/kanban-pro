# Mejoras Pendientes — Kanban Pro
Generado: 2026-04-01T14:13:11.381Z

---

## Mejora 1 (ID: `o5xxtvm`)
- **Usuario**: David Baquero
- **Fecha**: 1/4/2026, 16:10:08
- **Origen**: board
- **Descripción**: En la modal de la tarea, si hay un cambio y se pulsa el botón cerrar sin pulsar el botón guardar, debe salir un mensaje de confirmación de que el usuario desea salir sin guardar los cambios

---

## Mejora 2 (ID: `zuoatnf`)
- **Usuario**: David Baquero
- **Fecha**: 1/4/2026, 16:07:12
- **Origen**: board
- **Descripción**: El panel de mejoras debe ser visible por todos los usuarios. Si la mejora no la ha propuesto el usuario que está usando la app, sólo puede votarla (botón con mano con pulgar arriba). Además, en la página de mejoras hay dos botones de filtro: más votadas y más recientes.

---

## Instrucciones para Claude Code

Cuando el usuario diga "aplica las mejoras pendientes":
1. Lee cada mejora de este archivo
2. Analiza qué cambio de código es necesario
3. Aplica los cambios en el código fuente
4. Marca las mejoras como aplicadas en Supabase ejecutando:

```bash
export $(grep -v '^#' .env | xargs)
curl -X PATCH "$VITE_SUPABASE_URL/rest/v1/improvements?status=eq.ai_pending" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"applied","applied_at":"2026-04-01T14:13:11.381Z","ai_result":"[Resumen de cambios realizados]"}'
```
5. Llama a `/api/delete-file` con `{"filename":"MEJORAS_PENDIENTES.md"}` o elimina el archivo manualmente