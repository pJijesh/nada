import type { Lesson } from './content';

/** Used when Supabase is not configured yet, so the practice player still works locally. Mirrors supabase/seed.sql. */
export const FALLBACK_LESSONS: Lesson[] = [
  { id: 'h-sargam', tradition: 'hindustani', grp: 'Exercises', name: 'Sargam in the scale', notes: 'S R G M P D N S+', scale: null },
  { id: 'h-alankar1', tradition: 'hindustani', grp: 'Exercises', name: 'Alankar 1, in threes', notes: 'S R G R G M G M P M P D', scale: null },
  { id: 'h-yaman', tradition: 'hindustani', grp: 'Ragas', name: 'Yaman, aroh', notes: 'N- R G M P D N S+', scale: 'Kalyan' },
  { id: 'h-bhupali', tradition: 'hindustani', grp: 'Ragas', name: 'Bhupali, aroh and avroh', notes: 'S R G P D S+ D P G R S', scale: 'Bilawal' },
  { id: 'h-bhairav', tradition: 'hindustani', grp: 'Ragas', name: 'Bhairav, aroh and avroh', notes: 'S R G M P D N S+ S+ N D P M G R S', scale: 'Bhairav' },
  { id: 'c-sarali1', tradition: 'carnatic', grp: 'Varisai', name: 'Sarali varisai 1', notes: 'S R G M P D N S+ S+ N D P M G R S', scale: null },
  { id: 'c-janta', tradition: 'carnatic', grp: 'Varisai', name: 'Janta varisai', notes: 'S S R R G G M M P P D D N N S+ S+', scale: null },
  { id: 'c-datu', tradition: 'carnatic', grp: 'Varisai', name: 'Datu varisai', notes: 'S G R M G P M D P N D S+', scale: null },
];
