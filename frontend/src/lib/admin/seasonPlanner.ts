// Shared types and Chinese label maps for the season planner dashboard.
// Chinese UI is hardcoded — do NOT import from i18n.ts.

export type EventType =
  | "after_work_south"
  | "after_work_north"
  | "weekend_casual"
  | "weekend_challenge"
  | "special_event"
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
  after_work_south: "周三晚骑·南线",
  after_work_north: "周四晚骑·北线",
  weekend_casual: "周末休闲骑",
  weekend_challenge: "周末挑战赛",
  special_event: "特别活动",
  eyas_program: "雏鹰计划",
};

export const STATUS_LABEL: Record<SlotStatus, string> = {
  unclaimed: "待认领",
  claimed: "已认领",
  in_planning: "策划中",
  ready: "已就绪",
  published: "已发布",
  cancelled: "已取消",
};

export const READINESS_LABEL: Record<SlotReadiness, string> = {
  idea: "想法",
  route_drafted: "路线初稿",
  leader_confirmed: "队长确认",
  logistics_done: "后勤完成",
  ready_to_publish: "可发布",
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
  slots: PlanSlot[];
}

export interface GroupedSlotsResponse {
  weeks: WeekGroup[];
}
