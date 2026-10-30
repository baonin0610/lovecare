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
    <nav
      className="fixed left-3 right-3 sm:left-4 sm:right-4 z-40 max-w-md mx-auto pointer-events-none select-none transition-all duration-200"
      style={{
        bottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 8px))'
      }}
      aria-label="Thanh điều hướng nổi"
    >
      {/* Floating Island Dock - Modern iOS & Facebook Floating Capsule */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-2xl rounded-[26px] border border-gray-200/80 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.04)] px-1.5 py-1.5 flex items-center justify-between ring-1 ring-black/[0.04]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount = tab.badge || 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 active:scale-90 relative ${
                isActive
                  ? 'bg-rose-50/90 text-rose-600 font-bold shadow-2xs'
                  : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'
                  }`}
                />

                {/* Numeric Red Badge for Partner Actions */}
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-black min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white ring-1 ring-rose-500/20 animate-bounce">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-[58px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
