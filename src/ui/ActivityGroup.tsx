import type { PropsWithChildren } from 'react';
import { Icon } from './Icon';

export function ActivityGroup({ label, running, children }: PropsWithChildren<{ label: string; running: boolean }>) {
  return <details className="sp-activity" data-running={running}>
    <summary><Icon name="chevron-right" /><span className="sp-activity-label" role="status" aria-live="polite">{label}</span></summary>
    <div className="sp-activity-timeline">{children ?? <p className="sp-activity-empty">Estoy preparando el siguiente paso.</p>}</div>
  </details>;
}
