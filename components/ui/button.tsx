import type { ButtonHTMLAttributes, ReactNode } from 'react';

export default function Button({ variant = 'default', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger'; children: ReactNode }) {
  return <button {...props} className={`button ${variant === 'default' ? '' : `button-${variant}`} ${props.className ?? ''}`.trim()}>{children}</button>;
}
