import { ROLE_CODES } from '@ctcj/shared';
import { createContext, useContext, useMemo } from 'react';

import { guardianshipClient } from '../../api/guardianshipClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../lib/useAsync.js';

const MyCtcjContext = createContext(null);

/**
 * What every Mi CTCJ tab needs, fetched once for the whole area:
 * the profile (for "Hola, {nombre}" and the avatar), whether the person is
 * a JUGADOR, their membership status, and the minors they may book for.
 */
export function MyCtcjProvider({ children }) {
  const { user } = useAuth();
  const isJugador = (user?.roles ?? []).includes(ROLE_CODES.JUGADOR);

  const profile = useAsync(() => membershipClient.getMyProfile(), [user?.id], { enabled: !!user });
  const membership = useAsync(() => membershipClient.getMyStatus(), [user?.id], {
    enabled: !!user && isJugador,
  });
  const guardianships = useAsync(() => guardianshipClient.listMine(), [user?.id], {
    enabled: !!user,
  });

  const value = useMemo(() => {
    const all = guardianships.data?.guardianships ?? [];
    return {
      user,
      isJugador,
      profile: profile.data ?? null,
      setProfile: (next) => profile.setData(() => next),
      membershipStatus: membership.status === 'ready' ? membership.data.status : undefined,
      guardianships: all,
      reloadGuardianships: guardianships.reload,
      bookableMinors: all.filter((g) => g.status === 'APPROVED' && g.canBook),
    };
  }, [user, isJugador, profile, membership, guardianships]);

  return <MyCtcjContext.Provider value={value}>{children}</MyCtcjContext.Provider>;
}

export function useMyCtcj() {
  const context = useContext(MyCtcjContext);
  if (!context) throw new Error('useMyCtcj() must be used inside <MyCtcjProvider>.');
  return context;
}
