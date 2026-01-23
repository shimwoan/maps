import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'tw-inline-flex tw-items-center tw-justify-center tw-whitespace-nowrap tw-rounded-lg tw-text-sm tw-font-medium tw-transition-colors focus:tw-outline-none disabled:tw-pointer-events-none disabled:tw-opacity-50 tw-border-solid',
  {
    variants: {
      variant: {
        default: 'tw-bg-gray-900 tw-text-white tw-border-0 hover:tw-bg-gray-800',
        destructive: 'tw-bg-red-500 tw-text-white tw-border-0 hover:tw-bg-red-600',
        outline: 'tw-border tw-border-gray-300 tw-bg-white tw-text-gray-700 hover:tw-bg-gray-50',
        secondary: 'tw-bg-gray-100 tw-text-gray-900 tw-border-0 hover:tw-bg-gray-200',
        ghost: 'tw-border-0 tw-bg-transparent hover:tw-bg-gray-100 tw-text-gray-700',
        link: 'tw-text-gray-900 tw-underline-offset-4 hover:tw-underline tw-border-0 tw-bg-transparent',
      },
      size: {
        default: 'tw-h-9 tw-px-4 tw-py-2',
        sm: 'tw-h-8 tw-rounded-lg tw-px-3 tw-text-xs',
        lg: 'tw-h-10 tw-rounded-lg tw-px-8',
        icon: 'tw-h-9 tw-w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={{
          outline: 'none',
          boxShadow: 'none',
          ...style
        }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
