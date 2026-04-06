# Setup de login Google en Supabase

## 1. Activar Google Auth

En Supabase:

1. Ve a `Authentication > Providers`
2. Activa `Google`
3. Configura `Client ID` y `Client Secret`
4. Añade como redirect URL la URL pública de la app y la local de desarrollo

Ejemplo local:

```text
http://localhost:5173
```

## 2. Extender la tabla `users`

Si tu tabla `users` aún no tiene estos campos, añade:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS google_login_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS google_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activation_email_sent_at TIMESTAMPTZ;
```

## 3. Extender la tabla `boards`

Cada tablero debe tener propietario:

```sql
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES users(id);
```

## 4. Crear membresías e invitaciones

```sql
CREATE TABLE IF NOT EXISTS board_members (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

CREATE TABLE IF NOT EXISTS board_invites (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(board_id, email)
);
```

## 5. Recomendación de seguridad

Añade políticas RLS para que:

- El propietario vea sus tableros
- Los miembros vean solo tableros donde estén asociados
- Solo el propietario pueda invitar o revocar accesos
- Un usuario no pueda leer ni editar tarjetas de tableros sin acceso

## 6. Tabla de votos para mejoras

Si quieres habilitar el backlog compartido con votos:

```sql
CREATE TABLE IF NOT EXISTS improvement_votes (
  id TEXT PRIMARY KEY,
  improvement_id TEXT NOT NULL REFERENCES improvements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(improvement_id, user_id)
);
```
