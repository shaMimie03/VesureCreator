import { handleScheduledReminder } from "../_shared/scheduled-reminders.ts";

Deno.serve((request) => handleScheduledReminder(request, "sample_reminder_day_7"));
