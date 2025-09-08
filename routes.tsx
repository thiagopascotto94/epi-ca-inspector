import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

const App = lazy(() => import("./App"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));

import PrivateRoute from "./components/PrivateRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ClientStatsPage = lazy(() => import("./pages/ClientStatsPage"));

const LibraryDetailPage = lazy(() => import("./pages/LibraryDetailPage"));
const EditFilePage = lazy(() => import("./pages/EditFilePage"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "login", element: <LoginPage/> },
      { path: "register", element: <RegisterPage/> },
      { path: "library", element: <LibraryPage/> },
      { path: "library/:libraryId", element: <LibraryDetailPage /> },
      { path: "library/:libraryId/file/:fileId/edit", element: <EditFilePage /> },
      {
        path: "client-stats",
        element: (
          <PrivateRoute>
            <ClientStatsPage />
          </PrivateRoute>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> }
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}