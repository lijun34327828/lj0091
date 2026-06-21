import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '待取货', className: 'bg-amber-100 text-amber-700' },
  partial_picked: { label: '部分取货', className: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  locked: { label: '已锁定', className: 'bg-red-100 text-red-700' },
  arrived: { label: '已到店', className: 'bg-slate-100 text-slate-600' },
  prepared: { label: '已备货', className: 'bg-primary-100 text-primary-700' },
  picked: { label: '已取货', className: 'bg-green-100 text-green-700' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-600',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
