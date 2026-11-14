import React from 'react';
import { CustomersManagementView } from '../components/customers/CustomersManagementView';

/**
 * Page Clients & Consignes : répertoire des établissements CHR, plafonds d'encours et fûts consignés.
 */
export type CustomersPageProps = React.ComponentProps<typeof CustomersManagementView>;

export const CustomersPage: React.FC<CustomersPageProps> = (props) => {
  return <CustomersManagementView {...props} />;
};
