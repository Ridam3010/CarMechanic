"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  CheckCircle2,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText,
  DollarSign
} from "lucide-react";
import { MechanicBooking } from "@/lib/types";
import { getBookingById } from "@/lib/api";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<MechanicBooking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) return;
      setIsLoading(true);
      try {
        const data = await getBookingById(bookingId);
        setBooking(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Booking reference not found.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Diagnostic Bay</span>
        </Link>
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-orange-400" />
          <span className="font-bold text-sm text-white">GearHead Booking Portal</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full px-4 py-8">
        {isLoading ? (
          <div className="text-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 mx-auto text-orange-400 animate-spin" />
            <p className="text-xs text-slate-400">Locating booking records...</p>
          </div>
        ) : errorMsg || !booking ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <div>
              <h2 className="text-lg font-bold text-white">Booking Not Found</h2>
              <p className="text-xs text-slate-400 mt-1">
                {errorMsg || `No booking found for code ${bookingId}. Please check your reference code.`}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-400 transition-all"
            >
              Start New Car Diagnosis
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Appointment Ticket
                </span>
                <h1 className="text-2xl font-black text-white">{booking.id}</h1>
              </div>

              <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{booking.status_display || booking.status}</span>
              </span>
            </div>

            {/* Vehicle & Service Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Car className="w-3 h-3 text-orange-400" />
                  <span>Vehicle</span>
                </span>
                <div className="text-sm font-bold text-white">
                  {booking.car_year} {booking.car_make} {booking.car_model}
                </div>
                {booking.car_mileage && (
                  <div className="text-xs text-slate-400">{booking.car_mileage}</div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-orange-400" />
                  <span>Service Requested</span>
                </span>
                <div className="text-sm font-bold text-orange-400">
                  {booking.service_requested}
                </div>
                <div className="text-xs text-slate-400">{booking.service_type_display}</div>
              </div>
            </div>

            {/* Appointment Date & Time */}
            <div className="p-4 rounded-xl bg-slate-950 border border-white/5 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>Date</span>
                </span>
                <div className="text-sm font-bold text-white">{booking.preferred_date}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>Time</span>
                </span>
                <div className="text-sm font-bold text-white">{booking.preferred_time}</div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-2 border-t border-white/10 pt-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Customer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-medium">{booking.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{booking.customer_phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 truncate">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">{booking.customer_email}</span>
                </div>
              </div>
              {booking.customer_address && (
                <div className="flex items-start gap-2 text-xs text-slate-300 pt-1">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{booking.customer_address}</span>
                </div>
              )}
            </div>

            {/* Linked Diagnosis if available */}
            {booking.diagnosis_summary && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                  <FileText className="w-4 h-4" />
                  <span>Attached Diagnostic Assessment</span>
                </div>
                <div className="text-xs text-slate-200">
                  <strong>Issue: </strong> {booking.diagnosis_summary.issue_title}
                </div>
                <div className="text-xs text-emerald-400 font-mono">
                  <strong>Estimate: </strong> {booking.diagnosis_summary.estimated_cost_range}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        GearHead AI Mechanic • Certified Automotive Diagnostics Platform
      </footer>
    </div>
  );
}
