export type Tradition = 'hindustani' | 'carnatic';
export type Script = 'latin' | 'deva';
export type Act = 'clap' | 'finger' | 'wave';

export interface Lesson {
  id: string;
  tradition: Tradition;
  grp: string;
  name: string;
  notes: string;
  scale: string | null;
}

export interface TaalDef {
  name: string;
  beats: number;
  bols?: string[];
  acts?: Act[];
  /** x sam, 2/3 tali, 0 khali (Hindustani); c clap, w wave (Carnatic) */
  marks: Record<number, string>;
  legend: string;
}

export const MELA_NO: Record<string, number> = {
  Mayamalavagowla: 15, Shankarabharanam: 29, Kharaharapriya: 22, Kalyani: 65, Hanumatodi: 8,
};

export const SYL: Record<Tradition, Record<Script, string[]>> = {
  hindustani: { latin: ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'], deva: ['सा', 'रे', 'ग', 'म', 'प', 'ध', 'नि'] },
  carnatic: { latin: ['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'], deva: ['सा', 'रि', 'ग', 'म', 'प', 'ध', 'नि'] },
};

export const DEGREE_LETTERS = ['S', 'R', 'G', 'M', 'P', 'D', 'N'];

export const TAALS: Record<Tradition, Record<string, TaalDef>> = {
  hindustani: {
    teentaal: {
      name: 'Teentaal · 16 beats', beats: 16,
      bols: 'Dha Dhin Dhin Dha Dha Dhin Dhin Dha Dha Tin Tin Ta Ta Dhin Dhin Dha'.split(' '),
      marks: { 0: 'x', 4: '2', 8: '0', 12: '3' },
      legend: 'x sam, 2 and 3 tali, 0 khali. Bols: Dha Dhin Dhin Dha, repeated, then Dha Tin Tin Ta, Ta Dhin Dhin Dha.',
    },
    jhaptaal: {
      name: 'Jhaptaal · 10 beats', beats: 10,
      bols: 'Dhi Na Dhi Dhi Na Ti Na Dhi Dhi Na'.split(' '),
      marks: { 0: 'x', 2: '2', 5: '0', 7: '3' },
      legend: 'x sam, 2 and 3 tali, 0 khali. Grouped 2, 3, 2, 3.',
    },
    keherwa: {
      name: 'Keherwa · 8 beats', beats: 8,
      bols: 'Dha Ge Na Ti Na Ge Dhi Na'.split(' '),
      marks: { 0: 'x', 4: '0' },
      legend: 'x sam, 0 khali. Grouped 4, 4.',
    },
  },
  carnatic: {
    adi: {
      name: 'Adi tala · 8 beats', beats: 8,
      acts: ['clap', 'finger', 'finger', 'finger', 'clap', 'wave', 'clap', 'wave'],
      marks: { 0: 'c', 4: 'c', 5: 'w', 6: 'c', 7: 'w' },
      legend: 'Clap on 1, then three finger counts. Clap on 5, wave on 6, clap on 7, wave on 8.',
    },
    rupaka: {
      name: 'Rupaka tala · 6 beats', beats: 6,
      acts: ['clap', 'wave', 'clap', 'finger', 'finger', 'finger'],
      marks: { 0: 'c', 1: 'w', 2: 'c' },
      legend: 'Drutam: clap on 1, wave on 2. Laghu: clap on 3, then three finger counts. Shown as published on karnatik.com. Check the starting beat with your teacher.',
    },
  },
};

export const BOL: Record<string, { d?: 'open' | 'ring' | 'tap'; b?: boolean }> = {
  Dha: { d: 'open', b: true }, Dhin: { d: 'open', b: true }, Dhi: { d: 'open', b: true },
  Na: { d: 'open' }, Tin: { d: 'ring' }, Ta: { d: 'tap' }, Ti: { d: 'tap' }, Ge: { b: true },
};

export const DEFAULTS: Record<Tradition, { scale: string; taal: string; inst: 'harmonium' | 'violin' }> = {
  hindustani: { scale: 'Bilawal', taal: 'teentaal', inst: 'harmonium' },
  carnatic: { scale: 'Mayamalavagowla', taal: 'adi', inst: 'violin' },
};
