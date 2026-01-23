import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'tw-inline-flex tw-items-center tw-rounded-md tw-border tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-semibold tw-transition-colors focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-ring focus:tw-ring-offset-2',
  {
    variants: {
      variant: {
        default: 'tw-border-transparent tw-bg-primary tw-text-primary-foreground tw-shadow',
        secondary: 'tw-border-transparent tw-bg-secondary tw-text-secondary-foreground',
        destructive: 'tw-border-transparent tw-bg-destructive tw-text-destructive-foreground tw-shadow',
        outline: 'tw-text-foreground',
        success: 'tw-border-transparent tw-bg-green-100 tw-text-green-800',
        warning: 'tw-border-transparent tw-bg-yellow-100 tw-text-yellow-800',
        info: 'tw-border-transparent tw-bg-blue-100 tw-text-blue-800',
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
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
