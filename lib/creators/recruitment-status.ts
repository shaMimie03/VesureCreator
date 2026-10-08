import type { RecruitmentStatus } from "@/types/db";

export function initialRecruitmentStatus(
  mcnStatus: string,
  creatorStatus: string,
): RecruitmentStatus {
  if (mcnStatus === "MCN Signed" || creatorStatus === "Rejected") return "Rejected";
  if (creatorStatus === "Replied") return "Replied";
  if (creatorStatus === "Agreed") return "Interested";
  if (creatorStatus === "Not Contacted" || creatorStatus === "Cold Lead") return "New";
  return "Already Contacted";
}
