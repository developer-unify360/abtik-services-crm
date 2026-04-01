const PROXIED_ASSET_PREFIXES = ['/media/', '/static/'];

export const toBrowserAssetUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || typeof window === 'undefined') {
    return trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue, window.location.origin);
    const relativePath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

    if (PROXIED_ASSET_PREFIXES.some((prefix) => parsedUrl.pathname.startsWith(prefix))) {
      return relativePath;
    }

    return parsedUrl.toString();
  } catch {
    return trimmedValue;
  }
};
