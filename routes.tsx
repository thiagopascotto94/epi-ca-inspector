import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

const App = lazy(() => import("./App"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
    ),
    children: [
      { path: "login", element: <LoginPage/> },
      { path: "register", element: <RegisterPage/> },
      // Redirect any other path to login if not authenticated
      { path: "*", element: <Navigate to="/login" replace /> }
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}