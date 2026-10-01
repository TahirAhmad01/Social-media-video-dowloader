import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors select-none font-mono',
  {
    variants: {
      variant: {
        default:
          'border border-violet-500/40 bg-violet-500/20 text-violet-300 shadow-sm shadow-violet-500/20',
        secondary:
          'border border-white/10 bg-white/5 text-slate-300',
        destructive:
          'border border-red-500/40 bg-red-500/20 text-red-300',
        outline: 'text-slate-200 border border-slate-700',
        uhd: 'border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm shadow-amber-500/20',
        qhd: 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/20',
        fhd: 'border border-violet-500/50 bg-violet-500/20 text-violet-300 shadow-sm shadow-violet-500/20',
        hd: 'border border-blue-500/50 bg-blue-500/20 text-blue-300 shadow-sm shadow-blue-500/20',
        audio: 'border border-pink-500/50 bg-pink-500/20 text-pink-300 shadow-sm shadow-pink-500/20',
        success: 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
