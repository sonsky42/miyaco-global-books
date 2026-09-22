/**
 * Utility functions for PWA functionality
 */

/**
 * Check if the app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Check if the device is iOS
 */
export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  );
}

/**
 * Check if the device is Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Check if PWA installation is supported
 */
export function isPWAInstallSupported(): boolean {
  return "beforeinstallprompt" in window || isIOS();
}

/**
 * Get installation instructions based on device
 */
export function getInstallInstructions(): string {
  if (isIOS()) {
    return 'Tap the Share button and then "Add to Home Screen"';
  }
  if (isAndroid()) {
    return 'Tap the menu button and then "Add to Home Screen" or "Install App"';
  }
  return "Click the install button in your browser's address bar";
}

/**
 * Request persistent storage (for offline data)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage?.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persistent storage granted: ${isPersisted}`);
    return isPersisted;
  }
  return false;
}

/**
 * Check storage quota
 */
export async function checkStorageQuota(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}
