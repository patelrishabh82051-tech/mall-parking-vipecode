export type SlotStatus = 'free' | 'reserved' | 'occupied' | 'disabled';
export type SlotType = 'standard' | 'ev' | 'handicap' | 'vip';
export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type UserRole = 'driver' | 'admin';

export interface Slot {
  id: string; // e.g., 'F1-A01'
  floor: string; // 'B1', 'B2', '1F', '2F'
  zone: string; // 'Zone A', 'Zone B', 'Zone C'
  status: SlotStatus;
  pricePerHour: number;
  type?: SlotType;
  updatedAt?: number;
  currentBookingId?: string | null;
}

export interface Booking {
  id: string;
  userId: string;
  slotId: string;
  vehicleNo: string;
  startTime: number;
  endTime: number;
  status: BookingStatus;
  amount: number;
  createdAt: number;
  qrData?: string;
  extendedCount?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
}

export interface EntryExitLog {
  id: string;
  bookingId?: string | null;
  vehicleNo: string;
  slotId: string;
  entryTime: number;
  exitTime?: number | null;
  feeCollected: number;
  status: 'inside' | 'exited';
}

export interface MallConfig {
  mallName: string;
  defaultPricePerHour: number;
  currency: string;
  floors: string[];
  zones: string[];
  gracePeriodMinutes: number;
}

export interface FilterState {
  floor: string;
  zone: string;
  status: string;
  slotType: string;
}
