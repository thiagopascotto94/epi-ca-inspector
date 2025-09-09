import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import AuthenticatedRoute from "./components/AuthenticatedRoute";
import RootOnlyRoute from "./components/RootOnlyRoute";

const App = lazy(() => import("./App"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
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
            {
                index: true,
                element: <AuthenticatedRoute><Dashboard /></AuthenticatedRoute>,
            },
            { path: "login", element: <LoginPage /> },
            { path: "register", element: <RegisterPage /> },
            {
                path: "library",
                element: <AuthenticatedRoute><LibraryPage /></AuthenticatedRoute>,
            },
            {
                path: "library/:libraryId",
                element: <AuthenticatedRoute><LibraryDetailPage /></AuthenticatedRoute>,
            },
            {
                path: "library/:libraryId/file/:fileId/edit",
                element: <AuthenticatedRoute><EditFilePage /></AuthenticatedRoute>,
            },
            {
                path: "client-stats",
                element: <RootOnlyRoute><ClientStatsPage /></RootOnlyRoute>,
            },
            { path: "*", element: <Navigate to="/" replace /> },
        ],
    },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}