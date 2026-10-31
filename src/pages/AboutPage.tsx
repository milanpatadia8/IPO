import React from 'react';
import { Database, ShieldCheck, CheckCircle2, Layers, Cpu, Server, ExternalLink } from 'lucide-react';
import { SEBI_PUBLIC_ISSUES_URL } from '../lib/calculations';

interface AboutPageProps {
  navigate: (route: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Platform Architecture & Governance
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          About IPO Tracker India & Data Methodology
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          IPO Tracker India is an independent financial technology infrastructure engineered to provide transparency, data integrity, and verifiable intelligence across primary capital market offerings in India.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <Database className="w-5 h-5 text-slate-900" />
          <h3 className="font-bold text-slate-900 text-sm">Provable Provenance</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every market observation, subscription multiple, and grey market quotation records its exact source, UTC ingestion timestamp, and verification status.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <h3 className="font-bold text-slate-900 text-sm">Statutory Truth</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Officially confirmed dates, price bands, and listing returns are never approximated. We separate verified exchange facts from speculative estimates.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <Cpu className="w-5 h-5 text-indigo-700" />
          <h3 className="font-bold text-slate-900 text-sm">Pluggable Adapters</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Our ingestion engine orchestrates feeds across National Stock Exchange (NSE), Bombay Stock Exchange (BSE), and SEBI document repositories.
          </p>
        </div>
      </div>

      {/* Source Hierarchy */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Data Hierarchy & Reconciliation Priority
        </h2>
        <div className="space-y-3 text-xs text-slate-600">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-100">
            <span className="font-bold text-slate-900 shrink-0">Priority 1:</span>
            <span>
              <strong>Exchange Master Data (NSE & BSE):</strong> Confirmed bidding windows, price band determinations, lot sizes, and official listing day opening & settlement prints.
            </span>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-100">
            <span className="font-bold text-slate-900 shrink-0">Priority 2:</span>
            <span>
              <strong>Regulatory Filings (SEBI):</strong>{' '}
              <a
                href={SEBI_PUBLIC_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 underline font-semibold inline-flex items-center gap-0.5"
              >
                <span>Draft Red Herring Prospectus (DRHP) and Red Herring Prospectus (RHP)</span>
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              documentation, issue size breakdowns, and statutory risk disclosures from the official SEBI Public Issues portal.
            </span>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-100">
            <span className="font-bold text-slate-900 shrink-0">Priority 3:</span>
            <span>
              <strong>Registrar Allotment Portals:</strong> Link Intime, KFin Technologies, Bigshare Services, and Cameo Corporate declarations for allotment declaration verification.
            </span>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-100">
            <span className="font-bold text-slate-900 shrink-0">Priority 4:</span>
            <span>
              <strong>Grey Market Quotations:</strong> Informal broker and dealer circle observations tracked strictly as speculative community sentiment. Subject to admin review before inclusion.
            </span>
          </div>
        </div>
      </div>

      {/* Freshness Policies */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3 text-xs text-slate-600 leading-relaxed">
        <h2 className="text-lg font-bold text-slate-900">Freshness & Staleness Rules</h2>
        <p>
          Quotes that have not received an update within <strong>24 hours</strong> are automatically flagged with a <span className="text-amber-800 font-semibold bg-amber-50 px-1 py-0.5 rounded">Stale Quote</span> indicator. Subscription figures are reconciled at the close of daily bidding sessions at 17:00 IST.
        </p>
        <p>
          In accordance with our anti-fabrication constitution, whenever live provider credentials are not connected, the system visibly discloses that data is operating on local fixtures.
        </p>
      </div>
    </div>
  );
};
