"use client";

import React from "react";
import {
  History,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Car,
  ChevronRight,
  Flame,
  Volume2
} from "lucide-react";
import { ConversationSession } from "@/lib/types";

interface SessionSidebarProps {
  sessions: ConversationSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onQuickPrompt: (promptText: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_DTC_CODES = [
  { code: "P0300", name: "Random Cylinder Misfire", tag: "High" },
  { code: "P0420", name: "Catalytic Converter Bank 1", tag: "Medium" },
  { code: "P0171", name: "System Too Lean (Bank 1)", tag: "Medium" },
  { code: "P0128", name: "Thermostat Coolant Temp", tag: "Low" },
];

const QUICK_TROUBLESHOOTING = [
  "Brakes squealing when slowing down",
  "Engine overheating in stop-and-go traffic",
  "Car cranks but won't start in morning",
  "Rattling or clicking noise under acceleration",
  "How much for full synthetic oil change?",
];

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onQuickPrompt,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-80 bg-slate-950/95 lg:bg-slate-950/60 border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <History className="w-4 h-4 text-orange-400" />
            <span>Diagnostic History</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-400">
            {sessions.length} sessions
          </span>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-white/5">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No past diagnoses found. Start chatting with the master mechanic!
            </div>
          ) : (
            sessions.map((session) => {
              const isSelected = session.id === currentSessionId;
              const hasDiag = !!session.diagnosis || session.status === "diagnosed";
              const isBooked = session.status === "booked";

              return (
                <button
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all group flex items-start gap-2.5 ${
                    isSelected
                      ? "bg-gradient-to-r from-orange-500/15 to-transparent border border-orange-500/30 text-white"
                      : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isBooked
                        ? "bg-emerald-500/20 text-emerald-400"
                        : hasDiag
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isBooked ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : hasDiag ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Car className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate text-slate-200 group-hover:text-white">
                      {session.session_title || "Diagnostic Session"}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>
                        {new Date(session.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{session.status}</span>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform shrink-0 mt-2 ${
                      isSelected
                        ? "text-orange-400 translate-x-0.5"
                        : "text-slate-600 opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Quick Diagnostics Shortcuts Section */}
        <div className="p-3.5 border-t border-white/10 bg-slate-950/80 space-y-3">
          {/* Quick DTC Codes */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              <span>Instant DTC Code Lookup</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {COMMON_DTC_CODES.map((dtc) => (
                <button
                  key={dtc.code}
                  onClick={() => {
                    onQuickPrompt(`My scanner detected trouble code ${dtc.code}`);
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-orange-500/30 text-left transition-all group"
                >
                  <div className="text-xs font-mono font-bold text-orange-400 group-hover:text-orange-300">
                    {dtc.code}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{dtc.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Prompts */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-amber-400" />
              <span>Common Symptoms</span>
            </div>
            <div className="space-y-1">
              {QUICK_TROUBLESHOOTING.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onQuickPrompt(prompt);
                    onClose();
                  }}
                  className="w-full text-left text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 truncate block transition-all"
                >
                  • {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
