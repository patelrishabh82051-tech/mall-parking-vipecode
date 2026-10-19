import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Extend Express Request type to carry decoded user
interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

/**
 * Middleware: Verify Firebase Auth ID Token
 * Reject with 401 if missing or invalid
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header. Expected Bearer <token>'
    });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error: any) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase ID token' });
  }
}

/**
 * Middleware: Verify Admin Custom Claim
 * Non-negotiable requirement: reject with 403 Forbidden if not admin
 */
export async function requireAdminClaim(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  // Check custom claim
  const isAdmin = req.user.role === 'admin' || req.user.admin === true;

  if (!isAdmin) {
    return res.status(403).json({
      error: 'Forbidden: Mall Administrator custom claim required to access this resource'
    });
  }

  return next();
}

// ---------------------------------------------------------------------------
// DRIVER ROUTES
// ---------------------------------------------------------------------------

/**
 * POST /api/reserve
 * Non-negotiable requirement: Uses a Firestore Transaction to guarantee atomic slot reservation
 * and prevent double-booking when multiple users reserve the same slot concurrently.
 */
app.post('/api/reserve', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slotId, vehicleNo, startTime, endTime } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user ID' });
    }

    // Input Validation
    if (!slotId || typeof slotId !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing slotId' });
    }

    if (!vehicleNo || typeof vehicleNo !== 'string' || vehicleNo.trim().length < 2) {
      return res.status(400).json({ error: 'Valid vehicle plate number is required' });
    }

    const start = Number(startTime);
    const end = Number(endTime);

    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ error: 'End time must be strictly after start time' });
    }

    const durationHours = Math.max(0.5, (end - start) / (1000 * 60 * 60));

    // Execute Firestore Transaction to guarantee atomicity and avoid double booking
    const result = await db.runTransaction(async (transaction) => {
      const slotRef = db.collection('slots').doc(slotId);
      const slotDoc = await transaction.get(slotRef);

      if (!slotDoc.exists) {
        throw new Error('SLOT_NOT_FOUND');
      }

      const slotData = slotDoc.data();
      if (!slotData) {
        throw new Error('SLOT_NOT_FOUND');
      }

      // Check slot status
      if (slotData.status !== 'free') {
        throw new Error('SLOT_ALREADY_RESERVED');
      }

      // Calculate server-side fee: Never trust client-sent amounts
      const pricePerHour = Number(slotData.pricePerHour) || 5;
      const totalAmount = Math.round(durationHours * pricePerHour * 100) / 100;

      const bookingRef = db.collection('bookings').doc();
      const bookingId = bookingRef.id;

      const now = Date.now();
      const bookingData = {
        id: bookingId,
        userId: userId,
        slotId: slotId,
        vehicleNo: vehicleNo.trim().toUpperCase(),
        startTime: start,
        endTime: end,
        amount: totalAmount,
        status: start <= now + 300000 ? 'active' : 'upcoming',
        createdAt: now,
        qrData: JSON.stringify({
          ticket: bookingId,
          slot: slotId,
          plate: vehicleNo.trim().toUpperCase(),
          start: start,
          end: end
        })
      };

      // Transaction step 1: write the booking
      transaction.set(bookingRef, bookingData);

      // Transaction step 2: update slot status to 'reserved'
      transaction.update(slotRef, {
        status: 'reserved',
        currentBookingId: bookingId,
        updatedAt: now
      });

      return {
        bookingId,
        booking: bookingData
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Slot successfully reserved',
      bookingId: result.bookingId,
      booking: result.booking
    });

  } catch (error: any) {
    console.error('Reservation transaction error:', error);
    if (error.message === 'SLOT_NOT_FOUND') {
      return res.status(404).json({ error: 'Requested parking slot does not exist' });
    }
    if (error.message === 'SLOT_ALREADY_RESERVED') {
      return res.status(409).json({
        error: 'Concurrency conflict: This slot was just reserved or occupied by another driver. Please pick another slot.'
      });
    }
    return res.status(500).json({ error: 'Transaction failed while reserving slot. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// ADMIN ROUTES (Protected with requireAdminClaim middleware)
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/overview
 * Real-time summary statistics for mall admins
 */
app.get('/api/admin/overview', authenticateToken, requireAdminClaim, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const slotsSnapshot = await db.collection('slots').get();
    const bookingsSnapshot = await db.collection('bookings').get();

    const totalSlots = slotsSnapshot.size;
    let freeCount = 0;
    let reservedCount = 0;
    let occupiedCount = 0;
    let disabledCount = 0;

    slotsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'free') freeCount++;
      else if (data.status === 'reserved') reservedCount++;
      else if (data.status === 'occupied') occupiedCount++;
      else if (data.status === 'disabled') disabledCount++;
    });

    const activeBookings: any[] = [];
    let revenueToday = 0;
    const startOfToday = new Date().setHours(0, 0, 0, 0);

    bookingsSnapshot.forEach((doc) => {
      const b = doc.data();
      if (b.status === 'active' || b.status === 'upcoming') {
        activeBookings.push(b);
      }
      if (b.createdAt >= startOfToday && b.status !== 'cancelled') {
        revenueToday += Number(b.amount) || 0;
      }
    });

    const occupancyRate = totalSlots > 0 ? Math.round(((occupiedCount + reservedCount) / totalSlots) * 100) : 0;

    return res.json({
      totalSlots,
      freeCount,
      reservedCount,
      occupiedCount,
      disabledCount,
      occupancyRate,
      activeBookingsCount: activeBookings.length,
      revenueToday: Math.round(revenueToday * 100) / 100
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin overview statistics' });
  }
});

/**
 * POST /api/admin/slots
 * Add a new parking slot
 */
app.post('/api/admin/slots', authenticateToken, requireAdminClaim, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, floor, zone, type, pricePerHour } = req.body;

    if (!id || !floor || !zone) {
      return res.status(400).json({ error: 'Slot ID, floor, and zone are required' });
    }

    const slotRef = db.collection('slots').doc(id);
    const existing = await slotRef.get();
    if (existing.exists) {
      return res.status(409).json({ error: `Slot ${id} already exists` });
    }

    const newSlot = {
      id,
      floor,
      zone,
      status: 'free',
      type: type || 'standard',
      pricePerHour: Number(pricePerHour) || 5,
      updatedAt: Date.now()
    };

    await slotRef.set(newSlot);
    return res.status(201).json({ success: true, slot: newSlot });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/admin/slots/:id
 * Toggle disabled status or edit pricing
 */
app.patch('/api/admin/slots/:id', authenticateToken, requireAdminClaim, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const slotId = req.params.id;
    const { status, pricePerHour, type } = req.body;

    const slotRef = db.collection('slots').doc(slotId);
    const updateData: Record<string, any> = { updatedAt: Date.now() };

    if (status) updateData.status = status;
    if (pricePerHour !== undefined) updateData.pricePerHour = Number(pricePerHour);
    if (type) updateData.type = type;

    await slotRef.update(updateData);
    return res.json({ success: true, message: `Slot ${slotId} updated successfully` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/bookings/:id/cancel
 * Admin cancellation of any booking
 */
app.post('/api/admin/bookings/:id/cancel', authenticateToken, requireAdminClaim, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookingId = req.params.id;
    await db.runTransaction(async (transaction) => {
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingDoc = await transaction.get(bookingRef);
      if (!bookingDoc.exists) throw new Error('Booking not found');

      const booking = bookingDoc.data()!;
      transaction.update(bookingRef, { status: 'cancelled' });

      // Free the slot if it was reserved by this booking
      const slotRef = db.collection('slots').doc(booking.slotId);
      transaction.update(slotRef, { status: 'free', currentBookingId: null, updatedAt: Date.now() });
    });

    return res.json({ success: true, message: `Booking ${bookingId} cancelled` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/gate/entry
 * Barrier Gate Simulation: Record arrival & mark slot occupied
 */
app.post('/api/admin/gate/entry', authenticateToken, requireAdminClaim, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bookingId, vehicleNo, slotId } = req.body;
    const now = Date.now();

    await db.runTransaction(async (transaction) => {
      const slotRef = db.collection('slots').doc(slotId);
      transaction.update(slotRef, { status: 'occupied', updatedAt: now });

      if (bookingId) {
        const bookingRef = db.collection('bookings').doc(bookingId);
        transaction.update(bookingRef, { status: 'active' });
      }

      const logRef = db.collection('entryExitLogs').doc();
      transaction.set(logRef, {
        id: logRef.id,
        bookingId: bookingId || null,
        vehicleNo: vehicleNo.toUpperCase(),
        slotId,
        entryTime: now,
        exitTime: null,
        feeCollected: 0,
        status: 'inside'
      });
    });

    return res.json({ success: true, message: `Gate opened: Vehicle ${vehicleNo} entered slot ${slotId}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/gate/exit
 * Barrier Gate Simulation: Record departure & free slot
 */
app.post('/api/admin/gate/exit', authenticateToken, requireAdminClaim, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slotId, vehicleNo, feeCollected } = req.body;
    const now = Date.now();

    await db.runTransaction(async (transaction) => {
      const slotRef = db.collection('slots').doc(slotId);
      transaction.update(slotRef, { status: 'free', currentBookingId: null, updatedAt: now });

      // Query active log for this slot/vehicle
      const logsQuery = await db.collection('entryExitLogs')
        .where('slotId', '==', slotId)
        .where('status', '==', 'inside')
        .limit(1)
        .get();

      if (!logsQuery.empty) {
        const activeLogDoc = logsQuery.docs[0];
        transaction.update(activeLogDoc.ref, {
          exitTime: now,
          feeCollected: Number(feeCollected) || 0,
          status: 'exited'
        });

        const logData = activeLogDoc.data();
        if (logData.bookingId) {
          const bookingRef = db.collection('bookings').doc(logData.bookingId);
          transaction.update(bookingRef, { status: 'completed' });
        }
      }
    });

    return res.json({ success: true, message: `Gate opened: Vehicle ${vehicleNo} exited. Slot ${slotId} is now free.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Export Cloud Functions handler
export const api = functions.https.onRequest(app);
