export interface SelectedTenant {
  id: string;
  name: string;
}

const USER_STORAGE_KEY = 'user';
const SELECTED_TENANT_STORAGE_KEY = 'selectedTenant';

const safeParse = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getTenantIdFromRecord = (record: any): string => {
  if (!record || typeof record !== 'object') {
    return '';
  }

  if (typeof record.tenant_id === 'string' && record.tenant_id) {
    return record.tenant_id;
  }

  if (typeof record.tenant === 'string' && record.tenant) {
    return record.tenant;
  }

  return '';
};

const getRoleNameFromRecord = (record: any): string => {
  if (!record || typeof record !== 'object') {
    return '';
  }

  if (typeof record.role_name === 'string' && record.role_name) {
    return record.role_name;
  }

  if (typeof record.role === 'string' && record.role) {
    return record.role;
  }

  if (typeof record.role?.name === 'string' && record.role.name) {
    return record.role.name;
  }

  return '';
};

export const getStoredAuthData = () => safeParse(localStorage.getItem(USER_STORAGE_KEY));

export const getSelectedTenant = (): SelectedTenant | null => {
  const stored = safeParse(localStorage.getItem(SELECTED_TENANT_STORAGE_KEY));

  if (!stored || typeof stored.id !== 'string' || !stored.id) {
    return null;
  }

  return {
    id: stored.id,
    name: typeof stored.name === 'string' ? stored.name : '',
  };
};

export const setSelectedTenant = (tenant: SelectedTenant) => {
  localStorage.setItem(SELECTED_TENANT_STORAGE_KEY, JSON.stringify(tenant));
};

export const clearSelectedTenant = () => {
  localStorage.removeItem(SELECTED_TENANT_STORAGE_KEY);
};

export const getEffectiveTenantId = (authData?: any, user?: any): string => (
  getTenantIdFromRecord(authData) ||
  getTenantIdFromRecord(authData?.user) ||
  getTenantIdFromRecord(user) ||
  getSelectedTenant()?.id ||
  ''
);

export const userNeedsTenantSelection = (user?: any, authData?: any): boolean => {
  const roleName =
    getRoleNameFromRecord(user) ||
    getRoleNameFromRecord(authData?.user) ||
    getRoleNameFromRecord(authData);

  if (!['Admin', 'Super Admin'].includes(roleName)) {
    return false;
  }

  return !getEffectiveTenantId(authData, user);
};
