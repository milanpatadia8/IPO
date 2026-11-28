import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SitePolicy } from '../types/ipo';
import { formatIndianDate } from '../lib/calculations';

interface PolicyDocumentPageProps {
  policy?: SitePolicy;
  loading?: boolean;
  navigate: (route: string) => void;
}

const CATEGORY_LABELS: Record<SitePolicy['category'], string> = {
  disclaimer: 'Disclaimer & Regulatory Notice',
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
  policy: 'Platform Policy',
  disclosure: 'Disclosure & Governance',
};

export const PolicyDocumentPage: React.FC<PolicyDocumentPageProps> = ({
  policy,
  loading = false,
  navigate,
}) => {
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-8 text-sm text-[#6B7280]">
          Loading document...
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-8 text-center space-y-4">
          <h1 className="text-xl font-semibold text-[#111827]">Document Not Available</h1>
          <p className="text-sm text-[#4B5563]">
            This policy or disclosure page has been removed or is not currently published.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2.5 border-b border-[#EAEAEA] pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
          <span className="font-medium text-[#4B5563]">{CATEGORY_LABELS[policy.category]}</span>
          {policy.updated_at && (
            <>
              <span aria-hidden="true">·</span>
              <span>Last updated {formatIndianDate(policy.updated_at.slice(0, 10))}</span>
            </>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">
          {policy.title}
        </h1>
        {policy.subtitle && (
          <p className="text-base text-[#4B5563] leading-relaxed">{policy.subtitle}</p>
        )}
      </div>

      {policy.sections.length === 0 && policy.footer_summary ? (
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-3 text-sm text-[#4B5563] leading-relaxed">
          {policy.footer_summary
            .split(/\n{2,}/)
            .filter((p) => p.trim().length > 0)
            .map((paragraph, idx) => (
              <p key={idx} className="whitespace-pre-line">
                {paragraph.trim()}
              </p>
            ))}
        </div>
      ) : (
        <div className="space-y-5">
          {policy.sections.map((section, idx) => (
            <section
              key={idx}
              className="bg-white border border-[#EAEAEA] rounded-xl p-6 space-y-3 text-sm text-[#4B5563] leading-relaxed"
            >
              {section.heading && (
                <h2 className="text-base font-semibold text-[#111827]">{section.heading}</h2>
              )}
              {section.body
                .split(/\n{2,}/)
                .filter((p) => p.trim().length > 0)
                .map((paragraph, pIdx) => (
                  <p key={pIdx} className="whitespace-pre-line">
                    {paragraph.trim()}
                  </p>
                ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
