"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Clock,
  Wrench,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Car
} from "lucide-react";
import { DiagnosisReport } from "@/lib/types";

interface DiagnosisCardProps {
  diagnosis: DiagnosisReport;
  onBookMechanic: () => void;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  diagnosis,
  onBookMechanic,
}) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-500/50",
          text: "text-rose-400",
          glow: "shadow-rose-500/20",
          label: "Critical - Unsafe to Drive",
        };
      case "high":
        return {
          bg: "bg-orange-500/10",
          border: "border-orange-500/50",
          text: "text-orange-400",
          glow: "shadow-orange-500/20",
          label: "High - Urgent Repair",
        };
      case "medium":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/50",
          text: "text-amber-400",
          glow: "shadow-amber-500/20",
          label: "Medium - Service Needed",
        };
      default:
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/50",
          text: "text-emerald-400",
          glow: "shadow-emerald-500/20",
          label: "Low - Routine Check",
        };
    }
  };

  const style = getSeverityStyle(diagnosis.severity);

  return (
    <div
      className={`rounded-2xl bg-slate-900/90 border ${style.border} shadow-xl ${style.glow} p-5 space-y-4 relative overflow-hidden transition-all`}
    >
      {/* Background Accent Mesh */}
      <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

      {/* Header with Severity & Driveability */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Diagnostic Assessment Report
            </span>
            <h3 className="text-base font-bold text-white leading-tight">
              {diagnosis.issue_title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Tag */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.border} ${style.text}`}
          >
            {style.label}
          </span>

          {/* Driveability */}
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${
              diagnosis.is_driveable
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                : "bg-rose-950/40 border-rose-500/30 text-rose-400 font-semibold"
            }`}
          >
            {diagnosis.is_driveable ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Driveable</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3 h-3" />
                <span>Do Not Drive</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Root Cause Technical Explanation */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          Root Cause Analysis
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-white/5">
          {diagnosis.primary_cause}
        </p>
      </div>

      {/* Symptoms & Safety Warning */}
      {diagnosis.safety_warning && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <span className="font-bold text-rose-300">Safety Advisory: </span>
            <span>{diagnosis.safety_warning}</span>
          </div>
        </div>
      )}

      {/* Suggested Repairs List */}
      {diagnosis.suggested_repairs && diagnosis.suggested_repairs.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-orange-400" />
            <span>Recommended Repair Procedures</span>
          </h4>
          <ul className="space-y-1.5">
            {diagnosis.suggested_repairs.map((repair, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-white/5"
              >
                <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{repair}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Metrics: Cost & Labor */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Estimated Cost</span>
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
            {diagnosis.estimated_cost_range}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Labor Time</span>
          </div>
          <div className="text-sm font-bold text-slate-200 mt-0.5">
            {diagnosis.estimated_labor_hours}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Car className="w-3.5 h-3.5 text-blue-400" />
            <span>DIY Feasibility</span>
          </div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
            {diagnosis.diy_feasibility || "Professional"}
          </div>
        </div>
      </div>

      {/* Action CTA: Book Mechanic */}
      <div className="pt-2">
        <button
          onClick={onBookMechanic}
          className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Wrench className="w-4 h-4" />
          <span>Book Certified Mechanic for this Repair</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
