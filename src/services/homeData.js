import { Linking } from 'react-native';

export async function getToday() {
  return {
    openNow: true,
    until: '18:00',
    specials: ["Dirty chai", "Cheese & za'atar toastie"],
  };
}

export async function getPayItForward() {
  return {
    available: 7,
    contributed: 124,
  };
}

export async function getFreeDrinkProgress() {
  // Replace with real loyalty logic when ready
  return { current: 3, target: 10 };
}

export async function openInstagramProfile() {
  const app = 'instagram://user?username=ruminatecafe';
  const web = 'https://www.instagram.com/ruminatecafe/';
  try {
    const can = await Linking.canOpenURL(app);
    await Linking.openURL(can ? app : web);
  } catch {
    Linking.openURL(web);
  }
}
