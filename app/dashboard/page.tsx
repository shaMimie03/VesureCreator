import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data";
import { toMytDate } from "@/lib/utils";

const chartColors = ["#7c3aed", "#8b5cf6", "#c4b5fd", "#fbbf24", "#f97316", "#94a3b8"];

export default async function DashboardPage() {
  const {
    totalCreators,
    invitedCount,
    repliedCount,
    activeCount,
    dueToday,
    activity,
    settings,
    statusBreakdown,
    categoryBreakdown,
  } = await getDashboardData();
  const maxStatusValue = Math.max(1, ...statusBreakdown.map((status) => status.value));

  const statCards = [
    { label: "Total Creators", value: totalCreators, tone: "violet" },
    { label: "Invited", value: invitedCount, tone: "blue" },
    { label: "Replied", value: repliedCount, tone: "green" },
    { label: "Active", value: activeCount, tone: "amber" },
  ];
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Overview</p>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-500">Export report</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{card.label}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Live</span>
            </div>
            <div className="mt-5 text-3xl font-bold text-slate-900">{card.value}</div>
            <div className="mt-2 text-xs text-emerald-600">+12.4% this month</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Status breakdown</h2>
            <Badge className="bg-violet-50 text-violet-700">7 day snapshot</Badge>
          </div>
          <div className="space-y-4">
            {statusBreakdown.map((entry) => (
              <div key={entry.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{entry.name}</span>
                  <span className="font-medium text-slate-800">{entry.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${(entry.value / maxStatusValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Categories</h2>
            <Badge className="bg-emerald-50 text-emerald-700">By creator</Badge>
          </div>
          <div className="space-y-4">
            {categoryBreakdown.map((entry, index) => (
              <div key={entry.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{entry.name}</span>
                  <span className="font-medium text-slate-800">{entry.value}%</span>
                </div>
                <div className="flex h-9 items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${entry.value}%`, backgroundColor: chartColors[index % chartColors.length] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Follow-ups due today</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Contact</TableHead>
                </TableRow>
              </thead>
              <tbody>
                {dueToday.map((creator) => (
                  <TableRow key={creator.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{creator.creator_name}</div>
                      <div className="text-xs text-slate-500">{creator.tiktok_handle}</div>
                    </TableCell>
                    <TableCell>{creator.category}</TableCell>
                    <TableCell>
                      <Badge className="bg-amber-50 text-amber-700">{creator.status}</Badge>
                    </TableCell>
                    <TableCell>{toMytDate(creator.last_contact_at)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Recent activity</h2>
          </div>
          <div className="space-y-4">
            {activity.map((entry) => (
              <div key={entry.id} className="border-l-2 border-violet-200 pl-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-800">{entry.action}</p>
                  <span className="text-xs text-slate-500">{toMytDate(entry.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600">
                  {entry.old_value ?? "-"} → {entry.new_value ?? "-"} · {entry.performed_by}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live settings</h2>
          <Badge className="bg-slate-100 text-slate-700">{settings.brand.enterprise_name}</Badge>
        </div>
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">Default commission: {settings.commission.default_rate}</div>
          <div className="rounded-lg bg-slate-50 p-3">First follow-up: {settings.follow_up_days.first}d</div>
          <div className="rounded-lg bg-slate-50 p-3">Second follow-up: {settings.follow_up_days.second}d</div>
        </div>
      </div>
    </div>
  );
}
