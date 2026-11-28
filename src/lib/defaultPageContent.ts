// =====================================================================
// Default Website Page Content & Editable Field Registry
// Allows Admin (under Terms & Disclaimers -> Website Pages & Content)
// to edit every page's headings, labels, notices, and extra sections.
// =====================================================================

import { SitePageContent, SitePageKey } from '../types/ipo';

export interface CustomFieldSpec {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

export interface SitePageEditorSchema {
  page_key: SitePageKey;
  page_label: string;
  route_path: string;
  description: string;
  showEyebrow?: boolean;
  eyebrowLabel?: string;
  titleLabel: string;
  subtitleLabel?: string;
  showSubtitle?: boolean;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  noticeBannerHelp?: string;
  customFields: CustomFieldSpec[];
}

const DEFAULT_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const SITE_PAGE_KEYS: SitePageKey[] = [
  'site_chrome',
  'home',
  'ongoing',
  'upcoming',
  'unlisted_price',
  'listed',
  'calendar',
  'ipo_detail',
];

export const SITE_PAGE_SCHEMAS: Record<SitePageKey, SitePageEditorSchema> = {
  site_chrome: {
    page_key: 'site_chrome',
    page_label: 'Header, Brand & Footer (Global)',
    route_path: 'All Pages',
    description:
      'Controls the brand name, navigation link labels, top-bar buttons, global announcement banner, and footer branding/links across every page.',
    showEyebrow: false,
    titleLabel: 'Brand Name (Header & Footer Wordmark)',
    showSubtitle: true,
    subtitleLabel: 'Footer Brand Tagline / Summary',
    primaryCtaLabel: 'Header Primary Action Button (e.g. Check Allotment)',
    secondaryCtaLabel: 'Header Login Button Label',
    noticeBannerHelp:
      'Optional announcement bar displayed cleanly at the top of public pages. Leave blank to hide.',
    customFields: [
      { key: 'nav_ongoing', label: 'Nav Link: Open IPOs', placeholder: 'Open' },
      { key: 'nav_upcoming', label: 'Nav Link: Upcoming IPOs', placeholder: 'Upcoming' },
      { key: 'nav_unlisted', label: 'Nav Link: Unlisted Price', placeholder: 'Unlisted Price' },
      { key: 'nav_listed', label: 'Nav Link: Listed IPOs', placeholder: 'Listed' },
      {
        key: 'footer_exchange_strip',
        label: 'Footer Exchange Strip',
        placeholder: 'NSE · BSE · Mainboard · SME',
      },
      { key: 'footer_markets_heading', label: 'Footer Column 1 Heading', placeholder: 'Markets' },
      { key: 'footer_tools_heading', label: 'Footer Column 2 Heading', placeholder: 'Tools' },
      {
        key: 'footer_disclosures_heading',
        label: 'Footer Column 3 Heading',
        placeholder: 'Disclosures',
      },
      { key: 'footer_sebi_label', label: 'SEBI Filings Link Label', placeholder: 'SEBI Filings' },
      {
        key: 'footer_sebi_url',
        label: 'SEBI Filings Link URL',
        placeholder: 'https://www.sebi.gov.in/filings/public-issues.html',
      },
      { key: 'footer_copyright', label: 'Copyright Owner Name', placeholder: 'IPO Insiders' },
    ],
  },
  home: {
    page_key: 'home',
    page_label: 'Home Page',
    route_path: '/',
    description:
      'Hero section eyebrow, main headline, subheadline, buttons, market snapshot labels, and optional custom blocks on the landing page.',
    showEyebrow: true,
    eyebrowLabel: 'Hero Eyebrow Tagline',
    titleLabel: 'Hero Main Headline',
    showSubtitle: true,
    subtitleLabel: 'Hero Subtitle / Description',
    primaryCtaLabel: 'Primary Button Label (Allotment)',
    secondaryCtaLabel: 'Quick Search Button Placeholder',
    noticeBannerHelp: 'Optional notice banner shown directly above the Home IPO directory.',
    customFields: [
      { key: 'stat_open_label', label: 'Snapshot Card 1 Label', placeholder: 'Open for Bidding' },
      {
        key: 'stat_upcoming_label',
        label: 'Snapshot Card 2 Label',
        placeholder: 'Upcoming Pipeline',
      },
      { key: 'stat_listed_label', label: 'Snapshot Card 3 Label', placeholder: 'Listed Issues' },
      { key: 'stat_total_label', label: 'Snapshot Card 4 Label', placeholder: 'Total Tracked' },
      {
        key: 'search_placeholder',
        label: 'Table Search Input Placeholder',
        placeholder: 'Filter by company...',
      },
    ],
  },
  ongoing: {
    page_key: 'ongoing',
    page_label: 'Open IPOs Page',
    route_path: '/ipo/ongoing',
    description:
      'Headings, descriptions, section titles, button labels, and custom notes on the Open IPOs & Live Subscription page.',
    showEyebrow: true,
    eyebrowLabel: 'Page Eyebrow',
    titleLabel: 'Page Headline',
    showSubtitle: true,
    subtitleLabel: 'Page Description',
    primaryCtaLabel: 'Apply Button Label',
    secondaryCtaLabel: 'View Details Button Label',
    noticeBannerHelp: 'Optional notice banner shown below the Open IPOs page header.',
    customFields: [
      {
        key: 'open_section_heading',
        label: 'Open Section Heading',
        placeholder: 'Open for Bidding',
      },
      {
        key: 'open_section_sublabel',
        label: 'Open Section Sub-label',
        placeholder: 'NSE / BSE consolidated feed',
      },
      {
        key: 'closed_section_heading',
        label: 'Recently Closed Section Heading',
        placeholder: 'Recently Closed — Awaiting Allotment',
      },
      {
        key: 'closed_section_sublabel',
        label: 'Recently Closed Sub-label',
        placeholder: 'Basis of allotment pending',
      },
      {
        key: 'search_placeholder',
        label: 'Search Input Placeholder',
        placeholder: 'Search by company, exchange or symbol...',
      },
      {
        key: 'empty_state_text',
        label: 'Empty List Message',
        placeholder: 'No open IPOs match the selected filter criteria today.',
      },
    ],
  },
  upcoming: {
    page_key: 'upcoming',
    page_label: 'Upcoming IPOs Page',
    route_path: '/ipo/upcoming',
    description:
      'Headings, pipeline summary copy, table section title, and optional custom notes on the Upcoming IPOs page.',
    showEyebrow: true,
    eyebrowLabel: 'Page Eyebrow',
    titleLabel: 'Page Headline',
    showSubtitle: true,
    subtitleLabel: 'Page Description',
    noticeBannerHelp: 'Optional notice banner shown below the Upcoming IPOs page header.',
    customFields: [
      {
        key: 'list_section_heading',
        label: 'Table Section Heading',
        placeholder: 'Upcoming Issues',
      },
      {
        key: 'list_section_sublabel',
        label: 'Table Section Sub-label',
        placeholder: 'DRHP & announced pipeline',
      },
      {
        key: 'search_placeholder',
        label: 'Search Input Placeholder',
        placeholder: 'Search upcoming companies, sectors, or DRHP filings...',
      },
      {
        key: 'empty_state_text',
        label: 'Empty List Message',
        placeholder: 'No upcoming IPO records match the selected filter criteria.',
      },
    ],
  },
  unlisted_price: {
    page_key: 'unlisted_price',
    page_label: 'Unlisted Price Tracker Page',
    route_path: '/ipo/unlisted-price',
    description:
      'Page header, SEBI statutory notice text, guide toggle label, and custom informational sections on the Unlisted Price Tracker page.',
    showEyebrow: true,
    eyebrowLabel: 'Page Eyebrow',
    titleLabel: 'Page Headline',
    showSubtitle: true,
    subtitleLabel: 'Page Description',
    noticeBannerHelp:
      'Displayed inside the prominent SEBI Compliance & Unlisted Price Notice card on this page.',
    customFields: [
      {
        key: 'explainer_toggle_label',
        label: 'Guide Toggle Button Label',
        placeholder: 'How to Read Unlisted Price?',
      },
      {
        key: 'trend_section_eyebrow',
        label: 'Chart Section Eyebrow',
        placeholder: 'Historical Unlisted Price Trajectory',
      },
      {
        key: 'search_placeholder',
        label: 'Search Input Placeholder',
        placeholder: 'Filter IPO name...',
      },
      {
        key: 'empty_state_text',
        label: 'Empty List Message',
        placeholder: 'No active IPO unlisted price quotes match your filter.',
      },
    ],
  },
  listed: {
    page_key: 'listed',
    page_label: 'Listed Performance Page',
    route_path: '/ipo/listed',
    description:
      'Page header, debut chart heading, search placeholder, and custom notes on the Historical Listing Performance page.',
    showEyebrow: true,
    eyebrowLabel: 'Page Eyebrow',
    titleLabel: 'Page Headline',
    showSubtitle: true,
    subtitleLabel: 'Page Description',
    noticeBannerHelp: 'Optional notice banner shown below the Listed Performance page header.',
    customFields: [
      {
        key: 'chart_heading',
        label: 'Chart Card Heading',
        placeholder: 'First-Day Listing Gains (%)',
      },
      {
        key: 'chart_sublabel',
        label: 'Chart Card Sub-label',
        placeholder: 'Verified exchange data',
      },
      {
        key: 'search_placeholder',
        label: 'Search Input Placeholder',
        placeholder: 'Search listed companies or symbols...',
      },
      {
        key: 'empty_state_text',
        label: 'Empty List Message',
        placeholder: 'No listed IPO records match the selected criteria.',
      },
    ],
  },
  calendar: {
    page_key: 'calendar',
    page_label: 'IPO Calendar Page',
    route_path: '/calendar',
    description:
      'Page header, view toggle labels, empty state text, and custom sections on the IPO Event Calendar page.',
    showEyebrow: true,
    eyebrowLabel: 'Page Eyebrow',
    titleLabel: 'Page Headline',
    showSubtitle: true,
    subtitleLabel: 'Page Description',
    noticeBannerHelp: 'Optional notice banner shown below the IPO Calendar page header.',
    customFields: [
      { key: 'schedule_tab_label', label: 'Schedule View Tab Label', placeholder: 'Schedule' },
      { key: 'month_tab_label', label: 'Month View Tab Label', placeholder: 'Month Grid' },
      {
        key: 'empty_state_text',
        label: 'Empty Calendar Message',
        placeholder: 'No calendar events found for the active filter settings.',
      },
    ],
  },
  ipo_detail: {
    page_key: 'ipo_detail',
    page_label: 'IPO Detail Page Template',
    route_path: '/ipo/:slug',
    description:
      'Shared labels, CTA buttons, top advisory banner, and extra investor note sections shown across every individual IPO detail page.',
    showEyebrow: false,
    titleLabel: 'Template Label (Internal Reference)',
    showSubtitle: false,
    primaryCtaLabel: 'Open IPO Apply Button Label',
    secondaryCtaLabel: 'Closed / Listed Allotment Button Label',
    noticeBannerHelp:
      'Optional advisory banner displayed at the top of every individual IPO detail page.',
    customFields: [
      {
        key: 'back_link_label',
        label: 'Back Navigation Label',
        placeholder: 'Back to Open Issues',
      },
      {
        key: 'apply_helper_note',
        label: 'Login Helper Text Below Apply Button',
        placeholder: 'Login required to submit an IPO application',
      },
      {
        key: 'related_section_prefix',
        label: 'Related IPOs Heading Prefix',
        placeholder: 'Other',
      },
      {
        key: 'not_found_title',
        label: 'IPO Not Found Heading',
        placeholder: 'IPO Record Not Found',
      },
    ],
  },
};

export const DEFAULT_SITE_PAGES: Record<SitePageKey, SitePageContent> = {
  site_chrome: {
    id: 'site_chrome',
    page_key: 'site_chrome',
    page_label: 'Header, Brand & Footer (Global)',
    route_path: 'All Pages',
    title: 'IPO Insiders',
    subtitle:
      'Focused tracking for Indian primary markets — open dates, live subscription multiples, unlisted price references, and multi-PAN allotment checks.',
    primary_cta_label: 'Check Allotment',
    secondary_cta_label: 'Login',
    notice_banner_title: '',
    notice_banner_body: '',
    custom_fields: {
      nav_ongoing: 'Open',
      nav_upcoming: 'Upcoming',
      nav_unlisted: 'Unlisted Price',
      nav_listed: 'Listed',
      footer_exchange_strip: 'NSE · BSE · Mainboard · SME',
      footer_markets_heading: 'Markets',
      footer_tools_heading: 'Tools',
      footer_disclosures_heading: 'Disclosures',
      footer_sebi_label: 'SEBI Filings',
      footer_sebi_url: 'https://www.sebi.gov.in/filings/public-issues.html',
      footer_copyright: 'IPO Insiders',
    },
    extra_sections: [],
    is_customized: false,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
  },
  home: {
    id: 'home',
    page_key: 'home',
    page_label: 'Home Page',
    route_path: '/',
    eyebrow: 'Indian Primary Markets · NSE & BSE',
    title: 'Track IPOs and check allotment in one click.',
    subtitle:
      'Mainboard and SME IPO dates, live subscription multiples, indicative unlisted prices, and saved multi-PAN allotment status in one calm, focused view.',
    primary_cta_label: 'Check Allotment',
    secondary_cta_label: 'Quick search any IPO...',
    notice_banner_title: '',
    notice_banner_body: '',
    custom_fields: {
      stat_open_label: 'Open for Bidding',
      stat_upcoming_label: 'Upcoming Pipeline',
      stat_listed_label: 'Listed Issues',
      stat_total_label: 'Total Tracked',
      search_placeholder: 'Filter by company...',
    },
    extra_sections: [],
    is_customized: false,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
  },
  ongoing: {
    id: 'ongoing',
    page_key: 'ongoing',
    page_label: 'Open IPOs Page',
    route_path: '/ipo/ongoing',
    eyebrow: 'Live Primary Issues',
    title: 'Open IPOs & Live Subscription',
    subtitle:
      'Issues currently open for bidding across NSE and BSE. Track category subscription multiples, indicative unlisted prices, and key issue timelines.',
    primary_cta_label: 'Apply for IPO',
    secondary_cta_label: 'View Details',
    notice_banner_title: '',
    notice_banner_body: '',
    custom_fields: {
      open_section_heading: 'Open for Bidding',
      open_section_sublabel: 'NSE / BSE consolidated feed',
      closed_section_heading: 'Recently Closed — Awaiting Allotment',
      closed_section_sublabel: 'Basis of allotment pending',
      search_placeholder: 'Search by company, exchange or symbol...',
      empty_state_text: 'No open IPOs match the selected filter criteria today.',
    },
    extra_sections: [],
    is_customized: false,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
  },
  upcoming: {
    id: 'upcoming',
    page_key: 'upcoming',
    page_label: 'Upcoming IPOs Page',
    route_path: '/ipo/upcoming',
    eyebrow: 'DRHP & Exchange Pipeline',
    title: 'Upcoming Indian IPOs',
    subtitle:
      'Companies that have filed draft offer documents (DRHP), received SEBI / exchange approval, or announced issue dates across Mainboard & SME boards.',
    notice_banner_title: '',
    notice_banner_body: '',
    custom_fields: {
      list_section_heading: 'Upcoming Issues',
      list_section_sublabel: 'DRHP & announced pipeline',
      search_placeholder: 'Search upcoming companies, sectors, or DRHP filings...',
      empty_state_text: 'No upcoming IPO records match the selected filter criteria.',
    },
    extra_sections: [],
    is_customized: false,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
  },
  unlisted_price: {
    id: 'unlisted_price',
    page_key: 'unlisted_price',
    page_label: 'Unlisted Price Tracker Page',
    route_path: '/ipo/unlisted-price',
    eyebrow: 'Pre-Listing Reference Desk',
    title: 'Indicative Unlisted Price Tracker',
    subtitle:
      'Consolidated pre-listing unlisted price references, indicative spreads over issue price, and estimated debut ranges for active Indian IPOs.',
    notice_banner_title: 'SEBI Compliance & Unlisted Price Notice',
    notice_banner_body:
      'As per SEBI guidelines, we do not show Grey Market Premium (GMP). Unlisted Price references and indicative spreads shown here are strictly informational pre-listing indicators and do not constitute exchange-guaranteed listing prices or investment advice.',
    custom_fields: {
      explainer_toggle_label: 'How to Read Unlisted Price?',
      trend_section_eyebrow: 'Historical Unlisted Price Trajectory',
      search_placeholder: 'Filter IPO name...',
      empty_state_text: 'No active IPO unlisted price quotes match your filter.',
    },
    extra_sections: [],
    is_customized: false,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
  },
  listed: {
    id: 'listed',
    page_key: 'listed',
    page_label: 'Listed Performance Page',
    route_path: '/ipo/listed',
    eyebrow: 'Exchange Debuts',
    title: 'Historical Listing Performance',
    subtitle:
      'Verified IPO listing debut prices across NSE and BSE. Review issue prices against opening exchange rates.',
    notice_banner_title: '',
    notice_banner_body: '',
    custom_fields: {
      chart_heading: 'First-Day Listing Gains (%)',
      chart_sublabel: 'Verified exchange data',
      search_placeholder: 'Search listed companies or symbols...',
      empty_state_text: 'No listed IPO records match the selected criteria.',
    },
    extra_sections: [],
    is_customized: false,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
  },
  calendar: {
    id: 'calendar',
    page_key: 'calendar',
    page_label: 'IPO Calendar Page',
    route_path: '/calendar',
    eyebrow: 'Primary Market Schedule',
    title: 'IPO Event Calendar',
    subtitle:
      'Chronological timetable of issue opens, closes, allotment declarations, and exchange listings.',
    notice_banner_title: '',
    notice_banner_body: '',
    custom_fields: {
      schedule_tab_label: 'Schedule',
      month_tab_label: 'Month Grid',
      empty_state_text: 'No calendar events found for the active filter settings.',
    },
    extra_sections: [],
    is_customized: false,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
  },
  ipo_detail: {
    id: 'ipo_detail',
    page_key: 'ipo_detail',
    page_label: 'IPO Detail Page Template',
    route_path: '/ipo/:slug',
    title: 'IPO Issue Details',
    subtitle:
      'Detailed issue schedule, price band, minimum investment multiples, subscription progress, and official filings.',
    primary_cta_label: 'Apply for IPO',
    secondary_cta_label: 'Check Allotment Status',
    notice_banner_title: '',
    notice_banner_body: '',
    custom_fields: {
      back_link_label: 'Back to Open Issues',
      apply_helper_note: 'Login required to submit an IPO application',
      related_section_prefix: 'Other',
      not_found_title: 'IPO Record Not Found',
    },
    extra_sections: [],
    is_customized: false,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
  },
};

export function cloneDefaultSitePages(): Record<SitePageKey, SitePageContent> {
  const out = {} as Record<SitePageKey, SitePageContent>;
  for (const key of SITE_PAGE_KEYS) {
    const def = DEFAULT_SITE_PAGES[key];
    out[key] = {
      ...def,
      custom_fields: { ...def.custom_fields },
      extra_sections: def.extra_sections.map((s) => ({ ...s })),
    };
  }
  return out;
}

export function mergeSitePages(
  overrides: Array<Partial<SitePageContent> & { page_key?: string; id?: string }>
): Record<SitePageKey, SitePageContent> {
  const merged = cloneDefaultSitePages();
  for (const doc of overrides) {
    const key = (doc.page_key || doc.id) as SitePageKey;
    if (!key || !(key in merged)) continue;
    const base = merged[key];
    const incomingFields =
      doc.custom_fields && typeof doc.custom_fields === 'object' ? doc.custom_fields : {};
    merged[key] = {
      ...base,
      eyebrow: doc.eyebrow !== undefined ? doc.eyebrow : base.eyebrow,
      title: doc.title && doc.title.trim().length > 0 ? doc.title : base.title,
      subtitle: doc.subtitle !== undefined ? doc.subtitle : base.subtitle,
      primary_cta_label:
        doc.primary_cta_label !== undefined ? doc.primary_cta_label : base.primary_cta_label,
      secondary_cta_label:
        doc.secondary_cta_label !== undefined
          ? doc.secondary_cta_label
          : base.secondary_cta_label,
      notice_banner_title:
        doc.notice_banner_title !== undefined
          ? doc.notice_banner_title
          : base.notice_banner_title,
      notice_banner_body:
        doc.notice_banner_body !== undefined ? doc.notice_banner_body : base.notice_banner_body,
      custom_fields: {
        ...base.custom_fields,
        ...Object.fromEntries(
          Object.entries(incomingFields).filter(([, v]) => typeof v === 'string')
        ),
      },
      extra_sections: Array.isArray(doc.extra_sections)
        ? doc.extra_sections
            .filter((s) => s && (typeof s.heading === 'string' || typeof s.body === 'string'))
            .map((s) => ({
              heading: String(s.heading || ''),
              body: String(s.body || ''),
            }))
        : base.extra_sections,
      is_customized: true,
      created_at: typeof doc.created_at === 'string' ? doc.created_at : base.created_at,
      updated_at: typeof doc.updated_at === 'string' ? doc.updated_at : base.updated_at,
    };
  }
  return merged;
}
