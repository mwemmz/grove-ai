/* What a screen shows before there is anything on it: the cap, one line on what goes here, and how to start. */
import { ArrowRight } from 'lucide-react';
import { GradCap } from './GradCap';
import { primaryBtn } from './ui';

export function EmptyState({ title, text, action }: { title: string; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="animate-slide-up flex flex-col items-center px-4 py-10 text-center">
      <GradCap className="w-40 opacity-80" />
      <p className="mt-4 font-display text-xl text-text">{title}</p>
      <p className="mt-1 max-w-[36ch] text-sm text-muted">{text}</p>
      {action && (
        <button onClick={action.onClick} className={`${primaryBtn} mt-5`}>
          {action.label} <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
