import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  RefreshCw,
  Clock,
  AlertTriangle,
  Eye,
  Loader2,
  Radio,
} from "lucide-react";
import { TeacherPortalLayout } from "../../components/layout/TeacherPortalLayout";
import { teacherService } from "../../services/teacherService";
import type { TeacherLiveAttemptItem } from "../../types/teacher.types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";

export const TeacherLiveMonitoringPage: React.FC = () => {
  const [activeAttempts, setActiveAttempts] = useState<TeacherLiveAttemptItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(10);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    loadMonitoring();

    if (pollIntervalSec > 0) {
      const timer = setInterval(() => {
        loadMonitoring(false);
      }, pollIntervalSec * 1000);
      return () => clearInterval(timer);
    }
  }, [pollIntervalSec]);

  const loadMonitoring = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const data = await teacherService.getLiveMonitoring();
      setActiveAttempts(data);
      setLastRefreshed(new Date());
    } catch (e: any) {
      console.error(e);
      setError("Failed to fetch live proctoring stream.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  return (
    <TeacherPortalLayout
      title="Live Candidate Proctoring"
      subtitle="Real-time monitoring of active examination sessions with automatic computer vision flag updates"
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Polling:</span>
            <select
              value={pollIntervalSec}
              onChange={(e) => setPollIntervalSec(Number(e.target.value))}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 cursor-pointer"
            >
              <option value={5}>Every 5s</option>
              <option value={10}>Every 10s</option>
              <option value={30}>Every 30s</option>
              <option value={0}>Manual Only</option>
            </select>
          </div>

          <Button
            onClick={() => loadMonitoring(true)}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2 flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      }
    >
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-mono">
        <span>Active Test Takers: {activeAttempts.length}</span>
        <span>Last synced: {lastRefreshed.toLocaleTimeString()}</span>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <span className="text-xs">Connecting to proctoring stream...</span>
        </div>
      ) : error ? (
        <Card className="p-6 text-center border-rose-200 bg-rose-50 text-rose-800 rounded-xl">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-xs font-semibold">{error}</p>
        </Card>
      ) : activeAttempts.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-300 bg-white rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Activity className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Active Sessions Right Now</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            No candidates are currently taking your examinations. Active attempts will appear here automatically with real-time proctoring indicators.
          </p>
          <Link to="/teacher/results">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2">
              View Past Submissions
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAttempts.map((att) => {
            const hasViolations = att.violations_count > 0;
            return (
              <Card
                key={att.attempt_id}
                className={`p-5 rounded-2xl border transition-all ${
                  hasViolations
                    ? "bg-rose-50/30 border-rose-200 shadow-xs ring-1 ring-rose-200"
                    : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                      {att.course_code}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {att.elapsed_minutes} mins elapsed
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-extrabold text-sm text-slate-900 truncate">{att.student_name}</h4>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{att.student_email}</div>
                  <div className="text-xs font-semibold text-slate-700 truncate mt-1">{att.exam_title}</div>
                </div>

                {/* AI Proctoring Live Status */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px] font-medium">Integrity Score:</span>
                    <span
                      className={`font-black ${
                        att.integrity_score < 70
                          ? "text-rose-600"
                          : att.integrity_score < 90
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {att.integrity_score}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px] font-medium">Recorded Strikes:</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        hasViolations ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {att.violations_count} / 3 Strikes
                    </span>
                  </div>

                  {att.latest_violation && (
                    <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-rose-600 font-medium">Recent Flag:</span>
                      <span className="font-mono font-bold text-rose-800">{att.latest_violation}</span>
                    </div>
                  )}
                </div>

                {/* Link to results or violations */}
                <Link
                  to={`/teacher/results?search=${encodeURIComponent(att.student_email)}`}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Student Activity</span>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </TeacherPortalLayout>
  );
};
