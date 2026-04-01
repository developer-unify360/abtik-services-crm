export interface PageMeta {
  section: string;
  title: string;
}

const staticMeta: Array<{ prefix: string; meta: PageMeta }> = [
  { prefix: '/dashboard', meta: { section: 'Overview', title: 'Dashboard' } },
  { prefix: '/clients', meta: { section: 'Client Directory', title: 'Clients' } },
  { prefix: '/client-documents', meta: { section: 'Client Documents', title: 'Uploads' } },
  { prefix: '/document-portals', meta: { section: 'Document Portals', title: 'Portal Builder' } },
  { prefix: '/it-delivery', meta: { section: 'IT Delivery', title: 'Handoffs' } },
  { prefix: '/payments', meta: { section: 'Finance View', title: 'Payments' } },
  { prefix: '/bookings', meta: { section: 'Booking Operations', title: 'Bookings' } },
  { prefix: '/leads/assignment-rules', meta: { section: 'Sales Pipeline', title: 'Assignment Rules' } },
  { prefix: '/leads', meta: { section: 'Sales Pipeline', title: 'Leads' } },
  { prefix: '/attributes', meta: { section: 'System Settings', title: 'Attributes' } },
  { prefix: '/users', meta: { section: 'User Directory', title: 'Users' } },
];

export const getPageMeta = (pathname: string): PageMeta => {
  const normalizedPath = pathname.toLowerCase();

  if (normalizedPath === '/bookings/new') {
    return { section: 'Booking Operations', title: 'New Booking' };
  }

  if (normalizedPath.startsWith('/bookings/') && normalizedPath.endsWith('/edit')) {
    return { section: 'Booking Operations', title: 'Edit Booking' };
  }

  if (normalizedPath === '/payments/new') {
    return { section: 'Finance View', title: 'New Payment' };
  }

  if (normalizedPath.startsWith('/payments/') && normalizedPath.endsWith('/edit')) {
    return { section: 'Finance View', title: 'Edit Payment' };
  }

  const matchedEntry = staticMeta
    .filter(({ prefix }) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))
    .sort((left, right) => right.prefix.length - left.prefix.length)[0];

  return matchedEntry?.meta || { section: 'Workspace', title: 'Page' };
};
