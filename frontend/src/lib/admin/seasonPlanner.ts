// Shared types and label maps for the season planner dashboard (English-only UI).

export type EventType =
  | "afterwork"
  | "weekend_casual"
  | "weekend_challenge"
  | "special_ride"
  | "workshop"
  | "eyas_program";

export type SlotStatus =
  | "unclaimed"
  | "claimed"
  | "in_planning"
  | "ready"
  | "published"
  | "cancelled";

export type SlotReadiness =
  | "idea"
  | "route_drafted"
  | "leader_confirmed"
  | "logistics_done"
  | "ready_to_publish";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  afterwork: "Afterwork",
  weekend_casual: "Weekend Casual",
  weekend_challenge: "Weekend Challenge",
  special_ride: "Special Ride",
  workshop: "Workshop",
  eyas_program: "EYAS · 雏鹰计划",
};

export const STATUS_LABEL: Record<SlotStatus, string> = {
  unclaimed: "Unclaimed",
  claimed: "Claimed",
  in_planning: "Planning",
  ready: "Ready",
  published: "Published",
  cancelled: "Cancelled",
};

export const READINESS_LABEL: Record<SlotReadiness, string> = {
  idea: "Idea",
  route_drafted: "Route Drafted",
  leader_confirmed: "Leader Confirmed",
  logistics_done: "Logistics Done",
  ready_to_publish: "Ready to Publish",
};

export interface PlanSlot {
  id: number;
  season: string;
  iso_year: number;
  iso_week: number;
  planned_date: string;
  weekday: number;
  event_type: EventType;
  title: string | null;
  location: string | null;
  distance_km: number | null;
  notes: string | null;
  claimed_by: string | null;
  claimed_email: string | null;
  status: SlotStatus;
  readiness: SlotReadiness;
  auto_generated: boolean;
  locked: boolean;
  published_event_id: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeekGroup {
  iso_year: number;
  iso_week: number;
  label: string;
  date_range: string;
  monday: string;
  sunday: string;
  slots: PlanSlot[];
}

export interface GroupedSlotsResponse {
  weeks: WeekGroup[];
}
