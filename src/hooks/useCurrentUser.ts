import { useState, useEffect } from 'react';
import { getContext } from '@microsoft/power-apps/app';

export interface CurrentUser {
  id: string;
  displayName: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser>({
    id: '',
    displayName: '',
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const context = await getContext();
        setUser({
          id: context.user.objectId || '',
          displayName: context.user.fullName || context.user.userPrincipalName || 'User',
        });
      } catch (error) {
        console.error('Failed to load user context:', error);
      }
    };

    loadUser();
  }, []);

  return user;
}
