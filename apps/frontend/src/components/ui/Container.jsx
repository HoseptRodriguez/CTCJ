import { cn } from './cn.js';

export function Container({ className, children, as: Tag = 'div', ...props }) {
  return (
    <Tag className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props}>
      {children}
    </Tag>
  );
}
