import { normalizeAuthUser, normalizeRole } from './authStore';

export const getRoleName = (user: any | null | undefined): string => {
  const normalizedUser = normalizeAuthUser(user);
  const normalizedRole = normalizedUser?.role;

  if (normalizedUser?.is_admin) {
    return 'Admin';
  }

  switch (normalizedRole) {
    case 'sales_manager':
      return 'Business Development Manager';
    case 'booking_ops':
      return 'Booking Ops';
    case 'finance':
      return 'Finance';
    case 'hr':
      return 'HR';
    case 'service_ops':
      return 'Service Ops';
    case 'bde':
      return 'BDE';
    default:
      return normalizedRole || '';
  }
};

export const isAdminUser = (user: any | null | undefined): boolean => Boolean(normalizeAuthUser(user)?.is_admin);

export const isBdeUser = (user: any | null | undefined): boolean => normalizeRole(user?.role) === 'bde';

export const isHrUser = (user: any | null | undefined): boolean => normalizeRole(user?.role) === 'hr';

export const isSalesManager = (user: any | null | undefined): boolean => normalizeRole(user?.role) === 'sales_manager';

export const hasPayrollAccess = (user: any | null | undefined): boolean => {
  const normalizedUser = normalizeAuthUser(user);
  const normalizedRole = normalizedUser?.role;

  return Boolean(
    normalizedUser?.is_admin
    || normalizedRole === 'hr'
    || normalizedRole === 'finance'
  );
};

export const getDefaultRouteForUser = (user?: any): string => {
  if (isHrUser(user)) return '/payroll/company-setup';
  if (isBdeUser(user) || isSalesManager(user)) return '/leads';
  return '/dashboard';
};

