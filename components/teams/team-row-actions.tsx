"use client";

import { useState } from "react";
import { MoreHorizontal, Shield, Mail, Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { updateUserRole, removeUser } from "@/app/actions/team";
import { resendInvitation, revokeInvitation } from "@/app/actions/invitations";

interface TeamRowActionsProps {
  user: {
    id: string;
    role: string;
    isInvite: boolean;
  };
  isFullAdmin: boolean;
  isSelf: boolean;
  isMainAdmin: boolean;
}

export function TeamRowActions({
  user,
  isFullAdmin,
  isSelf,
  isMainAdmin,
}: TeamRowActionsProps) {
  const [loading, setLoading] = useState(false);

  // If the current user viewing this row is not a full admin, or it's their own row, they can't perform actions.
  if (!isFullAdmin || isSelf) {
    return null;
  }

  const handleUpdateRole = async (newRole: string) => {
    if (newRole === user.role) return;
    setLoading(true);
    try {
      await updateUserRole(user.id, newRole);
      toast.success("User role updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update user role");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!confirm("Are you sure you want to remove this user?")) return;
    setLoading(true);
    try {
      await removeUser(user.id);
      toast.success("User removed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove user");
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async () => {
    setLoading(true);
    try {
      await resendInvitation(user.id);
      toast.success("Invitation resent successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    setLoading(true);
    try {
      await revokeInvitation(user.id);
      toast.success("Invitation revoked successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke invitation");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Button variant="ghost" className="h-8 w-8 p-0" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[190px]">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {/* <DropdownMenuSeparator /> */}

        {user.isInvite ? (
          <>
            <DropdownMenuItem onClick={handleResendInvite}>
              <Mail className="mr-2 h-4 w-4" />
              Resend Invite
            </DropdownMenuItem>
            {/* <DropdownMenuSeparator /> */}
            <DropdownMenuItem
              onClick={handleRevokeInvite}
              className="text-red-600 focus:text-red-600"
            >
              <Trash className="mr-2 h-4 w-4" />
              Revoke Invite
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {!isMainAdmin && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="">
                    <Shield className="mr-2 h-4 w-4" />
                    Change Role
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={user.role}
                        onValueChange={handleUpdateRole}
                      >
                        <DropdownMenuRadioItem value="full_admin">
                          Full Admin
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="admin">
                          Admin
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="user">
                          User
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                {/* <DropdownMenuSeparator /> */}
                <DropdownMenuItem
                  onClick={handleRemoveUser}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Remove User
                </DropdownMenuItem>
              </>
            )}
            {isMainAdmin && (
              <DropdownMenuItem disabled>
                Main Admin (Immutable)
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
