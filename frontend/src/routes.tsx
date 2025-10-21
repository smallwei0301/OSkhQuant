import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const DataDownloadPage = lazy(() => import('./pages/DataDownloadPage'));
const TaskBoardPage = lazy(() => import('./pages/TaskBoardPage'));
const BacktestConfigPage = lazy(() => import('./pages/BacktestConfigPage'));
const ResultsDashboardPage = lazy(() => import('./pages/ResultsDashboardPage'));

type AppRoute = RouteObject & {
  path: string;
  protected?: boolean;
  element: JSX.Element;
};

const routes: AppRoute[] = [
  {
    path: '/download',
    element: <DataDownloadPage />,
    protected: true
  },
  {
    path: '/tasks',
    element: <TaskBoardPage />,
    protected: true
  },
  {
    path: '/backtest',
    element: <BacktestConfigPage />,
    protected: true
  },
  {
    path: '/results',
    element: <ResultsDashboardPage />,
    protected: true
  }
];

export default routes;
