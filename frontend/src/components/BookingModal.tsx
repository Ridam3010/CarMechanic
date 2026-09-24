"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  Mail,
  MapPin,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Truck
} from "lucide-react";
import confetti from "canvas-confetti";
import { DiagnosisReport, ConversationSession, MechanicBooking } from "@/lib/types";
import { createBooking } from "@/lib/api";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis?: DiagnosisReport | null;
  session?: ConversationSession | null;
  onBookingSuccess?: (booking: MechanicBooking) => void;
}

const TIME_SLOTS = [
  "08:30 AM",
  "09:30 AM",
  "10:30 AM",
  "11:30 AM",
  "01:30 PM",
  "02:30 PM",
  "03:30 PM",
  "04:30 PM",
  "05:30 PM",
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  diagnosis,
  session,
  onBookingSuccess,
}) => {
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState<string>("2020");
  const [carMileage, setCarMileage] = useState("");
  const [serviceRequested, setServiceRequested] = useState("");
  const [serviceType, setServiceType] = useState<"shop_visit" | "mobile_mechanic" | "emergency_towing">("shop_visit");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("10:30 AM");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<MechanicBooking | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Pre-fill on open
  useEffect(() => {
    if (isOpen) {
      setConfirmedBooking(null);
      setErrorMsg(null);

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPreferredDate(tomorrow.toISOString().split("T")[0]);

      if (session) {
        if (session.car_make) setCarMake(session.car_make);
        if (session.car_model) setCarModel(session.car_model);
        if (session.car_year) setCarYear(String(session.car_year));
        if (session.car_mileage) setCarMileage(session.car_mileage);
      }

      if (diagnosis) {
        setServiceRequested(diagnosis.recommended_service_name || diagnosis.issue_title);
      } else {
        setServiceRequested("Full Vehicle Diagnostic & Inspection");
      }
    }
  }, [isOpen, session, diagnosis]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      setErrorMsg("Please provide your name, phone number, and email.");
      return;
    }
    if (!carMake.trim() || !carModel.trim()) {
      setErrorMsg("Please specify your vehicle make and model.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createBooking({
        session_id: session?.id,
        diagnosis_id: diagnosis?.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        car_make: carMake,
        car_model: carModel,
        car_year: parseInt(carYear) || 2020,
        car_mileage: carMileage,
        service_requested: serviceRequested,
        service_type: serviceType,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        customer_address: customerAddress,
        notes: notes,
        estimated_cost: diagnosis?.estimated_cost_range || "$150 - $350",
      });

      setConfirmedBooking(response.booking_details);
      if (onBookingSuccess) {
        onBookingSuccess(response.booking_details);
      }

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore if not supported
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to schedule booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (confirmedBooking?.id) {
      navigator.clipboard.writeText(confirmedBooking.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {confirmedBooking ? (
          /* Confirmation Success Screen */
          <div className="py-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Appointment Scheduled
              </span>
              <h2 className="text-2xl font-black text-white mt-1">Mechanic Booking Confirmed!</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Our certified automotive technician has received your diagnostic report and will inspect your vehicle at the scheduled time.
              </p>
            </div>

            {/* Booking Reference Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 max-w-md mx-auto flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Booking Code</span>
                <div className="text-lg font-mono font-black text-emerald-400 tracking-wider">
                  {confirmedBooking.id}
                </div>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId ? "Copied" : "Copy Code"}</span>
              </button>
            </div>

            {/* Receipt Summary Details */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Customer</span>
                <span className="font-semibold text-white">{confirmedBooking.customer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Vehicle</span>
                <span className="font-semibold text-white">
                  {confirmedBooking.car_year} {confirmedBooking.car_make} {confirmedBooking.car_model}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Service</span>
                <span className="font-semibold text-orange-400">{confirmedBooking.service_requested}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Date & Time</span>
                <span className="font-semibold text-white">
                  {confirmedBooking.preferred_date} at {confirmedBooking.preferred_time}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Estimated Cost</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {confirmedBooking.estimated_cost || "$150 - $350"}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={onClose}
                className="py-2.5 px-8 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white transition-all"
              >
                Back to Diagnostics
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Schedule Certified Mechanic</h3>
                <p className="text-xs text-slate-400">
                  Direct appointment booking with linked AI diagnostic report
                </p>
              </div>
            </div>

            {/* Service Type Options */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Select Service Delivery Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setServiceType("shop_visit")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    serviceType === "shop_visit"
                      ? "bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10"
                      : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-orange-400 mb-1" />
                  <div className="text-xs font-bold">Workshop Visit</div>
                  <div className="text-[10px] text-slate-400">Certified Repair Bay</div>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType("mobile_mechanic")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    serviceType === "mobile_mechanic"
                      ? "bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10"
                      : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Truck className="w-4 h-4 text-orange-400 mb-1" />
                  <div className="text-xs font-bold">Mobile Mechanic</div>
                  <div className="text-[10px] text-slate-400">Doorstep Service Van</div>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType("emergency_towing")}
                  className={`p-3 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
                    serviceType === "emergency_towing"
                      ? "bg-rose-500/15 border-rose-500 text-white shadow-md shadow-rose-500/10"
                      : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 mb-1" />
                  <div className="text-xs font-bold">Emergency Towing</div>
                  <div className="text-[10px] text-slate-400">Direct Shop Recovery</div>
                </button>
              </div>
            </div>

            {/* Service & Cost Summary Card */}
            <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Service Requested</span>
                <input
                  type="text"
                  value={serviceRequested}
                  onChange={(e) => setServiceRequested(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white w-full focus:outline-none border-b border-transparent focus:border-orange-500"
                  placeholder="e.g. Brake Rotor & Pad Service"
                />
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Estimated Total</span>
                <div className="text-xs font-bold text-emerald-400 font-mono">
                  {diagnosis?.estimated_cost_range || "$150 - $350"}
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Year</label>
                <input
                  type="number"
                  value={carYear}
                  onChange={(e) => setCarYear(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Make</label>
                <input
                  type="text"
                  value={carMake}
                  onChange={(e) => setCarMake(e.target.value)}
                  placeholder="Toyota"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Model</label>
                <input
                  type="text"
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  placeholder="Camry"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mileage</label>
                <input
                  type="text"
                  value={carMileage}
                  onChange={(e) => setCarMileage(e.target.value)}
                  placeholder="65,000 mi"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-orange-400" />
                  <span>Appointment Date</span>
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-400" />
                  <span>Time Slot</span>
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t} className="bg-slate-900">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Address / Location for Mobile Mechanic */}
            {serviceType === "mobile_mechanic" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-400" />
                  <span>Service Address / Driveway Location</span>
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="123 Main St, Apt 4B, Austin, TX"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Additional Notes for Technician
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Park in the back alley driveway, keys will be in mailbox"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none resize-none"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit CTA */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Mechanic Booking</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
