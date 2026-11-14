import React from 'react';
import { InvoicesManagementView } from '../components/invoices/InvoicesManagementView';

/**
 * Page Factures & Règlements : suivi des créances clients, encaissements, annulations et impressions PDF/Ticket.
 */
export type InvoicesPageProps = React.ComponentProps<typeof InvoicesManagementView>;

export const InvoicesPage: React.FC<InvoicesPageProps> = (props) => {
  return <InvoicesManagementView {...props} />;
};
