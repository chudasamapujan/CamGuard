import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const iconMap = {
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
};

function ToastContainer({ toasts, onRemove }) {
    if (!toasts || toasts.length === 0) return null;

    return (
        <div className="toast-container" role="alert" aria-live="polite">
            {toasts.map(toast => {
                const Icon = iconMap[toast.type] || iconMap.info;
                return (
                    <div
                        key={toast.id}
                        className={`toast toast--${toast.type} ${toast.exiting ? 'toast--exit' : ''}`}
                    >
                        <Icon size={18} className="toast__icon" />
                        <span className="toast__message">{toast.message}</span>
                        <button
                            className="toast__close"
                            onClick={() => onRemove(toast.id)}
                            aria-label="Dismiss notification"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export default React.memo(ToastContainer);
