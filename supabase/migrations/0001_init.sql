-- Sur: schema, row-level security and helpers.
-- Roles: students practise and join classes with a code; teachers create classes,
-- assign lessons and see their students' attempts on the lessons they assigned.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

create table public.lessons (
  id text primary key,
  tradition text not null check (tradition in ('hindustani', 'carnatic')),
  grp text not null,
  name text not null,
  notes text not null,
  scale text,
  sort_order int not null default 0,
  published boolean not null default true
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index class_members_student_idx on public.class_members (student_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  note text check (note is null or char_length(note) <= 500),
  due_date date,
  created_at timestamptz not null default now(),
  unique (class_id, lesson_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  drill boolean not null default false,
  source text not null check (source in ('mic', 'upload')),
  sa_note int not null check (sa_note between 0 and 11),
  sa_oct int not null check (sa_oct between 2 and 4),
  scale text not null,
  tuning text not null check (tuning in ('just', 'equal')),
  bpm int not null check (bpm between 30 and 240),
  taal text not null,
  in_tune int not null,
  total int not null check (total between 1 and 64),
  notes jsonb not null check (jsonb_typeof(notes) = 'array'),
  created_at timestamptz not null default now(),
  check (in_tune between 0 and total)
);
create index attempts_user_idx on public.attempts (user_id, created_at desc);
create index attempts_lesson_idx on public.attempts (lesson_id, user_id);

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so policies can look across tables without recursion.
-- ---------------------------------------------------------------------------
create function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

create function public.is_class_teacher(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes where id = cid and teacher_id = auth.uid());
$$;

create function public.is_class_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.class_members where class_id = cid and student_id = auth.uid());
$$;

-- True when the signed-in teacher has this student in one of their classes.
create function public.teaches_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members m join public.classes c on c.id = m.class_id
    where m.student_id = sid and c.teacher_id = auth.uid());
$$;

-- True when the signed-in student is in one of this teacher's classes.
create function public.learns_from(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members m join public.classes c on c.id = m.class_id
    where m.student_id = auth.uid() and c.teacher_id = tid);
$$;

-- A teacher sees a student's attempts only for lessons assigned in a class they share.
create function public.teacher_sees_attempt(sid uuid, lid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members m
    join public.classes c on c.id = m.class_id
    join public.assignments a on a.class_id = c.id
    where m.student_id = sid and a.lesson_id = lid and c.teacher_id = auth.uid());
$$;

create function public.gen_join_code() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  code text; i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = code);
  end loop;
  return code;
end $$;
alter table public.classes alter column join_code set default public.gen_join_code();

-- Students join a class with its code. Returns the class id.
create function public.join_class(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; r text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select role into r from public.profiles where id = auth.uid();
  if r is distinct from 'student' then raise exception 'Only student accounts can join a class'; end if;
  select id into cid from public.classes where join_code = upper(trim(code));
  if cid is null then raise exception 'No class found for that code'; end if;
  insert into public.class_members (class_id, student_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

-- Profile row for every new auth user. Role comes from sign-up metadata (student by default).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Singer'), 60),
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.attempts enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.teaches_student(id) or public.learns_from(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy lessons_read on public.lessons for select to anon, authenticated using (published);

create policy classes_teacher_all on public.classes for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and public.is_teacher());
create policy classes_member_read on public.classes for select to authenticated
  using (public.is_class_member(id));

create policy members_student_read on public.class_members for select to authenticated
  using (student_id = auth.uid() or public.is_class_teacher(class_id));
create policy members_leave on public.class_members for delete to authenticated
  using (student_id = auth.uid() or public.is_class_teacher(class_id));

create policy assignments_teacher_all on public.assignments for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy assignments_member_read on public.assignments for select to authenticated
  using (public.is_class_member(class_id));

create policy attempts_own_read on public.attempts for select to authenticated
  using (user_id = auth.uid() or public.teacher_sees_attempt(user_id, lesson_id));
create policy attempts_own_insert on public.attempts for insert to authenticated
  with check (user_id = auth.uid());
create policy attempts_own_delete on public.attempts for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (explicit, so the schema works the same on any Postgres)
-- ---------------------------------------------------------------------------
grant select on public.lessons to anon, authenticated;
grant select on public.profiles, public.classes, public.class_members, public.assignments, public.attempts to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, update, delete on public.classes, public.assignments to authenticated;
grant delete on public.class_members to authenticated;
grant insert, delete on public.attempts to authenticated;
grant execute on function public.join_class(text) to authenticated;
revoke execute on function public.join_class(text) from anon, public;
