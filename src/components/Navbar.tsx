import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Car,
  ShieldCheck,
  Sun,
  Moon,
  Clock,
  LogOut,
  LogIn,
  Layers,
} from 'lucide-react';

interface Props {
  currentView: 'map' | 'bookings' | 'admin';
  onNavigate: (view: 'map' | 'bookings' | 'admin') => void;
  activeBookingsCount: number;
}

export const Navbar: React.FC<Props> = ({
  currentView,
  onNavigate,
  activeBookingsCount,
}) => {
  const { user, isAdmin, logout, openAuthModal } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => onNavigate('map')}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:bg-emerald-700 transition">
              <Car className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              ParkSmart
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onNavigate('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                currentView === 'map'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Find Spot</span>
            </button>

            <button
              onClick={() => onNavigate('bookings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                currentView === 'bookings'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Bookings</span>
              {activeBookingsCount > 0 && (
                <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">
                  {activeBookingsCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  currentView === 'admin'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
                {/* TODO: add a proper profile dropdown menu later */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                    {user.name || 'User'}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('driver')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => onNavigate('map')}
            className={`p-2 rounded-lg flex flex-col items-center gap-1 w-full ${
              currentView === 'map' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] font-medium">Spots</span>
          </button>
          
          <button
            onClick={() => onNavigate('bookings')}
            className={`p-2 rounded-lg flex flex-col items-center gap-1 w-full ${
              currentView === 'bookings' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-medium">Bookings</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className={`p-2 rounded-lg flex flex-col items-center gap-1 w-full ${
                currentView === 'admin' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-medium">Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
