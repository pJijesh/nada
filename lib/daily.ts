/** Daily course content. Text and layout for each day card; the practice lines live in the lessons table. */
export type Tone = 'yellow' | 'green' | 'blue' | 'pink' | 'lilac';

export interface Circle { abbr: string; name: string; color: string }
export interface Seq { label?: string; items: string[]; tone?: Tone }

export type Section =
  | { kind: 'text'; tone: Tone; icon?: string; title?: string; heading?: string; paras: string[]; size?: 'full' | 'third' }
  | { kind: 'ideas'; title: string; items: { name: string; text: string; color: string }[]; after?: string }
  | { kind: 'circles'; title: string; circles: Circle[]; sequence: string[]; lead: string; after: string }
  | { kind: 'scale'; title: string; lead: string; aroh: string[]; avaroh: string[]; notice: string; after: string }
  | { kind: 'activity'; title: string; subtitle?: string; steps?: string[]; intro?: string; sequences?: Seq[]; why?: { title: string; text: string }; after?: string[]; note?: string; size?: 'full' | 'third' }
  | { kind: 'thought'; paras: string[]; script?: string; size?: 'full' | 'third' };

export interface DayLesson {
  day: number;
  kicker?: string;
  title: string;
  highlight?: string;
  aside: string[];
  sections: Section[];
  practice: { lessonId: string; label: string; findSa?: boolean };
  signoff: string;
}

export const COURSE = { id: 'carnatic-foundations', name: 'Carnatic foundations', tradition: 'carnatic' as const };

export const DAYS: DayLesson[] = [
  {
    day: 1,
    title: 'The Beginning of a Musical Journey',
    aside: ['Different notes…', 'Different emotions…', 'One eternal music…'],
    sections: [
      {
        kind: 'text', tone: 'yellow', icon: 'namaste', title: 'Welcome to Nada Sangamam!',
        paras: [
          'Music is not merely something we hear. Sometimes, it touches a place within us that words cannot reach.',
          'Carnatic music is a beautiful tradition where every raga has a unique identity, every rhythm has a structure, and every composition carries a story.',
        ],
      },
      {
        kind: 'ideas', title: 'Four musical ideas to know',
        items: [
          { name: 'Raga', text: 'The melodic framework that gives music its distinctive character.', color: 'var(--maroon)' },
          { name: 'Tala', text: 'The rhythmic cycle that gives music structure and movement.', color: 'var(--gold)' },
          { name: 'Bhava', text: 'The expressive feeling that brings music to life.', color: 'var(--green)' },
          { name: 'Nada', text: 'Sound, which is also contemplated as a pathway to spiritual experience in certain Indian philosophical traditions.', color: 'var(--navy)' },
        ],
        after: 'Over the coming days, we will discover beautiful ragas, legendary composers, timeless compositions, musical instruments, and the fascinating ideas behind Carnatic music.',
      },
      {
        kind: 'activity', title: 'Today’s mini-activity: Meet the seven swaras!', size: 'full',
        intro: 'Did you know that Carnatic music uses seven basic swara names?',
        sequences: [{ items: ['SA', 'RI', 'GA', 'MA', 'PA', 'DA', 'NI'], tone: 'blue' }],
        after: ['These are the seven swaras, followed by SA again at the higher octave.'],
        subtitle: 'Try this simple exercise:',
        steps: [
          'Take a comfortable breath.',
          'Slowly hum: SA – RI – GA – MA – PA – DA – NI – SA.',
          'Now sing or hum the notes backwards: SA – NI – DA – PA – MA – GA – RI – SA.',
          'Repeat gently and notice how the melody rises and falls.',
        ],
        note: 'No musical training is needed. Just enjoy the sound!',
      },
      {
        kind: 'thought', size: 'full',
        paras: ['You do not need to be a singer or musician to enjoy Carnatic music. You only need the willingness to listen.'],
        script: 'Let us begin this journey: one note, one raga, one story at a time.',
      },
    ],
    practice: { lessonId: 'c-day1-swaras', label: 'Hum it in the practice player' },
    signoff: 'Welcome to Nada Sangamam: where every note begins a new discovery.',
  },
  {
    day: 2,
    title: 'Discover the Magic of SA',
    aside: ['The journey of a thousand notes begins with one…', 'SA'],
    sections: [
      {
        kind: 'text', tone: 'yellow', icon: 'bulb', title: 'Did you know?',
        paras: [
          'Carnatic music has a musical home! That home is called SA, the first of the seven swaras!',
          'In Carnatic music, SA is known as Shadjam. It acts as the reference note around which the other swaras are understood.',
          'Unlike a fixed piano note, SA can be set at different pitches to suit a singer or instrumentalist.',
        ],
      },
      {
        kind: 'circles', title: 'Meet the seven swaras',
        circles: [
          { abbr: 'SA', name: 'Shadjam', color: '#D9506B' }, { abbr: 'RI', name: 'Rishabham', color: '#E98A2E' },
          { abbr: 'GA', name: 'Gandharam', color: '#E6B52F' }, { abbr: 'MA', name: 'Madhyamam', color: '#4E9A4A' },
          { abbr: 'PA', name: 'Panchamam', color: '#3C8CC4' }, { abbr: 'DA', name: 'Dhaivatam', color: '#8B5CB3' },
          { abbr: 'NI', name: 'Nishadam', color: '#9B54C8' },
        ],
        lead: 'Together, they create the familiar sequence:',
        sequence: ['SA', 'RI', 'GA', 'MA', 'PA', 'DA', 'NI', 'SA'],
        after: 'But here is something fascinating: the names are only the beginning. Carnatic music uses different varieties of RI, GA, MA, DA and NI, creating a rich range of melodic possibilities.',
      },
      {
        kind: 'activity', title: 'Today’s mini-activity: Find your SA!', size: 'third',
        steps: ['Gently hum a comfortable note.', 'Treat that note as your SA.', 'Slowly sing SA – PA – SA.', 'Listen to how the notes relate to one another.'],
        why: { title: 'Why PA?', text: 'Panchamam is a perfect fifth above SA in the standard swara relationship, making SA–PA–SA a useful beginner’s exercise.' },
        note: 'No instrument is needed. Just your voice and a little curiosity!',
      },
      {
        kind: 'thought', size: 'third',
        paras: [
          'Every beautiful musical journey needs a starting point.',
          'In Carnatic music, SA gives us that point of reference. Once we find our SA, the rest of the musical world begins to unfold.',
        ],
      },
    ],
    practice: { lessonId: 'c-day2-sapasa', label: 'Sing SA – PA – SA', findSa: true },
    signoff: 'Nada Sangamam: one note closer to understanding music.',
  },
  {
    day: 3,
    kicker: 'Meet the Raga',
    title: 'Mohanam',
    aside: ['Five notes.', 'Countless possibilities.'],
    sections: [
      {
        kind: 'text', tone: 'yellow', heading: 'Can just five notes create a world of musical beauty?',
        paras: [
          'Yes! Meet Mohanam, one of the most loved ragas in Carnatic music.',
          'The word Mohanam is associated with charm and enchantment, and its bright, graceful melodic character makes it a wonderful raga for beginners to discover.',
        ],
      },
      {
        kind: 'scale', title: 'The five-note magic',
        lead: 'Mohanam uses five swaras in its basic ascending and descending forms.',
        aroh: ['SA', 'RI₂', 'GA₃', 'PA', 'DA₂', 'SA'],
        avaroh: ['SA', 'DA₂', 'PA', 'GA₃', 'RI₂', 'SA'],
        notice: 'Notice something interesting? MA and NI are absent from these basic patterns!',
        after: 'Yet, these five notes can create countless beautiful musical phrases.',
      },
      {
        kind: 'text', tone: 'blue', icon: 'note', title: 'A composition to discover', size: 'third',
        paras: [
          'One celebrated composition in Mohanam is “Nannu Palimpa” by Saint Tyagaraja.',
          'Listen to a performance and notice how the melody moves between the notes, rather than simply climbing up and down the scale.',
        ],
      },
      {
        kind: 'activity', title: 'Today’s mini-activity: The Mohanam challenge', size: 'third',
        intro: 'Try humming this simple sequence slowly:',
        sequences: [
          { items: ['SA', 'RI', 'GA', 'PA', 'DA', 'SA'], tone: 'green' },
          { label: 'Now sing it backwards:', items: ['SA', 'DA', 'PA', 'GA', 'RI', 'SA'], tone: 'pink' },
        ],
        after: ['Can you notice how the melody rises and falls?'],
        note: 'Remember, this is a basic scale exercise. The full identity of Mohanam comes alive through its characteristic phrases and ornamentation.',
      },
      {
        kind: 'text', tone: 'pink', icon: 'headphones', title: 'Listening tip', size: 'third',
        paras: ['Search for “Mohanam raga alapana Carnatic music” and enjoy how an experienced musician explores the raga.'],
      },
      {
        kind: 'thought', size: 'full',
        paras: ['A raga is not defined by how many notes it contains, but by the beauty of how those notes come together.'],
      },
    ],
    practice: { lessonId: 'c-day3-mohanam', label: 'Sing Mohanam up and down' },
    signoff: 'Nada Sangamam: every raga opens a new world.',
  },
];

export function getDay(n: number): DayLesson | undefined {
  return DAYS.find((d) => d.day === n);
}
