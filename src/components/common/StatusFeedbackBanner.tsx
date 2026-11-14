import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, RefreshCw, X } from 'lucide-react';

interface StatusFeedbackBannerProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
}

const TONE_CLASSES: Record<
  StatusFeedbackBannerProps['type'],
  { container: string; icon: React.ComponentType<{ className?: string }> }
> = {
  error: {
    container: 'bg-rose-50 border-rose-200 text-rose-900',
    icon: AlertCircle,
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: CheckCircle2,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: AlertTriangle,
  },
  info: {
    container: 'bg-sky-50 border-sky-200 text-sky-900',
    icon: Info,
  },
};

/**
 * Bannière d'état uniforme pour afficher erreurs de synchronisation, confirmations ou alertes.
 */
export const StatusFeedbackBanner: React.FC<StatusFeedbackBannerProps> = ({
  type,
  message,
  onDismiss,
  onRetry,
  retryLabel = 'Réessayer',
}) => {
  const { container, icon: Icon } = TONE_CLASSES[type];

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`px-4 py-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs font-medium shadow-2xs ${container}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="leading-snug">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[34px] px-3 py-1 rounded-lg bg-white border border-current/20 font-bold hover:opacity-90 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{retryLabel}</span>
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-black/5 transition cursor-pointer"
            aria-label="Fermer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
