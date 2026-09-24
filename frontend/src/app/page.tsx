"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SessionSidebar } from "@/components/SessionSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { DiagnosisCard } from "@/components/DiagnosisCard";
import { MediaUploader } from "@/components/MediaUploader";
import { BookingModal } from "@/components/BookingModal";
import {
  ConversationSession,
  ChatMessage,
  UploadedMedia,
  DiagnosisReport,
  MechanicBooking
} from "@/lib/types";
import {
  checkHealth,
  getSessions,
  createSession,
  getSessionHistory,
  sendChatMessage,
  generateDiagnosis
} from "@/lib/api";
import {
  Wrench,
  PanelLeft,
  FileText,
  AlertCircle,
  Car,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  X
} from "lucide-react";

export default function Home() {
  // State
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadedMediaList, setUploadedMediaList] = useState<UploadedMedia[]>([]);
  const [diagnosis, setDiagnosis] = useState<DiagnosisReport | null>(null);

  // System & Status
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isGeneratingDiag, setIsGeneratingDiag] = useState<boolean>(false);

  // Modals & Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isMediaUploaderOpen, setIsMediaUploaderOpen] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

  // Initial Load: Check backend and load sessions
  useEffect(() => {
    async function init() {
      const health = await checkHealth();
      setIsBackendHealthy(health.status === "healthy");
      setIsGeminiConfigured(health.gemini_configured);

      const loadedSessions = await getSessions();
      setSessions(loadedSessions);

      if (loadedSessions.length > 0) {
        loadSession(loadedSessions[0].id);
      } else {
        handleNewSession();
      }
    }
    init();
  }, []);

  const loadSession = async (sessionId: string) => {
    try {
      const sessionData = await getSessionHistory(sessionId);
      setCurrentSession(sessionData);
      setMessages(sessionData.messages || []);
      setUploadedMediaList(sessionData.media_files || []);
      setDiagnosis(sessionData.diagnosis || null);
    } catch (err) {
      console.error("Error loading session:", err);
    }
  };

  const handleNewSession = async () => {
    try {
      const newSess = await createSession();
      setCurrentSession(newSess);
      setMessages(newSess.messages || []);
      setUploadedMediaList([]);
      setDiagnosis(null);
      setSessions((prev) => [newSess, ...prev]);
    } catch (err) {
      console.error("Error creating new session:", err);
      // Fallback local session if backend is temporarily offline
      const mockSession: ConversationSession = {
        id: "local-" + Date.now(),
        session_title: "New Diagnostic Session",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCurrentSession(mockSession);
      setMessages([
        {
          id: "welcome-1",
          sender: "bot",
          text: "👋 **Welcome to AI Car Mechanic!** What car make, model, and symptoms are you diagnosing today?",
          is_ai_generated: false,
          created_at: new Date().toISOString(),
          suggested_actions: [
            "Brakes squealing when stopping",
            "Engine overheating in traffic",
            "Check engine light code P0420",
            "Car won't start in morning"
          ]
        }
      ]);
    }
  };

  const handleSendMessage = async (text: string, mediaId?: string) => {
    setIsSending(true);

    // Optimistic user message update
    const tempUserMsg: ChatMessage = {
      id: "temp-" + Date.now(),
      sender: "user",
      text: text || "[Media Uploaded]",
      is_ai_generated: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await sendChatMessage({
        session_id: currentSession?.id.startsWith("local-") ? undefined : currentSession?.id,
        message: text,
        media_id: mediaId,
      });

      const botMsg: ChatMessage = {
        id: result.message_id || "bot-" + Date.now(),
        sender: "bot",
        text: result.response,
        is_ai_generated: result.is_ai_generated,
        triage_tag: result.triage_tag,
        suggested_actions: result.follow_ups,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Update session info if car was extracted or session id returned
      if (result.session_id && currentSession?.id !== result.session_id) {
        const updatedSessions = await getSessions();
        setSessions(updatedSessions);
        await loadSession(result.session_id);
      } else if (result.car_context && currentSession) {
        setCurrentSession((prev) =>
          prev
            ? {
                ...prev,
                car_make: result.car_context.make || prev.car_make,
                car_model: result.car_context.model || prev.car_model,
                car_year: result.car_context.year || prev.car_year,
              }
            : null
        );
      }

      // If diagnosis preview is ready
      if (result.diagnosis_preview && !diagnosis) {
        // Automatically set preliminary diagnosis preview
        setDiagnosis({
          id: "preview-" + Date.now(),
          issue_title: result.diagnosis_preview.issue_title,
          primary_cause: result.diagnosis_preview.primary_cause,
          severity: result.diagnosis_preview.severity,
          urgency_level: result.diagnosis_preview.urgency_level,
          is_driveable: result.diagnosis_preview.is_driveable,
          symptoms: [],
          suggested_repairs: result.diagnosis_preview.suggested_repairs || [],
          estimated_cost_range: result.diagnosis_preview.estimated_cost_range,
          estimated_labor_hours: "1 - 2 hrs",
          recommended_service_name: result.diagnosis_preview.recommended_service_name,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      const errorBotMsg: ChatMessage = {
        id: "err-" + Date.now(),
        sender: "bot",
        text: `⚠️ **Diagnostic Alert:** ${err.message || "Failed to contact diagnostic server."}`,
        is_ai_generated: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorBotMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaUploaded = async (media: UploadedMedia) => {
    setUploadedMediaList((prev) => [media, ...prev]);

    // Send a message notifying the bot about the upload with analysis
    const promptText = `I uploaded a ${media.file_type}: ${media.original_filename}. Analysis summary: ${media.analysis || "Please inspect this file."}`;
    await handleSendMessage(promptText, media.media_id);
  };

  const handleGenerateDiagnosis = async () => {
    if (!currentSession?.id) return;
    setIsGeneratingDiag(true);

    try {
      const diagData = await generateDiagnosis(currentSession.id);
      setDiagnosis(diagData);
      setShowRightPanel(true);

      // Add diagnosis announcement in chat
      const diagNoticeMsg: ChatMessage = {
        id: "diag-notice-" + Date.now(),
        sender: "bot",
        text: `📋 **Formal Diagnostic Report Generated!**\n\n• **Issue:** ${diagData.issue_title}\n• **Severity:** \`${diagData.severity.toUpperCase()}\`\n• **Estimated Repair Cost:** \`${diagData.estimated_cost_range}\`\n• **Labor Estimate:** ${diagData.estimated_labor_hours}\n\nYou can review the complete report on the right panel and schedule a certified mechanic anytime!`,
        is_ai_generated: false,
        suggested_actions: ["Book Mechanic Now", "Explain the repair steps", "Is there a DIY alternative?"],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, diagNoticeMsg]);
    } catch (err: any) {
      console.error("Error generating diagnosis:", err);
    } finally {
      setIsGeneratingDiag(false);
    }
  };

  const handleBookingSuccess = (booking: MechanicBooking) => {
    // Refresh sessions
    getSessions().then(setSessions);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Header */}
      <Header
        currentSession={currentSession}
        onNewSession={handleNewSession}
        isBackendHealthy={isBackendHealthy}
        isGeminiConfigured={isGeminiConfigured}
        onOpenBooking={() => setIsBookingModalOpen(true)}
        hasDiagnosis={!!diagnosis}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Session History & DTC Shortcuts Sidebar */}
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSession?.id || null}
          onSelectSession={loadSession}
          onQuickPrompt={(prompt) => handleSendMessage(prompt)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Center: Main Troubleshooting Chat */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Mobile Sidebar Toggle Button */}
          <div className="p-2 border-b border-white/5 bg-slate-950/40 flex items-center justify-between lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5"
            >
              <PanelLeft className="w-3.5 h-3.5 text-orange-400" />
              <span>History & Codes</span>
            </button>

            {diagnosis && (
              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30 text-xs text-orange-300 font-semibold flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{showRightPanel ? "Hide Report" : "View Report"}</span>
              </button>
            )}
          </div>

          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onOpenMediaUploader={() => setIsMediaUploaderOpen(true)}
            onGenerateDiagnosis={handleGenerateDiagnosis}
            onOpenBooking={() => setIsBookingModalOpen(true)}
            isSending={isSending}
            isGeneratingDiag={isGeneratingDiag}
            diagnosis={diagnosis}
            uploadedMediaList={uploadedMediaList}
          />
        </main>

        {/* Right Panel: Live Diagnosis Report & Booking CTA */}
        {diagnosis && showRightPanel && (
          <aside className="w-full sm:w-96 lg:w-[420px] border-l border-white/10 bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto shrink-0 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Diagnostic Summary
                </span>
              </div>
              <button
                onClick={() => setShowRightPanel(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <DiagnosisCard
              diagnosis={diagnosis}
              onBookMechanic={() => setIsBookingModalOpen(true)}
            />
          </aside>
        )}
      </div>

      {/* Multimodal Media Uploader Modal */}
      <MediaUploader
        sessionId={currentSession?.id}
        onMediaUploaded={handleMediaUploaded}
        isOpen={isMediaUploaderOpen}
        onClose={() => setIsMediaUploaderOpen(false)}
      />

      {/* Certified Mechanic Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        diagnosis={diagnosis}
        session={currentSession}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  );
}
