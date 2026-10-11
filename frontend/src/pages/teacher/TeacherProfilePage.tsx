import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { TeacherPortalLayout } from "../../components/layout/TeacherPortalLayout";
import { useAuthStore } from "../../store/useAuthStore";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { authService } from "../../services/authService";
import { extractErrorMessage } from "../../services/api";

export const TeacherProfilePage: React.FC = () => {
  const { user } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const teacherName = user?.full_name || "Faculty Member";
  const teacherEmail = user?.email || "teacher@example.com";
  const employeeCode = user?.admin_profile?.employee_code || "FAC-102";
  const adminLevel = user?.admin_profile?.admin_level || "Professor & Invigilator";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(extractErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <TeacherPortalLayout
      title="Faculty Account Profile"
      subtitle="View institutional faculty credentials, invigilation authority, and security settings"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 bg-white border-slate-200 rounded-2xl shadow-xs text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-600/30">
              {teacherName.charAt(0)}
            </div>
            <h3 className="font-extrabold text-base text-slate-900">{teacherName}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{teacherEmail}</p>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Faculty Account</span>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Faculty Authority
            </h4>
            <div className="text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Employee Code:</span>
                <span className="font-mono font-bold text-slate-900">{employeeCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Designation:</span>
                <span className="font-bold text-slate-900">{adminLevel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">System Role:</span>
                <span className="font-bold text-indigo-700 capitalize">{user?.role || "Teacher"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Account Status:</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Security & Password Management */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-white border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Change Account Password</h4>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={passwordLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Card>

          <Card className="p-6 bg-white border-slate-200 rounded-2xl shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Institutional Security Policy</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Teacher accounts have administrative invigilation authority. All examination creation, answer key alterations, student scorecard inspections, and proctoring evidence reviews are recorded in the institutional audit log.
            </p>
          </Card>
        </div>
      </div>
    </TeacherPortalLayout>
  );
};
