import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'tw-flex tw-h-10 tw-w-full tw-rounded-lg tw-border tw-border-solid tw-border-gray-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm tw-transition-colors file:tw-border-0 file:tw-bg-transparent file:tw-text-sm file:tw-font-medium placeholder:tw-text-gray-400 focus:tw-outline-none focus:tw-border-gray-900 disabled:tw-cursor-not-allowed disabled:tw-opacity-50',
          className
        )}
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
Input.displayName = 'Input';

export { Input };
