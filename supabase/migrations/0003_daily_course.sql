-- Daily course: practice lines for Days 1 to 3, and per-user progress (completed, hearted).
-- The day cards themselves (text and layout) live in lib/daily.ts.
insert into public.lessons (id, tradition, grp, name, notes, scale, sort_order) values
  ('c-day1-swaras',  'carnatic', 'Daily course', 'Day 1 · The seven swaras',  'S R G M P D N S+ S+ N D P M G R S', 'Shankarabharanam', 100),
  ('c-day2-sapasa',  'carnatic', 'Daily course', 'Day 2 · Sa, Pa, Sa',        'S P S', 'Shankarabharanam', 110),
  ('c-day3-mohanam', 'carnatic', 'Daily course', 'Day 3 · Mohanam',           'S R G P D S+ D P G R S', 'Shankarabharanam', 120)
on conflict (id) do update set
  tradition = excluded.tradition, grp = excluded.grp, name = excluded.name,
  notes = excluded.notes, scale = excluded.scale, sort_order = excluded.sort_order;

create table public.daily_progress (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course text not null default 'carnatic-foundations' check (char_length(course) between 1 and 60),
  day int not null check (day between 1 and 365),
  completed_at timestamptz,
  hearted boolean not null default false,
  primary key (user_id, course, day)
);

alter table public.daily_progress enable row level security;
create policy daily_own_read on public.daily_progress for select to authenticated using (user_id = auth.uid());
create policy daily_own_insert on public.daily_progress for insert to authenticated with check (user_id = auth.uid());
create policy daily_own_update on public.daily_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy daily_own_delete on public.daily_progress for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.daily_progress to authenticated;
