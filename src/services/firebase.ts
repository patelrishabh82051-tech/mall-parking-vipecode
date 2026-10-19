import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { Slot, Booking, UserProfile, EntryExitLog, MallConfig } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check for live Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isLiveFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'AIzaSyYourApiKeyHere'
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

if (isLiveFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    authInstance = getAuth(app);
    firestoreInstance = getFirestore(app);

    // Validate connection to Firestore as per skill requirements
    const testConnection = async () => {
      try {
        if (firestoreInstance) {
          await getDocFromServer(doc(firestoreInstance, 'test', 'connection'));
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn('Firebase configuration notice: the client is currently offline.');
        }
      }
    };
    testConnection();
  } catch (err) {
    console.warn('Live Firebase initialization fallback to memory store:', err);
  }
}

export const auth = authInstance;
export const db = firestoreInstance;

// ============================================================================
// IN-APP RESILIENT REACTIVE STORE (Powers Real-Time onSnapshot & Transactions)
// ============================================================================

export const DEFAULT_MALL_CONFIG: MallConfig = {
  mallName: 'Grand Galaxy Mall & Galleria',
  defaultPricePerHour: 6.0,
  currency: 'USD',
  floors: ['1F', '2F', 'B1', 'B2'],
  zones: ['Zone A (West Gate)', 'Zone B (Main Atrium)', 'Zone C (Cinema / Dining)'],
  gracePeriodMinutes: 15,
};

// Initial realistic parking slots
const INITIAL_SLOTS: Slot[] = [
  // 1F
  { id: '1F-A01', floor: '1F', zone: 'Zone A (West Gate)', status: 'free', pricePerHour: 6.0, type: 'standard', updatedAt: Date.now() },
  { id: '1F-A02', floor: '1F', zone: 'Zone A (West Gate)', status: 'occupied', pricePerHour: 6.0, type: 'standard', updatedAt: Date.now() },
  { id: '1F-A03', floor: '1F', zone: 'Zone A (West Gate)', status: 'free', pricePerHour: 7.5, type: 'ev', updatedAt: Date.now() },
  { id: '1F-A04', floor: '1F', zone: 'Zone A (West Gate)', status: 'free', pricePerHour: 6.0, type: 'handicap', updatedAt: Date.now() },
  { id: '1F-B01', floor: '1F', zone: 'Zone B (Main Atrium)', status: 'reserved', pricePerHour: 8.0, type: 'vip', updatedAt: Date.now(), currentBookingId: 'demo-b1' },
  { id: '1F-B02', floor: '1F', zone: 'Zone B (Main Atrium)', status: 'free', pricePerHour: 8.0, type: 'vip', updatedAt: Date.now() },
  { id: '1F-B03', floor: '1F', zone: 'Zone B (Main Atrium)', status: 'occupied', pricePerHour: 6.5, type: 'standard', updatedAt: Date.now() },
  { id: '1F-B04', floor: '1F', zone: 'Zone B (Main Atrium)', status: 'free', pricePerHour: 6.5, type: 'standard', updatedAt: Date.now() },
  { id: '1F-C01', floor: '1F', zone: 'Zone C (Cinema / Dining)', status: 'free', pricePerHour: 6.0, type: 'standard', updatedAt: Date.now() },
  { id: '1F-C02', floor: '1F', zone: 'Zone C (Cinema / Dining)', status: 'free', pricePerHour: 7.5, type: 'ev', updatedAt: Date.now() },
  { id: '1F-C03', floor: '1F', zone: 'Zone C (Cinema / Dining)', status: 'disabled', pricePerHour: 6.0, type: 'standard', updatedAt: Date.now() },

  // 2F
  { id: '2F-A01', floor: '2F', zone: 'Zone A (West Gate)', status: 'free', pricePerHour: 5.5, type: 'standard', updatedAt: Date.now() },
  { id: '2F-A02', floor: '2F', zone: 'Zone A (West Gate)', status: 'free', pricePerHour: 5.5, type: 'standard', updatedAt: Date.now() },
  { id: '2F-B01', floor: '2F', zone: 'Zone B (Main Atrium)', status: 'occupied', pricePerHour: 6.0, type: 'standard', updatedAt: Date.now() },
  { id: '2F-B02', floor: '2F', zone: 'Zone B (Main Atrium)', status: 'free', pricePerHour: 7.0, type: 'ev', updatedAt: Date.now() },
  { id: '2F-C01', floor: '2F', zone: 'Zone C (Cinema / Dining)', status: 'free', pricePerHour: 5.5, type: 'standard', updatedAt: Date.now() },
  { id: '2F-C02', floor: '2F', zone: 'Zone C (Cinema / Dining)', status: 'reserved', pricePerHour: 5.5, type: 'standard', updatedAt: Date.now(), currentBookingId: 'demo-b2' },

  // B1
  { id: 'B1-A01', floor: 'B1', zone: 'Zone A (West Gate)', status: 'free', pricePerHour: 5.0, type: 'standard', updatedAt: Date.now() },
  { id: 'B1-A02', floor: 'B1', zone: 'Zone A (West Gate)', status: 'occupied', pricePerHour: 5.0, type: 'standard', updatedAt: Date.now() },
  { id: 'B1-B01', floor: 'B1', zone: 'Zone B (Main Atrium)', status: 'free', pricePerHour: 5.0, type: 'standard', updatedAt: Date.now() },
  { id: 'B1-B02', floor: 'B1', zone: 'Zone B (Main Atrium)', status: 'free', pricePerHour: 6.5, type: 'ev', updatedAt: Date.now() },
  { id: 'B1-B03', floor: 'B1', zone: 'Zone B (Main Atrium)', status: 'free', pricePerHour: 5.0, type: 'handicap', updatedAt: Date.now() },
  { id: 'B1-C01', floor: 'B1', zone: 'Zone C (Cinema / Dining)', status: 'occupied', pricePerHour: 5.0, type: 'standard', updatedAt: Date.now() },
  { id: 'B1-C02', floor: 'B1', zone: 'Zone C (Cinema / Dining)', status: 'free', pricePerHour: 5.0, type: 'standard', updatedAt: Date.now() },

  // B2
  { id: 'B2-A01', floor: 'B2', zone: 'Zone A (West Gate)', status: 'free', pricePerHour: 4.5, type: 'standard', updatedAt: Date.now() },
  { id: 'B2-A02', floor: 'B2', zone: 'Zone A (West Gate)', status: 'free', pricePerHour: 4.5, type: 'standard', updatedAt: Date.now() },
  { id: 'B2-B01', floor: 'B2', zone: 'Zone B (Main Atrium)', status: 'free', pricePerHour: 4.5, type: 'standard', updatedAt: Date.now() },
  { id: 'B2-B02', floor: 'B2', zone: 'Zone B (Main Atrium)', status: 'occupied', pricePerHour: 6.0, type: 'ev', updatedAt: Date.now() },
  { id: 'B2-C01', floor: 'B2', zone: 'Zone C (Cinema / Dining)', status: 'free', pricePerHour: 4.5, type: 'standard', updatedAt: Date.now() },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'BK-89012',
    userId: 'driver-demo-uid',
    slotId: '1F-B01',
    vehicleNo: 'CA 7XYZ99',
    startTime: Date.now() - 30 * 60 * 1000,
    endTime: Date.now() + 90 * 60 * 1000,
    status: 'active',
    amount: 16.0,
    createdAt: Date.now() - 40 * 60 * 1000,
    qrData: JSON.stringify({ ticket: 'BK-89012', slot: '1F-B01', plate: 'CA 7XYZ99' }),
  },
  {
    id: 'BK-77421',
    userId: 'driver-demo-uid',
    slotId: '2F-C02',
    vehicleNo: 'CA 7XYZ99',
    startTime: Date.now() + 120 * 60 * 1000,
    endTime: Date.now() + 240 * 60 * 1000,
    status: 'upcoming',
    amount: 11.0,
    createdAt: Date.now() - 10 * 60 * 1000,
    qrData: JSON.stringify({ ticket: 'BK-77421', slot: '2F-C02', plate: 'CA 7XYZ99' }),
  },
  {
    id: 'BK-62180',
    userId: 'driver-demo-uid',
    slotId: 'B1-A01',
    vehicleNo: 'CA 7XYZ99',
    startTime: Date.now() - 86400000,
    endTime: Date.now() - 86400000 + 7200000,
    status: 'completed',
    amount: 10.0,
    createdAt: Date.now() - 87000000,
    qrData: JSON.stringify({ ticket: 'BK-62180', slot: 'B1-A01', plate: 'CA 7XYZ99' }),
  },
];

const INITIAL_LOGS: EntryExitLog[] = [
  {
    id: 'LOG-001',
    bookingId: 'BK-89012',
    vehicleNo: 'CA 7XYZ99',
    slotId: '1F-B01',
    entryTime: Date.now() - 28 * 60 * 1000,
    exitTime: null,
    feeCollected: 0,
    status: 'inside',
  },
  {
    id: 'LOG-002',
    bookingId: 'BK-62180',
    vehicleNo: 'CA 7XYZ99',
    slotId: 'B1-A01',
    entryTime: Date.now() - 86400000,
    exitTime: Date.now() - 86400000 + 7100000,
    feeCollected: 10.0,
    status: 'exited',
  },
  {
    id: 'LOG-003',
    bookingId: null,
    vehicleNo: 'NY KLP882',
    slotId: '1F-A02',
    entryTime: Date.now() - 45 * 60 * 1000,
    exitTime: null,
    feeCollected: 0,
    status: 'inside',
  },
];

// Persistent state wrapper
class ResilientParkingStore {
  private slots: Slot[];
  private bookings: Booking[];
  private logs: EntryExitLog[];
  private config: MallConfig;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.slots = this.loadStorage('parksmart_slots', INITIAL_SLOTS);
    this.bookings = this.loadStorage('parksmart_bookings', INITIAL_BOOKINGS);
    this.logs = this.loadStorage('parksmart_logs', INITIAL_LOGS);
    this.config = this.loadStorage('parksmart_config', DEFAULT_MALL_CONFIG);
  }

  private loadStorage<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return fallback;
  }

  private saveStorage(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error notifying store subscriber:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSlots(): Slot[] {
    return [...this.slots];
  }

  public getBookings(userId?: string): Booking[] {
    if (userId) {
      return this.bookings.filter((b) => b.userId === userId);
    }
    return [...this.bookings];
  }

  public getLogs(): EntryExitLog[] {
    return [...this.logs];
  }

  public getConfig(): MallConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<MallConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveStorage('parksmart_config', this.config);
    this.notify();
  }

  /**
   * TRANSACTIONAL SLOT RESERVATION
   * Atomically checks slot availability and reserves it, preventing double-booking race conditions.
   */
  public async executeReserveTransaction(params: {
    slotId: string;
    userId: string;
    vehicleNo: string;
    startTime: number;
    endTime: number;
  }): Promise<{ bookingId: string; booking: Booking }> {
    // Artificial slight latency to simulate network and test race conditions
    await new Promise((res) => setTimeout(res, 350));

    // Atomic read
    const slotIndex = this.slots.findIndex((s) => s.id === params.slotId);
    if (slotIndex === -1) {
      throw new Error('Requested parking slot was not found in the mall database.');
    }

    const slot = this.slots[slotIndex];
    if (slot.status !== 'free') {
      throw new Error(`Double-booking prevented: Slot ${params.slotId} is currently ${slot.status.toUpperCase()} and cannot be reserved.`);
    }

    // Calculate server-side fee: Never trust client amount
    const durationHours = Math.max(0.5, (params.endTime - params.startTime) / (1000 * 60 * 60));
    const pricePerHour = slot.pricePerHour || this.config.defaultPricePerHour;
    const totalAmount = Math.round(durationHours * pricePerHour * 100) / 100;

    const bookingId = `BK-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = Date.now();
    const newBooking: Booking = {
      id: bookingId,
      userId: params.userId,
      slotId: params.slotId,
      vehicleNo: params.vehicleNo.trim().toUpperCase(),
      startTime: params.startTime,
      endTime: params.endTime,
      status: params.startTime <= now + 5 * 60 * 1000 ? 'active' : 'upcoming',
      amount: totalAmount,
      createdAt: now,
      qrData: JSON.stringify({
        ticket: bookingId,
        slot: params.slotId,
        plate: params.vehicleNo.trim().toUpperCase(),
        start: params.startTime,
        end: params.endTime,
      }),
    };

    // Atomic write
    this.slots[slotIndex] = {
      ...slot,
      status: 'reserved',
      currentBookingId: bookingId,
      updatedAt: now,
    };
    this.bookings.unshift(newBooking);

    this.saveStorage('parksmart_slots', this.slots);
    this.saveStorage('parksmart_bookings', this.bookings);
    this.notify();

    return { bookingId, booking: newBooking };
  }

  public cancelBooking(bookingId: string, performedByAdmin: boolean = false, userId?: string) {
    const bookingIndex = this.bookings.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const booking = this.bookings[bookingIndex];
    if (!performedByAdmin && booking.userId !== userId) {
      throw new Error('Unauthorized: You can only cancel your own bookings');
    }

    this.bookings[bookingIndex] = {
      ...booking,
      status: 'cancelled',
    };

    // Free the slot
    const slotIndex = this.slots.findIndex((s) => s.id === booking.slotId);
    if (slotIndex !== -1 && this.slots[slotIndex].status === 'reserved') {
      this.slots[slotIndex] = {
        ...this.slots[slotIndex],
        status: 'free',
        currentBookingId: null,
        updatedAt: Date.now(),
      };
    }

    this.saveStorage('parksmart_slots', this.slots);
    this.saveStorage('parksmart_bookings', this.bookings);
    this.notify();
  }

  public extendBooking(bookingId: string, extraHours: number, userId: string) {
    const bookingIndex = this.bookings.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const booking = this.bookings[bookingIndex];
    if (booking.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const slot = this.slots.find((s) => s.id === booking.slotId);
    const hourlyRate = slot ? slot.pricePerHour : this.config.defaultPricePerHour;
    const additionalAmount = Math.round(extraHours * hourlyRate * 100) / 100;

    const newEndTime = booking.endTime + extraHours * 3600 * 1000;
    this.bookings[bookingIndex] = {
      ...booking,
      endTime: newEndTime,
      amount: Math.round((booking.amount + additionalAmount) * 100) / 100,
      extendedCount: (booking.extendedCount || 0) + 1,
    };

    this.saveStorage('parksmart_bookings', this.bookings);
    this.notify();
  }

  // Admin slot management
  public addSlot(slot: Slot) {
    if (this.slots.some((s) => s.id.toLowerCase() === slot.id.toLowerCase())) {
      throw new Error(`Slot ${slot.id} already exists`);
    }
    this.slots.push({ ...slot, updatedAt: Date.now() });
    this.saveStorage('parksmart_slots', this.slots);
    this.notify();
  }

  public updateSlot(slotId: string, updates: Partial<Slot>) {
    const idx = this.slots.findIndex((s) => s.id === slotId);
    if (idx === -1) throw new Error(`Slot ${slotId} not found`);

    this.slots[idx] = {
      ...this.slots[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveStorage('parksmart_slots', this.slots);
    this.notify();
  }

  // Admin gate simulation
  public recordGateEntry(slotId: string, vehicleNo: string, bookingId?: string) {
    const now = Date.now();
    const slotIdx = this.slots.findIndex((s) => s.id === slotId);
    if (slotIdx !== -1) {
      this.slots[slotIdx] = {
        ...this.slots[slotIdx],
        status: 'occupied',
        updatedAt: now,
      };
    }

    if (bookingId) {
      const bIdx = this.bookings.findIndex((b) => b.id === bookingId);
      if (bIdx !== -1) {
        this.bookings[bIdx] = {
          ...this.bookings[bIdx],
          status: 'active',
        };
      }
    }

    const newLog: EntryExitLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      bookingId: bookingId || null,
      vehicleNo: vehicleNo.toUpperCase(),
      slotId,
      entryTime: now,
      exitTime: null,
      feeCollected: 0,
      status: 'inside',
    };
    this.logs.unshift(newLog);

    this.saveStorage('parksmart_slots', this.slots);
    this.saveStorage('parksmart_bookings', this.bookings);
    this.saveStorage('parksmart_logs', this.logs);
    this.notify();
  }

  public recordGateExit(slotId: string, vehicleNo: string, feeCollected: number) {
    const now = Date.now();
    const slotIdx = this.slots.findIndex((s) => s.id === slotId);
    if (slotIdx !== -1) {
      this.slots[slotIdx] = {
        ...this.slots[slotIdx],
        status: 'free',
        currentBookingId: null,
        updatedAt: now,
      };
    }

    // Find active log
    const logIdx = this.logs.findIndex((l) => l.slotId === slotId && l.status === 'inside');
    if (logIdx !== -1) {
      const log = this.logs[logIdx];
      this.logs[logIdx] = {
        ...log,
        exitTime: now,
        feeCollected,
        status: 'exited',
      };
      if (log.bookingId) {
        const bIdx = this.bookings.findIndex((b) => b.id === log.bookingId);
        if (bIdx !== -1) {
          this.bookings[bIdx] = {
            ...this.bookings[bIdx],
            status: 'completed',
          };
        }
      }
    }

    this.saveStorage('parksmart_slots', this.slots);
    this.saveStorage('parksmart_bookings', this.bookings);
    this.saveStorage('parksmart_logs', this.logs);
    this.notify();
  }

  public resetToDefault() {
    this.slots = [...INITIAL_SLOTS];
    this.bookings = [...INITIAL_BOOKINGS];
    this.logs = [...INITIAL_LOGS];
    this.config = { ...DEFAULT_MALL_CONFIG };
    this.saveStorage('parksmart_slots', this.slots);
    this.saveStorage('parksmart_bookings', this.bookings);
    this.saveStorage('parksmart_logs', this.logs);
    this.saveStorage('parksmart_config', this.config);
    this.notify();
  }
}

export const parkingStore = new ResilientParkingStore();
