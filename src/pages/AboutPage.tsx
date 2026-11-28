import React from 'react';
import { Database, ShieldCheck, Cpu, ExternalLink } from 'lucide-react';
import { SEBI_PUBLIC_ISSUES_URL } from '../lib/calculations';

interface AboutPageProps {
  navigate: (route: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="space-y-2 border-b border-[#EAEAEA] pb-6">
        <div className="text-xs font-medium text-[#4B5563]">
          Platform Architecture &amp; Governance
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
          About IPO Insiders &amp; Data Methodology
        </h1>
        <p className="text-base text-[#4B5563] leading-relaxed">
          IPO Insiders is an independent primary markets intelligence suite engineered to provide complete transparency, data integrity, and verifiable bidding analytics across Indian public offerings.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-2">
          <Database className="w-5 h-5 text-[#111827]" />
          <h3 className="font-semibold text-[#111827] text-base">Provable Provenance</h3>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            Every market observation, subscription multiple, and unlisted price reference records its exact source, UTC ingestion timestamp, and verification status.
          </p>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-2">
          <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
          <h3 className="font-semibold text-[#111827] text-base">Statutory Truth</h3>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            Officially confirmed dates, price bands, and listing returns are never approximated. We separate verified exchange facts from speculative estimates.
          </p>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 space-y-2">
          <Cpu className="w-5 h-5 text-[#111827]" />
          <h3 className="font-semibold text-[#111827] text-base">Pluggable Adapters</h3>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            Our ingestion engine orchestrates feeds across National Stock Exchange (NSE), Bombay Stock Exchange (BSE), and SEBI document repositories.
          </p>
        </div>
      </div>

      {/* Source Hierarchy */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#111827]">
          Data Hierarchy &amp; Reconciliation Priority
        </h2>
        <div className="space-y-3 text-sm text-[#4B5563]">
          <div className="flex items-start gap-3 p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
            <span className="font-semibold text-[#111827] shrink-0">Priority 1:</span>
            <span>
              <strong className="text-[#111827]">Exchange Master Data (NSE &amp; BSE):</strong> Confirmed bidding windows, price band determinations, lot sizes, and official listing day opening &amp; settlement prints.
            </span>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
            <span className="font-semibold text-[#111827] shrink-0">Priority 2:</span>
            <span>
              <strong className="text-[#111827]">Regulatory Filings (SEBI):</strong>{' '}
              <a
                href={SEBI_PUBLIC_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#111827] underline font-medium inline-flex items-center gap-0.5"
              >
                <span>Draft Red Herring Prospectus (DRHP) and Red Herring Prospectus (RHP)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>{' '}
              documentation, issue size breakdowns, and statutory risk disclosures from the official SEBI Public Issues portal.
            </span>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
            <span className="font-semibold text-[#111827] shrink-0">Priority 3:</span>
            <span>
              <strong className="text-[#111827]">Registrar Allotment Portals:</strong> Link Intime, KFin Technologies, Bigshare Services, and Cameo Corporate declarations for allotment declaration verification.
            </span>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-[#FAFAFA] rounded-lg border border-[#EAEAEA]">
            <span className="font-semibold text-[#111827] shrink-0">Priority 4:</span>
            <span>
              <strong className="text-[#111827]">Unlisted Price References (Non-GMP):</strong> As per SEBI rules, we do not publish Grey Market Premium (GMP). Pre-listing unlisted price indicators are tracked solely as informational market references subject to admin review.
            </span>
          </div>
        </div>
      </div>

      {/* Freshness Policies */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-3 text-sm text-[#4B5563] leading-relaxed">
        <h2 className="text-lg font-semibold text-[#111827]">Freshness &amp; Staleness Rules</h2>
        <p>
          Live subscription data is refreshed continuously throughout trading hours (10:00 AM – 5:00 PM IST) on active bidding days. Observations older than 24 hours are clearly badged to prevent decision-making on outdated market data.
        </p>
      </div>
    </div>
  );
};

