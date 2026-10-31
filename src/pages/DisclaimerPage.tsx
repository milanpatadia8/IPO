import React from 'react';
import { AlertTriangle, ShieldAlert, Scale, CheckCircle2 } from 'lucide-react';

interface DisclaimerPageProps {
  navigate: (route: string) => void;
}

export const DisclaimerPage: React.FC<DisclaimerPageProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-3">
        <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          <span>Statutory Disclosures & Financial Notice</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Disclaimer & Risk Disclosures
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Please read this disclosure carefully before utilizing information published on IPO Tracker India.
        </p>
      </div>

      {/* 1. SEBI Disclaimer */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3 text-xs text-slate-700 leading-relaxed">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Scale className="w-4 h-4 text-slate-700" />
          <span>1. Not a SEBI-Registered Investment Advisor or Research Analyst</span>
        </h2>
        <p>
          IPO Tracker India is an independent informational and software tracking utility. It is <strong>NOT</strong> registered with the Securities and Exchange Board of India (SEBI) under the SEBI (Investment Advisers) Regulations, 2013, or the SEBI (Research Analysts) Regulations, 2014.
        </p>
        <p>
          Nothing contained on this website constitutes financial, legal, tax, or investment advice, nor does it represent a recommendation or solicitation to buy, subscribe, hold, or sell securities of any company.
        </p>
      </div>

      {/* 2. Grey Market Premium (GMP) Trust & Speculation Warning */}
      <div className="bg-white border border-amber-200 rounded-lg p-6 space-y-3 text-xs text-slate-700 leading-relaxed bg-amber-50/20">
        <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <span>2. Grey Market Premium (GMP) Speculative Risk</span>
        </h2>
        <p>
          <strong>Grey Market Premium (GMP)</strong> represents unofficial, unregulated, and speculative bids circulated in informal dealer circles before an initial public offering lists on the stock exchange.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          <li>GMP is <strong>NOT</strong> an exchange-confirmed transaction or settlement price.</li>
          <li>GMP can change rapidly and without notice due to dealer rumors, market liquidity, and secondary index fluctuations.</li>
          <li>A positive GMP does <strong>NOT</strong> guarantee a listing gain, nor does a negative GMP guarantee a listing discount.</li>
          <li>Historical GMP observations must not be construed as future performance indicators.</li>
        </ul>
      </div>

      {/* 3. Market Risks */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3 text-xs text-slate-700 leading-relaxed">
        <h2 className="text-base font-bold text-slate-900">
          3. Market Risks & Due Diligence
        </h2>
        <p>
          Investments in initial public offerings and equities are subject to significant capital risk. Prospective investors should perform their own independent due diligence, carefully analyze the{' '}
          <a
            href="https://www.sebi.gov.in/filings/public-issues.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:text-blue-900 underline font-semibold"
          >
            Draft Red Herring Prospectus (DRHP)
          </a>{' '}
          and{' '}
          <a
            href="https://www.sebi.gov.in/filings/public-issues.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:text-blue-900 underline font-semibold"
          >
            Red Herring Prospectus (RHP)
          </a>{' '}
          filed with SEBI (available on the official portal at{' '}
          <a
            href="https://www.sebi.gov.in/filings/public-issues.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:text-blue-900 underline"
          >
            sebi.gov.in/filings/public-issues.html
          </a>
          ) and relevant stock exchanges (NSE and BSE), and consult a certified financial advisor before committing funds.
        </p>
      </div>

      {/* 4. Data Accuracy & Sample Fixtures Notice */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3 text-xs text-slate-700 leading-relaxed">
        <h2 className="text-base font-bold text-slate-900">
          4. Data Freshness & Non-Warranty
        </h2>
        <p>
          While we strive to source accurate records from official filings, registrar announcements, and public disclosures, IPO Tracker India makes no warranty, express or implied, regarding the completeness, timeliness, or accuracy of any price, subscription multiple, or timetable displayed.
        </p>
      </div>
    </div>
  );
};
