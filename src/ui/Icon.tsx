import { useLayoutEffect, useRef } from 'react';
import { setIcon } from 'obsidian';

type IconName = 'sparkles' | 'plus' | 'settings' | 'arrow-up-right' | 'mic' | 'square' | 'arrow-up' | 'loader-circle' | 'chevron-right' | 'check' | 'circle-alert';

/** Obsidian's bundled Lucide SVGs: no font download or extra icon dependency. */
export function Icon({ name }: { name: IconName }) {
  const element = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => { if (element.current) setIcon(element.current, name); }, [name]);
  return <span ref={element} className="sp-icon" aria-hidden="true" />;
}
