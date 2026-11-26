import { useNotifications, type NotificationType } from '../context/NotificationContext';

const styles: Record<NotificationType, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const titles: Record<NotificationType, string> = {
  success: 'Success',
  error: 'Failed',
  warning: 'Please wait',
  info: 'Info',
};

export default function ToastContainer() {
  const { notifications, dismiss } = useNotifications();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${styles[n.type]}`}
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">{titles[n.type]}</p>
            <p className="mt-0.5 break-words">{n.message}</p>
          </div>
          <button
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss notification"
            className="text-current opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}