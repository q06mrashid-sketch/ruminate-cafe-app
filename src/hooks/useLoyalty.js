
import React, { useState, useEffect } from 'react';
import { initDB, loadMockData, getAllMembers, updateFreeDrinks } from '../services/offlineSync';

/**
 * Custom hook to interact with the loyalty database. Handles initialisation,
 * loading mock data for offline mode and tracking member state. Exposes a
 * function to redeem a free drink for a member by ID.
 *
 * @param {boolean} mockMode - When true, loads mock members into the database
 */
export default function useLoyalty(mockMode = true) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    initDB();
    if (mockMode) loadMockData();
    refreshMembers();
  }, []);

  const refreshMembers = async () => {
    const data = await getAllMembers();
    setMembers(data);
  };

  /**
   * Redeem a free drink for a member if available. Updates the database
   * and refreshes member state.
   *
   * @param {string} id - Member identifier
   */
  const redeemFreeDrink = (id) => {
    const member = members.find(m => m.id === id);
    if (!member) return;
    if (member.freeDrinksRemaining > 0) {
      updateFreeDrinks(id, member.freeDrinksRemaining - 1);
      refreshMembers();
    }
  };

  return {
    members,
    redeemFreeDrink
  };
}