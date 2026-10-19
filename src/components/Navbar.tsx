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
  HelpCircle,
  Wifi,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';

interface Props {
  currentView: 'map' | 'bookings' | 'admin';
  onNavigate: (view: 'map' | 'bookings' | 'admin') => void;
  activeBookingsCount: number;
  onOpenArchitecture: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentView,
  onNavigate,
  activeBookingsCount,
  onOpenArchitecture,
}) => {
  const { user, isAdmin, logout, openAuthModal, quickLoginAs } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Mall Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('map')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  ParkSmart
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Wifi className="w-2.5 h-2.5 animate-pulse" /> Live Firestore
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden xs:block">
                Grand Galaxy Mall & Galleria
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={() => onNavigate('map')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                currentView === 'map'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>Parking Bays</span>
            </button>

            <button
              onClick={() => onNavigate('bookings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                currentView === 'bookings'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>My Passes</span>
              {activeBookingsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeBookingsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('admin')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                currentView === 'admin'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Mall Admin</span>
              {isAdmin && (
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              )}
            </button>
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Demo Switcher button */}
            <button
              onClick={() => {
                if (isAdmin) {
                  quickLoginAs('driver');
                } else {
                  quickLoginAs('admin');
                }
              }}
              title={isAdmin ? "Switch perspective to Customer Driver" : "Switch perspective to Mall Operations Admin"}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isAdmin
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>Role: {isAdmin ? 'Admin' : 'Driver'}</span>
            </button>

            {/* Architecture Guide Button */}
            <button
              onClick={onOpenArchitecture}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Architecture & Deployment Guide"
              aria-label="Architecture and Deploy Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Session Menu */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {user.role === 'admin' ? 'Operations Admin' : 'Driver'}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('driver')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => onNavigate('map')}
            className={`py-1 px-3 rounded-lg flex items-center gap-1 font-semibold ${
              currentView === 'map' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Slots</span>
          </button>
          <button
            onClick={() => onNavigate('bookings')}
            className={`py-1 px-3 rounded-lg flex items-center gap-1 font-semibold ${
              currentView === 'bookings' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Passes ({activeBookingsCount})</span>
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`py-1 px-3 rounded-lg flex items-center gap-1 font-semibold ${
              currentView === 'admin' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
          <button
            onClick={() => {
              if (isAdmin) quickLoginAs('driver');
              else quickLoginAs('admin');
            }}
            className="py-1 px-2.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Switch to {isAdmin ? 'Driver' : 'Admin'}
          </button>
        </div>
      </div>
    </header>
  );
};
