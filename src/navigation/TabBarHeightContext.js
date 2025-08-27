import { createContext, useContext } from 'react';

export const TabBarHeightContext = createContext(0);

export const useTabBarHeight = () => useContext(TabBarHeightContext);
