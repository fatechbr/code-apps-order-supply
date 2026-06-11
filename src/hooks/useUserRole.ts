import { useState, useEffect } from 'react';
import { getClient } from '@microsoft/power-apps/data';
import { dataSourcesInfo } from '../../.power/schemas/appschemas/dataSourcesInfo';

export type AppRole = 'admin' | 'user' | 'none' | 'loading';

const ROLE_ADMIN = 'Order Admin';
const ROLE_USER = 'Order User';

export function useUserRole(userId: string): AppRole {
  const [role, setRole] = useState<AppRole>('loading');

  useEffect(() => {
    if (!userId) return;

    const fetchRoles = async () => {
      try {
        console.log('userId: ' + userId);

        const client = getClient(dataSourcesInfo);

        // Query 'roles' directly filtered by the user via reverse navigation.
        // This avoids $expand entirely and maps to:
        // /roles?$filter=systemuserroles_association/any(u:u/systemuserid eq 'id')&$select=name,roleid
        const result = await client.retrieveMultipleRecordsAsync<{
          name: string;
          roleid: string;
        }>('roles', {
          filter: `systemuserroles_association/any(u:u/systemuserid eq '${userId}')`,
          select: ['name', 'roleid'],
        } as any);

        console.log('Role query result:', result);

        const roleNames = (result.data ?? []).map((r) => r.name ?? '');

        if (roleNames.includes(ROLE_ADMIN)) {
          setRole('admin');
        } else if (roleNames.includes(ROLE_USER)) {
          setRole('user');
        } else {
          setRole('none');
        }
      } catch (err) {
        console.error('Failed to fetch user roles:', err);
        setRole('none');
      }
    };

    fetchRoles();
  }, [userId]);

  return role;
}
