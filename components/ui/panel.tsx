import type { ReactNode } from 'react';

export default function Panel({ title, meta, children }: { title?: string; meta?: string; children: ReactNode }) {
  return <section className="panel">{title ? <div className="panel-heading"><h2>{title}</h2>{meta ? <span>{meta}</span> : null}</div> : null}{children}</section>;
}
