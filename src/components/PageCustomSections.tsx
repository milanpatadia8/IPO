import React from 'react';
import { AlertCircle } from 'lucide-react';
import { SitePolicySection } from '../types/ipo';

export const PageNoticeBanner: React.FC<{
  title?: string;
  body?: string;
  compact?: boolean;
}> = ({ title, body, compact = false }) => {
  const cleanTitle = (title || '').trim();
  const cleanBody = (body || '').trim();
  if (!cleanTitle && !cleanBody) return null;

  return (
    <div
      className={`bg-[#FDF8EE] border border-[#EBDCC3] rounded-xl text-sm text-[#57534E] space-y-1.5 ${
        compact ? 'px-4 py-3' : 'p-5'
      }`}
    >
      {cleanTitle && (
        <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
          <AlertCircle className="w-4 h-4 text-[#9A5B13] shrink-0" />
          <span>{cleanTitle}</span>
        </div>
      )}
      {cleanBody && (
        <div className="space-y-2 leading-relaxed">
          {cleanBody
            .split(/\n{2,}/)
            .filter((p) => p.trim().length > 0)
            .map((paragraph, idx) => (
              <p key={idx} className="whitespace-pre-line">
                {paragraph.trim()}
              </p>
            ))}
        </div>
      )}
    </div>
  );
};

export const PageExtraSections: React.FC<{
  sections?: SitePolicySection[];
}> = ({ sections }) => {
  const valid = (sections || []).filter(
    (s) => (s.heading || '').trim().length > 0 || (s.body || '').trim().length > 0
  );
  if (valid.length === 0) return null;

  return (
    <section className="space-y-4 pt-4 border-t border-[#E6DFD3]">
      <div className="grid grid-cols-1 gap-4">
        {valid.map((sec, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#E6DFD3] rounded-xl p-5 sm:p-6 space-y-2.5 shadow-2xs"
          >
            {sec.heading.trim() && (
              <h2 className="text-lg font-display font-semibold text-[#1C1917]">
                {sec.heading.trim()}
              </h2>
            )}
            {sec.body.trim() && (
              <div className="space-y-2 text-sm text-[#57534E] leading-relaxed">
                {sec.body
                  .split(/\n{2,}/)
                  .filter((p) => p.trim().length > 0)
                  .map((paragraph, pIdx) => (
                    <p key={pIdx} className="whitespace-pre-line">
                      {paragraph.trim()}
                    </p>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
