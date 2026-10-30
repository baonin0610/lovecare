import React from 'react';
import {
  Clock,
  Sparkles,
  CalendarHeart,
  BookOpen,
  MessageCircle,
  Calendar
} from 'lucide-react';

export const BottomNavBar = ({
  activeTab = 'today', // 'today' | 'moments' | 'cycle' | 'setlog' | 'chat'
  onChangeTab,
  unreadCount = 0,
  onOpenChat
}) => {
  const tabs = [
    {
      id: 'today',
      label: 'Hôm nay',
      icon: Clock
    },
    {
      id: 'moments',
      label: 'Khoảnh khắc',
      icon: Sparkles
    },
    {
      id: 'cycle',
      label: 'Chu kỳ',
      icon: Calendar
    },
    {
      id: 'setlog',
      label: 'Setlog',
      icon: BookOpen
    },
    {
      id: 'chat',
      label: 'Tin nhắn',
      icon: MessageCircle,
      badge: unreadCount
    }
  ];

  const handleTabClick = (tabId) => {
    if (tabId === 'chat') {
      if (onOpenChat) onOpenChat();
      return;
    }
    if (onChangeTab) {
      onChangeTab(tabId);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-xl border-t border-gray-200/80 shadow-lg">
      <div className="max-w-md mx-auto px-2 pt-1.5 pb-safe flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center transition-all duration-150 active:scale-90 relative ${
                isActive ? 'text-rose-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />

                {/* Badge for unread chat messages */}
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] mt-1 tracking-tight truncate max-w-[62px] ${
                  isActive ? 'font-bold text-rose-600' : 'font-medium text-gray-500'
                }`}
              >
                {tab.label}
              </span>

              {/* Active pill dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-rose-500 mt-0.5 animate-in fade-in zoom-in-75" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
