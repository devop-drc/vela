// Shared section heading — style comes from config.layout.sectionHeader:
//  centered  — icon + title, centered (the classic look)
//  left      — small-caps eyebrow above a left-aligned title, action link right
//  editorial — title on the baseline with a hairline rule running to the action
// The eyebrow defaults to the block's purpose; `action` is an optional link.

import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';

interface Props {
  title: ReactNode;
  icon?: LucideIcon;
  eyebrow?: string;
  /** Optional "view all"-style link rendered by the left/editorial styles. */
  action?: { label: string; to: string };
  className?: string;
}

export const SectionHeader = ({ title, icon: Icon, eyebrow, action, className }: Props) => {
  const config = useStorefrontConfig();
  const style = config.layout.sectionHeader ?? 'centered';

  const actionLink = action && (
    <Link
      to={action.to}
      className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {action.label}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );

  if (style === 'left') {
    return (
      <div className={cn('mb-8 flex items-end justify-between gap-4', className)}>
        <div className="min-w-0">
          {eyebrow && <p className="sf-eyebrow mb-1.5 !text-primary">{eyebrow}</p>}
          <h2 className="sf-heading text-2xl md:text-3xl font-bold leading-tight">{title}</h2>
        </div>
        {actionLink}
      </div>
    );
  }

  if (style === 'editorial') {
    return (
      <div className={cn('mb-8 flex items-baseline gap-5', className)}>
        <h2 className="sf-heading shrink-0 text-2xl md:text-3xl font-bold leading-tight">{title}</h2>
        <span className="h-px flex-1 bg-border" aria-hidden />
        {actionLink}
      </div>
    );
  }

  // centered (default)
  return (
    <h2 className={cn('sf-heading mb-8 flex items-center justify-center gap-3 text-center text-3xl md:text-4xl font-bold', className)}>
      {Icon && <Icon className="h-7 w-7 text-primary" />} {title}
    </h2>
  );
};
