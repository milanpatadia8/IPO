import React from 'react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2 border-b border-[#EAEAEA] pb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-[#4B5563]">Effective Date: October 2026</p>
      </div>

      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4 text-sm text-[#4B5563] leading-relaxed">
        <h2 className="text-base font-semibold text-[#111827]">1. Data Collection</h2>
        <p>
          IPO Insiders does not sell or distribute personal user information. We do not require public users to submit brokerage credentials, bank account numbers, or PAN numbers to browse analytics or view subscription trends.
        </p>

        <h2 className="text-base font-semibold text-[#111827]">2. Cookies &amp; Storage</h2>
        <p>
          We use minimal local storage and session indicators strictly to preserve user preferences (such as bookmarked issues or saved PAN numbers in your browser).
        </p>

        <h2 className="text-base font-semibold text-[#111827]">3. Administrative Security</h2>
        <p>
          Administrative operations are logged with role attribution for regulatory audit and platform integrity purposes.
        </p>
      </div>
    </div>
  );
};
