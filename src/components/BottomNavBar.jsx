import React from 'react';
import {
  Clock,
  Sparkles,
  Calendar,
  BookOpen,
  MessageCircle
} from 'lucide-react';

export const BottomNavBar = ({
  activeTab = 'today', // 'today' | 'moments' | 'cycle' | 'setlog' | 'chat'
  onChangeTab,
  unreadCount = 0,
  badges = {},
  onOpenChat
}) => {
  const tabs = [
    {
      id: 'today',
      label: 'Hôm nay',
      icon: Clock,
      badge: badges.today || 0
    },
    {
      id: 'moments',
      label: 'Khoảnh khắc',
      icon: Sparkles,
      badge: badges.moments || 0
    },
    {
      id: 'cycle',
      label: 'Chu kỳ',
      icon: Calendar,
      badge: badges.cycle || 0
    },
    {
      id: 'setlog',
      label: 'Setlog',
      icon: BookOpen,
      badge: badges.setlog || 0
    },
    {
      id: 'chat',
      label: 'Tin nhắn',
      icon: MessageCircle,
      badge: unreadCount || badges.chat || 0
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
    <div
      className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-gray-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)'
      }}
      aria-label="Thanh điều hướng"
    >
      <nav
        className="w-full max-w-md mx-auto px-2 pt-1.5 flex items-center justify-around select-none"
        style={{
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))'
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount = tab.badge || 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center justify-center transition-all duration-150 active:scale-90 relative ${
                isActive
                  ? 'bg-rose-50/90 text-rose-600 font-bold shadow-2xs'
                  : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'
                  }`}
                />

                {/* Numeric Red Badge for Partner Actions */}
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white ring-1 ring-rose-500/20 animate-bounce">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight leading-tight mt-0.5 whitespace-nowrap text-center">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
