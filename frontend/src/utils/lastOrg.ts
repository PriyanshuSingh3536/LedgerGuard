const KEY = 'lg_last_org';

export const getLastOrg = (): string => {
  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
};

export const setLastOrg = (value: string): void => {
  try { localStorage.setItem(KEY, value); } catch { /* storage blocked */ }
};