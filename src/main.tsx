import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import Root from './layouts/root.tsx';
import ErrorPage from './pages/error-pages.tsx';
import LoginPage from './pages/login-page.tsx';
import WelcomePage from './pages/welcome-page.tsx';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/welcome" replace /> },
      {
        path: "/welcome",
        element: <WelcomePage />,
      }
    ]
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <RouterProvider router={router} />
  </StrictMode>,
)
