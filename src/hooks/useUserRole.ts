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
        const client = getClient(dataSourcesInfo);

        // Query systemuserroles (junction table) joined with roles
        // Using the systemusers data source with $expand on roles
        const result = await client.retrieveMultipleRecordsAsync<{
          name: string;
          roleid: string;
        }>('systemusers', {
          top: 50,
          filter: `systemuserid eq '${userId}'`,
          expand: [
            {
              property: 'systemuserroles_association',
              select: ['name', 'roleid'],
            },
          ],
        } as any);

        if (result.success && result.data && result.data.length > 0) {
          const record = result.data[0] as any;
          const roles: { name?: string }[] =
            record['systemuserroles_association'] ?? [];
          const roleNames = roles.map((r) => r.name ?? '');

          if (roleNames.includes(ROLE_ADMIN)) {
            setRole('admin');
          } else if (roleNames.includes(ROLE_USER)) {
            setRole('user');
          } else {
            setRole('none');
          }
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
