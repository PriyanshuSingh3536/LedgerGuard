let org = 'company-a';

export const isMock = () => import.meta.env.VITE_USE_MOCK === 'true';
export const setMockOrg = (o: string) => { org = o; };
export const getMockOrg = () => org;