
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy, Suspense } from "react";
import { auth } from "./firebase/firebase"; // Import auth from your firebase config

const App = lazy(() => import("./App"));

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
        async lazy() {
          const { default: Component } = await import("./pages/HomePage");
          return { Component };
        },
      },
      {
        path: "login",
        async lazy() {
          const { default: Component } = await import("./pages/LoginPage");
          return { Component };
        },
      },
      {
        path: "register",
        async lazy() {
          const { default: Component } = await import("./pages/RegisterPage");
          return { Component };
        },
      },
      {
        path: "dashboard",
        async lazy() {
          const { default: Component } = await import("./pages/DashboardPage");
          return { Component };
        },
        loader: () => {
          if (!auth.currentUser) {
            throw new Response("Unauthorized", { status: 401 });
          }
          return null;
        },
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
