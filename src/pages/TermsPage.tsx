import React from 'react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terms of Use</h1>
        <p className="text-xs text-slate-500">Effective Date: October 2026</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
        <h2 className="text-sm font-bold text-slate-900">1. Acceptance of Terms</h2>
        <p>
          By accessing or using the IPO Tracker India platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.
        </p>

        <h2 className="text-sm font-bold text-slate-900">2. Informational Purpose Only</h2>
        <p>
          The content on this website is for informational and educational purposes only. It is not intended as financial, trading, or investment advice.
        </p>

        <h2 className="text-sm font-bold text-slate-900">3. Proprietary Rights</h2>
        <p>
          All charts, algorithms, and interface compilations are protected under applicable intellectual property laws.
        </p>

        <h2 className="text-sm font-bold text-slate-900">4. Limitation of Liability</h2>
        <p>
          In no event shall IPO Tracker India or its contributors be liable for any direct, indirect, incidental, or consequential damages arising out of your reliance on data displayed on this portal.
        </p>
      </div>
    </div>
  );
};
