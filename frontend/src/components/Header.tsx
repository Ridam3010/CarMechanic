"use client";

import React from "react";
import { Wrench, ShieldCheck, Cpu, PlusCircle, Sparkles, AlertTriangle } from "lucide-react";
import { ConversationSession } from "@/lib/types";

interface HeaderProps {
  currentSession: ConversationSession | null;
  onNewSession: () => void;
  isBackendHealthy: boolean;
  isGeminiConfigured: boolean;
  onOpenBooking: () => void;
  hasDiagnosis: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentSession,
  onNewSession,
  isBackendHealthy,
  isGeminiConfigured,
  onOpenBooking,
  hasDiagnosis,
}) => {
  const carDisplay = currentSession?.car_make
    ? `${currentSession.car_year || ""} ${currentSession.car_make} ${currentSession.car_model || ""}`.trim()
    : null;

  return (
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold">
            <Wrench className="w-5 h-5 text-slate-950" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center" title="System Online">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              GearHead <span className="text-orange-500 font-mono text-sm uppercase px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">AI Mechanic</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ASE Master Certified Diagnostics • Multimodal Vision & Audio Triage
          </p>
        </div>
      </div>

      {/* Middle Status Badge: Active Vehicle */}
      {carDisplay && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-orange-500/30 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-slate-400">Target Vehicle:</span>
          <span className="font-semibold text-white">{carDisplay}</span>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Gemini status pill */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
            isGeminiConfigured
              ? "bg-purple-950/40 border-purple-500/30 text-purple-300"
              : "bg-slate-900 border-slate-700 text-slate-400"
          }`}
          title={isGeminiConfigured ? "Gemini 1.5/2.0 Flash AI active" : "Using expert heuristic engine (add GEMINI_API_KEY for live LLM)"}
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>{isGeminiConfigured ? "Gemini AI" : "Heuristic Triage"}</span>
        </div>

        {/* Backend health status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
            isBackendHealthy
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
              : "bg-rose-950/40 border-rose-500/30 text-rose-400"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isBackendHealthy ? "bg-emerald-400" : "bg-rose-500"}`} />
          <span className="hidden sm:inline">{isBackendHealthy ? "API Ready" : "API Offline"}</span>
        </div>

        {/* Book Mechanic CTA in header if diagnosis exists */}
        {hasDiagnosis && (
          <button
            onClick={onOpenBooking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:from-orange-400 hover:to-amber-400 transition-all shadow-md shadow-orange-500/20 active:scale-95"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Book Mechanic</span>
          </button>
        )}

        {/* New Diagnostic Session Button */}
        <button
          onClick={onNewSession}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white border border-white/10 transition-all active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden sm:inline">New Diagnosis</span>
        </button>
      </div>
    </header>
  );
};
