import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function Card({ children, className = '', title, subtitle }: CardProps) {
  return (
    <div className={`paper-card p-6 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-bold font-serif-cn text-ink-black">{title}</h3>
          {subtitle && <p className="text-sm text-ash-gray mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
