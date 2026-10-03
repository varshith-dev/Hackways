export type ConsoleRole =
  | "organizer"
  | "team"
  | "event_manager"
  | "marketing_manager"
  | "finance_manager"
  | "checkin_manager"
  | "volunteer_manager"
  | "super_admin"
  | "venue_host";

export interface RoleDefinition {
  id: ConsoleRole;
  title: string;
  badge: string;
  category: "organizer" | "team" | "platform" | "venue";
  description: string;
  allowedPaths: string[];
}

export interface AttendeeRecord {
  id: string;
  name: string;
  email: string;
  tierName: string;
  tierId: string;
  ticketCode: string;
  priceFormatted: string;
  status: "CONFIRMED" | "CHECKED_IN" | "REFUNDED" | "WAITLIST";
  checkedInAt?: string;
  checkedInBy?: string;
  entrance?: string;
  isVip?: boolean;
  isSpeaker?: boolean;
  isStaff?: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  usageCount: number;
  usageLimit: number;
  status: "ACTIVE" | "EXPIRED" | "PAUSED";
  campaignName: string;
}

export interface SessionScheduleItem {
  id: string;
  title: string;
  speaker: string;
  room: string;
  startTime: string;
  endTime: string;
  capacityPercentage: number;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
}

export interface VenueRoom {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  percentage: number;
  status: "NORMAL" | "HIGH" | "CRITICAL";
}

export interface PlatformEventApproval {
  id: string;
  title: string;
  organizerName: string;
  organizerEmail: string;
  expectedAttendees: number;
  submittedAt: string;
  status: "PENDING" | "APPROVED" | "FLAGGED";
  category: string;
}

export interface OrganizerKYC {
  id: string;
  organizationName: string;
  contactPerson: string;
  taxId: string;
  bankAccountLast4: string;
  verificationStatus: "VERIFIED" | "IN_REVIEW" | "REJECTED";
  payoutHold: boolean;
}

export interface FinancialTransaction {
  id: string;
  timestamp: string;
  eventName: string;
  type: "TICKET_SALE" | "REFUND" | "PAYOUT" | "PLATFORM_FEE";
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status: "SETTLED" | "PROCESSING" | "PENDING";
  referenceId: string;
}
