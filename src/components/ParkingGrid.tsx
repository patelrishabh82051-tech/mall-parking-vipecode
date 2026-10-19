import React, { useState, useMemo } from 'react';
import { Slot, SlotStatus, SlotType } from '../types';
import {
  Car,
  Zap,
  Accessibility,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  Ban,
  ArrowRight,
  Filter,
  Sparkle
} from 'lucide-react';

interface Props {
  slots: Slot[];
  selectedFloor: string;
  onFloorChange: (floor: string) => void;
  onSelectSlot: (slot: Slot) => void;
  floors: string[];
}

export const ParkingGrid: React.FC<Props> = ({
  slots,
  selectedFloor,
  onFloorChange,
  onSelectSlot,
  floors,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Extract unique zones on current floor
  const zonesOnFloor = useMemo(() => {
    const floorSlots = slots.filter((s) => s.floor === selectedFloor);
    const zSet = new Set(floorSlots.map((s) => s.zone));
    return Array.from(zSet);
  }, [slots, selectedFloor]);

  // Compute floor occupancy statistics
  const floorStats = useMemo(() => {
    const stats: Record<string, { total: number; free: number }> = {};
    floors.forEach((f) => {
      const fSlots = slots.filter((s) => s.floor === f);
      stats[f] = {
        total: fSlots.length,
        free: fSlots.filter((s) => s.status === 'free').length,
      };
    });
    return stats;
  }, [slots, floors]);

  // Filter slots for current view
  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      if (s.floor !== selectedFloor) return false;
      if (selectedZone !== 'all' && s.zone !== selectedZone) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      return true;
    });
  }, [slots, selectedFloor, selectedZone, statusFilter, typeFilter]);

  // Group filtered slots by zone
  const slotsGroupedByZone = useMemo(() => {
    const groups: Record<string, Slot[]> = {};
    filteredSlots.forEach((slot) => {
      if (!groups[slot.zone]) {
        groups[slot.zone] = [];
      }
      groups[slot.zone].push(slot);
    });
    return groups;
  }, [filteredSlots]);

  const getStatusBadge = (status: SlotStatus) => {
    switch (status) {
      case 'free':
        return {
          label: 'Available',
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dotClass: 'bg-emerald-500 animate-pulse',
        };
      case 'reserved':
        return {
          label: 'Reserved',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          dotClass: 'bg-amber-500',
        };
      case 'occupied':
        return {
          label: 'Occupied',
          badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
          dotClass: 'bg-rose-500',
        };
      case 'disabled':
        return {
          label: 'Maintenance',
          badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
          dotClass: 'bg-slate-400',
        };
    }
  };

  const getTypeIcon = (type?: SlotType) => {
    switch (type) {
      case 'ev':
        return (
          <span title="EV Fast Charging">
            <Zap className="w-4 h-4 text-cyan-500" />
          </span>
        );
      case 'handicap':
        return (
          <span title="Accessible Parking">
            <Accessibility className="w-4 h-4 text-blue-500" />
          </span>
        );
      case 'vip':
        return (
          <span title="VIP Valet Area">
            <Sparkles className="w-4 h-4 text-purple-500" />
          </span>
        );
      default:
        return (
          <span title="Standard Slot">
            <Car className="w-4 h-4 text-slate-400" />
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Floor Selection Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Select Floor Level
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live bay sensors synchronized via Firestore
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {floors.map((floor) => {
              const stat = floorStats[floor] || { total: 0, free: 0 };
              const isSelected = selectedFloor === floor;
              return (
                <button
                  key={floor}
                  onClick={() => onFloorChange(floor)}
                  className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  <span className="font-bold text-sm tracking-wide">{floor}</span>
                  <span
                    className={`text-[11px] font-medium mt-0.5 ${
                      isSelected ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {stat.free} Free
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone and Filter Pills */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Zone Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Zone:
            </span>
            <button
              onClick={() => setSelectedZone('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedZone === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Zones
            </button>
            {zonesOnFloor.map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedZone === zone
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>

          {/* Type / Feature Filters */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setStatusFilter((prev) => (prev === 'free' ? 'all' : 'free'))}
              className={`px-3 py-1.5 rounded-xl font-medium border transition flex items-center gap-1.5 ${
                statusFilter === 'free'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Free Only
            </button>
            <button
              onClick={() => setTypeFilter((prev) => (prev === 'ev' ? 'all' : 'ev'))}
              className={`px-3 py-1.5 rounded-xl font-medium border transition flex items-center gap-1.5 ${
                typeFilter === 'ev'
                  ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              EV Fast Charge
            </button>
          </div>
        </div>
      </div>

      {/* Status Legend Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Bay Status:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span>Free (Click to book)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400 ring-4 ring-slate-400/20" />
            <span>Disabled</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          * Prices updated according to mall dynamic policy
        </div>
      </div>

      {/* Empty State */}
      {filteredSlots.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Ban className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">No Parking Bays Match Filters</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try clearing the zone or type filter to view all slots on {selectedFloor}.
          </p>
          <button
            onClick={() => {
              setSelectedZone('all');
              setStatusFilter('all');
              setTypeFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Parking Grid grouped by Zones */}
      {Object.entries(slotsGroupedByZone).map(([zoneName, zoneSlots]) => (
        <div
          key={zoneName}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm"
        >
          {/* Zone Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 rounded-full bg-emerald-500" />
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {zoneName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {zoneSlots.filter((s) => s.status === 'free').length} of {zoneSlots.length} slots available
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                <span>Entry Way ←</span>
              </div>
            </div>
          </div>

          {/* Slots Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {zoneSlots.map((slot) => {
              const badge = getStatusBadge(slot.status);
              const isFree = slot.status === 'free';

              return (
                <div
                  key={slot.id}
                  onClick={() => isFree && onSelectSlot(slot)}
                  className={`group relative rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                    isFree
                      ? 'cursor-pointer bg-white dark:bg-slate-800/80 border-emerald-400/80 dark:border-emerald-600/60 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5'
                      : slot.status === 'reserved'
                      ? 'cursor-not-allowed bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 opacity-90'
                      : slot.status === 'occupied'
                      ? 'cursor-not-allowed bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 opacity-80'
                      : 'cursor-not-allowed bg-slate-100/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  {/* Overhead Sensor Glow Bar */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-extrabold text-base text-slate-900 dark:text-white">
                      {slot.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getTypeIcon(slot.type)}
                      <span className={`w-2.5 h-2.5 rounded-full ${badge.dotClass}`} />
                    </div>
                  </div>

                  {/* Slot Graphic / Bay Marker */}
                  <div className="my-2 py-3 px-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                    {slot.status === 'occupied' ? (
                      <div className="flex flex-col items-center text-rose-500">
                        <Car className="w-7 h-7" />
                        <span className="text-[10px] font-bold uppercase mt-1">Occupied</span>
                      </div>
                    ) : slot.status === 'reserved' ? (
                      <div className="flex flex-col items-center text-amber-500">
                        <Clock className="w-7 h-7" />
                        <span className="text-[10px] font-bold uppercase mt-1">Booked</span>
                      </div>
                    ) : slot.status === 'disabled' ? (
                      <div className="flex flex-col items-center text-slate-400">
                        <Ban className="w-7 h-7" />
                        <span className="text-[10px] font-bold uppercase mt-1">Closed</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
                        <CheckCircle2 className="w-7 h-7" />
                        <span className="text-[10px] font-bold uppercase mt-1">Available</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Price & Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      ${slot.pricePerHour.toFixed(2)}
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">/hr</span>
                    </span>

                    {isFree ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition">
                        Reserve <ArrowRight className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 capitalize">
                        {slot.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lane marking visually simulating garage aisle */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400 font-mono tracking-widest uppercase">
            <span>◄ Drive Aisle Lane</span>
            <span className="opacity-60">Speed Limit: 10 MPH</span>
            <span>Pedestrian Crossing ►</span>
          </div>
        </div>
      ))}
    </div>
  );
};
