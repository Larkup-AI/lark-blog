"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Play,
  Pencil,
  Trash2,
  Loader2,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CRON_PRESETS, describeCron, isValidCron } from "@/lib/cron/schedule";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  setScheduleEnabled,
  runScheduleNow,
  type ScheduleInput,
} from "@/app/actions/schedules";

type Schedule = {
  id: string;
  name: string;
  cron: string;
  timezone: string;
  prompt: string;
  topics: string[];
  model: string | null;
  length: string;
  category: string | null;
  autoPublish: boolean;
  enabled: boolean;
  lastRunAt: string | Date | null;
  nextRunAt: string | Date | null;
  preview: string;
};

type Job = {
  id: string;
  status: string;
  log: string | null;
  postId: number | null;
  createdAt: string | Date;
};

const LENGTHS = ["short", "medium", "long"];

function emptyForm(): ScheduleInput {
  return {
    name: "",
    cron: "0 9 * * 1",
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    prompt: "",
    topics: [],
    model: null,
    length: "medium",
    category: null,
    autoPublish: false,
    enabled: true,
  };
}

export function SchedulesManager({
  initialSchedules,
  initialJobs,
  canAutoPublish,
  limitReached,
}: {
  initialSchedules: Schedule[];
  initialJobs: Job[];
  canAutoPublish: boolean;
  limitReached: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleInput>(emptyForm());
  const [topicsText, setTopicsText] = useState("");
  const [customCron, setCustomCron] = useState(false);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setTopicsText("");
    setCustomCron(false);
    setOpen(true);
  }

  function openEdit(s: Schedule) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      cron: s.cron,
      timezone: s.timezone,
      prompt: s.prompt,
      topics: s.topics ?? [],
      model: s.model,
      length: s.length,
      category: s.category,
      autoPublish: s.autoPublish,
      enabled: s.enabled,
    });
    setTopicsText((s.topics ?? []).join("\n"));
    setCustomCron(!CRON_PRESETS.some((p) => p.cron === s.cron));
    setOpen(true);
  }

  function submit() {
    const topics = topicsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload: ScheduleInput = { ...form, topics };

    if (!payload.name.trim()) return toast.error("Give the schedule a name.");
    if (!payload.prompt.trim()) return toast.error("Add a prompt / brief.");
    if (!isValidCron(payload.cron))
      return toast.error("That cron expression is not valid.");

    startTransition(async () => {
      const res = editingId
        ? await updateSchedule(editingId, payload)
        : await createSchedule(payload);
      if ((res as any).error) {
        toast.error((res as any).error);
        return;
      }
      toast.success(editingId ? "Schedule updated." : "Schedule created.");
      setOpen(false);
      router.refresh();
    });
  }

  function toggle(s: Schedule) {
    startTransition(async () => {
      const res = await setScheduleEnabled(s.id, !s.enabled);
      if ((res as any).error) toast.error((res as any).error);
      else router.refresh();
    });
  }

  function runNow(s: Schedule) {
    toast.info(`Generating a post for "${s.name}"…`);
    startTransition(async () => {
      const res = await runScheduleNow(s.id);
      if ((res as any).error) toast.error((res as any).error);
      else {
        toast.success("Draft generated. Check your posts.");
        router.refresh();
      }
    });
  }

  function remove(s: Schedule) {
    if (!confirm(`Delete schedule "${s.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteSchedule(s.id);
      if ((res as any).error) toast.error((res as any).error);
      else {
        toast.success("Schedule deleted.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {initialSchedules.length} schedule
          {initialSchedules.length === 1 ? "" : "s"}
        </p>
        <Button onClick={openNew} disabled={limitReached} size="sm">
          <Plus className="mr-2 h-4 w-4" /> New schedule
        </Button>
      </div>

      {limitReached && (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          You've reached the free plan's single-schedule limit. Enterprise
          unlocks multiple schedules and auto-publish.
        </div>
      )}

      {initialSchedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No schedules yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one to have the AI draft posts automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialSchedules.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  {s.autoPublish ? (
                    <Badge variant="default">auto-publish</Badge>
                  ) : (
                    <Badge variant="secondary">draft</Badge>
                  )}
                  {!s.enabled && <Badge variant="outline">paused</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.preview || describeCron(s.cron, s.timezone)}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {s.prompt}
                </p>
                {s.nextRunAt && s.enabled && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Next run: {new Date(s.nextRunAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={s.enabled}
                  onCheckedChange={() => toggle(s)}
                  disabled={pending}
                  aria-label="Enabled"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => runNow(s)}
                  disabled={pending}
                  title="Run now"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(s)}
                  disabled={pending}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(s)}
                  disabled={pending}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent jobs */}
      <div>
        <h2 className="mb-3 text-sm font-medium">Recent runs</h2>
        {initialJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {initialJobs.map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {j.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : j.status === "error" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate text-muted-foreground">
                    {j.log || j.status}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {j.postId && (
                    <a
                      href={`/blogs/${j.postId}`}
                      className="text-xs underline hover:no-underline"
                    >
                      Open draft
                    </a>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(j.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit schedule" : "New schedule"}
            </DialogTitle>
            <DialogDescription>
              The AI will generate a post each time this schedule fires.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Weekly product update"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Prompt / brief</Label>
              <Textarea
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                placeholder="Write an engaging post about our product area, aimed at developers…"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Topic pool (optional, one per line)</Label>
              <Textarea
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)}
                placeholder={"Onboarding\nAnalytics\nIntegrations"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                One topic is used per run, rotating through the list.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Length</Label>
                <Select
                  value={form.length}
                  onValueChange={(v) => setForm({ ...form, length: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTHS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category (optional)</Label>
                <Input
                  value={form.category ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Product"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>When</Label>
              {!customCron ? (
                <Select
                  value={
                    CRON_PRESETS.some((p) => p.cron === form.cron)
                      ? form.cron
                      : "__custom"
                  }
                  onValueChange={(v) => {
                    if (v === "__custom") setCustomCron(true);
                    else setForm({ ...form, cron: v });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRON_PRESETS.map((p) => (
                      <SelectItem key={p.cron} value={p.cron}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom">Custom cron…</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.cron}
                  onChange={(e) => setForm({ ...form, cron: e.target.value })}
                  placeholder="0 9 * * 1"
                  className="font-mono"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {isValidCron(form.cron)
                  ? describeCron(form.cron, form.timezone)
                  : "Invalid cron expression"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="Europe/Berlin"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Auto-publish</p>
                <p className="text-xs text-muted-foreground">
                  {canAutoPublish
                    ? "Publish immediately instead of saving a draft."
                    : "Available on Enterprise. Posts are saved as drafts."}
                </p>
              </div>
              <Switch
                checked={form.autoPublish}
                onCheckedChange={(v) =>
                  setForm({ ...form, autoPublish: v })
                }
                disabled={!canAutoPublish}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Enabled</p>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
