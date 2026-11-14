import React from 'react';
import { SettingsManagementView } from '../components/settings/SettingsManagementView';

/**
 * Page Paramètres : configuration générale de l'entreprise, taxes, consignes, impression et synchronisation Cloud.
 */
export type SettingsPageProps = React.ComponentProps<typeof SettingsManagementView>;

export const SettingsPage: React.FC<SettingsPageProps> = (props) => {
  return <SettingsManagementView {...props} />;
};
