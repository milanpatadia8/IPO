import React from 'react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-500">Effective Date: October 2026</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
        <h2 className="text-sm font-bold text-slate-900">1. Data Collection</h2>
        <p>
          IPO Tracker India does not sell or distribute personal user information. We do not require public users to submit brokerage credentials, bank account numbers, or PAN numbers.
        </p>

        <h2 className="text-sm font-bold text-slate-900">2. Cookies & Analytics</h2>
        <p>
          We use minimal local storage and session indicators strictly to preserve user interface preferences (such as filtered views and dark/light display settings).
        </p>

        <h2 className="text-sm font-bold text-slate-900">3. Administrative Security</h2>
        <p>
          Administrative operations are logged with role attribution for regulatory audit and platform integrity purposes.
        </p>
      </div>
    </div>
  );
};
