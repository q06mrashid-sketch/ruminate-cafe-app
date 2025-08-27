import { getMenuItems } from '../services/menu';

let menuItemsCache: any[] | null = null;
let menuPromise: Promise<any[] | null> | null = null;

export async function preloadMenuItems() {
  if (!menuPromise) {
    menuPromise = getMenuItems()
      .then(items => {
        menuItemsCache = items;
        return items;
      })
      .catch(() => {
        menuItemsCache = [];
        return [];
      });
  }
  return menuPromise;
}

export function getCachedMenuItems() {
  return menuItemsCache || [];
}

export function setCachedMenuItems(items: any[]) {
  menuItemsCache = items;
}
