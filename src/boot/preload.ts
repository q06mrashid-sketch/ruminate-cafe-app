
import { getMyStats } from '../services/stats';
import { getMembershipSummary } from '../services/membership';
import { getCMS } from '../services/cms';
import { markLoaded } from './loadingSignals';

async function preload() {
  const statsPromise = getMyStats()
    .then(s => {
      globalThis.freebiesLeft = s.freebiesLeft;
      globalThis.loyaltyStamps = s.loyaltyStamps;
      globalThis.stats = s;
      markLoaded('stamps');
      return s;
    })
    .catch(() => {
      markLoaded('stamps');
    });

  const membershipPromise = getMembershipSummary()
    .then(m => {
      globalThis.membershipSummary = m;
      return m;
    })
    .catch(() => {});

  const cmsPromise = getCMS()
    .then(c => {
      globalThis.cms = c;
      markLoaded('cms');
      return c;
    })
    .catch(() => {
      markLoaded('cms');
    });

  await Promise.all([statsPromise, membershipPromise, cmsPromise]);
}

preload();

export {};
