import React from 'react';
import { OverviewDashboard } from '../components/dashboard/OverviewDashboard';

/**
 * Page Tableau de Bord : point d'entrée analytique regroupant les KPI, graphiques et alertes prioritaires.
 */
export type DashboardPageProps = React.ComponentProps<typeof OverviewDashboard>;

export const DashboardPage: React.FC<DashboardPageProps> = (props) => {
  return <OverviewDashboard {...props} />;
};
