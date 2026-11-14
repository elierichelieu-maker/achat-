import React from 'react';
import { FinancialReportsView } from '../components/reports/FinancialReportsView';

/**
 * Page Rapports Financiers : analyse de rentabilité, marges par catégorie et simulateur commercial.
 */
export type ReportsPageProps = React.ComponentProps<typeof FinancialReportsView>;

export const ReportsPage: React.FC<ReportsPageProps> = (props) => {
  return <FinancialReportsView {...props} />;
};
