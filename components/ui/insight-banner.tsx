import type { ReactNode } from 'react';

export default function InsightBanner({ children }: { children: ReactNode }) { return <aside className="insight-banner">{children}</aside>; }
