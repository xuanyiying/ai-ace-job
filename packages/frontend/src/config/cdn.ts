/**
 * CDN Configuration
 * Requirement 10: System Performance & Availability
 *
 * Configures CDN URLs for static assets and enables caching strategies
 */

interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  imageOptimization: boolean;
  cacheControl: string;
}

/**
 * Get CDN configuration based on environment
 */
export const getCDNConfig = (): CDNConfig => {
  const cdnUrl = import.meta.env.VITE_CDN_URL || '';
  const isDevelopment = import.meta.env.DEV;

  return {
    enabled: !isDevelopment && !!cdnUrl,
    baseUrl: cdnUrl,
    imageOptimization: !isDevelopment,
    cacheControl: 'public, max-age=31536000, immutable', // 1 year
  };
};

/**
 * Get CDN URL for an asset
 */
export const getCDNAssetUrl = (assetPath: string): string => {
  const config = getCDNConfig();

  if (!config.enabled) {
    return assetPath;
  }

  // Remove leading slash if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;

  return `${config.baseUrl}/${cleanPath}`;
};

/**
 * Get optimized image URL with CDN
 */
export const getOptimizedImageUrl = (
  imagePath: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }
): string => {
  const config = getCDNConfig();

  if (!config.enabled || !config.imageOptimization) {
    return imagePath;
  }

  // Build query parameters for image optimization
  const params = new URLSearchParams();

  if (options?.width) {
    params.append('w', options.width.toString());
  }

  if (options?.height) {
    params.append('h', options.height.toString());
  }

  if (options?.quality) {
    params.append('q', options.quality.toString());
  }

  if (options?.format) {
    params.append('f', options.format);
  }

  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  const queryString = params.toString();

  return `${config.baseUrl}/${cleanPath}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Preload critical assets for performance
 */
export const preloadCriticalAssets = (assets: string[]): void => {
  const config = getCDNConfig();

  if (!config.enabled) {
    return;
  }

  assets.forEach((asset) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = getCDNAssetUrl(asset);

    // Determine asset type
    if (asset.endsWith('.js')) {
      link.as = 'script';
    } else if (asset.endsWith('.css')) {
      link.as = 'style';
    } else if (asset.match(/\.(woff|woff2|ttf|otf)$/)) {
      link.as = 'font';
      link.crossOrigin = 'anonymous';
    } else if (asset.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      link.as = 'image';
    }

    document.head.appendChild(link);
  });
};

/**
 * Enable service worker for offline caching
 */
export const enableServiceWorkerCaching = (): void => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
      });
  }
};

/**
 * Cache strategy for API responses
 */
export const cacheAPIResponse = (
  key: string,
  data: any,
  ttl: number = 3600000 // 1 hour in milliseconds
): void => {
  const cacheEntry = {
    data,
    timestamp: Date.now(),
    ttl,
  };

  try {
    localStorage.setItem(`api_cache:${key}`, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn('Failed to cache API response:', error);
  }
};

/**
 * Get cached API response if still valid
 */
export const getCachedAPIResponse = (key: string): any | null => {
  try {
    const cached = localStorage.getItem(`api_cache:${key}`);

    if (!cached) {
      return null;
    }

    const cacheEntry = JSON.parse(cached);
    const age = Date.now() - cacheEntry.timestamp;

    if (age > cacheEntry.ttl) {
      localStorage.removeItem(`api_cache:${key}`);
      return null;
    }

    return cacheEntry.data;
  } catch (error) {
    console.warn('Failed to retrieve cached API response:', error);
    return null;
  }
};

/**
 * Clear all API cache
 */
export const clearAPICache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('api_cache:')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear API cache:', error);
  }
};
