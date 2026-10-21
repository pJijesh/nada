# Sur

Free, in-browser riyaz practice for Hindustani and Carnatic singers, with accounts, saved progress and teacher tools.

- **Students:** hear a line against a synthesised tanpura and tabla / tala, sing it back, see which swaras were in tune, low, high or missed, drill the slips, find a comfortable Sa, save progress, join a teacher's class.
- **Teachers:** create classes (6-character join code), assign lines, see each student's best score. A teacher sees a student's attempts **only on lines assigned to a class they share**.
- **Guests** can practise without an account; nothing is saved.

Stack: Next.js 15 (App Router, TypeScript), Supabase (Auth, Postgres, row-level security), Web Audio in the browser. No audio leaves the device: pitch is analysed locally and only per-swara results are stored.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and publishable (anon) key
npm run dev                  # http://localhost:3000
```

Without Supabase variables the app still runs: guest practice works, account pages show a setup notice.

## Set up Supabase

1. Create a project at supabase.com.
2. Run `supabase/migrations/0001_init.sql`, then `0002_seed_lessons.sql` (SQL editor, or `supabase db push`).
3. Authentication → URL configuration: set the Site URL to your deployed URL and add `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback` as redirect URLs.
4. Authentication → Providers → Email: leave "Confirm email" on for production.
5. Put the project URL and anon / publishable key in `.env.local` and in your host's environment variables.

## Deploy

Any Node host works. On Vercel: import the repo, add the two `NEXT_PUBLIC_SUPABASE_*` variables, deploy.

## Tests

```bash
npm test          # pitch engine (19 checks) and stats helpers
npm run typecheck
PGPORT=5544 PGHOST=/tmp PGUSER=postgres npm run test:db   # access rules, on a throwaway local Postgres
```

`test:db` loads the migrations into a plain Postgres with a small stand-in for Supabase's `auth` schema, then checks who can read and write what: students see only their own data, teachers only see attempts on lessons they assigned in a class they teach, anonymous visitors only read lessons, and a student who leaves a class stops being visible to that teacher.

## Layout

| Path | What it is |
|---|---|
| `lib/engine.js` | Pitch maths, YIN tracking, scoring, Sa finder (pure functions, shared with the tests) |
| `lib/audio.ts` | Web Audio synthesis: tanpura, harmonium, violin, tabla, tala keeper |
| `components/Player.tsx` | The practice player |
| `components/SaFinder.tsx` | Find my Sa |
| `app/` | Pages and server actions (`actions.ts`) |
| `supabase/migrations/` | Schema, row-level security, sample lessons |

## Known limits

- Scoring is pitch only, octave-folded, in tune within ±30 cents. Timing, gamaka and meend are not scored.
- Sounds are synthesised. Recorded instruments are a later step.
- Lesson content is a small sample and **needs teacher review** before real students rely on it. Rupaka tala follows one published source and is unconfirmed.
- Anyone can choose "Teacher" at sign-up. That is safe for privacy (teachers only see students who joined their class code and only on assigned lines) but you may want approval before public launch.
- Join codes use `random()`, which is fine for classroom codes but should not guard sensitive data.
- Practice-day streaks use UTC days.
