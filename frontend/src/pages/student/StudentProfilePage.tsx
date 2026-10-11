import React, { useState, useRef } from "react";
import {
  Camera,
  CheckCircle2,
  KeyRound,
  GraduationCap,
  ShieldCheck,
  X,
  AlertOctagon,
} from "lucide-react";
import { StudentPortalLayout } from "../../components/layout/StudentPortalLayout";
import { useAuthStore } from "../../store/useAuthStore";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Card } from "../../components/common/Card";
import { authService } from "../../services/authService";
import { extractErrorMessage } from "../../services/api";

export const StudentProfilePage: React.FC = () => {
  const { user, setAuth, token } = useAuthStore();

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [studentId, setStudentId] = useState(user?.student_profile?.student_id_number || "");
  const [department, setDepartment] = useState(user?.student_profile?.department || "Computer Science & Engineering");
  const [course, setCourse] = useState(user?.student_profile?.course || "B.Tech Computer Science");
  const [semester, setSemester] = useState<number>(user?.student_profile?.semester || 4);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // States
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsUpdatingProfile(true);

    try {
      const updatedUser = await authService.updateProfile({
        full_name: fullName.trim(),
        student_id_number: studentId.trim(),
        department: department.trim(),
        course: course.trim(),
        semester: Number(semester),
      });
      if (token) setAuth(token, updatedUser);
      setProfileSuccess("Candidate profile updated successfully!");
    } catch (err) {
      setProfileError(extractErrorMessage(err));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters in length.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match. Please re-enter.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(extractErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setProfileError(null);

    try {
      const updatedUser = await authService.uploadPhoto(file);
      if (token) setAuth(token, updatedUser);
      setProfileSuccess("Candidate portrait uploaded successfully!");
    } catch (err) {
      setProfileError(extractErrorMessage(err));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <StudentPortalLayout
      title="Candidate Profile & Settings"
      subtitle="Manage your institutional student details, registered credentials, and biometric identification"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Photo & Academic Overview */}
        <div className="space-y-6">
          <Card className="p-6 border-slate-200 bg-white text-center">
            {/* Avatar / Portrait */}
            <div className="relative inline-block mx-auto mb-4">
              <div className="w-24 h-24 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-700 text-3xl font-extrabold overflow-hidden shadow-sm">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.charAt(0) || "S"
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors cursor-pointer"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <h3 className="text-base font-extrabold text-slate-900">{user?.full_name || "Enrolled Candidate"}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Student ID</span>
                <span className="font-mono font-bold text-slate-800">
                  {user?.student_profile?.student_id_number || studentId || "STU-2026"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Enrollment</span>
                <span className="font-semibold text-slate-800">
                  {user?.student_profile?.course || course}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Academic Standing</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                  ACTIVE &bull; SEMESTER {user?.student_profile?.semester || semester}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-slate-200 bg-white">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Institutional Verification
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Institutional Email Verified</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Dual-Role Separation Enforced</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Webcam Proctoring Enabled</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Columns: Edit Profile & Change Password Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile Card */}
          <Card className="p-6 border-slate-200 bg-white">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              Academic Credentials
            </h3>

            {profileError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 border-l-4 border-l-rose-500 text-rose-900 text-xs shadow-xs animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertOctagon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-900 text-xs mb-0.5">Update Failed</h4>
                      <p className="text-rose-700 leading-relaxed font-medium">{profileError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileError(null)}
                    className="text-rose-400 hover:text-rose-700 p-1 rounded-md hover:bg-rose-100 transition-colors"
                    title="Dismiss notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Legal Name
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Student ID Number
                  </label>
                  <Input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. STU-2026-042"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Degree / Course
                  </label>
                  <Input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Current Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Academic Department
                </label>
                <Input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="text-xs"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" isLoading={isUpdatingProfile} className="font-bold">
                  Save Academic Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Change Password Card */}
          <Card className="p-6 border-slate-200 bg-white">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              Security & Password
            </h3>

            {passwordError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 border-l-4 border-l-rose-500 text-rose-900 text-xs shadow-xs animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertOctagon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-900 text-xs mb-0.5">Password Change Failed</h4>
                      <p className="text-rose-700 leading-relaxed font-medium">{passwordError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasswordError(null)}
                    className="text-rose-400 hover:text-rose-700 p-1 rounded-md hover:bg-rose-100 transition-colors"
                    title="Dismiss notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" isLoading={isChangingPassword} className="font-bold">
                  Update Account Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </StudentPortalLayout>
  );
};
