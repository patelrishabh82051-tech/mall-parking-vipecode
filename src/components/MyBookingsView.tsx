import React, { useState } from 'react';
import { Booking, Slot } from '../types';
import { cancelBooking, extendBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import {
  Calendar,
  Clock,
  Car,
  QrCode,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  ExternalLink,
  Ban
} from 'lucide-react';

interface Props {
  bookings: Booking[];
  slots: Slot[];
  onViewTicket: (booking: Booking, slot?: Slot) => void;
  onExploreSlots: () => void;
}

export const MyBookingsView: React.FC<Props> = ({
  bookings,
  slots,
  onViewTicket,
  onExploreSlots,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'past'>('active');
  const [extendingBookingId, setExtendingBookingId] = useState<string | null>(null);
  const [extensionHours, setExtensionHours] = useState<number>(1);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const now = Date.now();

  const categorizedBookings = {
    active: bookings.filter((b) => b.status === 'active' || (b.status === 'upcoming' && b.startTime <= now && b.endTime > now)),
    upcoming: bookings.filter((b) => b.status === 'upcoming' && b.startTime > now),
    past: bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled' || b.endTime <= now),
  };

  const currentList = categorizedBookings[activeTab];

  const handleCancel = (booking: Booking) => {
    if (!user) return;
    try {
      cancelBooking(booking.id, false, user.uid);
      showToast('success', 'Booking Cancelled', `Reservation #${booking.id} was successfully cancelled. Slot ${booking.slotId} is now free.`);
      setCancellingBookingId(null);
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.message);
    }
  };

  const handleExtend = (booking: Booking) => {
    if (!user) return;
    try {
      extendBooking(booking.id, extensionHours, user.uid);
      showToast('success', 'Parking Extended', `Added ${extensionHours} hour(s) to reservation #${booking.id}.`);
      setExtendingBookingId(null);
    } catch (err: any) {
      showToast('error', 'Extension Failed', err.message);
    }
  };

  const formatDateTime = (ts: number) => {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (endTime: number) => {
    const diff = endTime - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes} minutes left`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              My Parking Reservations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your active sessions, gate passes, and parking history
            </p>
          </div>

          <button
            onClick={onExploreSlots}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
          >
            <span>Book Another Slot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'active'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active ({categorizedBookings.active.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'upcoming'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Upcoming ({categorizedBookings.upcoming.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'past'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>History ({categorizedBookings.past.length})</span>
          </button>
        </div>
      </div>

      {/* Bookings List or Empty State */}
      {currentList.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Car className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            No {activeTab} bookings found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {activeTab === 'active'
              ? 'You do not have any vehicle currently parked or active in the garage.'
              : activeTab === 'upcoming'
              ? 'No upcoming scheduled parking reservations.'
              : 'No past booking records yet.'}
          </p>
          <button
            onClick={onExploreSlots}
            className="mt-5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
          >
            Find a Parking Bay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((booking) => {
            const slot = slots.find((s) => s.id === booking.slotId);
            const isCancelled = booking.status === 'cancelled';
            const isActive = activeTab === 'active' && !isCancelled;

            return (
              <div
                key={booking.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center font-bold">
                        <span className="font-mono text-sm leading-tight">{booking.slotId}</span>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                          {slot?.floor || '1F'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                            {booking.vehicleNo}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              booking.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : booking.status === 'upcoming'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : booking.status === 'completed'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Booking ID: <span className="font-mono">{booking.id}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                        ${booking.amount.toFixed(2)}
                      </span>
                      {booking.extendedCount ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Extended {booking.extendedCount}x
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Time and countdown metrics */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs mb-4">
                    <div>
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" /> Time Range
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {formatDateTime(booking.startTime)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        to {formatDateTime(booking.endTime)}
                      </p>
                    </div>

                    <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3" /> Status / Timer
                      </span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {isActive ? getTimeRemaining(booking.endTime) : booking.status.toUpperCase()}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Zone: {slot?.zone || 'Zone A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewTicket(booking, slot)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                    <span>View Pass & QR</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Extend Button (for active / upcoming) */}
                    {(booking.status === 'active' || booking.status === 'upcoming') && (
                      <button
                        onClick={() => setExtendingBookingId(booking.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Extend</span>
                      </button>
                    )}

                    {/* Cancel Button */}
                    {(booking.status === 'upcoming' || booking.status === 'active') && (
                      <button
                        onClick={() => setCancellingBookingId(booking.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Extend Form */}
                {extendingBookingId === booking.id && (
                  <div className="mt-4 p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Extend Parking Session
                      </span>
                      <button
                        onClick={() => setExtendingBookingId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {[1, 2, 3].map((h) => (
                        <button
                          key={h}
                          onClick={() => setExtensionHours(h)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            extensionHours === h
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          +{h} hr
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleExtend(booking)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                    >
                      Confirm Extension (+${(extensionHours * (slot?.pricePerHour || 6)).toFixed(2)})
                    </button>
                  </div>
                )}

                {/* Inline Cancel Confirmation Dialog */}
                {cancellingBookingId === booking.id && (
                  <div className="mt-4 p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 animate-in fade-in">
                    <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Cancel Reservation #{booking.id}?
                    </p>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
                      Slot {booking.slotId} will immediately be freed for other drivers.
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <button
                        onClick={() => setCancellingBookingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Keep Booking
                      </button>
                      <button
                        onClick={() => handleCancel(booking)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
                      >
                        Yes, Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
