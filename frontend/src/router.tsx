import { createBrowserRouter, Navigate } from "react-router-dom";
import { PrivateLayout } from "./layouts/PrivateLayout";
import { ControlePage } from "./pages/ControlePage";
import { DashboardPage } from "./pages/DashboardPage";
import { GroupsPage } from "./pages/GroupsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { VisaoGeralPage } from "./pages/VisaoGeralPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/verify-email",
    element: <VerifyEmailPage />,
  },
  {
    path: "/reset-password/:token",
    element: <ResetPasswordPage />,
  },
  {
    element: <PrivateLayout />,
    children: [
      {
        path: "/visao-geral",
        element: <VisaoGeralPage />,
      },
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/controle",
        element: <ControlePage />,
      },
      {
        path: "/grupos",
        element: <GroupsPage />,
      },
      {
        path: "/profile",
        element: <ProfilePage />,
      },
    ],
  },
]);
