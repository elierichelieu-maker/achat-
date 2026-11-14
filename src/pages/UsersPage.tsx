import React from 'react';
import { UsersManagementView } from '../components/users/UsersManagementView';

/**
 * Page Utilisateurs & Équipe : gestion des vendeurs, permissions d'accès, objectifs et commissions.
 */
export type UsersPageProps = React.ComponentProps<typeof UsersManagementView>;

export const UsersPage: React.FC<UsersPageProps> = (props) => {
  return <UsersManagementView {...props} />;
};
