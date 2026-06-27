'use client';

import { useState, useEffect } from 'react';
import { SYSTEM_SETTING_DEFAULTS } from '@/lib/system-settings';

export function useSiteSettings() {
  const [themeColor, setThemeColor] = useState<string>(SYSTEM_SETTING_DEFAULTS.themeColor);
  const [siteName, setSiteName] = useState<string>(SYSTEM_SETTING_DEFAULTS.siteName);
  const [siteSubtitle, setSiteSubtitle] = useState<string>(SYSTEM_SETTING_DEFAULTS.siteSubtitle);
  const [storeThemeColor, setStoreThemeColor] = useState<string>(SYSTEM_SETTING_DEFAULTS.storeThemeColor);

  useEffect(() => {
    fetch('/api/settings/public')
      .then((r) => r.json())
      .then((data) => {
        if (data.themeColor) setThemeColor(data.themeColor);
        if (data.siteName) setSiteName(data.siteName);
        if (data.siteSubtitle) setSiteSubtitle(data.siteSubtitle);
        if (data.storeThemeColor) setStoreThemeColor(data.storeThemeColor);
      })
      .catch((err) => console.error('Failed to load public settings:', err));
  }, []);

  return { themeColor, siteName, siteSubtitle, storeThemeColor };
}