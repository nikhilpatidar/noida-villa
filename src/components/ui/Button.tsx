import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        primary: 'bg-ink-900 text-cream-50 hover:bg-ink-800 focus-visible:ring-ink-900',
        secondary: 'border border-ink-200 bg-transparent text-ink-900 hover:bg-ink-50 focus-visible:ring-ink-400',
        accent: 'bg-olive-700 text-cream-50 hover:bg-olive-800 focus-visible:ring-olive-700',
        ghost: 'text-ink-700 hover:bg-ink-100 focus-visible:ring-ink-400',
        danger: 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700',
        link: 'text-olive-700 underline-offset-4 hover:underline focus-visible:ring-olive-700',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
