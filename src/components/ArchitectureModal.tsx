import React, { useState } from 'react';
import { X, ShieldCheck, Terminal, Database, Server, FileText, CheckCircle2, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'transactions' | 'deploy' | 'structure'>('transactions');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Smart Mall Parking Architecture & Deploy Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed verification of Firestore transactions, RBAC custom claims, and deployment instructions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'transactions', label: '1. Firestore Transactions & Anti Double-Booking', icon: ShieldCheck },
            { id: 'rules', label: '2. Firestore Security Rules (ABAC)', icon: FileText },
            { id: 'deploy', label: '3. Step-by-Step Run & Firebase Deploy', icon: Terminal },
            { id: 'structure', label: '4. Folder Structure & Roles', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 pt-2 px-3 border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
                  isSelected
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-bold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <p className="font-bold text-sm mb-1">Non-Negotiable Backend Requirement: Transactional Atomicity</p>
                <p className="text-xs opacity-90">
                  When two users click "Reserve" on the same slot simultaneously, a naive system will double-book the slot.
                  Our implementation runs an atomic Firestore transaction (`db.runTransaction`) that reads the current slot status in the database lock, verifies `status === 'free'`, and only commits if no intervening mutation took place.
                </p>
              </div>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto relative">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `await db.runTransaction(async (transaction) => {\n  const slotRef = db.collection('slots').doc(slotId);\n  const slotDoc = await transaction.get(slotRef);\n  if (!slotDoc.exists || slotDoc.data().status !== 'free') {\n    throw new Error('SLOT_ALREADY_RESERVED');\n  }\n  // Server computes total amount from slot price\n  const amount = durationHours * slotDoc.data().pricePerHour;\n  transaction.set(bookingRef, { ... });\n  transaction.update(slotRef, { status: 'reserved', currentBookingId: bookingRef.id });\n});`,
                      'code-tx'
                    )
                  }
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {copied === 'code-tx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre>{`// Backend: functions/src/index.ts & src/services/firebase.ts
await db.runTransaction(async (transaction) => {
  const slotRef = db.collection('slots').doc(slotId);
  const slotDoc = await transaction.get(slotRef);

  if (!slotDoc.exists || slotDoc.data().status !== 'free') {
    throw new Error('SLOT_ALREADY_RESERVED');
  }

  // Server-side calculation: never trust client-sent amounts
  const pricePerHour = Number(slotDoc.data().pricePerHour) || 5;
  const totalAmount = durationHours * pricePerHour;

  transaction.set(bookingRef, {
    id: bookingId,
    userId: req.user.uid,
    slotId,
    vehicleNo,
    startTime,
    endTime,
    amount: totalAmount,
    status: 'upcoming',
    createdAt: Date.now()
  });

  transaction.update(slotRef, {
    status: 'reserved',
    currentBookingId: bookingId,
    updatedAt: Date.now()
  });
});`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900 dark:text-white">
                Hardened Zero-Trust ABAC Firestore Security Rules (`firestore.rules`):
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Public Bay Availability:</strong> Drivers can read <code className="font-mono">/slots/&#123;slotId&#125;</code> in real-time (<code className="font-mono">onSnapshot</code>) without authentication, allowing customers to view live garage capacity before creating an account.</li>
                <li><strong>Driver Booking Isolation:</strong> Drivers can strictly read and write only their own bookings (<code className="font-mono">resource.data.userId == request.auth.uid</code>). Drivers are blocked from modifying slotId, userId, or createdAt.</li>
                <li><strong>Admin Authorization:</strong> Only administrators with <code className="font-mono">request.auth.token.role == 'admin'</code> can write slots, modify hourly rates, or access <code className="font-mono">/entryExitLogs</code>. Normal users cannot elevate their role to admin on profile creation.</li>
                <li><strong>Catch-All Default Deny:</strong> Root-level match <code className="font-mono">/&#123;document=**&#125;</code> denies all reads and writes unless explicitly permitted.</li>
              </ul>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-4">
              <p className="font-semibold text-slate-900 dark:text-white">
                Step-by-Step Run & Deployment Instructions:
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px]">
                  <strong>1. Local Development Run:</strong>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-1">npm install</p>
                  <p className="text-emerald-600 dark:text-emerald-400">npm run dev</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px]">
                  <strong>2. Local Cloud Functions Emulator:</strong>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-1">cd functions && npm install</p>
                  <p className="text-emerald-600 dark:text-emerald-400">firebase emulators:start --only functions,firestore</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px]">
                  <strong>3. Deploy Security Rules:</strong>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-1">firebase deploy --only firestore:rules</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px]">
                  <strong>4. Deploy Full Stack (Functions + Hosting):</strong>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-1">npm run build</p>
                  <p className="text-emerald-600 dark:text-emerald-400">firebase deploy</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-3 font-mono text-[11px] bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
              <p className="font-sans font-bold text-slate-900 dark:text-white text-xs mb-2">Project File Organization:</p>
              <p>├── firestore.rules          # Production ABAC Firestore security rules</p>
              <p>├── firebase-blueprint.json   # JSON schema IR for entities & collections</p>
              <p>├── functions/                # Firebase Cloud Functions (Node.js/Express)</p>
              <p>│   ├── package.json</p>
              <p>│   └── src/index.ts         # /api/reserve (transaction) & /api/admin/* (custom claims)</p>
              <p>├── src/</p>
              <p>│   ├── types/index.ts        # Data contracts (Slot, Booking, User, Log)</p>
              <p>│   ├── services/firebase.ts  # Firebase SDK & resilient real-time store</p>
              <p>│   ├── services/api.ts       # Client API & transaction concurrency tests</p>
              <p>│   ├── context/AuthContext   # Driver vs Admin roles with custom claims</p>
              <p>│   ├── components/           # Navbar, ParkingGrid, ReservationModal, etc.</p>
              <p>│   └── App.tsx               # Main SPA routing & role layouts</p>
              <p>└── README.md                # Architectural design rationale</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
