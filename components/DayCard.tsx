import Link from 'next/link';
import type { DayLesson, Section, Tone } from '@/lib/daily';
import { Diya, Lotus, Sprig } from './art';
import { TanpuraSvg } from './graphics';

const ICONS: Record<string, string> = { namaste: '🙏', bulb: '💡', note: '♪', headphones: '🎧' };

function Pills({ items, tone }: { items: string[]; tone?: Tone }) {
  return (
    <div className={`pills ${tone ?? 'yellow'}`}>
      {items.map((x, i) => <span key={i} className="pill-item">{x}{i < items.length - 1 && <span className="dash" aria-hidden="true"> – </span>}</span>)}
    </div>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return <ol className="num">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>;
}

function Block({ s }: { s: Section }) {
  switch (s.kind) {
    case 'text':
      return (
        <section className={`panel ${s.tone}`}>
          {s.title && <h3 className="ptitle">{s.icon && <span aria-hidden="true">{ICONS[s.icon]} </span>}{s.title}</h3>}
          {s.heading && <h2 className="phead">{s.heading}</h2>}
          {s.paras.map((p, i) => <p key={i}>{p}</p>)}
        </section>
      );
    case 'ideas':
      return (
        <section className="panel yellow">
          <h2 className="phead">{s.title}</h2>
          <div className="ideas">
            {s.items.map((x) => (
              <div key={x.name} className="idea">
                <span className="dot" style={{ background: x.color }} aria-hidden="true" />
                <h4 style={{ color: x.color }}>{x.name}</h4>
                <p>{x.text}</p>
              </div>
            ))}
          </div>
          <p className="after">{s.after}</p>
        </section>
      );
    case 'circles':
      return (
        <section className="panel blue">
          <h2 className="phead">{s.title}</h2>
          <div className="circles">
            {s.circles.map((c) => (
              <div key={c.abbr} className="circ"><span style={{ background: c.color }}>{c.abbr}</span><small>{c.name}</small></div>
            ))}
          </div>
          <p className="center">{s.lead}</p>
          <Pills items={s.sequence} tone="yellow" />
          <p className="after">{s.after}</p>
        </section>
      );
    case 'scale':
      return (
        <section className="panel yellow">
          <h2 className="phead">{s.title}</h2>
          <p>{s.lead}</p>
          <div className="pair">
            <div><h4 className="up">↗ Arohanam <small>(ascending)</small></h4><Pills items={s.aroh} tone="green" /></div>
            <div><h4 className="down">↓ Avarohanam <small>(descending)</small></h4><Pills items={s.avaroh} tone="pink" /></div>
          </div>
          <p className="center"><strong>{s.notice}</strong></p>
          <p className="center after">{s.after}</p>
        </section>
      );
    case 'activity':
      return (
        <section className="panel green">
          <h3 className="ptitle">🎯 {s.title}</h3>
          {s.intro && <p>{s.intro}</p>}
          {s.sequences?.map((q, i) => (
            <div key={i}>{q.label && <p className="lab">{q.label}</p>}<Pills items={q.items} tone={q.tone} /></div>
          ))}
          {s.after?.map((p, i) => <p key={i}>{p}</p>)}
          {s.subtitle && <p className="lab">{s.subtitle}</p>}
          {s.steps && <Steps steps={s.steps} />}
          {s.why && <div className="why"><strong>💡 {s.why.title}</strong><p>{s.why.text}</p></div>}
          {s.note && <p className="script note">{s.note}</p>}
        </section>
      );
    case 'thought':
      return (
        <section className="panel pink">
          <h3 className="ptitle">🪷 Today’s musical thought</h3>
          {s.paras.map((p, i) => <p key={i} className="script quote">{p}</p>)}
          {s.script && <p className="script quote strong">{s.script}</p>}
        </section>
      );
  }
}

/** Group consecutive 'third' sections into one row; everything else gets its own row. */
function rows(sections: Section[]): Section[][] {
  const out: Section[][] = [];
  for (const s of sections) {
    const size = 'size' in s ? s.size : undefined;
    const last = out[out.length - 1];
    if (size === 'third' && last && 'size' in last[0] && last[0].size === 'third' && last.length < 3) last.push(s);
    else out.push([s]);
  }
  return out;
}

export default function DayCard({ lesson }: { lesson: DayLesson }) {
  return (
    <article className="day" data-trad="carnatic">
      <header className="dayhead">
        <div className="art left" aria-hidden="true">
          <Sprig size={90} className="sprig" />
          <TanpuraSvg plucks={[0, 0, 0, 0]} />
          <Diya size={54} className="diya" />
        </div>
        <div className="center">
          <span className="brush green">Day {lesson.day}</span>
          {lesson.kicker && <p className="script kicker">{lesson.kicker}</p>}
          <h1 className="daytitle">{lesson.title}</h1>
        </div>
        <div className="art right" aria-hidden="true">
          <aside className="bubble script">{lesson.aside.map((l, i) => <span key={i}>{l}</span>)}</aside>
          <Lotus size={96} />
        </div>
      </header>
      <div className="daybody">
        {rows(lesson.sections).map((r, i) => (
          <div key={i} className={'row3 n' + r.length}>{r.map((s, j) => <Block key={j} s={s} />)}</div>
        ))}
      </div>
    </article>
  );
}

export function TryIt({ lesson }: { lesson: DayLesson }) {
  return (
    <div className="tryit">
      <Link className="btn primary" href={`/practice?lesson=${lesson.practice.lessonId}`}>{lesson.practice.label}</Link>
      {lesson.practice.findSa && <Link className="btn" href="/practice#find-sa">Find my Sa</Link>}
    </div>
  );
}
