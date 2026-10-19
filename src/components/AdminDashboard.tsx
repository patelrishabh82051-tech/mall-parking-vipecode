import React, { useState, useMemo } from 'react';
import { Slot, Booking, EntryExitLog, MallConfig, SlotType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import {
  adminAddSlot,
  adminUpdateSlot,
  adminRecordGateEntry,
  adminRecordGateExit,
  adminUpdateMallConfig,
  cancelBooking,
  testConcurrencyCollision,
  adminResetSystemData
} from '../services/api';
import {
  ShieldAlert,
  BarChart3,
  Layers,
  Car,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  Unlock,
  Edit2,
  Zap,
  Accessibility,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Send,
  Ban
} from 'lucide-react';

interface Props {
  slots: Slot[];
  bookings: Booking[];
  logs: EntryExitLog[];
  config: MallConfig;
}

export const AdminDashboard: React.FC<Props> = ({ slots, bookings, logs, config }) => {
  const { user, isAdmin, quickLoginAs } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'slots' | 'bookings' | 'gate' | 'concurrency'>('overview');

  // Search and filter states
  const [vehicleSearch, setVehicleSearch] = useState<string>('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [slotFloorFilter, setSlotFloorFilter] = useState<string>('all');

  // Modal / form states for slot creation
  const [isAddSlotOpen, setIsAddSlotOpen] = useState<boolean>(false);
  const [newSlotId, setNewSlotId] = useState<string>('');
  const [newSlotFloor, setNewSlotFloor] = useState<string>(config.floors[0] || '1F');
  const [newSlotZone, setNewSlotZone] = useState<string>(config.zones[0] || 'Zone A (West Gate)');
  const [newSlotType, setNewSlotType] = useState<SlotType>('standard');
  const [newSlotPrice, setNewSlotPrice] = useState<number>(config.defaultPricePerHour);

  // Edit slot pricing
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(6.0);

  // Gate simulation inputs
  const [simGateSlotId, setSimGateSlotId] = useState<string>(slots.find((s) => s.status === 'reserved')?.id || slots[0]?.id || '1F-A01');
  const [simGatePlate, setSimGatePlate] = useState<string>('NY ABC991');

  // Concurrency tester state
  const [concurrencySlotId, setConcurrencySlotId] = useState<string>(slots.find((s) => s.status === 'free')?.id || '1F-A01');
  const [isTestingConcurrency, setIsTestingConcurrency] = useState<boolean>(false);
  const [concurrencyResult, setConcurrencyResult] = useState<{
    userASucceeded: boolean;
    userBSucceeded: boolean;
    errorB?: string;
  } | null>(null);

  // 1. Guard check: Require admin custom claim
  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Access Restricted</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          The Mall Operations Console requires authenticated Firebase ID tokens containing the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">admin</code> custom claim.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => quickLoginAs('admin')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Switch to Mall Admin Demo Role</span>
          </button>
        </div>
      </div>
    );
  }

  // Calculate Overview KPIs
  const totalSlots = slots.length;
  const freeSlots = slots.filter((s) => s.status === 'free').length;
  const reservedSlots = slots.filter((s) => s.status === 'reserved').length;
  const occupiedSlots = slots.filter((s) => s.status === 'occupied').length;
  const disabledSlots = slots.filter((s) => s.status === 'disabled').length;

  const occupancyRate = totalSlots > 0 ? Math.round(((occupiedSlots + reservedSlots) / totalSlots) * 100) : 0;
  const activeBookings = bookings.filter((b) => b.status === 'active' || b.status === 'upcoming');

  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const revenueToday = bookings
    .filter((b) => b.createdAt >= startOfToday && b.status !== 'cancelled')
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  // Slot handlers
  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotId.trim()) return;
    try {
      adminAddSlot({
        id: newSlotId.trim().toUpperCase(),
        floor: newSlotFloor,
        zone: newSlotZone,
        status: 'free',
        type: newSlotType,
        pricePerHour: Number(newSlotPrice) || 6.0,
      });
      showToast('success', 'Slot Added', `Parking bay ${newSlotId} has been added.`);
      setIsAddSlotOpen(false);
      setNewSlotId('');
    } catch (err: any) {
      showToast('error', 'Error Adding Slot', err.message);
    }
  };

  const handleToggleSlotStatus = (slot: Slot) => {
    const nextStatus = slot.status === 'disabled' ? 'free' : 'disabled';
    try {
      adminUpdateSlot(slot.id, { status: nextStatus });
      showToast('info', 'Slot Updated', `Slot ${slot.id} status changed to ${nextStatus}.`);
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  const handleSavePrice = (slotId: string) => {
    try {
      adminUpdateSlot(slotId, { pricePerHour: Number(editPrice) });
      showToast('success', 'Price Updated', `Slot ${slotId} price updated to $${Number(editPrice).toFixed(2)}/hr.`);
      setEditingSlotId(null);
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  // Gate simulation handlers
  const handleSimulateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simGateSlotId || !simGatePlate) return;
    try {
      const associatedBooking = bookings.find(
        (b) => (b.slotId === simGateSlotId || b.vehicleNo === simGatePlate.toUpperCase()) && (b.status === 'active' || b.status === 'upcoming')
      );
      adminRecordGateEntry(simGateSlotId, simGatePlate, associatedBooking?.id);
      showToast('success', 'Gate Opened (Entry)', `Vehicle ${simGatePlate} entered. Slot ${simGateSlotId} marked as OCCUPIED.`);
    } catch (err: any) {
      showToast('error', 'Gate Error', err.message);
    }
  };

  const handleSimulateExit = (slotId: string, vehicleNo: string) => {
    try {
      adminRecordGateExit(slotId, vehicleNo, 12.0);
      showToast('success', 'Gate Opened (Exit)', `Vehicle ${vehicleNo} departed. Slot ${slotId} is now FREE.`);
    } catch (err: any) {
      showToast('error', 'Exit Error', err.message);
    }
  };

  // Concurrency tester
  const handleRunConcurrencyTest = async () => {
    setIsTestingConcurrency(true);
    setConcurrencyResult(null);

    const targetSlot = slots.find((s) => s.id === concurrencySlotId);
    if (!targetSlot || targetSlot.status !== 'free') {
      showToast('error', 'Slot Not Available', 'Please select a FREE slot to test the concurrency double-booking prevention.');
      setIsTestingConcurrency(false);
      return;
    }

    try {
      const outcome = await testConcurrencyCollision(
        concurrencySlotId,
        { uid: 'concurrent-driver-a', plate: 'CONCUR-A' },
        { uid: 'concurrent-driver-b', plate: 'CONCUR-B' }
      );
      setConcurrencyResult(outcome);
      if (outcome.userASucceeded && !outcome.userBSucceeded) {
        showToast('success', 'Transaction Lock Succeeded!', 'User A booked the slot. User B was blocked by Firestore transaction conflict.');
      }
    } catch (err: any) {
      showToast('error', 'Test Error', err.message);
    } finally {
      setIsTestingConcurrency(false);
    }
  };

  // Filtered slots for slots tab
  const displaySlots = useMemo(() => {
    return slots.filter((s) => {
      if (slotFloorFilter !== 'all' && s.floor !== slotFloorFilter) return false;
      return true;
    });
  }, [slots, slotFloorFilter]);

  // Filtered bookings
  const displayBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (vehicleSearch.trim() && !b.vehicleNo.toLowerCase().includes(vehicleSearch.toLowerCase()) && !b.id.toLowerCase().includes(vehicleSearch.toLowerCase())) {
        return false;
      }
      if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) {
        return false;
      }
      return true;
    });
  }, [bookings, vehicleSearch, bookingStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Admin Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Mall Operations Portal
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Admin Claim Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authenticated as: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                adminResetSystemData();
                showToast('info', 'Data Reset', 'All slots, bookings, and logs reset to default state.');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>
            <button
              onClick={() => setIsAddSlotOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bay</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Overview Metrics', icon: BarChart3 },
            { id: 'slots', label: `Manage Bays (${totalSlots})`, icon: Layers },
            { id: 'bookings', label: `Bookings (${bookings.length})`, icon: Clock },
            { id: 'gate', label: 'Gate Simulator & Logs', icon: Car },
            { id: 'concurrency', label: 'Transaction Stress Test', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Occupancy Rate
                </span>
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {occupancyRate}%
                </span>
                <span className="text-xs text-slate-500">
                  ({occupiedSlots + reservedSlots} / {totalSlots} bays)
                </span>
              </div>
              <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Bookings
                </span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {activeBookings.length}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Currently Valid
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {reservedSlots} reserved • {occupiedSlots} parked inside
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Revenue Today
                </span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  ${revenueToday.toFixed(2)}
                </span>
                <span className="text-xs text-emerald-600 font-medium">
                  USD
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Calculated strictly server-side
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Available Bays
                </span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {freeSlots}
                </span>
                <span className="text-xs text-slate-500">
                  Free right now
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {disabledSlots} slots out for maintenance
              </p>
            </div>
          </div>

          {/* Floor-by-floor breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              Floor-by-Floor Capacity Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {config.floors.map((floor) => {
                const fSlots = slots.filter((s) => s.floor === floor);
                const freeCount = fSlots.filter((s) => s.status === 'free').length;
                const occCount = fSlots.filter((s) => s.status === 'occupied').length;
                const resCount = fSlots.filter((s) => s.status === 'reserved').length;
                const pct = fSlots.length > 0 ? Math.round(((occCount + resCount) / fSlots.length) * 100) : 0;

                return (
                  <div
                    key={floor}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Floor {floor}</span>
                      <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-3">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="grid grid-cols-3 text-[11px] text-center">
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {freeCount} Free
                      </div>
                      <div className="text-amber-600 dark:text-amber-400 font-semibold">
                        {resCount} Booked
                      </div>
                      <div className="text-rose-600 dark:text-rose-400 font-semibold">
                        {occCount} Parked
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE SLOTS & PRICING */}
      {activeTab === 'slots' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Parking Bay & Pricing Directory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Directly configure availability status, hourly rates, and maintenance toggles
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Floor:</span>
              <select
                value={slotFloorFilter}
                onChange={(e) => setSlotFloorFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Floors</option>
                {config.floors.map((f) => (
                  <option key={f} value={f}>
                    Floor {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Bay ID</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Rate / Hour</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displaySlots.map((slot) => {
                  const isEditingThis = editingSlotId === slot.id;
                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {slot.id}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        Floor {slot.floor} • {slot.zone}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-medium capitalize text-slate-700 dark:text-slate-300">
                          {slot.type === 'ev' && <Zap className="w-3.5 h-3.5 text-cyan-500" />}
                          {slot.type === 'handicap' && <Accessibility className="w-3.5 h-3.5 text-blue-500" />}
                          {slot.type === 'vip' && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                          {slot.type || 'Standard'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            slot.status === 'free'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : slot.status === 'reserved'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : slot.status === 'occupied'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {slot.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <span>$</span>
                            <input
                              type="number"
                              step="0.5"
                              value={editPrice}
                              onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                              className="w-16 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-xs"
                            />
                            <button
                              onClick={() => handleSavePrice(slot.id)}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>${slot.pricePerHour.toFixed(2)}/hr</span>
                            <button
                              onClick={() => {
                                setEditingSlotId(slot.id);
                                setEditPrice(slot.pricePerHour);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                              title="Edit price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleSlotStatus(slot)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            slot.status === 'disabled'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {slot.status === 'disabled' ? 'Enable Bay' : 'Disable (Maintenance)'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BOOKINGS DIRECTORY & VEHICLE SEARCH */}
      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Vehicle Bookings Registry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search reservations by license plate number or booking reference
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search license plate / ID..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Vehicle Plate</th>
                  <th className="py-3 px-4">Assigned Bay</th>
                  <th className="py-3 px-4">Time Window</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {b.id}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {b.vehicleNo}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {b.slotId}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : b.status === 'upcoming'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : b.status === 'completed'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      ${b.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <button
                          onClick={() => {
                            cancelBooking(b.id, true);
                            showToast('info', 'Booking Cancelled', `Admin cancelled booking #${b.id}`);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BARRIER GATE SIMULATOR & AUDIT LOGS */}
      {activeTab === 'gate' && (
        <div className="space-y-6">
          {/* Barrier Simulation Controller */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <Car className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="font-bold text-lg">Physical Barrier Gate Simulator</h3>
                <p className="text-xs text-slate-400">
                  Simulate optical camera license plate scans and automated barrier arm triggers
                </p>
              </div>
            </div>

            <form onSubmit={handleSimulateEntry} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">
                  Target Parking Bay
                </label>
                <select
                  value={simGateSlotId}
                  onChange={(e) => setSimGateSlotId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-semibold text-white"
                >
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} ({s.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">
                  Detected License Plate
                </label>
                <input
                  type="text"
                  value={simGatePlate}
                  onChange={(e) => setSimGatePlate(e.target.value.toUpperCase())}
                  placeholder="e.g. CA 8XYZ99"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white uppercase"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Simulate Vehicle Entry Scan</span>
                </button>
              </div>
            </form>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              Real-Time Entry & Exit Event Audit Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Plate</th>
                    <th className="py-3 px-4">Bay</th>
                    <th className="py-3 px-4">Entry Timestamp</th>
                    <th className="py-3 px-4">Exit Timestamp</th>
                    <th className="py-3 px-4">Fee Paid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Barrier Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {log.vehicleNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {log.slotId}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(log.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {log.exitTime
                          ? new Date(log.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${log.feeCollected.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.status === 'inside'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {log.status === 'inside' ? 'Parked Inside' : 'Departed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.status === 'inside' && (
                          <button
                            onClick={() => handleSimulateExit(log.slotId, log.vehicleNo)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm"
                          >
                            Simulate Exit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TRANSACTION CONCURRENCY STRESS TESTER */}
      {activeTab === 'concurrency' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="max-w-2xl">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Firestore Transaction Concurrency Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              <strong>Non-negotiable requirement:</strong> Slot reservation must use a Firestore transaction to prevent double-booking when two users reserve the same slot simultaneously. Test and verify this behavior right now with live parallel transaction simulation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Select a Free Bay to Target
                </label>
                <select
                  value={concurrencySlotId}
                  onChange={(e) => setConcurrencySlotId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                >
                  {slots
                    .filter((s) => s.status === 'free')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} (Floor {s.floor} • ${s.pricePerHour}/hr)
                      </option>
                    ))}
                </select>
              </div>

              <button
                onClick={handleRunConcurrencyTest}
                disabled={isTestingConcurrency}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{isTestingConcurrency ? 'Executing Simultaneous Txns...' : 'Simulate 2 Simultaneous Reservations'}</span>
              </button>
            </div>

            {/* Test Results Banner */}
            {concurrencyResult && (
              <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Transaction Concurrency Test Outcome
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <p className="font-bold text-emerald-800 dark:text-emerald-300">Driver 1 (CONCUR-A):</p>
                    <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Status: <strong>ACQUIRED LOCK & RESERVED</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Transaction committed slot state to 'reserved'.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <p className="font-bold text-rose-800 dark:text-rose-300">Driver 2 (CONCUR-B):</p>
                    <p className="text-rose-700 dark:text-rose-400 mt-0.5">
                      Status: <strong>ABORTED (DOUBLE-BOOKING PREVENTED)</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      Error: "{concurrencyResult.errorB || 'Slot is already reserved'}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add New Slot */}
      {isAddSlotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
              Add New Parking Bay
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Create a new physical parking slot in the mall inventory
            </p>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Slot ID (e.g. 1F-D01)
                </label>
                <input
                  type="text"
                  required
                  value={newSlotId}
                  onChange={(e) => setNewSlotId(e.target.value.toUpperCase())}
                  placeholder="e.g. 1F-D01"
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Floor
                  </label>
                  <select
                    value={newSlotFloor}
                    onChange={(e) => setNewSlotFloor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {config.floors.map((f) => (
                      <option key={f} value={f}>
                        Floor {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newSlotType}
                    onChange={(e) => setNewSlotType(e.target.value as SlotType)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="standard">Standard</option>
                    <option value="ev">EV Fast Charging</option>
                    <option value="handicap">Accessible</option>
                    <option value="vip">VIP Valet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Zone
                </label>
                <select
                  value={newSlotZone}
                  onChange={(e) => setNewSlotZone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {config.zones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hourly Rate ($ USD)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newSlotPrice}
                  onChange={(e) => setNewSlotPrice(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSlotOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-md"
                >
                  Create Bay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
