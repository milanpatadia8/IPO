import React, { createContext, useContext } from 'react';
import { SitePageContent, SitePageKey } from '../types/ipo';
import { cloneDefaultSitePages } from './defaultPageContent';

interface SiteContentContextValue {
  pages: Record<SitePageKey, SitePageContent>;
}

const defaultPages = cloneDefaultSitePages();

const SiteContentContext = createContext<SiteContentContextValue>({
  pages: defaultPages,
});

export const SiteContentProvider: React.FC<{
  pages: Record<SitePageKey, SitePageContent>;
  children: React.ReactNode;
}> = ({ pages, children }) => {
  return (
    <SiteContentContext.Provider value={{ pages }}>{children}</SiteContentContext.Provider>
  );
};

export function useSitePageContent(key: SitePageKey): SitePageContent {
  const { pages } = useContext(SiteContentContext);
  return pages[key] || defaultPages[key];
}

export function useAllSitePages(): Record<SitePageKey, SitePageContent> {
  return useContext(SiteContentContext).pages;
}
