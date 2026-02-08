# Sistema de Votación Escolar (Internet, gratis)

Esta versión está lista para **subir a Internet gratis** usando:
- **Vercel** (hosting del sitio + APIs serverless)
- **Supabase** (base de datos Postgres)

No requiere Firebase, no es modo demo.

---

## 1) Crear la base de datos en Supabase (gratis)

1. Crea un proyecto en Supabase.
2. Ve a **SQL Editor** y ejecuta este script:

```sql
-- Tabla de configuración (fila única id=1)
create table if not exists config (
  id int primary key,
  school_name text,
  logo_url text,
  election_status text not null default 'active',
  updated_at timestamptz not null default now()
);

insert into config (id, school_name, logo_url, election_status)
values (1, 'Institución Educativa', null, 'active')
on conflict (id) do nothing;

-- Estudiantes
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade int not null,
  course int not null,
  list_number int,
  access_code text not null unique,
  has_voted boolean not null default false,
  voted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Candidatos
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

-- Votos
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  access_code text,
  candidate_id uuid not null references candidates(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Función para votar de forma atómica (evita doble voto)
create or replace function cast_vote(p_access_code text, p_candidate_id uuid)
returns json
language plpgsql
as $$
declare
  s students;
  v_id uuid;
begin
  select * into s from students where access_code = p_access_code;
  if not found then
    return json_build_object('ok', false, 'error', 'Código no encontrado');
  end if;

  if s.has_voted then
    return json_build_object('ok', false, 'error', 'Este código ya votó');
  end if;

  insert into votes (student_id, access_code, candidate_id)
  values (s.id, p_access_code, p_candidate_id)
  returning id into v_id;

  update students
    set has_voted = true,
        voted_at = now()
  where id = s.id;

  return json_build_object('ok', true, 'vote_id', v_id);
end;
$$;
```

---

## 2) Configurar variables en Vercel

En tu proyecto de Supabase:
- **SUPABASE_URL**: lo encuentras en *Settings → API*
- **SUPABASE_SERVICE_ROLE_KEY**: *Settings → API → service_role* (IMPORTANTE: solo en el servidor)

En Vercel:
1. Importa el repo/carpeta.
2. Ve a **Settings → Environment Variables** y agrega:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy.

---

## 3) Uso

- Panel de Administración: contraseña por defecto **ADMIN2026**
- Importar estudiantes: desde Excel (**Nombre, Grado, Curso**). Si trae columna **Lista** se respeta; si no, se asigna.
- Los códigos se generan con el formato: **<grado><curso><númeroLista 2 dígitos>**
  - Ej: **6112** = grado 6, curso 1, lista 12.

---

## Endpoints (internos)

- `GET /api/health`
- `GET/POST /api/config`
- `GET/POST /api/candidates`
- `PUT/DELETE /api/candidates/:id`
- `GET /api/students`
- `POST /api/students/add`
- `POST /api/students/update`
- `POST /api/students/delete-by-code`
- `POST /api/students/verify-code`
- `POST /api/students/generate-codes`
- `POST /api/students/bulk`
- `POST /api/vote`
- `GET /api/stats`
- `POST /api/admin/reset-votes`
- `POST /api/admin/export`

