import React, { useState } from 'react';
import { Slot, Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { reserveSlot } from '../services/api';
import { X, Clock, Car, ShieldCheck, AlertCircle, Loader2, Zap, Accessibility, Sparkles, Navigation } from 'lucide-react';

interface Props {
  slot: Slot;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
}

export const ReservationModal: React.FC<Props> = ({ slot, onClose, onSuccess }) => {
  const { user, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [vehicleNo, setVehicleNo] = useState<string>('CA 8ABC99');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [startOffsetMinutes, setStartOffsetMinutes] = useState<number>(0); // 0 = Now
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate estimated total on the client for live preview (server will strictly calculate & enforce)
  const pricePerHour = slot.pricePerHour || 6.0;
  const estimatedAmount = (durationHours * pricePerHour).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      showToast('info', 'Sign in Required', 'Please sign in or select a demo driver profile to complete the reservation.');
      openAuthModal('driver');
      return;
    }

    const trimmedPlate = vehicleNo.trim().toUpperCase();
    if (trimmedPlate.length < 2) {
      setErrorMessage('Please enter a valid vehicle license plate number.');
      return;
    }

    setIsSubmitting(true);
    const startTime = Date.now() + startOffsetMinutes * 60 * 1000;
    const endTime = startTime + durationHours * 3600 * 1000;

    try {
      const result = await reserveSlot({
        slotId: slot.id,
        userId: user.uid,
        vehicleNo: trimmedPlate,
        startTime,
        endTime,
        userToken: user.token,
      });

      showToast('success', 'Slot Reserved!', `Booking #${result.bookingId} confirmed with atomic Firestore transaction.`);
      onSuccess(result.booking);
    } catch (err: any) {
      console.error('Reservation failed:', err);
      const msg = err.message || 'Failed to complete reservation transaction';
      setErrorMessage(msg);
      showToast('error', 'Reservation Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold font-mono">
              {slot.id.split('-')[1] || slot.id}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                Reserve Slot {slot.id}
                {slot.type === 'ev' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300">
                    <Zap className="w-3 h-3" /> EV Fast Charge
                  </span>
                )}
                {slot.type === 'handicap' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    <Accessibility className="w-3 h-3" /> Accessible
                  </span>
                )}
                {slot.type === 'vip' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-3 h-3" /> VIP Premium
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Navigation className="w-3 h-3" /> Floor {slot.floor} • {slot.zone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-semibold">Unable to Complete Booking</p>
                <p className="text-xs mt-0.5 opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Vehicle License Plate */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Vehicle License Plate
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Car className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="e.g. CA 8XYZ99"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              License plate recognition cameras at barrier gates will automatically detect this plate.
            </p>
          </div>

          {/* Start Time Option */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Arrival Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Now (Immediate)', offset: 0 },
                { label: 'In 30 Mins', offset: 30 },
                { label: 'In 1 Hour', offset: 60 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.offset}
                  onClick={() => setStartOffsetMinutes(opt.offset)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                    startOffsetMinutes === opt.offset
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Parking Duration
              </label>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {durationHours} {durationHours === 1 ? 'Hour' : 'Hours'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((hours) => (
                <button
                  type="button"
                  key={hours}
                  onClick={() => setDurationHours(hours)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                    durationHours === hours
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {hours} hr{hours > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Price Calculation Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Hourly Base Rate</span>
              <span className="font-medium">${pricePerHour.toFixed(2)} / hr</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Duration</span>
              <span className="font-medium">{durationHours} Hours</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Grace Period Included</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">15 mins free</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Estimated Total Cost
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Strictly calculated server-side
                </p>
              </div>
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ${estimatedAmount}
              </span>
            </div>
          </div>

          {/* Firestore Transaction Guarantee Callout */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Guaranteed zero double-booking via atomic Firestore transaction lock</span>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Locking Slot...
                </>
              ) : (
                <>
                  Confirm & Reserve (${estimatedAmount})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
