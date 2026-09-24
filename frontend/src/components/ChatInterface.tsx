"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Wrench,
  User,
  Sparkles,
  Bot,
  AlertCircle,
  FileCheck2,
  CalendarCheck,
  ChevronRight,
  Loader2,
  Volume2,
  Video,
  Image as ImageIcon,
  Cpu
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessage, UploadedMedia, DiagnosisReport } from "@/lib/types";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, mediaId?: string) => Promise<void>;
  onOpenMediaUploader: () => void;
  onGenerateDiagnosis: () => void;
  onOpenBooking: () => void;
  isSending: boolean;
  isGeneratingDiag: boolean;
  diagnosis: DiagnosisReport | null;
  uploadedMediaList: UploadedMedia[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onOpenMediaUploader,
  onGenerateDiagnosis,
  onOpenBooking,
  isSending,
  isGeneratingDiag,
  diagnosis,
  uploadedMediaList,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const text = inputText;
    setInputText("");
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative">
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xl shadow-orange-500/20">
              <Wrench className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">AI Automotive Diagnostic Bay</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Describe your car issues, symptoms, dashboard warning codes, or upload photos/sounds for an instant master mechanic evaluation.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 text-xs font-bold ${
                    isUser
                      ? "bg-slate-800 text-slate-200 border border-white/10"
                      : "bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 shadow-md shadow-orange-500/20"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                </div>

                {/* Message Bubble Content */}
                <div className={`space-y-2 max-w-[85%] sm:max-w-[78%]`}>
                  {/* Sender Name & Meta */}
                  <div className={`flex items-center gap-2 text-[11px] ${isUser ? "justify-end text-slate-400" : "text-slate-400"}`}>
                    <span className="font-semibold text-slate-300">
                      {isUser ? "Vehicle Owner" : "Antigravity Master Mechanic"}
                    </span>
                    {!isUser && msg.is_ai_generated && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/10 border border-purple-500/30 text-[10px] text-purple-300 flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" />
                        Gemini AI
                      </span>
                    )}
                    {!isUser && !msg.is_ai_generated && msg.triage_tag !== "welcome" && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400">
                        Fast Triage
                      </span>
                    )}
                    <span className="text-slate-600">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Message Card */}
                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-orange-600 text-white shadow-lg shadow-orange-600/10 rounded-tr-none font-medium"
                        : "bg-slate-900/90 text-slate-200 border border-white/10 shadow-xl rounded-tl-none prose prose-invert max-w-none"
                    }`}
                  >
                    {/* Render Markdown */}
                    <div className="prose prose-invert prose-xs sm:prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>

                    {/* Attached Media Display */}
                    {msg.media_url && (
                      <div className="mt-3 pt-2 border-t border-white/10">
                        {msg.media_type === "image" && (
                          <div className="rounded-xl overflow-hidden border border-white/10 max-w-sm">
                            <img src={msg.media_url} alt="Uploaded component" className="w-full object-cover max-h-60" />
                          </div>
                        )}
                        {msg.media_type === "audio" && (
                          <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-center gap-3">
                            <Volume2 className="w-5 h-5 text-purple-400 shrink-0 animate-pulse" />
                            <audio controls src={msg.media_url} className="w-full h-8" />
                          </div>
                        )}
                        {msg.media_type === "video" && (
                          <div className="rounded-xl overflow-hidden border border-white/10 max-w-sm">
                            <video controls src={msg.media_url} className="w-full max-h-60" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suggested Follow-Up Actions / Chips */}
                  {!isUser && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggested_actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSendMessage(action)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-orange-500/20 text-slate-300 hover:text-orange-300 border border-white/10 hover:border-orange-500/30 transition-all flex items-center gap-1 active:scale-95"
                        >
                          <span>{action}</span>
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Real-time typing/diagnosing indicator */}
        {isSending && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-xs">
              <Wrench className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              <span>Senior technician analyzing mechanical parameters...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Diagnosis Trigger Banner */}
      {messages.length >= 3 && !diagnosis && (
        <div className="mx-4 mb-2 p-2.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-transparent border border-orange-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="font-semibold">Ready for full technical assessment?</span>
          </div>
          <button
            onClick={onGenerateDiagnosis}
            disabled={isGeneratingDiag}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5 shrink-0"
          >
            {isGeneratingDiag ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Generate Diagnosis Report</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Input Box & Action Bar */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/80 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          {/* Media Upload Trigger */}
          <button
            type="button"
            onClick={onOpenMediaUploader}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-orange-400 border border-white/10 hover:border-orange-500/30 transition-all shrink-0"
            title="Upload photo of leak, engine audio, or exhaust video"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Textarea Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask mechanic (e.g., '2018 Honda Civic brake noise', 'CEL code P0420', or 'engine ticking')..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none max-h-32"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:from-orange-400 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/20 shrink-0 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
