export type ProductLink = {
  label: string;
  url: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  links: ProductLink[];
  commission_rate: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Template = {
  id: string;
  name: string;
  type: string;
  category: string;
  channel: string;
  language: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreatorStatus =
  | "Not Contacted"
  | "Invited"
  | "Follow-up 1 Sent"
  | "Follow-up 2 Sent"
  | "Replied"
  | "Agreed"
  | "TAP Link Sent"
  | "Sample Sent"
  | "Sample Delivered"
  | "Content Posted"
  | "Active"
  | "Rejected"
  | "Cold Lead";

export type McnStatus = "Checking MCN" | "MCN Signed" | "Not MCN Signed" | "MCN Unknown";
export type EligibilityStatus = "Pending" | "Eligible" | "Not Eligible";
export type RecruitmentStatus =
  | "New"
  | "Already Contacted"
  | "Invitation Sent"
  | "Replied"
  | "Interested"
  | "Not Interested"
  | "Joined"
  | "Follow-up Required"
  | "No Response"
  | "Rejected";

export type Creator = {
  id: string;
  creator_name: string;
  tiktok_handle: string;
  profile_url: string | null;
  whatsapp_number: string;
  email: string;
  category: string;
  follower_count: number;
  following_count: number | null;
  engagement_rate: number;
  engagement_details: string | null;
  content_type: string | null;
  recent_activity: string | null;
  source: string;
  status: CreatorStatus;
  mcn_status: McnStatus;
  mcn_company: string | null;
  mcn_evidence: string | null;
  mcn_checked_at: string | null;
  eligibility_status: EligibilityStatus;
  eligibility_score: number | null;
  eligibility_reason: string | null;
  recruitment_status: RecruitmentStatus;
  discovered_at: string;
  product_id: string;
  pic: string;
  notes: string;
  last_contact_at: string;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  creator_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string;
  created_at: string;
};

export type ContactLog = {
  id: string;
  creator_id: string;
  channel: string;
  template_id: string | null;
  message_body: string;
  sent_at: string | null;
  status?: "pending_send" | "sent";
  replied: boolean;
  replied_at: string | null;
  reply_body: string | null;
};

export type AppSettings = {
  brand: {
    enterprise_name: string;
    mcn_name: string;
  };
  commission: {
    default_rate: string;
  };
  follow_up_days: {
    first: number;
    second: number;
    sample_reminder_1: number;
    sample_reminder_2: number;
  };
};
