import { useState, useEffect } from 'react';
import { getContext } from '@microsoft/power-apps/app';
import { getClient } from '@microsoft/power-apps/data';
import { dataSourcesInfo } from '../../.power/schemas/appschemas/dataSourcesInfo';

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
        const displayName = context.user.fullName || context.user.userPrincipalName || 'User';
        const aadObjectId = context.user.objectId || '';

        // Resolve the Dataverse systemuserid from the AAD objectId
        const client = getClient(dataSourcesInfo);
        const sysUserResult = await (client as any).retrieveMultipleRecordsAsync('systemusers', {
          top: 1,
          filter: `azureactivedirectoryobjectid eq '${aadObjectId}'`,
          select: ['systemuserid'],
        });

        const systemUserId =
          sysUserResult.success && sysUserResult.data?.length > 0
            ? (sysUserResult.data[0] as any).systemuserid ?? aadObjectId
            : aadObjectId;

        setUser({ id: systemUserId, displayName });
      } catch (error) {
        console.error('Failed to load user context:', error);
      }
    };

    loadUser();
  }, []);

  return user;
}
