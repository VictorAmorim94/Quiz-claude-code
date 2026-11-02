import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost';

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary:
    'border border-stone-300 bg-white hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800',
  ghost: 'hover:bg-stone-100 dark:hover:bg-stone-800',
};

function buttonClass(variant: Variant = 'primary', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`;
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: LinkProps & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
