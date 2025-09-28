import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out',
            {
              'bg-background border-border': notification.type === 'info',
              'bg-green-50 border-green-200 text-green-800': notification.type === 'success',
              'bg-yellow-50 border-yellow-200 text-yellow-800': notification.type === 'warning',
              'bg-red-50 border-red-200 text-red-800': notification.type === 'error',
            }
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-sm mt-1 opacity-90">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-4 text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}