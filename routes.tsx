import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

const App = lazy(() => import("./App"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));

const Dashboard = lazy(() => import("./pages/Dashboard"));

const LibraryDetailPage = lazy(() => import("./pages/LibraryDetailPage"));

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
      { path: "admin/login", element: <AdminLoginPage/> },
      { path: "register", element: <RegisterPage/> },
      { path: "library", element: <LibraryPage/> },
      { path: "library/:libraryId", element: <LibraryDetailPage /> },
      { path: "*", element: <Navigate to="/" replace /> }
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}