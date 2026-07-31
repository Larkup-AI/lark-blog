"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Mail } from "lucide-react";
import { createInvitations } from "@/app/actions/invitations";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const addEmailFromInput = (value: string) => {
    const newEmail = value.trim();
    if (
      newEmail &&
      !emails.includes(newEmail) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
    ) {
      setEmails((prev) => [...prev, newEmail]);
      setInputValue("");
    } else if (newEmail) {
      toast.error("Please enter a valid, unique email address.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmailFromInput(inputValue);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addEmailFromInput(inputValue);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter((email) => email !== emailToRemove));
  };

  const handleInvite = async () => {
    if (emails.length === 0) {
      toast.error("Please add at least one email address.");
      return;
    }

    setLoading(true);
    try {
      await createInvitations({ emails, role });
      toast.success(`Successfully invited ${emails.length} user(s).`);
      setOpen(false);
      setEmails([]);
      setInputValue("");
      setRole("user");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label>Email Addresses</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {emails.map((email) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  {email}
                  <button
                    onClick={() => removeEmail(email)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Type email and press Enter or Space..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          </div>

          <div className="space-y-3">
            <Label>Select Role</Label>
            <RadioGroup
              value={role}
              onValueChange={setRole}
              className="grid gap-4"
            >
              <div>
                <RadioGroupItem
                  value="full_admin"
                  id="full_admin"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="full_admin"
                  className="flex flex-col items-start justify-between rounded-md border-2 border-border bg-background p-4 hover:bg-secondary peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <div className="font-semibold flex items-center">
                    Full Admin
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Full access to settings, team management, and all posts.
                  </div>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="admin"
                  id="admin"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="admin"
                  className="flex flex-col items-start justify-between rounded-md border-2 border-border bg-background p-4 hover:bg-secondary peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <div className="font-semibold flex items-center">Admin</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Can manage and publish all posts, but cannot change
                    settings.
                  </div>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="user"
                  id="user"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="user"
                  className="flex flex-col items-start justify-between rounded-md border-2 border-border bg-background p-4 hover:bg-secondary peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <div className="font-semibold flex items-center">User</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Can create and edit their own posts. Requires approval to
                    publish.
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleInvite}
              disabled={loading || emails.length === 0}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send {emails.length > 0 ? emails.length : ""} Invitation
              {emails.length > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
