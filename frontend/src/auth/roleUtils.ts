export const getRoleName = (user: any | null | undefined): string => {
  if (!user) {
    return '';
  }

  if (typeof user.role_name === 'string' && user.role_name) {
    return user.role_name;
  }

  if (typeof user.role === 'string' && user.role) {
    return user.role;
  }

  if (typeof user.role?.name === 'string' && user.role.name) {
    return user.role.name;
  }

  return '';
};

export const isBDEUser = (user: any | null | undefined): boolean => getRoleName(user) === 'BDE';
export const isAdminUser = (user: any | null | undefined): boolean => getRoleName(user) === 'Admin';
export const isSuperAdminUser = (user: any | null | undefined): boolean => getRoleName(user) === 'Super Admin';
export const isITManagerUser = (user: any | null | undefined): boolean => getRoleName(user) === 'IT Manager';
export const canManageServicesCatalog = (user: any | null | undefined): boolean => (
  isAdminUser(user) || isSuperAdminUser(user)
);

export const getDefaultRouteForUser = (user: any | null | undefined): string => (
  isBDEUser(user) ? '/bookings' : '/dashboard'
);

export const canAccessPath = (pathname: string, user: any | null | undefined): boolean => {
  if (!isBDEUser(user)) {
    return true;
  }

  return pathname === '/bookings' || pathname.startsWith('/bookings/');
};
