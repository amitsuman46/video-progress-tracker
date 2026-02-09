import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AuthProvider } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Courses from "./pages/Courses";
import Course from "./pages/Course";
import VideoPage from "./pages/VideoPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Courses />} />
          <Route path="courses/:courseId" element={<Course />} />
          <Route path="courses/:courseId/videos/:videoId" element={<VideoPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
