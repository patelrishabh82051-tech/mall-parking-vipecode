import { Slot, Booking, EntryExitLog, MallConfig } from '../types';
import { parkingStore, isLiveFirebaseConfigured, auth, db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, where, doc, getDoc, runTransaction } from 'firebase/firestore';

/**
 * Real-time listener for all parking slots
 * Mirrors Firestore onSnapshot
 */
export function subscribeToSlots(onUpdate: (slots: Slot[]) => void): () => void {
  if (isLiveFirebaseConfigured && db) {
    try {
      const q = collection(db, 'slots');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const slots: Slot[] = [];
          snapshot.forEach((d) => {
            slots.push({ id: d.id, ...d.data() } as Slot);
          });
          onUpdate(slots);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'slots');
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Fallback to local reactive store for slots listener:', e);
    }
  }

  // Resilient reactive store subscriber
  onUpdate(parkingStore.getSlots());
  return parkingStore.subscribe(() => {
    onUpdate(parkingStore.getSlots());
  });
}

/**
 * Real-time listener for user bookings
 */
export function subscribeToUserBookings(userId: string, onUpdate: (bookings: Booking[]) => void): () => void {
  if (isLiveFirebaseConfigured && db && userId) {
    try {
      const q = query(collection(db, 'bookings'), where('userId', '==', userId));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const bookings: Booking[] = [];
          snapshot.forEach((d) => {
            bookings.push({ id: d.id, ...d.data() } as Booking);
          });
          bookings.sort((a, b) => b.createdAt - a.createdAt);
          onUpdate(bookings);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'bookings');
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Fallback to local reactive store for bookings listener:', e);
    }
  }

  onUpdate(parkingStore.getBookings(userId));
  return parkingStore.subscribe(() => {
    onUpdate(parkingStore.getBookings(userId));
  });
}

/**
 * Real-time listener for mall config
 */
export function subscribeToMallConfig(onUpdate: (config: MallConfig) => void): () => void {
  onUpdate(parkingStore.getConfig());
  return parkingStore.subscribe(() => {
    onUpdate(parkingStore.getConfig());
  });
}

/**
 * Non-negotiable requirement: Reserve a slot using a Firestore Transaction
 * Prevents double-booking when two users reserve the same slot simultaneously
 */
export async function reserveSlot(params: {
  slotId: string;
  userId: string;
  vehicleNo: string;
  startTime: number;
  endTime: number;
  userToken?: string;
}): Promise<{ bookingId: string; booking: Booking }> {
  // If live Firebase & live Cloud Functions URL configured, call Cloud Functions endpoint
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (isLiveFirebaseConfigured && apiBase && apiBase !== '/api') {
    const res = await fetch(`${apiBase}/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.userToken || ''}`,
      },
      body: JSON.stringify({
        slotId: params.slotId,
        vehicleNo: params.vehicleNo,
        startTime: params.startTime,
        endTime: params.endTime,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reserve slot');
    }
    return data;
  }

  // If live Firestore direct transaction
  if (isLiveFirebaseConfigured && db) {
    const firestoreDb = db;
    try {
      return await runTransaction(firestoreDb, async (transaction) => {
        const slotRef = doc(firestoreDb, 'slots', params.slotId);
        const slotDoc = await transaction.get(slotRef);
        if (!slotDoc.exists()) {
          throw new Error('Slot does not exist');
        }
        const slotData = slotDoc.data();
        if (slotData.status !== 'free') {
          throw new Error('Concurrency collision: Slot is already reserved or occupied.');
        }

        const durationHours = Math.max(0.5, (params.endTime - params.startTime) / (1000 * 60 * 60));
        const price = Number(slotData.pricePerHour) || 5;
        const amount = Math.round(durationHours * price * 100) / 100;

        const bookingRef = doc(collection(firestoreDb, 'bookings'));
        const bookingId = bookingRef.id;
        const now = Date.now();
        const bookingData: Booking = {
          id: bookingId,
          userId: params.userId,
          slotId: params.slotId,
          vehicleNo: params.vehicleNo.trim().toUpperCase(),
          startTime: params.startTime,
          endTime: params.endTime,
          status: params.startTime <= now + 5 * 60 * 1000 ? 'active' : 'upcoming',
          amount,
          createdAt: now,
          qrData: JSON.stringify({ ticket: bookingId, slot: params.slotId, plate: params.vehicleNo }),
        };

        transaction.set(bookingRef, bookingData);
        transaction.update(slotRef, { status: 'reserved', currentBookingId: bookingId, updatedAt: now });

        return { bookingId, booking: bookingData };
      });
    } catch (err: any) {
      console.error('Firestore transaction error:', err);
      throw err;
    }
  }

  // Resilient in-app Firestore transactional execution
  return parkingStore.executeReserveTransaction(params);
}

/**
 * Concurrency Test Utility
 * Simulates two simultaneous requests attempting to reserve the exact same slot.
 * Returns the outcome of User A and User B.
 */
export async function testConcurrencyCollision(
  slotId: string,
  userA: { uid: string; plate: string },
  userB: { uid: string; plate: string }
): Promise<{ userASucceeded: boolean; userBSucceeded: boolean; errorB?: string }> {
  const now = Date.now();
  const startTime = now;
  const endTime = now + 2 * 3600 * 1000;

  const promiseA = reserveSlot({
    slotId,
    userId: userA.uid,
    vehicleNo: userA.plate,
    startTime,
    endTime,
  });

  const promiseB = reserveSlot({
    slotId,
    userId: userB.uid,
    vehicleNo: userB.plate,
    startTime,
    endTime,
  });

  const results = await Promise.allSettled([promiseA, promiseB]);

  const resA = results[0];
  const resB = results[1];

  return {
    userASucceeded: resA.status === 'fulfilled',
    userBSucceeded: resB.status === 'fulfilled',
    errorB: resB.status === 'rejected' ? (resB.reason as Error).message : undefined,
  };
}

export function cancelBooking(bookingId: string, isAdmin: boolean = false, userId?: string) {
  parkingStore.cancelBooking(bookingId, isAdmin, userId);
}

export function extendBooking(bookingId: string, extraHours: number, userId: string) {
  parkingStore.extendBooking(bookingId, extraHours, userId);
}

// ---------------------------------------------------------------------------
// ADMIN ACTIONS
// ---------------------------------------------------------------------------

export function adminAddSlot(slot: Slot) {
  parkingStore.addSlot(slot);
}

export function adminUpdateSlot(slotId: string, updates: Partial<Slot>) {
  parkingStore.updateSlot(slotId, updates);
}

export function adminRecordGateEntry(slotId: string, vehicleNo: string, bookingId?: string) {
  parkingStore.recordGateEntry(slotId, vehicleNo, bookingId);
}

export function adminRecordGateExit(slotId: string, vehicleNo: string, feeCollected: number) {
  parkingStore.recordGateExit(slotId, vehicleNo, feeCollected);
}

export function adminUpdateMallConfig(newConfig: Partial<MallConfig>) {
  parkingStore.updateConfig(newConfig);
}

export function adminResetSystemData() {
  parkingStore.resetToDefault();
}

export function adminGetLogs(): EntryExitLog[] {
  return parkingStore.getLogs();
}

export function subscribeToLogs(onUpdate: (logs: EntryExitLog[]) => void): () => void {
  onUpdate(parkingStore.getLogs());
  return parkingStore.subscribe(() => {
    onUpdate(parkingStore.getLogs());
  });
}
