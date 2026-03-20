export const getRoleName = (user: any | null | undefined): string => {
  if (!user) return '';
  return 'Admin';
};

export const isAdminUser = (user: any | null | undefined): boolean => !!user;

export const getDefaultRouteForUser = (_user?: any): string => '/dashboard';

