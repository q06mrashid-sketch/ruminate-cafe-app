import NetInfo from '@react-native-community/netinfo';
import { mockMembers } from '../../config/mockData';
let membersData = [...mockMembers];
export const initDB = () => {};
export const loadMockData = () => {
  membersData = [...mockMembers];
};
export const getAllMembers = async () => {
  return membersData;
};
export const updateFreeDrinks = (id, newCount) => {
  membersData = membersData.map(m =>
    m.id === id
      ? { ...m, freeDrinksRemaining: newCount, lastUpdated: new Date().toISOString() }
      : m
  );
};
export const syncIfOnline = async (syncFunction) => {
  const state = await NetInfo.fetch();
  if (state.isConnected) {
    await syncFunction();
  }
};
