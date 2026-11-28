import { SitePolicy } from '../types/ipo';

const BASE_TIMESTAMP = '2026-10-01T00:00:00.000Z';

export const DEFAULT_SITE_POLICIES: SitePolicy[] = [
  {
    id: 'policy-disclaimer',
    slug: 'disclaimer',
    title: 'SEBI Disclaimer & Risk Disclosures',
    subtitle: 'Statutory Disclosures & Regulatory Notice',
    category: 'disclaimer',
    footer_summary: [
      'No GMP Disclosure (SEBI Compliance): As per SEBI guidelines and regulatory rules, IPO Insiders does NOT show, publish, or endorse Grey Market Premium (GMP). Any Unlisted Price or pre-listing indicative reference figures displayed on this platform are solely informational indicators and should not be treated as GMP, official exchange prices, or guaranteed listing estimates.',
      'IPO Insiders is not registered with SEBI as an Investment Advisor, Research Analyst, Stockbroker, or Merchant Banker. All IPO information, issue dates, quota breakdowns, subscription figures, and unlisted price references published on this platform are provided strictly for informational and educational purposes only and do not constitute financial advice or a recommendation to apply, buy, or sell any securities.',
      'Investments in the securities market are subject to market risks. Read the official Draft Red Herring Prospectus (DRHP) / Red Herring Prospectus (RHP) and all scheme-related documents filed with SEBI, NSE, and BSE carefully before investing, and consult a SEBI-registered financial advisor for personalized guidance.',
    ].join('\n\n'),
    show_in_footer_links: true,
    show_in_footer_banner: true,
    sort_order: 1,
    sections: [
      {
        heading: '1. Not a SEBI-Registered Investment Advisor or Research Analyst',
        body: [
          'IPO Insiders is an independent informational and software tracking utility. It is NOT registered with the Securities and Exchange Board of India (SEBI) under the SEBI (Investment Advisers) Regulations, 2013, or the SEBI (Research Analysts) Regulations, 2014.',
          'Nothing contained on this website constitutes financial, legal, tax, or investment advice, nor does it represent a recommendation or solicitation to buy, subscribe, hold, or sell securities of any company.',
        ].join('\n\n'),
      },
      {
        heading: '2. SEBI Compliance: No GMP Policy & Unlisted Price Notice',
        body: [
          "As per SEBI's regulatory rules and guidelines, IPO Insiders does NOT show, publish, promote, or endorse Grey Market Premium (GMP) data.",
          'Any Unlisted Price or pre-listing indicative reference figures displayed on this platform represent informal, unregulated market reference observations tracked solely for educational and informational awareness before an initial public offering lists on NSE or BSE.',
          'Unlisted Price references are NOT Grey Market Premium (GMP) and are NOT exchange-confirmed transaction or settlement prices. A positive Unlisted Price spread does NOT guarantee a listing gain, nor does a negative spread guarantee a listing discount.',
        ].join('\n\n'),
      },
      {
        heading: '3. Market Risks & Due Diligence',
        body: 'Investments in initial public offerings and equities are subject to significant capital risk. Prospective investors should perform their own independent due diligence, carefully analyze the Draft Red Herring Prospectus (DRHP) and Red Herring Prospectus (RHP) filed with SEBI, NSE, and BSE, and consult a certified financial advisor before committing funds.',
      },
      {
        heading: '4. Data Freshness & Non-Warranty',
        body: 'While we strive to maintain accurate records from official filings, registrar announcements, and public disclosures, IPO Insiders makes no warranty, express or implied, regarding the completeness, timeliness, or accuracy of any price, subscription multiple, or timetable displayed.',
      },
    ],
    created_at: BASE_TIMESTAMP,
    updated_at: BASE_TIMESTAMP,
  },
  {
    id: 'policy-terms',
    slug: 'terms',
    title: 'Terms of Use',
    subtitle: 'Effective Date: October 2026',
    category: 'terms',
    show_in_footer_links: true,
    show_in_footer_banner: false,
    sort_order: 2,
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By accessing or using the IPO Insiders platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.',
      },
      {
        heading: '2. Informational Purpose Only',
        body: 'The content on this website is for informational and educational purposes only. It is not intended as financial, trading, or investment advice.',
      },
      {
        heading: '3. Proprietary Rights',
        body: 'All charts, compilations, and interface designs are protected under applicable intellectual property laws.',
      },
      {
        heading: '4. Limitation of Liability',
        body: 'In no event shall IPO Insiders or its contributors be liable for any direct, indirect, incidental, or consequential damages arising out of your reliance on data displayed on this portal.',
      },
    ],
    created_at: BASE_TIMESTAMP,
    updated_at: BASE_TIMESTAMP,
  },
  {
    id: 'policy-privacy',
    slug: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'Effective Date: October 2026',
    category: 'privacy',
    show_in_footer_links: true,
    show_in_footer_banner: false,
    sort_order: 3,
    sections: [
      {
        heading: '1. Data Collection',
        body: 'IPO Insiders does not sell or distribute personal user information. Public visitors are not required to submit brokerage credentials, bank account numbers, or PAN numbers to browse IPO listings or view subscription trends.',
      },
      {
        heading: '2. Cookies & Storage',
        body: 'We use minimal browser storage and authenticated cloud storage strictly to preserve user sessions, bookmarked issues, and submitted application records.',
      },
      {
        heading: '3. Administrative Security',
        body: 'Administrative operations are authenticated and logged with role attribution for audit and platform integrity purposes.',
      },
    ],
    created_at: BASE_TIMESTAMP,
    updated_at: BASE_TIMESTAMP,
  },
  {
    id: 'policy-about',
    slug: 'about',
    title: 'About IPO Insiders & Data Methodology',
    subtitle: 'Platform Governance & Data Verification',
    category: 'disclosure',
    show_in_footer_links: true,
    show_in_footer_banner: false,
    sort_order: 4,
    sections: [
      {
        heading: '1. Verified Exchange & Filing Priority',
        body: 'Confirmed bidding windows, price bands, lot sizes, quota distributions, and listing prints are maintained directly from official NSE, BSE, SEBI DRHP/RHP filings, and registrar announcements.',
      },
      {
        heading: '2. Unlisted Price References (Non-GMP)',
        body: 'As per SEBI guidelines, we do not publish Grey Market Premium (GMP). Pre-listing unlisted price references are maintained solely as informational indicators subject to admin verification.',
      },
      {
        heading: '3. Freshness & Manual Verification',
        body: 'IPO schedules, subscription multiples, and allotment links are reviewed and updated manually by authorized administrators to maintain accuracy and avoid broken third-party scrapes.',
      },
    ],
    created_at: BASE_TIMESTAMP,
    updated_at: BASE_TIMESTAMP,
  },
];

export function getPolicyRoutePath(slug: string): string {
  if (slug === 'disclaimer' || slug === 'terms' || slug === 'privacy' || slug === 'about') {
    return `/${slug}`;
  }
  return `/policy/${slug}`;
}
