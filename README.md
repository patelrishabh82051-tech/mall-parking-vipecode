# ParkSmart - Smart Mall Parking System

A production-grade, responsive web frontend and backend integration for a Smart Mall Parking Management System built with React, Vite, Tailwind CSS, Firebase Cloud Functions (Node.js/Express), and Cloud Firestore.

---

## 🏗️ Folder Structure

```
├── .env.example               # Environment variables template for Firebase SDK & APIs
├── firestore.rules            # Hardened Zero-Trust ABAC Firestore Security Rules
├── firebase-blueprint.json    # JSON Schema Intermediate Representation (IR)
├── functions/                 # Backend: Firebase Cloud Functions (Node.js/Express)
│   ├── package.json
│   └── src/
│       └── index.ts           # /api/reserve (transaction) & /api/admin/* (custom claims)
├── index.html                 # App entry point with meta tags and Google fonts
├── metadata.json              # AI Studio app metadata
├── package.json               # Frontend dependencies (React 19, Vite, Lucide, QRCode)
├── src/
│   ├── App.tsx                # Main view orchestrator and layout routing
│   ├── index.css              # Tailwind CSS imports & custom typography
│   ├── main.tsx               # DOM root mounting
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces (Slot, Booking, UserProfile, Log)
│   ├── context/
│   │   ├── AuthContext.tsx    # Firebase Auth, custom claim checks & demo switchers
│   │   └── ThemeContext.tsx   # Light/Dark mode state with persistence
│   ├── services/
│   │   ├── firebase.ts        # Firebase Client SDK init & resilient real-time store
│   │   └── api.ts             # API client, transactional booking & concurrency tester
│   └── components/
│       ├── Navbar.tsx         # Responsive header, live status, role toggle & theme
│       ├── ParkingGrid.tsx    # Interactive garage floorplan with real-time bay statuses
│       ├── ReservationModal.tsx# Plate validation, duration selector & atomic booking
│       ├── BookingConfirmationModal.tsx # Dynamic SVG QR ticket generation & directions
│       ├── MyBookingsView.tsx # Active, upcoming, and past booking management
│       ├── AdminDashboard.tsx # Protected admin console: KPIs, bays, search & gate simulator
│       ├── ArchitectureModal.tsx # In-app architectural and deployment reference
│       ├── AuthModal.tsx      # Email/Password + Google login + Quick demo switchers
│       └── Toast.tsx          # Real-time feedback alerts
└── tsconfig.json
```

---

## 🧠 Architectural Decisions & Rationale

### 1. Concurrency Control: Firestore Transactions for Zero Double-Booking
* **The Problem:** In a high-traffic mall garage, two drivers frequently attempt to reserve the same prime spot simultaneously. In standard non-transactional writes, both requests read `status: "free"` and write conflicting reservations, causing customer disputes at the barrier gate.
* **The Solution:** The `/api/reserve` endpoint and `reserveSlot` service execute inside an atomic **Firestore transaction (`runTransaction`)**:
  1. The transaction reads the slot document within a locked snapshot.
  2. If the slot status is not strictly `free`, the transaction aborts with a concurrency error.
  3. The server computes the fee from the official slot hourly rate (never trusting client-supplied numbers).
  4. The booking document is created and the slot status atomically changes to `reserved`.
* **Testing:** The Admin Dashboard includes a dedicated **Transaction Stress Test** tool where admins can trigger two simultaneous reservation requests for the same slot to visually verify transaction lock acquisition and rejection of the competing write.

### 2. Role-Based Access Control (RBAC) via Firebase Custom Claims
* **The Problem:** Client-side role checks or storing `isAdmin: true` in public documents are vulnerable to tampering and client impersonation.
* **The Solution:** All `/api/admin/*` routes enforce two layered Express middlewares:
  1. `authenticateToken`: Verifies the cryptographically signed Firebase ID token.
  2. `requireAdminClaim`: Verifies that `decodedToken.role === 'admin'` or `decodedToken.admin === true`. Unauthorized requests immediately terminate with `401 Unauthorized` or `403 Forbidden`.
* In `firestore.rules`, administrative operations (`/slots/{slotId}` write, `/entryExitLogs/{logId}` read/write) require `request.auth.token.role == 'admin'`, preventing direct SDK bypass.

### 3. Real-Time Occupancy Stream (`onSnapshot`)
* Drivers immediately see slot availability updates across all floors as vehicles enter and depart without refreshing the page.
* Built-in fallback resilience: If live Firebase credentials are not yet configured, the app seamlessly runs on an integrated in-memory & LocalStorage reactive pub/sub store that implements real-time listeners and transactional logic identical to Firestore.

### 4. Dynamic QR Code Gate Passes
* Completed reservations generate a scannable QR ticket containing an encoded JSON payload (`ticketId`, `slotId`, `vehiclePlate`, `expiration`).
* Drivers scan this QR code or have their vehicle license plate scanned via automatic number-plate recognition (ANPR) cameras at the mall entrance barrier.
* The Admin Dashboard features an interactive **Gate Simulator** to test both entry (marking slot `occupied`) and exit (marking slot `free` and computing final parking duration and fees).

---

## 🔒 Firestore Security Rules (`firestore.rules`)

The security rules adhere to Attribute-Based Access Control (ABAC) with mathematical safety:
- **Default Deny:** Catch-all `match /{document=**} { allow read, write: if false; }`.
- **Slots:** Public read (`allow get, list: if true;`) so prospective visitors can check garage availability; write restricted strictly to authenticated admins.
- **Bookings:** Drivers can strictly read and write only their own records (`resource.data.userId == request.auth.uid`). Drivers are forbidden from modifying immutable fields (`slotId`, `userId`, `createdAt`).
- **Users:** Users can only create their own profile with `role: 'driver'` on initial registration. Self-assignment of the `admin` role is strictly rejected.

---

## 🚀 Step-by-Step Local Run & Firebase Deploy Instructions

### Prerequisites
- Node.js 18+ or 20+
- Firebase CLI: `npm install -g firebase-tools`

### Step 1: Clone and Configure Environment
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with your Firebase web app credentials from the Firebase Console (Project Settings > General > Your apps > Web app).

### Step 2: Install Dependencies & Run Frontend Locally
```bash
# Install frontend packages
npm install

# Start Vite dev server on port 3000
npm run dev
```
Open `http://localhost:3000` to interact with the responsive dashboard.

### Step 3: Run Cloud Functions Locally with Firebase Emulator
```bash
cd functions
npm install
npm run build

# Start Firestore and Cloud Functions local emulators
firebase emulators:start --only functions,firestore
```

### Step 4: Deploy to Firebase Hosting & Cloud Functions
1. Login to Firebase CLI:
   ```bash
   firebase login
   ```
2. Link your Firebase project:
   ```bash
   firebase use --add
   ```
3. Deploy Firestore Security Rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Build the production React frontend:
   ```bash
   npm run build
   ```
5. Deploy everything (Frontend Hosting + Cloud Functions):
   ```bash
   firebase deploy
   ```

---

## 👥 Demo Quick-Switching

For seamless demonstration and evaluation, the app provides convenient 1-click role toggles directly in the navbar and login modal:
- **Driver Role:** Alex Rivera (`alex.rivera@example.com`)
- **Admin Role:** Mall Operations Lead (`patelrishabh82051@gmail.com`) with verified admin custom claims
