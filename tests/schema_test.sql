\set ON_ERROR_STOP on
-- Users: t1,t2 teachers, s1,s2 students (created through the auth trigger)
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','t1@x.test','{"display_name":"Teacher One","role":"teacher"}'),
 ('00000000-0000-0000-0000-0000000000a2','t2@x.test','{"role":"teacher"}'),
 ('00000000-0000-0000-0000-0000000000b1','s1@x.test','{"display_name":"Student One"}'),
 ('00000000-0000-0000-0000-0000000000b2','s2@x.test','{"display_name":"Student Two","role":"admin"}');

do $$ begin
  assert (select count(*) from public.profiles) = 4, 'trigger creates 4 profiles';
  assert (select role from public.profiles where id='00000000-0000-0000-0000-0000000000b2') = 'student', 'unknown role falls back to student';
  assert (select display_name from public.profiles where id='00000000-0000-0000-0000-0000000000a2') = 't2', 'display name falls back to email prefix';
  assert (select count(*) from public.lessons) = 8, 'seed lessons';
end $$;

-- As teacher 1: create a class, assign a lesson
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into public.classes (name) values ('Evening batch');
do $$ begin
  assert (select count(*) from public.classes) = 1, 'teacher sees own class';
  assert (select length(join_code) from public.classes) = 6, 'join code is 6 chars';
end $$;
insert into public.assignments (class_id, lesson_id, note)
  select id, 'h-sargam', 'Slowly, with the tanpura' from public.classes;

-- Student cannot create a class
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  begin
    insert into public.classes (teacher_id, name) values ('00000000-0000-0000-0000-0000000000b1','Nope');
    raise exception 'student created a class';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- Student joins by code (lowercase, padded) and sees class + assignment
do $$ declare c text; cid uuid; begin
  reset role;
  select join_code into c from public.classes limit 1;
  set role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
  cid := public.join_class('  ' || lower(c) || ' ');
  assert cid is not null, 'join_class returns id';
  begin perform public.join_class('ZZZZZZ'); raise exception 'bad code accepted';
  exception when raise_exception then assert sqlerrm like 'No class found%', 'bad code message'; end;
end $$;
do $$ begin
  assert (select count(*) from public.classes) = 1, 'member sees class';
  assert (select count(*) from public.assignments) = 1, 'member sees assignment';
  assert (select count(*) from public.profiles) = 2, 'student sees self and own teacher only';
end $$;

-- Student saves attempts: assigned lesson and an unassigned one
insert into public.attempts (user_id, lesson_id, source, sa_note, sa_oct, scale, tuning, bpm, taal, in_tune, total, notes)
  values ('00000000-0000-0000-0000-0000000000b1','h-sargam','mic',2,3,'Bilawal','just',60,'teentaal',5,8,'[]');
insert into public.attempts (user_id, lesson_id, source, sa_note, sa_oct, scale, tuning, bpm, taal, in_tune, total, notes)
  values ('00000000-0000-0000-0000-0000000000b1','c-janta','upload',2,3,'Mayamalavagowla','just',60,'adi',9,16,'[]');
do $$ begin
  begin
    insert into public.attempts (user_id, lesson_id, source, sa_note, sa_oct, scale, tuning, bpm, taal, in_tune, total, notes)
      values ('00000000-0000-0000-0000-0000000000b2','h-sargam','mic',2,3,'Bilawal','just',60,'teentaal',5,8,'[]');
    raise exception 'inserted attempt for another user';
  exception when insufficient_privilege or others then
    assert sqlstate in ('42501'), 'RLS blocks writing as someone else: ' || sqlstate;
  end;
  begin
    insert into public.attempts (user_id, lesson_id, source, sa_note, sa_oct, scale, tuning, bpm, taal, in_tune, total, notes)
      values ('00000000-0000-0000-0000-0000000000b1','h-sargam','demo',2,3,'Bilawal','just',60,'teentaal',5,8,'[]');
    raise exception 'demo source accepted';
  exception when check_violation then null; end;
end $$;

-- Student 2 (not in the class) sees no class, no assignments, no one else's attempts
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  assert (select count(*) from public.classes) = 0, 's2 sees no classes';
  assert (select count(*) from public.assignments) = 0, 's2 sees no assignments';
  assert (select count(*) from public.attempts) = 0, 's2 sees no attempts';
  assert (select count(*) from public.profiles) = 1, 's2 sees only self';
end $$;

-- Teacher 1 sees student 1's attempt on the assigned lesson only
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  assert (select count(*) from public.attempts) = 1, 'teacher sees one assigned-lesson attempt';
  assert (select lesson_id from public.attempts) = 'h-sargam', 'and it is the assigned lesson';
  assert (select count(*) from public.profiles) = 2, 'teacher sees self and class student';
  assert (select count(*) from public.class_members) = 1, 'teacher sees roster';
end $$;

-- Teacher 2 sees nothing of teacher 1's world
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  assert (select count(*) from public.classes) = 0, 't2 sees no classes';
  assert (select count(*) from public.attempts) = 0, 't2 sees no attempts';
  assert (select count(*) from public.class_members) = 0, 't2 sees no roster';
end $$;
-- t2 cannot assign into t1's class even when it knows the class id
reset role;
select set_config('app.t1class', (select id::text from public.classes limit 1), false) \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ declare blocked boolean := false; begin
  begin
    insert into public.assignments (class_id, lesson_id) values (current_setting('app.t1class')::uuid, 'c-datu');
  exception when insufficient_privilege then blocked := true; end;
  assert blocked, 't2 cannot assign into t1 class';
end $$;

-- Anonymous visitors read lessons but nothing else
reset role; set role anon; set request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.lessons) = 8, 'anon reads lessons';
  begin perform count(*) from public.attempts; raise exception 'anon read attempts';
  exception when insufficient_privilege then null; end;
end $$;

-- Student leaves class: teacher stops seeing the student's attempts
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
delete from public.class_members;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  assert (select count(*) from public.attempts) = 0, 'after leaving, teacher sees no attempts';
end $$;
\echo SCHEMA TESTS PASSED
