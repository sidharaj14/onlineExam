import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";

import { StudentDashboardPage } from "../pages/student/StudentDashboardPage";
import { StudentExamsPage } from "../pages/student/StudentExamsPage";
import { StudentAttemptsPage } from "../pages/student/StudentAttemptsPage";
import { StudentResultsPage } from "../pages/student/StudentResultsPage";
import { StudentPerformancePage } from "../pages/student/StudentPerformancePage";
import { StudentProfilePage } from "../pages/student/StudentProfilePage";

import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";

import { ExamInstructionsPage } from "../pages/exams/ExamInstructionsPage";
import { ExamTakingPage } from "../pages/exams/ExamTakingPage";
import { ExamResultPage } from "../pages/exams/ExamResultPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthStore } from "../store/useAuthStore";

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (isAuthenticated && user) {
    if (user.role === "admin" || user.role === "super_admin" || user.role === "teacher") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/student/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Root: Direct to login or authenticated dashboard */}
      <Route path="/" element={<RootRedirect />} />

      {/* 2. Direct Authentication Routes (Sign In & Sign Up) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Legacy / alias login routes */}
      <Route path="/login/student" element={<Navigate to="/login" replace />} />
      <Route path="/login/teacher" element={<Navigate to="/login" replace />} />

      {/* 3. Student Dedicated Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/student/dashboard" element={<StudentDashboardPage />} />
        <Route path="/student/exams" element={<StudentExamsPage />} />
        <Route path="/student/attempts" element={<StudentAttemptsPage />} />
        <Route path="/student/results" element={<StudentResultsPage />} />
        <Route path="/student/performance" element={<StudentPerformancePage />} />
        <Route path="/student/profile" element={<StudentProfilePage />} />

        {/* Legacy redirects */}
        <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/exams" element={<Navigate to="/student/exams" replace />} />
      </Route>

      {/* 4. Examination Flow Routes */}
      <Route element={<ProtectedRoute allowedRoles={["student", "teacher", "admin", "super_admin"]} />}>
        <Route path="/exams/:examId/instructions" element={<ExamInstructionsPage />} />
        <Route path="/exams/:examId/verify" element={<Navigate to="/exams/:examId/instructions" replace />} />
        <Route path="/exams/:attemptId/take" element={<ExamTakingPage />} />
        <Route path="/exams/:attemptId/result" element={<ExamResultPage />} />
      </Route>

      {/* 5. Teacher & Invigilator / Admin Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={["teacher", "admin", "super_admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/teacher/dashboard" element={<AdminDashboardPage />} />
      </Route>

      {/* 6. Fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};
