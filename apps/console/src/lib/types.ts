export type EventStatus = "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "CANCELLED" | "DELETED";
export type RSVPStatus = "CONFIRMED" | "WAITLIST" | "PENDING_APPROVAL" | "PENDING_CONFIRMATION" | "CANCELLED" | "BLOCKED" | "CHECKED_IN" | "REFUNDED";
export type TicketApprovalMode = "AUTO_APPROVE" | "REQUIRES_APPROVAL" | "OVERFLOW_WAITLIST";

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  role: "organizer" | "attendee" | "admin";
}

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  total_capacity: number;
  remaining_capacity: number;
  price_cents?: number;
  approval_mode?: TicketApprovalMode;
  waitlist_capacity?: number;
}

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "phone"
  | "email"
  | "number"
  | "url"
  | "file"
  | "date";

export interface QuestionCondition {
  depends_on_question_id?: string;
  operator?: "equals" | "not_equals" | "contains" | "is_answered";
  expected_value?: string;
  ticket_tier_id?: string;
}

export interface RSVPQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  condition?: QuestionCondition;
}

export type PartnerStyle = "single_badge" | "bar" | "cards" | "inline";

export type ChannelRole = "owner" | "admin" | "host";
export type EventVisibility = "PUBLIC" | "PRIVATE";

export interface ChannelMember {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: ChannelRole;
  added_at: string;
  assigned_event_ids?: string[];
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner_id: string;
  owner_name: string;
  avatar_url?: string;
  banner_url?: string;
  follower_count: number;
  verified: boolean;
  visibility?: EventVisibility;
  is_private?: boolean;
  created_at: string;
  members: ChannelMember[];
  social_links?: {
    website?: string;
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
}

export interface EventScheduleItem {
  id: string;
  time: string;
  title: string;
  description?: string;
}

export interface EventFaq {
  id: string;
  question: string;
  answer: string;
}

export type EventPageTheme = "auto" | "light" | "dark" | "light-ambient" | "dark-ambient" | "obsidian" | "sand";

export interface EventItem {
  id: string;
  slug?: string;
  title: string;
  description: string;
  organizer_id: string;
  organizer_username?: string;
  organizer_type?: "USER" | "COMMUNITY";
  channel_id?: string;
  channel_name?: string;
  channel_slug?: string;
  channel_avatar?: string;
  channel_is_private?: boolean;
  visibility?: EventVisibility;
  status: EventStatus;
  rsvp_deadline?: string;
  total_capacity: number;
  created_at: string;
  tiers: TicketTier[];
  banner_url?: string; // 16:9 Landscape banner (Hero, Featured, Header)
  square_banner_url?: string; // 1:1 Square banner (Timeline poster, Card, Mobile)
  location?: string;
  city?: string;
  category?: string;
  start_time?: string;
  time_display?: string;
  hosts?: string[];
  host_avatars?: string[];
  host_users?: Array<{
    user_id: string;
    name: string;
    email: string;
    avatar_url?: string;
    role: string;
  }>;
  attendee_count?: number;
  partners?: string[];
  partner_label?: string;
  partner_style?: PartnerStyle;
  custom_questions?: RSVPQuestion[];
  deleted_by_organizer?: boolean;
  deleted_at?: string;
  deletion_reason?: string;
  // Media Assets Gallery
  media_assets?: MediaAsset[];
  // Team Registration & Limit Range
  team_registration_enabled?: boolean;
  team_min_size?: number;
  team_max_size?: number;
  // Organizer-authored page content (set from the console)
  page_theme?: EventPageTheme;
  end_time?: string;
  schedule?: EventScheduleItem[];
  faqs?: EventFaq[];
  contact_email?: string;
  contact_phone?: string;
  staff_members?: EventStaffMember[];
}

export interface EventStaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  gate: string;
  status: "ACTIVE" | "OFF_DUTY" | "INVITED" | "SUSPENDED";
  added_at: string;
  is_owner?: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  uploaded_at: string;
  size?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "LEADER" | "MEMBER";
  joined_at: string;
  ticket_tier_id?: string;
}

export interface EventTeam {
  id: string;
  event_id: string;
  name: string;
  code: string;
  leader_name: string;
  leader_email: string;
  min_size: number;
  max_size: number;
  members: TeamMember[];
  created_at: string;
  status: "OPEN" | "FULL" | "LOCKED";
}

export interface RSVP {
  id: string;
  event_id: string;
  tier_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: RSVPStatus;
  answers?: Record<string, string | string[]>;
  idempotency_key?: string;
  created_at: string;
}

export interface CapacitySnapshot {
  event_id: string;
  tier_id: string;
  total_capacity: number;
  remaining_capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  is_sold_out: boolean;
}

export interface RSVPResponse {
  rsvp: RSVP;
  waitlist_position?: number;
  message: string;
  cached?: boolean;
}

export interface ShortLinkTracker {
  id: string;
  code: string;
  title: string;
  destination_url: string;
  scope: "PLATFORM" | "EVENT";
  event_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  clicks: number;
  unique_visitors: number;
  created_at: string;
}

export interface DeviceTelemetryEvent {
  id: string;
  visitor_id: string;
  session_id: string;
  pathname: string;
  referrer: string;
  timestamp: string;
  device: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  os: string;
  screen_resolution: string;
  viewport_size: string;
  timezone: string;
  language: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  short_link_code?: string;
}
