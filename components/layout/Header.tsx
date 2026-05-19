'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, Bell, Globe, Menu, X, User, Moon, Sun, Monitor, LogOut, Check } from 'lucide-react';
import { useTheme } from 'next-themes';

export const Header = () => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showJurisdictionMenu, setShowJurisdictionMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('India');
  const [user, setUser] = useState<{ email: string } | null>(null);

  useState(() => {
    const savedUser = localStorage.getItem('lawsync_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  });

  const handleJurisdictionChange = (newJurisdiction: string) => {
    setJurisdiction(newJurisdiction);
    setShowJurisdictionMenu(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem('lawsync_user');
    localStorage.removeItem('auth_token');
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="glass border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-white font-bold text-xl hidden sm:block">LawSync</span>
          </Link>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition">
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-white/80">
            <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
            <Link href="/dashboard?tool=documents" className="hover:text-white transition">Documents</Link>
            <Link href="/dashboard?tool=chat" className="hover:text-white transition">AI Chat</Link>
          </nav>

          {/* Right Icons */}
          <div className="hidden lg:flex items-center gap-3">
            
            {/* History Dropdown */}
            <div className="relative">
              <button onClick={() => setShowHistory(!showHistory)} className="p-2 rounded-lg hover:bg-white/10 transition">
                <History className="w-5 h-5 text-white" />
              </button>
              {showHistory && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-40">
                  <div className="p-3 border-b border-slate-700">
                    <p className="text-xs text-gray-400 font-medium">RECENT DOCUMENTS</p>
                  </div>
                  <div className="px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 cursor-pointer">📄 Contract_Review.pdf</div>
                  <div className="px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 cursor-pointer">📝 NDA_Agreement.docx</div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-lg hover:bg-white/10 transition relative">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-40">
                  <div className="p-3 border-b border-slate-700">
                    <p className="text-xs text-gray-400 font-medium">NOTIFICATIONS</p>
                  </div>
                  <div className="px-4 py-2 text-sm text-gray-300">✅ Document analyzed successfully</div>
                </div>
              )}
            </div>

            {/* Jurisdiction Toggle */}
            <div className="relative">
              <button onClick={() => setShowJurisdictionMenu(!showJurisdictionMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition">
                <Globe className="w-4 h-4 text-white" />
                <span className="text-white text-sm">{jurisdiction}</span>
              </button>
              {showJurisdictionMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-40">
                  <button onClick={() => handleJurisdictionChange('India')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">🇮🇳 India</button>
                  <button onClick={() => handleJurisdictionChange('USA')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">🇺🇸 USA</button>
                  <button onClick={() => handleJurisdictionChange('UK')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">🇬🇧 UK</button>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-9 h-9 rounded-full bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center hover:opacity-90 transition shadow-lg">
                <span className="text-white font-semibold text-sm">{getUserInitials()}</span>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-40">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-700">
                    <p className="text-white font-semibold text-sm">{user?.email?.split('@')[0] || 'User'}</p>
                    <p className="text-gray-400 text-xs truncate">{user?.email || 'No email'}</p>
                  </div>

                  {/* Theme Section */}
                  <div className="px-3 py-2 border-b border-slate-700">
                    <p className="text-gray-400 text-xs px-2 pb-1">Theme</p>
                    <button onClick={() => setTheme('dark')} className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-slate-700'}`}>
                      <Moon className="w-4 h-4" /> Dark {theme === 'dark' && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                    <button onClick={() => setTheme('light')} className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition ${theme === 'light' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-slate-700'}`}>
                      <Sun className="w-4 h-4" /> Light {theme === 'light' && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                    <button onClick={() => setTheme('system')} className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition ${theme === 'system' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-slate-700'}`}>
                      <Monitor className="w-4 h-4" /> System {theme === 'system' && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  </div>

                  {/* Account Settings */}
                  <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-gray-300 text-sm hover:bg-slate-700 transition">
                    <User className="w-4 h-4" /> Account Settings
                  </Link>

                  {/* Logout */}
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 text-sm hover:bg-red-500/10 transition">
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pt-4 border-t border-white/10">
            <nav className="flex flex-col gap-3">
              <Link href="/dashboard" className="text-white/80 hover:text-white transition py-2">Dashboard</Link>
              <Link href="/dashboard?tool=documents" className="text-white/80 hover:text-white transition py-2">Documents</Link>
              <Link href="/dashboard?tool=chat" className="text-white/80 hover:text-white transition py-2">AI Chat</Link>
              <button onClick={handleLogout} className="text-red-400 text-left py-2">Log out</button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};