"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppHeader } from "@/components/app-shell/AppHeader";
import {
  getEvent,
  getEventSync,
  createRSVP,
  cancelRSVP,
  fetchTeamByCodeAsync,
  createEventTeam,
  joinEventTeam,
  getExistingRSVP,
  ExistingRSVPInfo,
} from "@/lib/api";
import { EventItem, TicketTier, RSVPResponse, EventTeam, RSVPQuestion } from "@/lib/types";
import { useEventSSE } from "@/hooks/useEventSSE";
import {
  Ticket,
  Calendar,
  MapPin,
  Building,
  Video,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { DuplicateRSVPNotice } from "@/components/feedback/DuplicateRSVPNotice";
import { HorizontalEventPass } from "@/components/pass/HorizontalEventPass";
import { RegistrationStatusCard } from "@/components/pass/RegistrationStatusCard";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type StepType = "details" | "questions";

export default function EventRSVPPageClient({
  id,
  initialEvent,
}: {
  id: string;
  initialEvent?: EventItem | null;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(() => initialEvent || getEventSync(id));
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(() => {
    const initial = initialEvent || getEventSync(id);
    return initial?.tiers?.find((t) => (t.remaining_capacity || 0) > 0) || initial?.tiers?.[0] || null;
  });
  const [isLoading, setIsLoading] = useState(() => !(initialEvent || getEventSync(id)));
  const [loadError, setLoadError] = useState("");

  // Platform settings for fees & payment gateway
  const [platformSettings, setPlatformSettings] = useState<{
    platformFeePercent: number;
    razorpayKeyId?: string;
  }>({ platformFeePercent: 4 });

  useEffect(() => {
    fetch("/api/v1/platform/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setPlatformSettings({
            platformFeePercent:
              typeof data.settings.platformFeePercent === "number"
                ? data.settings.platformFeePercent
                : 4,
            razorpayKeyId: data.settings.paymentGateways?.razorpay?.keyId || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  // Cache initialEvent to localStorage for instant subsequent synchronous reads
  useEffect(() => {
    if (initialEvent && typeof window !== "undefined") {
      try {
        localStorage.setItem(`hackways_event_${initialEvent.id}`, JSON.stringify(initialEvent));
        if (initialEvent.slug) {
          localStorage.setItem(`hackways_event_${initialEvent.slug.toLowerCase()}`, JSON.stringify(initialEvent));
        }
        if (initialEvent.tiers && initialEvent.tiers.length > 0) {
          localStorage.setItem(`hackways_tiers_${initialEvent.id}`, JSON.stringify(initialEvent.tiers));
        }
      } catch {}
    }
  }, [initialEvent]);

  // Team Registration State
  const [teamCodeParam, setTeamCodeParam] = useState<string>("");
  const [invitedTeam, setInvitedTeam] = useState<EventTeam | null>(null);
  const [regMode, setRegMode] = useState<"individual" | "create_team" | "join_team">("individual");
  const [teamName, setTeamName] = useState("");
  const [inputTeamCode, setInputTeamCode] = useState("");
  const [activeTeamResult, setActiveTeamResult] = useState<EventTeam | null>(null);

  // Form State
  const [attendeeName, setAttendeeName] = useState(user?.name || "");
  const [attendeeEmail, setAttendeeEmail] = useState(user?.email || "");
  const [attendeePhone, setAttendeePhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState(false);

  // Result & View States
  const [rsvpResult, setRsvpResult] = useState<RSVPResponse | null>(null);
  const [existingRSVP, setExistingRSVP] = useState<ExistingRSVPInfo | null>(null);
  const [forceShowForm, setForceShowForm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Stepper State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Load team from query parameter if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("team") || params.get("team_code");
    if (code) {
      setTeamCodeParam(code);
      setRegMode("join_team");
      fetchTeamByCodeAsync(id, code).then((team) => {
        if (team) {
          setInvitedTeam(team);
          const teamTierId = (team as any).tier_id;
          if (teamTierId && event?.tiers) {
            const matchTier = event.tiers.find((t) => t.id === teamTierId);
            if (matchTier) setSelectedTier(matchTier);
          }
        }
      });
    }
  }, [id, event]);

  // Sync user profile if logged in
  useEffect(() => {
    if (user?.name && !attendeeName) setAttendeeName(user.name);
    if (user?.email && !attendeeEmail) setAttendeeEmail(user.email);
  }, [user, attendeeName, attendeeEmail]);

  // Check for existing RSVP on client mount
  const refreshRSVP = () => {
    if (!event) return;
    const emailToCheck = attendeeEmail || user?.email;
    const existing = getExistingRSVP(event.id, emailToCheck, user?.userId);
    setExistingRSVP(existing);
  };

  useEffect(() => {
    if (event) refreshRSVP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, user?.email]);

  // Fetch Event Data
  const loadEvent = (showRetryError: boolean) => {
    getEvent(id)
      .then((ev) => {
        if (ev) {
          setEvent(ev);
          setLoadError("");
          if (ev.tiers && ev.tiers.length > 0) {
            const availableTier = ev.tiers.find((t) => (t.remaining_capacity || 0) > 0) || ev.tiers[0];
            setSelectedTier(availableTier);
          }
        } else if (showRetryError) {
          setLoadError("This event couldn't be loaded. Check your connection and retry.");
        }
        setIsLoading(false);
      })
      .catch(() => {
        setLoadError("This event couldn't be loaded. Check your connection and retry.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadEvent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Real-time capacity updates
  useEventSSE({
    eventId: id,
    onUpdate: (payload) => {
      if (payload.tier_id && typeof payload.payload?.remaining_capacity === "number") {
        setEvent((prev) => {
          if (!prev) return prev;
          const updatedTiers = (prev.tiers || []).map((t) =>
            t.id === payload.tier_id ? { ...t, remaining_capacity: payload.payload.remaining_capacity } : t
          );
          return { ...prev, tiers: updatedTiers };
        });
      }
    },
  });

  const activeTier = selectedTier || (event?.tiers && event.tiers.length > 0 ? event.tiers[0] : null);
  const tierPriceCents = activeTier?.price_cents || 0;
  const isPaidEvent = tierPriceCents > 0;
  const platformFeePercent = platformSettings.platformFeePercent;
  const platformFeeCents =
    isPaidEvent && platformFeePercent > 0 ? Math.round((tierPriceCents * platformFeePercent) / 100) : 0;
  const totalPayableCents = tierPriceCents + platformFeeCents;

  const hasCapacityLimit = Boolean(activeTier?.total_capacity && activeTier.total_capacity > 0);
  const remainingCapacity = activeTier?.remaining_capacity ?? 0;
  const isSoldOut = hasCapacityLimit
    ? remainingCapacity <= 0 || event?.status === "SOLD_OUT"
    : event?.status === "SOLD_OUT";

  // Question condition visibility
  const isQuestionVisible = (q: RSVPQuestion): boolean => {
    if (!q.condition) return true;
    const { ticket_tier_id, depends_on_question_id, operator, expected_value } = q.condition;
    if (ticket_tier_id && ticket_tier_id !== "ALL" && activeTier?.id && activeTier.id !== ticket_tier_id) {
      return false;
    }
    if (depends_on_question_id) {
      const parentAnswer = (answers[depends_on_question_id] || "").trim().toLowerCase();
      const targetVal = (expected_value || "").trim().toLowerCase();
      if (!operator || operator === "equals") {
        if (parentAnswer !== targetVal) return false;
      } else if (operator === "not_equals") {
        if (parentAnswer === targetVal) return false;
      } else if (operator === "contains") {
        if (!parentAnswer.includes(targetVal)) return false;
      } else if (operator === "is_answered") {
        if (!parentAnswer) return false;
      }
    }
    return true;
  };

  const visibleQuestions = (event?.custom_questions || []).filter((q) => isQuestionVisible(q));
  const hasQuestions = visibleQuestions.length > 0;

  // SECTION STEPS:
  // If event has questions: Step 1 Details -> Step 2 Questions
  // If event has no questions: 1 unified page (direct checkout/completion)
  const steps: { key: StepType; label: string }[] = hasQuestions
    ? [
        { key: "details", label: "Attendee details" },
        { key: "questions", label: "Questions" },
      ]
    : [{ key: "details", label: "Registration" }];

  const isMultiStep = steps.length > 1;
  const currentStep = steps[currentStepIndex] || steps[0];

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleMultiSelectToggle = (qId: string, opt: string) => {
    setAnswers((prev) => {
      const cur = (prev[qId] || "").split(", ").filter(Boolean);
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
      return { ...prev, [qId]: next.join(", ") };
    });
  };

  const validateStep = (stepKey: StepType): boolean => {
    setSubmitError(null);

    if (stepKey === "details") {
      if (!attendeeName.trim()) {
        setSubmitError("Please enter your full name.");
        return false;
      }
      if (!attendeeEmail.trim() || !attendeeEmail.includes("@")) {
        setSubmitError("Please enter a valid email address.");
        return false;
      }
      if (!activeTier) {
        setSubmitError("Please select a pass tier.");
        return false;
      }
      if (isSoldOut) {
        setSubmitError("This pass tier is currently sold out.");
        return false;
      }
      if (regMode === "create_team" && !teamName.trim()) {
        setSubmitError("Please enter a name for your team.");
        return false;
      }
      if (regMode === "join_team") {
        const c = invitedTeam?.code || inputTeamCode || teamCodeParam;
        if (!c.trim()) {
          setSubmitError("Please enter a team invite code.");
          return false;
        }
      }
    }

    if (stepKey === "questions") {
      for (const q of visibleQuestions) {
        if (q.required && (!answers[q.id] || !answers[q.id].trim())) {
          setSubmitError(`Please answer: "${q.label}"`);
          return false;
        }
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep.key)) return;
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setSubmitError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Registration Execution
  const executeRSVP = async (paymentId?: string) => {
    if (!event || !activeTier) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setDuplicateNotice(false);

    try {
      // 1. Team creation if applicable
      if (regMode === "create_team") {
        const team = createEventTeam(event.id, {
          name: teamName.trim(),
          leader_name: attendeeName.trim(),
          leader_email: attendeeEmail.trim().toLowerCase(),
          min_size: event.team_min_size || 2,
          max_size: event.team_max_size || 4,
          tier_id: activeTier.id,
        });
        setActiveTeamResult(team);
      }

      // 2. Team join if applicable
      if (regMode === "join_team") {
        const codeToUse = (invitedTeam?.code || inputTeamCode || teamCodeParam).trim().toUpperCase();
        joinEventTeam(event.id, codeToUse, {
          name: attendeeName.trim(),
          email: attendeeEmail.trim().toLowerCase(),
          tier_id: activeTier.id,
        });
      }

      const answerPayload: Record<string, string | string[]> = { ...answers };
      if (attendeePhone.trim()) {
        answerPayload.phone = attendeePhone.trim();
      }
      if (paymentId) {
        answerPayload.razorpay_payment_id = paymentId;
        answerPayload.payment_status = "PAID";
        answerPayload.platform_fee_cents = String(platformFeeCents);
        answerPayload.total_paid_cents = String(totalPayableCents);
      }
      if (regMode === "create_team" && teamName.trim()) {
        answerPayload.team_name = teamName.trim();
        answerPayload.team_role = "LEADER";
      } else if (regMode === "join_team") {
        const c = (invitedTeam?.code || inputTeamCode || teamCodeParam).trim().toUpperCase();
        if (c) {
          answerPayload.team_code = c;
          answerPayload.team_role = "MEMBER";
        }
      }

      const resp = await createRSVP(event.id, {
        tier_id: activeTier.id,
        user_id: user?.userId || `anon_${Date.now()}`,
        user_name: attendeeName.trim(),
        user_email: attendeeEmail.trim().toLowerCase(),
        answers: answerPayload,
      });

      // 3. For paid tickets, successful payment guarantees CONFIRMED status immediately!
      const finalStatus = paymentId ? "CONFIRMED" : resp.rsvp.status;

      // 4. Sync Order record for paid events
      if (tierPriceCents > 0) {
        const orderData = {
          id: `ord_${Date.now().toString(36)}`,
          ticketCode: (resp.rsvp as any).ticket_code || `HKW-${event.id.slice(-6).toUpperCase()}`,
          eventId: event.id,
          eventName: event.title,
          buyerName: attendeeName.trim(),
          buyerEmail: attendeeEmail.trim().toLowerCase(),
          tierName: activeTier.name,
          tierId: activeTier.id,
          amount: totalPayableCents / 100,
          status: "CONFIRMED",
          paymentMethod: paymentId ? "Razorpay" : "Direct Rail",
          transactionId: paymentId || undefined,
          createdAt: new Date().toISOString(),
        };
        try {
          await fetch("/api/v1/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
          });
        } catch {}
      }

      const confirmedResponse: RSVPResponse = {
        ...resp,
        rsvp: {
          ...resp.rsvp,
          status: finalStatus,
        },
        message: paymentId ? "Payment successful. Pass confirmed!" : resp.message,
      };

      setRsvpResult(confirmedResponse);
      setForceShowForm(false);
      refreshRSVP();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to complete registration.");
      if (err.message && err.message.toLowerCase().includes("duplicate")) {
        setDuplicateNotice(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final submission trigger (Pay or Complete)
  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep(currentStep.key)) return;
    if (!event || !activeTier) return;

    // Paid Event Razorpay Gateway Flow
    if (tierPriceCents > 0 && !isSoldOut) {
      setIsSubmitting(true);
      try {
        await loadRazorpayScript();
        let rzpKey = platformSettings.razorpayKeyId || "";
        if (!rzpKey) {
          try {
            const sRes = await fetch("/api/v1/platform/settings");
            if (sRes.ok) {
              const sData = await sRes.json();
              rzpKey = sData?.settings?.paymentGateways?.razorpay?.keyId || "";
            }
          } catch {}
        }

        if (!rzpKey) {
          setSubmitError("Payment gateway is not currently configured for this event. Please contact the organizer.");
          setIsSubmitting(false);
          return;
        }

        const options = {
          key: rzpKey,
          amount: totalPayableCents, // Amount in paise (base price + platform fee)
          currency: "INR",
          name: "Hackways",
          description: `${event.title} - ${activeTier.name}`,
          handler: async function (response: any) {
            if (response && response.razorpay_payment_id) {
              await executeRSVP(response.razorpay_payment_id);
            } else {
              setSubmitError("Payment was not completed. Please try again.");
              setIsSubmitting(false);
            }
          },
          prefill: {
            name: attendeeName.trim(),
            email: attendeeEmail.trim().toLowerCase(),
            contact: attendeePhone.trim(),
          },
          theme: {
            color: "#09090b",
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
            },
          },
        };

        const razorpayInstance = new (window as any).Razorpay(options);
        razorpayInstance.on("payment.failed", function (response: any) {
          setSubmitError(response.error?.description || "Payment failed. Please try again.");
          setIsSubmitting(false);
        });
        razorpayInstance.open();
        return;
      } catch (err: any) {
        setSubmitError(err.message || "Failed to initialize payment gateway.");
        setIsSubmitting(false);
        return;
      }
    }

    // Free Event Flow
    await executeRSVP();
  };

  const handleCancelRSVP = async (rsvpId?: string) => {
    const targetId =
      rsvpId ||
      activeRSVP?.attendee?.id ||
      activeRSVP?.ticket?.id ||
      (activeRSVP as any)?.id ||
      rsvpResult?.rsvp.id ||
      "";
    if (!targetId) return;
    if (!confirm("Are you sure you want to request cancellation for this pass?")) return;
    const ownerEmail = activeRSVP?.attendee?.email || rsvpResult?.rsvp.user_email || attendeeEmail.trim().toLowerCase();
    setIsCancelling(true);
    try {
      await cancelRSVP(targetId, ownerEmail);
      setExistingRSVP(null);
      setRsvpResult(null);
      setForceShowForm(true);
      refreshRSVP();
    } catch (err: any) {
      alert(err?.message || "Failed to process cancellation request. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Active RSVP pass resolution
  const activeRSVP: ExistingRSVPInfo | null =
    existingRSVP ||
    (rsvpResult
      ? {
          status: rsvpResult.rsvp.status,
          ticket: undefined,
          attendee: {
            id: rsvpResult.rsvp.id,
            eventId: id,
            name: rsvpResult.rsvp.user_name || attendeeName,
            email: rsvpResult.rsvp.user_email || attendeeEmail,
            tierName: activeTier?.name || "General Admission",
            tierId: rsvpResult.rsvp.tier_id,
            ticketCode: (rsvpResult.rsvp as any).ticket_code || `HKW-${id.slice(-6).toUpperCase()}`,
            priceFormatted: tierPriceCents > 0 ? `₹${(totalPayableCents / 100).toFixed(2)}` : "FREE",
            status: rsvpResult.rsvp.status as any,
            registeredAt: new Date().toISOString(),
          },
          sequenceNo: 1,
        }
      : null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col font-body">
        <AppHeader theme="light" transparent={false} />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-zinc-400" size={22} />
            <p className="text-xs font-medium text-zinc-500">Loading registration...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col font-body text-zinc-900">
        <AppHeader theme="light" transparent={false} />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md p-8 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-500">
              <Ticket size={22} />
            </div>
            <h1 className="text-xl font-bold font-heading text-zinc-950">
              {loadError ? "Event couldn't be loaded" : "Event not found"}
            </h1>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {loadError || "We couldn't load details for this event. Please verify the link or explore available events."}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              {loadError && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    setLoadError("");
                    loadEvent(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition"
                >
                  Retry
                </button>
              )}
              <Link
                href="/home"
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-semibold hover:bg-zinc-50 transition"
              >
                Browse events
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-body text-zinc-900">
      <AppHeader theme="light" transparent={false} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Pass View or Form View */}
        {activeRSVP && activeRSVP.status !== "CANCELLED" && !forceShowForm ? (
          activeRSVP.status === "CONFIRMED" || activeRSVP.status === "CHECKED_IN" ? (
            <HorizontalEventPass
              event={event}
              ticket={activeRSVP.ticket}
              attendee={activeRSVP.attendee}
              sequenceNo={activeRSVP.sequenceNo || 1}
              onCancelRSVP={() => handleCancelRSVP()}
              isCancelling={isCancelling}
              onRegisterAnother={() => setForceShowForm(true)}
            />
          ) : (
            <RegistrationStatusCard
              event={event}
              status={activeRSVP.status as any}
              ticket={activeRSVP.ticket}
              attendee={activeRSVP.attendee}
              team={activeTeamResult || invitedTeam}
              onRefresh={refreshRSVP}
              onCancelRSVP={() => handleCancelRSVP()}
              isCancelling={isCancelling}
            />
          )
        ) : (
          <>
            {activeRSVP && activeRSVP.status !== "CANCELLED" && forceShowForm && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-medium">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>You have an existing pass registered for this event.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForceShowForm(false)}
                  className="font-semibold underline text-emerald-800 hover:text-emerald-950 self-start sm:self-auto cursor-pointer"
                >
                  View your pass
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column: Event Context & Clean Summary */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                {/* Back to event link */}
                <Link
                  href={`/events/${id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 transition"
                >
                  <ArrowLeft size={13} />
                  <span>Back to {event.title}</span>
                </Link>

                {/* Event Poster (16:9 Banner or 1:1 Square Banner) */}
                {(event.banner_url || event.square_banner_url) ? (
                  <div className="aspect-16/9 w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-xs">
                    <img
                      src={event.banner_url || event.square_banner_url}
                      alt={event.title}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="aspect-16/9 w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Hackways Event</span>
                      <Ticket size={16} className="text-zinc-500" />
                    </div>
                    <div>
                      <div className="text-white font-bold font-heading text-lg line-clamp-2 leading-tight">
                        {event.title}
                      </div>
                      <div className="text-zinc-400 text-xs mt-1">
                        {event.time_display || event.start_time || "Scheduled Event"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Event Title & Metadata */}
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-3xl font-bold font-heading text-zinc-950 tracking-tight leading-tight">
                    {event.title}
                  </h1>

                  <div className="space-y-2 text-xs text-zinc-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-zinc-400 shrink-0" />
                      <span>{event.time_display || event.start_time || "Date to be announced"}</span>
                    </div>

                    {(event.location || (event as any).is_virtual) && (
                      <div className="flex items-center gap-2">
                        {(event as any).is_virtual ? (
                          <Video size={14} className="text-zinc-400 shrink-0" />
                        ) : (
                          <MapPin size={14} className="text-zinc-400 shrink-0" />
                        )}
                        <span>
                          {(event as any).is_virtual
                            ? "Online Virtual Event"
                            : [event.location, event.city].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}

                    {(event.channel_name || (event.hosts && event.hosts.length > 0)) && (
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-zinc-400 shrink-0" />
                        <span>Hosted by {event.channel_name || event.hosts?.[0]}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clean Pass Summary Card */}
                <div className="p-5 rounded-2xl border border-zinc-200/80 bg-white space-y-3 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-heading">
                    Pass Summary
                  </div>

                  <div className="flex items-baseline justify-between text-sm">
                    <div>
                      <div className="font-semibold text-zinc-900">{activeTier?.name || "General Admission"}</div>
                      <div className="text-xs text-zinc-500">1x Admission</div>
                    </div>
                    {tierPriceCents > 0 && (
                      <div className="font-mono font-semibold text-zinc-950">
                        ₹{(tierPriceCents / 100).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {isPaidEvent && platformFeeCents > 0 && (
                    <div className="flex items-baseline justify-between text-xs text-zinc-500 pt-1">
                      <span>Platform fee ({platformFeePercent}%)</span>
                      <span className="font-mono">₹{(platformFeeCents / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {isPaidEvent && (
                    <div className="flex items-baseline justify-between text-sm font-bold pt-3 border-t border-zinc-100 text-zinc-950">
                      <span>Total</span>
                      <span className="font-mono text-base text-zinc-950">
                        ₹{(totalPayableCents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {isPaidEvent && (
                    <div className="text-[11px] text-zinc-400 pt-1">
                      Secured checkout via Razorpay
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Clean Form & Step Transition */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
                  {/* Subtle Hairline Progress Indicator (Multi-step only) */}
                  {isMultiStep && (
                    <div className="px-6 sm:px-8 pt-6 pb-2">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-zinc-900">{currentStep.label}</span>
                        <span className="font-mono text-[11px] text-zinc-400">
                          Step {currentStepIndex + 1} of {steps.length}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-950 transition-all duration-300 ease-out rounded-full"
                          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Form Container */}
                  <form onSubmit={(e) => e.preventDefault()} className="p-6 sm:p-8 space-y-6">
                    {/* Error Notice */}
                    {submitError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                        <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {duplicateNotice && <DuplicateRSVPNotice email={attendeeEmail} />}

                    {/* SECTION 1: Attendee Details */}
                    {currentStep.key === "details" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-lg font-bold font-heading text-zinc-950">Attendee Details</h2>
                          <p className="text-xs text-zinc-500 mt-1">
                            Your pass will be sent to this email address.
                          </p>
                        </div>

                        {/* Individual vs Team Registration (if enabled) */}
                        {event.team_registration_enabled && !teamCodeParam && (
                          <div className="p-1 rounded-xl bg-zinc-100 flex items-center gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setRegMode("individual")}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                                regMode === "individual"
                                  ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                                  : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              Individual
                            </button>
                            <button
                              type="button"
                              onClick={() => setRegMode("create_team")}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                                regMode === "create_team"
                                  ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                                  : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              Create a team
                            </button>
                            <button
                              type="button"
                              onClick={() => setRegMode("join_team")}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                                regMode === "join_team"
                                  ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                                  : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              Join a team
                            </button>
                          </div>
                        )}

                        {/* Team Name Input */}
                        {regMode === "create_team" && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-900">
                              Team Name
                            </label>
                            <input
                              type="text"
                              value={teamName}
                              onChange={(e) => setTeamName(e.target.value)}
                              placeholder="Team name"
                              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 bg-white"
                            />
                          </div>
                        )}

                        {/* Team Code Input */}
                        {regMode === "join_team" && !invitedTeam && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-900">
                              Team Invite Code
                            </label>
                            <input
                              type="text"
                              value={inputTeamCode}
                              onChange={(e) => setInputTeamCode(e.target.value.toUpperCase())}
                              placeholder="Invite code"
                              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 bg-white uppercase"
                            />
                          </div>
                        )}

                        {/* Contact Inputs */}
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-900">
                              Full Name
                            </label>
                            <input
                              type="text"
                              required
                              value={attendeeName}
                              onChange={(e) => setAttendeeName(e.target.value)}
                              placeholder="Full name"
                              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 bg-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-900">
                              Email Address
                            </label>
                            <input
                              type="email"
                              required
                              value={attendeeEmail}
                              onChange={(e) => setAttendeeEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 bg-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-900">
                              Phone Number <span className="text-zinc-400 font-normal">(optional)</span>
                            </label>
                            <input
                              type="tel"
                              value={attendeePhone}
                              onChange={(e) => setAttendeePhone(e.target.value)}
                              placeholder="Phone number"
                              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 bg-white"
                            />
                          </div>
                        </div>

                        {/* Pass Tiers Selection (if event has multiple tiers) */}
                        {event.tiers && event.tiers.length > 1 && (
                          <div className="space-y-2 pt-2">
                            <label className="block text-xs font-semibold text-zinc-900">
                              Select Pass
                            </label>
                            <div className="space-y-2">
                              {event.tiers.map((tier) => {
                                const isSelected = activeTier?.id === tier.id;
                                const tierLimited = Boolean(tier.total_capacity && tier.total_capacity > 0);
                                const tierSoldOut = tierLimited && (tier.remaining_capacity || 0) <= 0;
                                return (
                                  <div
                                    key={tier.id}
                                    onClick={() => !tierSoldOut && setSelectedTier(tier)}
                                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                                      isSelected
                                        ? "border-zinc-950 bg-zinc-50/50"
                                        : "border-zinc-200 bg-white hover:border-zinc-300"
                                    } ${tierSoldOut ? "opacity-50 cursor-not-allowed" : ""}`}
                                  >
                                    <div>
                                      <div className="text-xs font-semibold text-zinc-900">{tier.name}</div>
                                      {tierLimited && (
                                        <div className="text-[11px] text-zinc-400 mt-0.5">
                                          {tierSoldOut ? "Sold out" : `${tier.remaining_capacity} spots left`}
                                        </div>
                                      )}
                                    </div>
                                    {tier.price_cents && tier.price_cents > 0 ? (
                                      <div className="font-mono text-xs font-semibold text-zinc-950">
                                        ₹{(tier.price_cents / 100).toFixed(2)}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTION 2: Custom Questionnaire */}
                    {currentStep.key === "questions" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-lg font-bold font-heading text-zinc-950">Questions</h2>
                          <p className="text-xs text-zinc-500 mt-1">
                            Please answer the questions requested by the host.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {visibleQuestions.map((q) => (
                            <div key={q.id} className="space-y-1.5">
                              <label className="block text-xs font-semibold text-zinc-900">
                                {q.label} {q.required && <span className="text-rose-500">*</span>}
                              </label>

                              {(q.type === "text" ||
                                q.type === "email" ||
                                q.type === "phone" ||
                                q.type === "number" ||
                                q.type === "url" ||
                                (q.type as any) === "TEXT") && (
                                <input
                                  type={
                                    q.type === "number"
                                      ? "number"
                                      : q.type === "email"
                                      ? "email"
                                      : q.type === "phone"
                                      ? "tel"
                                      : "text"
                                  }
                                  value={answers[q.id] || ""}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  placeholder={q.placeholder || "Your answer"}
                                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 bg-white"
                                />
                              )}

                              {(q.type === "textarea" || (q.type as any) === "TEXTAREA") && (
                                <textarea
                                  rows={3}
                                  value={answers[q.id] || ""}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  placeholder={q.placeholder || "Your answer"}
                                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 bg-white"
                                />
                              )}

                              {(q.type === "select" || (q.type as any) === "SELECT") && q.options && (
                                <select
                                  value={answers[q.id] || ""}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 bg-white"
                                >
                                  <option value="">Select an option</option>
                                  {q.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {(q.type === "radio" || (q.type as any) === "RADIO") && q.options && (
                                <div className="space-y-2">
                                  {q.options.map((opt) => (
                                    <label key={opt} className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={q.id}
                                        value={opt}
                                        checked={answers[q.id] === opt}
                                        onChange={() => handleAnswerChange(q.id, opt)}
                                        className="text-zinc-950 focus:ring-zinc-950"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {(q.type === "checkbox" || q.type === "multiselect" || (q.type as any) === "CHECKBOX") &&
                                q.options && (
                                  <div className="space-y-2">
                                    {q.options.map((opt) => {
                                      const isChecked = (answers[q.id] || "").split(", ").includes(opt);
                                      return (
                                        <label key={opt} className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleMultiSelectToggle(q.id, opt)}
                                            className="rounded text-zinc-950 focus:ring-zinc-950"
                                          />
                                          <span>{opt}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                    {/* Step Action Buttons */}
                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
                      {isMultiStep && currentStepIndex > 0 ? (
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          disabled={isSubmitting}
                          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                        >
                          Back
                        </button>
                      ) : (
                        <div />
                      )}

                      {isMultiStep && currentStepIndex < steps.length - 1 ? (
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="px-6 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
                        >
                          Continue
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleFinalSubmit()}
                          disabled={isSubmitting || isSoldOut}
                          className="px-6 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmitting
                            ? "Processing..."
                            : isPaidEvent
                            ? `Pay ₹${(totalPayableCents / 100).toFixed(2)}`
                            : "Complete registration"}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
