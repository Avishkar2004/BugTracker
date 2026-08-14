import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Bugs from "./pages/Bugs.jsx";
import BugDetail from "./pages/BugDetail.jsx";
import NewBug from "./pages/NewBug.jsx";
import Team from "./pages/Team.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="bugs" element={<Bugs />} />
        <Route path="bugs/new" element={<NewBug />} />
        <Route path="bugs/:id" element={<BugDetail />} />
        <Route
          path="team"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Team />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
