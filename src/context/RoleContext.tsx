import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useUserRole } from '../hooks/useUserRole';
import type { AppRole } from '../hooks/useUserRole';

interface RoleContextValue {
  role: AppRole;
  userId: string;
  displayName: string;
  isAdmin: boolean;
  isUser: boolean;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextValue>({
  role: 'loading',
  userId: '',
  displayName: '',
  isAdmin: false,
  isUser: false,
  isLoading: true,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const role = useUserRole(user.id);

  const value: RoleContextValue = {
    role,
    userId: user.id,
    displayName: user.displayName,
    isAdmin: role === 'admin',
    isUser: role === 'user' || role === 'admin', // admin also has user access
    isLoading: role === 'loading' || !user.id,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
