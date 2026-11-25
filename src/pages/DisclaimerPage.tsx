import React from 'react';
import { AlertTriangle, ShieldAlert, Scale } from 'lucide-react';

interface DisclaimerPageProps {
  navigate: (route: string) => void;
}

export const DisclaimerPage: React.FC<DisclaimerPageProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="space-y-2 border-b border-[#EAEAEA] pb-6">
        <div className="text-xs font-medium text-[#DC2626] flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          <span>Statutory Disclosures &amp; Regulatory Notice</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
          Disclaimer &amp; Risk Disclosures
        </h1>
        <p className="text-base text-[#4B5563] leading-relaxed">
          Please read this statutory disclosure carefully before utilizing information published on IPO Insiders.
        </p>
      </div>

      {/* 1. SEBI Disclaimer */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-3 text-sm text-[#4B5563] leading-relaxed">
        <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#111827]" />
          <span>1. Not a SEBI-Registered Investment Advisor or Research Analyst</span>
        </h2>
        <p>
          IPO Insiders is an independent informational and software tracking utility. It is <strong className="text-[#111827]">NOT</strong> registered with the Securities and Exchange Board of India (SEBI) under the SEBI (Investment Advisers) Regulations, 2013, or the SEBI (Research Analysts) Regulations, 2014.
        </p>
        <p>
          Nothing contained on this website constitutes financial, legal, tax, or investment advice, nor does it represent a recommendation or solicitation to buy, subscribe, hold, or sell securities of any company.
        </p>
      </div>

      {/* 2. Grey Market Premium (GMP) Speculation Warning */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-3 text-sm text-[#4B5563] leading-relaxed">
        <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>2. Grey Market Premium (GMP) Speculative Risk</span>
        </h2>
        <p>
          <strong className="text-[#111827]">Grey Market Premium (GMP)</strong> represents unofficial, unregulated, and speculative bids circulated in informal dealer circles before an initial public offering lists on the stock exchange.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#4B5563]">
          <li>GMP is <strong className="text-[#111827]">NOT</strong> an exchange-confirmed transaction or settlement price.</li>
          <li>GMP can change rapidly and without notice due to dealer rumors, market liquidity, and secondary index fluctuations.</li>
          <li>A positive GMP does <strong className="text-[#111827]">NOT</strong> guarantee a listing gain, nor does a negative GMP guarantee a listing discount.</li>
          <li>Historical GMP observations must not be construed as future performance indicators.</li>
        </ul>
      </div>

      {/* 3. Market Risks */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-3 text-sm text-[#4B5563] leading-relaxed">
        <h2 className="text-base font-semibold text-[#111827]">
          3. Market Risks &amp; Due Diligence
        </h2>
        <p>
          Investments in initial public offerings and equities are subject to significant capital risk. Prospective investors should perform their own independent due diligence, carefully analyze the{' '}
          <a
            href="https://www.sebi.gov.in/filings/public-issues.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#111827] hover:underline font-semibold"
          >
            Draft Red Herring Prospectus (DRHP)
          </a>{' '}
          and{' '}
          <a
            href="https://www.sebi.gov.in/filings/public-issues.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#111827] hover:underline font-semibold"
          >
            Red Herring Prospectus (RHP)
          </a>{' '}
          filed with SEBI (available at{' '}
          <a
            href="https://www.sebi.gov.in/filings/public-issues.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#111827] hover:underline font-medium"
          >
            sebi.gov.in/filings/public-issues.html
          </a>
          ) and relevant stock exchanges (NSE and BSE), and consult a certified financial advisor before committing funds.
        </p>
      </div>

      {/* 4. Data Accuracy & Non-Warranty */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-3 text-sm text-[#4B5563] leading-relaxed">
        <h2 className="text-base font-semibold text-[#111827]">
          4. Data Freshness &amp; Non-Warranty
        </h2>
        <p>
          While we strive to source accurate records from official filings, registrar announcements, and public disclosures, IPO Insiders makes no warranty, express or implied, regarding the completeness, timeliness, or accuracy of any price, subscription multiple, or timetable displayed.
        </p>
      </div>
    </div>
  );
};
