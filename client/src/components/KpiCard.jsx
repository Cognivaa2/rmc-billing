import clsx from 'clsx';
import { Link } from 'react-router-dom';

export function KpiCard({ title, value, hint, accent = false, icon, to, state }) {
  const content = (
    <>
      <div
        className={clsx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          accent ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-600',
          !icon && 'hidden'
        )}
      >
        {icon}
      </div>
      <div>
        <div className={clsx('text-xs font-medium', accent ? 'text-white/80' : 'text-slate-500')}>
          {title}
        </div>
        <div className="mt-0.5 text-2xl font-semibold">{value}</div>
        {hint && (
          <div className={clsx('mt-1 text-xs', accent ? 'text-white/75' : 'text-slate-400')}>
            {hint}
          </div>
        )}
      </div>
    </>
  );

  const className = clsx(
    'card card-body flex items-start gap-4 transition-all duration-200',
    accent ? 'bg-brand-600 text-white shadow-lg' : 'bg-white',
    to && 'hover:-translate-y-1 hover:shadow-md cursor-pointer'
  );

  if (to) {
    return (
      <Link to={to} state={state} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
