import React, { useEffect, useState } from 'react';
import { Booking, Slot } from '../types';
import QRCode from 'qrcode';
import { CheckCircle2, QrCode, Calendar, Clock, Car, Navigation, Download, X, Copy, Check } from 'lucide-react';

interface Props {
  booking: Booking;
  slot?: Slot;
  onClose: () => void;
  onGoToBookings?: () => void;
}

export const BookingConfirmationModal: React.FC<Props> = ({
  booking,
  slot,
  onClose,
  onGoToBookings,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const payload = JSON.stringify({
          bookingId: booking.id,
          slotId: booking.slotId,
          vehicleNo: booking.vehicleNo,
          expires: new Date(booking.endTime).toISOString(),
        });
        const url = await QRCode.toDataURL(payload, {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Error generating QR Code:', err);
      }
    };
    generateQR();
  }, [booking]);

  const copyBookingId = () => {
    navigator.clipboard.writeText(booking.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateTime = (ts: number) => {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Slot Reserved Successfully!</h2>
          <p className="text-emerald-100 text-sm mt-1">
            Transaction confirmed • Your parking spot is guaranteed
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Booking Code Bar */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">BOOKING ID</p>
              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-wider">
                {booking.id}
              </p>
            </div>
            <button
              onClick={copyBookingId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* QR Code Pass */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Parking Pass QR Code"
                className="w-48 h-48 rounded-xl shadow-md border-4 border-white dark:border-slate-700"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-xl">
                <QrCode className="w-12 h-12 text-slate-400 animate-pulse" />
              </div>
            )}
            <p className="mt-3 text-xs text-center text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-500" />
              Scan at the entry barrier gate for automatic access
            </p>
          </div>

          {/* Ticket Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Navigation className="w-3.5 h-3.5 text-teal-500" />
                <span>Reserved Slot</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-base">
                {booking.slotId}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {slot?.floor || 'Floor 1F'} • {slot?.zone || 'Zone A'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Car className="w-3.5 h-3.5 text-indigo-500" />
                <span>Vehicle Plate</span>
              </div>
              <p className="font-bold font-mono text-slate-900 dark:text-white text-base">
                {booking.vehicleNo}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {slot?.type || 'Standard'} Vehicle
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Arrival Window</span>
              </div>
              <p className="font-semibold text-xs text-slate-900 dark:text-white">
                {formatDateTime(booking.startTime)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                to {formatDateTime(booking.endTime)}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Estimated Total</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-base">
                ${booking.amount.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Pay on exit or pre-authorized
              </p>
            </div>
          </div>

          {/* Turn-by-turn Mall Direction Advice */}
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2.5">
            <Navigation className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
            <div>
              <p className="font-semibold">Wayfinding Directions:</p>
              <p className="opacity-90 mt-0.5">
                Enter via {slot?.zone?.includes('West') ? 'West Entrance Ramp' : 'Main Boulevard Gate'}. Follow floor signs for {slot?.floor || '1F'}. Slot {booking.slotId} is marked with bright green LED indicator overhead.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {onGoToBookings ? (
            <button
              onClick={() => {
                onClose();
                onGoToBookings();
              }}
              className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View in My Bookings →
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
