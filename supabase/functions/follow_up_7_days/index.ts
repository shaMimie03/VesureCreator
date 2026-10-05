import { handleScheduledReminder } from "../_shared/scheduled-reminders.ts";

Deno.serve((request) => handleScheduledReminder(request, "follow_up_7_days"));
