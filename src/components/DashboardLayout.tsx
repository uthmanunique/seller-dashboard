//src/components/DashboardLayout.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import Cookies from 'js-cookie';
import Wallet from './Wallet';
import CreateWalletOverlay from './CreateWalletOverlay';
import WithdrawFundsOverlay from './WithdrawFundsOverlay';
import api, { setupTokenRefresh, validateAuth } from '../lib/api';
import { getLoginRedirectUrl } from '../config/env';

interface UserProfile {
  name: string;
  role: string;
  profilePicture?: string;
}

interface SellerData {
  id: string;
  role: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  walletCreated?: boolean;
}

interface Notification {
  sender: { id: string; name: string };
  receiver: { id: string; name: string };
  _id: string;
  message: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isWalletOverlayOpen, setIsWalletOverlayOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isWalletActivated, setIsWalletActivated] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isWalletPromptOpen, setIsWalletPromptOpen] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const loginUrl = getLoginRedirectUrl('seller');

  useEffect(() => {
    console.log('DashboardLayout - Mounting component');
    setIsMounted(true);
    
    // Check authentication immediately
    const isAuth = validateAuth();
    setAuthChecked(true);
    
    if (!isAuth && !pathname.includes('/auth')) {
      console.log('DashboardLayout - No valid auth, redirecting to login');
      window.location.href = loginUrl;
      return;
    }
    
    // Only set up token refresh if we're authenticated
    if (isAuth) {
      setupTokenRefresh();
    }
  }, [loginUrl, pathname]);

  const loadUserData = useCallback(async () => {
    if (!isMounted || !authChecked) {
      console.log('DashboardLayout - Not mounted yet or auth not checked, skipping loadUserData');
      return;
    }

    // Skip loading data for auth pages
    if (pathname === '/auth' || pathname.includes('/login') || pathname === '/') {
      console.log('DashboardLayout - On auth page, skipping data load');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('DashboardLayout loadUserData - Starting');

    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');
    
    if (!accessToken || !sellerDataString) {
      console.log('DashboardLayout - Missing required data, redirecting to login');
      window.location.href = loginUrl;
      setIsLoading(false);
      return;
    }

    try {
      const sellerData = JSON.parse(sellerDataString);
      
      // Set basic user info immediately from cookies to improve perceived performance
      setUserProfile({
        name: `${sellerData.firstName || ''} ${sellerData.lastName || ''}`.trim() || sellerData.email || 'User',
        role: sellerData.role || 'SELLER',
        profilePicture: sellerData.profilePicture || '/profile.png',
      });
      
      setIsWalletActivated(sellerData.walletCreated || false);

      // Fetch additional data in parallel
      const [walletResponse, notificationsResponse] = await Promise.all([
        api.get(`/wallets/fetch-info?userType=SELLER&userId=${sellerData.id}`),
        api.get(`/notifications/all/${sellerData.id}`)
      ]);
      
      // Update state with fetched data
      setWalletBalance(walletResponse.data.wallet.balance || 0);
      
      const fetchedNotifications = notificationsResponse.data.notifications || [];
      setNotifications(fetchedNotifications);
      setUnreadNotifications(fetchedNotifications.length);
      
    } catch (error) {
      console.error(`DashboardLayout - Error fetching data:`, error);
      
      // Determine if error is auth-related or just a data fetch issue
      const axiosError = error as any;
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        window.location.href = loginUrl;
      } else {
        // For non-auth errors, just use defaults and let the user continue
        setWalletBalance(0);
        setUnreadNotifications(0);
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
      console.log('DashboardLayout loadUserData - Ended');
    }
  }, [isMounted, authChecked, pathname, loginUrl]);

  useEffect(() => {
    if (!isMounted || !authChecked) return;
    loadUserData();
  }, [isMounted, authChecked, loadUserData]);

  useEffect(() => {
    if (!isWalletActivated) {
      setIsWalletPromptOpen(true);
    }
  }, [pathname, isWalletActivated]);

  const handleLogout = useCallback(() => {
    console.log('DashboardLayout - Logging out');
    Cookies.remove('accessToken', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
    Cookies.remove('sellerData', { path: '/' });
    Cookies.remove('role', { path: '/' });
    
    // Use timestamp to prevent caching
    const timestamp = new Date().getTime();
    window.location.href = `${loginUrl}&t=${timestamp}`;
  }, [loginUrl]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const handleOpenWalletOverlay = () => setIsWalletOverlayOpen(true);
  const handleWalletCreated = () => {
    setIsWalletActivated(true);
    setIsWalletOverlayOpen(false);
    setIsWalletPromptOpen(false);
    loadUserData();
  };
  const handleWithdrawSuccess = () => {
    setIsWithdrawOpen(false);
    loadUserData();
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '/dashboard.png' },
    { name: 'Listing', path: '/dashboard/listings', icon: '/listings.png' },
    { name: 'Offers', path: '/dashboard/offers', icon: '/offers.png' },
    { name: 'Messages', path: '/dashboard/messages', icon: '/message.png' },
    { name: 'Wallet & Transactions', path: '/dashboard/walletTransactions', icon: '/transactions.png' },
    { name: 'Settings', path: '/dashboard/settings', icon: '/settings.png' },
    { name: 'Contact', path: '/dashboard/contact', icon: '/contact.png' },
  ];

  const walletOverlay = isMounted && document.getElementById('overlay-root') ? (
    createPortal(
      <>
        <CreateWalletOverlay
          isOpen={isWalletOverlayOpen}
          onClose={() => setIsWalletOverlayOpen(false)}
          onWalletCreated={handleWalletCreated}
        />
        <WithdrawFundsOverlay
          isOpen={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          onWithdrawSuccess={handleWithdrawSuccess}
          availableBalance={walletBalance}
        />
      </>,
      document.getElementById('overlay-root')!
    )
  ) : null;

  if (isLoading || !isMounted) {
    console.log('DashboardLayout - Rendering loading state');
    return (
      <div className="flex justify-center items-center h-screen">
        <Image src="/loader.gif" alt="Loading" width={32} height={32} className="animate-spin" />
      </div>
    );
  }

  console.log(`DashboardLayout - Rendering main layout, userProfile: ${JSON.stringify(userProfile)}`);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#011631] text-white p-4 flex items-center justify-between w-full sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden"
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <Image src="/hamburger.png" alt="Menu" width={16} height={16} />
          </button>
          <Link href="/dashboard">
            <Image src="/logo.png" alt="Rebrivo Logo" width={100} height={30} />
          </Link>
        </div>
        <div className="hidden md:flex flex-1 mx-3 max-w-md">
          <div className="flex items-center w-full bg-white text-gray-600 rounded-full px-3 py-1.5">
            <Image src="/search.png" alt="Search" width={16} height={16} className="mr-2" />
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 bg-transparent outline-none text-xs text-black"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleTheme} aria-label="Toggle theme">
            <Image
              src="/theme.png"
              alt={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              width={16}
              height={16}
            />
          </button>
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label="Notifications"
            >
              <Image src="/notification.png" alt="Notifications" width={16} height={16} />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  <Link
                    href="/dashboard/notifications"
                    className="text-xs text-[#F26E52] hover:underline"
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    See all
                  </Link>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-gray-500">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
                    >
                      <p className="text-xs font-medium">{notification.sender.name}</p>
                      <p className="text-xs text-gray-600">{notification.message}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center space-x-2"
            >
              <Image
                src={userProfile?.profilePicture || '/profile.png'}
                alt="Profile"
                width={24}
                height={24}
                className="rounded-full"
              />
              {userProfile && (
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold">{userProfile.name}</p>
                  <p className="text-[10px] text-gray-300">{userProfile.role}</p>
                </div>
              )}
            </button>
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white text-gray-800 rounded-lg shadow-lg z-50">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center px-3 py-2 hover:bg-gray-100 text-xs"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <Image src="/settings2.png" alt="Settings" width={16} height={16} className="mr-2" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 text-xs"
                >
                  <Image src="/logout.png" alt="Logout" width={16} height={16} className="mr-2" />
                  Logout
                </button>
                <button
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 text-xs"
                >
                  <Image src="/cancel.png" alt="Cancel" width={16} height={16} className="mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        <aside
          className={`bg-white text-gray-600 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 md:sticky md:top-[72px] w-56 border-r border-gray-200 md:w-48 absolute z-40 h-[calc(100vh-72px)] md:h-[calc(100vh-72px)] overflow-y-auto`}
        >
          <div className="p-4 flex flex-col h-full">
            <nav className="flex-1">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.path}
                        className={`flex items-center p-3 rounded-lg transition-colors text-xs w-full relative ${
                          isActive ? 'bg-[#FFF1EE] text-[#F26E52]' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-0 h-full w-1 bg-[#F26E52] rounded-r"></span>
                        )}
                        <Image
                          src={item.icon}
                          alt={item.name}
                          width={16}
                          height={16}
                          className={`mr-2 ${isActive ? 'text-[#F26E52]' : ''}`}
                          style={{
                            filter: isActive
                              ? 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(356deg) brightness(95%) contrast(90%)'
                              : 'none',
                          }}
                        />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-auto">
              <Wallet
                onOpenWalletOverlay={handleOpenWalletOverlay}
                isActivated={isWalletActivated}
                onOpenWithdraw={() => setIsWithdrawOpen(true)}
                balance={walletBalance}
              />
              <p className="text-[10px] text-gray-400 text-center mt-4">
                ©2025 The Rebrivo Platform Ltd. All rights reserved worldwide.
              </p>
            </div>
          </div>
        </aside>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 bg-gray-100 overflow-y-auto relative">
          {children}
          {!isWalletActivated && pathname === '/dashboard' && isWalletPromptOpen && (
            <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full relative">
                <button
                  onClick={() => setIsWalletPromptOpen(false)}
                  className="absolute top-4 right-4"
                  aria-label="Close"
                >
                  <Image src="/cancel.png" alt="Close" width={16} height={16} />
                </button>
                <h2 className="text-lg font-semibold text-[#011631] mb-4 text-center">
                  Welcome! Create Your Wallet
                </h2>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  To fully access your dashboard and manage transactions, please create a wallet account.
                </p>
                <button
                  onClick={() => setIsWalletOverlayOpen(true)}
                  className="w-full bg-[#F26E52] text-white py-3 rounded-md hover:bg-[#e65c41] transition-colors text-base font-semibold"
                >
                  Create Wallet Now
                </button>
              </div>
            </div>
          )}
        </main>
        {isMounted && <div id="overlay-root"></div>}
      </div>

      {walletOverlay}
    </div>
  );
}