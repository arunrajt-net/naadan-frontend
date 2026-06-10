import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Package, Search, ShoppingBag, User } from 'lucide-react';

const BuyerBottomNav = ({ cartCount = 0, orderCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const tabs = [
    { icon: Home,        label: 'Home',     href: '/',               match: p => p === '/' },
    { icon: Search,      label: 'Browse',   href: '/buyer/search',   match: p => p.startsWith('/buyer/search') },
    { icon: ShoppingBag, label: 'Cart',     href: null,              match: () => false, badge: cartCount, isCart: true },
    { icon: Package,     label: 'Orders',   href: '/buyer/orders',   match: p => p.startsWith('/buyer/orders'), badge: orderCount },
    { icon: User,        label: 'Profile',  href: '/profile',        match: p => p.startsWith('/profile') },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.match(path);
        return (
          <button
            key={tab.label}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => {
              if (tab.isCart) {
                // Trigger cart open - dispatch custom event
                window.dispatchEvent(new CustomEvent('openCart'));
              } else if (tab.href) {
                navigate(tab.href);
              }
            }}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {tab.badge > 0 && (
                <span className="notif-dot" style={{fontSize: '9px'}}>
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const FarmerBottomNav = ({ orderCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const hash = location.hash;

  return (
    <nav className="bottom-nav">
      {[
        { label: 'Dashboard', href: '/farmer', icon: Home, active: path === '/farmer' && (hash === '' || hash === '#harvests' || hash === '#insights' || hash === '#verification') },
        { label: 'Orders', href: '/farmer#orders', icon: Package, badge: orderCount, active: path === '/farmer' && hash === '#orders' },
        { label: 'Profile', href: '/profile', icon: User, active: path.startsWith('/profile') },
      ].map((tab) => {
        const Icon = tab.icon;
        const active = tab.active;
        return (
          <button key={tab.label} className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => {
              navigate(tab.href);
              // Force hashchange event manually in case router doesn't fire it
              setTimeout(() => {
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }, 50);
            }}>
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {tab.badge > 0 && <span className="notif-dot">{tab.badge}</span>}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export { BuyerBottomNav, FarmerBottomNav };
