import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

interface NotificationValue {
  notifications: AppNotification[];
  notify: (type: NotificationType, message: string) => void;
  dismiss: (id: number) => void;
}

const NotificationContext = createContext<NotificationValue | null>(null);
const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 4;
let nextId = 1;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismiss = useCallback((id: number) => {
    setNotifications((list) => list.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    (type: NotificationType, message: string) => {
      const id = nextId++;
      setNotifications((list) => [...list, { id, type, message }].slice(-MAX_VISIBLE));
      // Errors zyada der tak dikhte hain
      setTimeout(() => dismiss(id), type === 'error' ? AUTO_DISMISS_MS * 2 : AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notifications, notify, dismiss }), [notifications, notify, dismiss]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}