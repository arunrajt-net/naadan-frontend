import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle, Info, Package, Trash2, Truck, XCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const TYPE_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  error:   { icon: XCircle,    color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-100' },
  info:    { icon: Info,       color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-100' },
  warning: { icon: Package,    color: 'text-orange-600',bg: 'bg-orange-50',border: 'border-orange-100' },
  order:   { icon: Truck,      color: 'text-purple-600',bg: 'bg-purple-50',border: 'border-purple-100' },
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { notifications, markAllRead, clearAll, unreadCount } = useNotifications();

  React.useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border-none cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-extrabold text-lg text-gray-900">Notifications</h1>
          <button onClick={clearAll}
            className="text-xs text-red-500 font-bold border-none bg-transparent cursor-pointer px-2 py-1">
            Clear All
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell size={64} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold text-lg">No notifications yet</p>
            <p className="text-gray-300 text-sm mt-1">We will notify you about your orders here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div key={n.id}
                  className={`flex gap-3 p-4 rounded-2xl border cursor-pointer hover:bg-gray-100 transition-colors`}
                  onClick={() => {
                      if (n.orderId) {
                        const activeRole = localStorage.getItem('activeRole');
                        if (activeRole === 'farmer') {
                          navigate('/farmer/dashboard');
                        } else {
                          navigate(`/buyer/track/${n.orderId}`);
                        }
                      }
                    }}>
                  <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">{timeAgo(n.time)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
