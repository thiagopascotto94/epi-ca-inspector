import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_51...YOUR_PUBLISHABLE_KEY"); // Replace with your publishable key

const App = lazy(() => import("./App"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));

import PrivateRoute from "./components/PrivateRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ClientStatsPage = lazy(() => import("./pages/ClientStatsPage"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const PaymentsReportPage = lazy(() => import("./pages/PaymentsReportPage"));
const UsagePage = lazy(() => import("./pages/UsagePage"));

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
      {
        path: "admin/payments",
        element: (
          <PrivateRoute>
            <PaymentsReportPage />
          </PrivateRoute>
        ),
      },
      {
        path: "admin/plans",
        element: (
          <PrivateRoute>
            <PlansPage />
          </PrivateRoute>
        ),
      },
      {
        path: "subscription",
        element: (
          <PrivateRoute>
            <Elements stripe={stripePromise}>
              <SubscriptionPage />
            </Elements>
          </PrivateRoute>
        ),
      },
      {
        path: "usage",
        element: (
          <PrivateRoute>
            <UsagePage />
          </PrivateRoute>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> }
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}