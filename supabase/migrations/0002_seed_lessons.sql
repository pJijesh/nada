-- Sample curriculum. Every line needs teacher review before real students use it.
insert into public.lessons (id, tradition, grp, name, notes, scale, sort_order) values
  ('h-sargam',   'hindustani', 'Exercises', 'Sargam in the scale',     'S R G M P D N S+', null, 10),
  ('h-alankar1', 'hindustani', 'Exercises', 'Alankar 1, in threes',    'S R G R G M G M P M P D', null, 20),
  ('h-yaman',    'hindustani', 'Ragas',     'Yaman, aroh',             'N- R G M P D N S+', 'Kalyan', 30),
  ('h-bhupali',  'hindustani', 'Ragas',     'Bhupali, aroh and avroh', 'S R G P D S+ D P G R S', 'Bilawal', 40),
  ('h-bhairav',  'hindustani', 'Ragas',     'Bhairav, aroh and avroh', 'S R G M P D N S+ S+ N D P M G R S', 'Bhairav', 50),
  ('c-sarali1',  'carnatic',   'Varisai',   'Sarali varisai 1',        'S R G M P D N S+ S+ N D P M G R S', null, 10),
  ('c-janta',    'carnatic',   'Varisai',   'Janta varisai',           'S S R R G G M M P P D D N N S+ S+', null, 20),
  ('c-datu',     'carnatic',   'Varisai',   'Datu varisai',            'S G R M G P M D P N D S+', null, 30)
on conflict (id) do update set
  tradition = excluded.tradition, grp = excluded.grp, name = excluded.name,
  notes = excluded.notes, scale = excluded.scale, sort_order = excluded.sort_order;
