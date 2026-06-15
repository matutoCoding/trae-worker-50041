import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface AlertProps {
  level: 'info' | 'warning' | 'danger' | 'success';
  message: string;
  suggestion?: string;
  children?: ReactNode;
}

const levelConfig = {
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  danger: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-vermilion',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconColor: 'text-green-500',
  },
};

export default function Alert({ level, message, suggestion, children }: AlertProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border} ${config.text}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={`mt-0.5 flex-shrink-0 ${config.iconColor}`} />
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {suggestion && (
            <p className="text-sm mt-1 opacity-80">{suggestion}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
