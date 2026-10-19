import React, { useEffect, useState } from 'react';
import { Slot, Booking, EntryExitLog, MallConfig } from './types';
import {
  subscribeToSlots,
  subscribeToUserBookings,
  subscribeToLogs,
  subscribeToMallConfig,
} from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { ParkingGrid } from './components/ParkingGrid';
import { ReservationModal } from './components/ReservationModal';
import { BookingConfirmationModal } from './components/BookingConfirmationModal';
import { MyBookingsView } from './components/MyBookingsView';
import { AdminDashboard } from './components/AdminDashboard';
import { ArchitectureModal } from './components/ArchitectureModal';
import {
  Car,
  ShieldCheck,
  Zap,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';

function MainLayout() {
  const { user, isAdmin, openAuthModal } = useAuth();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [logs, setLogs] = useState<EntryExitLog[]>([]);
  const [config, setConfig] = useState<MallConfig>({
    mallName: 'Grand Galaxy Mall & Galleria',
    defaultPricePerHour: 6.0,
    currency: 'USD',
    floors: ['1F', '2F', 'B1', 'B2'],
    zones: ['Zone A (West Gate)', 'Zone B (Main Atrium)', 'Zone C (Cinema / Dining)'],
    gracePeriodMinutes: 15,
  });

  const [currentView, setCurrentView] = useState<'map' | 'bookings' | 'admin'>('map');
  const [selectedFloor, setSelectedFloor] = useState<string>('1F');

  // Modals
  const [selectedSlotForReservation, setSelectedSlotForReservation] = useState<Slot | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<{ booking: Booking; slot?: Slot } | null>(null);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

  // Subscribe to real-time slots (onSnapshot)
  useEffect(() => {
    const unsubscribe = subscribeToSlots((updatedSlots) => {
      setSlots(updatedSlots);
      setIsLoadingInitial(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time mall configuration
  useEffect(() => {
    const unsubscribe = subscribeToMallConfig((updatedConfig) => {
      setConfig(updatedConfig);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user bookings
  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }
    const unsubscribe = subscribeToUserBookings(user.uid, (updatedBookings) => {
      setBookings(updatedBookings);
    });
    return () => unsubscribe();
  }, [user]);

  // Subscribe to logs (for admin view)
  useEffect(() => {
    const unsubscribe = subscribeToLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  // Count active bookings for current user
  const activeBookingsCount = bookings.filter((b) => b.status === 'active' || b.status === 'upcoming').length;

  // Real-time capacity statistics
  const totalFreeSlots = slots.filter((s) => s.status === 'free').length;
  const totalSlotsCount = slots.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        activeBookingsCount={activeBookingsCount}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {isLoadingInitial ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Connecting to Firestore real-time slot stream...</p>
          </div>
        ) : currentView === 'map' ? (
          <>
            {/* Hero / Quick Status Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Sensor Synchronization</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Seamless Parking at {config.mallName}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
                  Pick your floor, lock your parking bay with zero double-booking, and scan your dynamic QR pass at the barrier gate.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-emerald-400 font-mono font-bold text-sm">{totalFreeSlots}</span>
                    <span className="opacity-80">Free bays now</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Grace period: {config.gracePeriodMinutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                    <Zap className="w-3.5 h-3.5 text-cyan-300" />
                    <span>EV Superchargers on 1F</span>
                  </div>
                </div>
              </div>

              {/* Decorative background watermark */}
              <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none text-white">
                <Car className="w-72 h-72" />
              </div>
            </div>

            {/* Parking Availability Grid */}
            <ParkingGrid
              slots={slots}
              selectedFloor={selectedFloor}
              onFloorChange={(f) => setSelectedFloor(f)}
              onSelectSlot={(slot) => setSelectedSlotForReservation(slot)}
              floors={config.floors}
            />
          </>
        ) : currentView === 'bookings' ? (
          <MyBookingsView
            bookings={bookings}
            slots={slots}
            onViewTicket={(booking, slot) => setConfirmedBooking({ booking, slot })}
            onExploreSlots={() => setCurrentView('map')}
          />
        ) : (
          <AdminDashboard
            slots={slots}
            bookings={bookings}
            logs={logs}
            config={config}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">ParkSmart System</span>
            <span>•</span>
            <span>Firebase Cloud Functions + Firestore Realtime Engine</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Architecture & Firebase Deploy Docs</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Reservation Booking Modal */}
      {selectedSlotForReservation && (
        <ReservationModal
          slot={selectedSlotForReservation}
          onClose={() => setSelectedSlotForReservation(null)}
          onSuccess={(newBooking) => {
            const bookedSlot = slots.find((s) => s.id === newBooking.slotId);
            setSelectedSlotForReservation(null);
            setConfirmedBooking({ booking: newBooking, slot: bookedSlot });
          }}
        />
      )}

      {/* Confirmation & Dynamic QR Code Modal */}
      {confirmedBooking && (
        <BookingConfirmationModal
          booking={confirmedBooking.booking}
          slot={confirmedBooking.slot}
          onClose={() => setConfirmedBooking(null)}
          onGoToBookings={() => {
            setConfirmedBooking(null);
            setCurrentView('bookings');
          }}
        />
      )}

      {/* Architecture & Deploy Guide Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MainLayout />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
