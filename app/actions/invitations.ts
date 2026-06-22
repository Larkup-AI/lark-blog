"use server";

import { revalidatePath } from "next/cache";

import { pool } from "@/lib/db";
import { invitation, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAdminUserId, isFullAdmin, getSession } from "@/lib/admin";
import { sendEmail } from "@/app/actions/resend";
import crypto from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import React from "react";
import { InvitationEmail } from "@/components/emails/invitation-email";

const db = drizzle(pool);

export async function createInvitations(data: { emails: string[]; role: string }) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");

  if (!isFullAdmin(session.user)) {
    throw new Error("Only Full Admins can send invitations");
  }

  const newInvites = [];

  for (const email of data.emails) {
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser) {
      throw new Error(`User ${email} is already a team member`);
    }

    const [existingInvite] = await db
      .select()
      .from(invitation)
      .where(and(eq(invitation.email, email), eq(invitation.status, "pending")))
      .limit(1);

    if (existingInvite) {
      throw new Error(`An invitation is already pending for ${email}`);
    }

    const token = crypto.randomBytes(32).toString("hex");

    const [newInvite] = await db
      .insert(invitation)
      .values({
        id: crypto.randomUUID(),
        email: email,
        role: data.role,
        token,
        invitedBy: session.user.id,
        status: "pending",
      })
      .returning();

    const inviteUrl = `${process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/invite?token=${token}`;

    await sendEmail({
      email: email,
      subject: "You have been invited to join the team",
      text: `You have been invited to join the team. Click the link to accept or reject the invitation: ${inviteUrl}`,
      react: React.createElement(InvitationEmail, { inviteUrl }),
    });

    newInvites.push(newInvite);
  }

  return newInvites;
}
export async function getInvitationByToken(token: string) {
  const [invite] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.token, token))
    .limit(1);
  return invite;
}

export async function rejectInvitation(token: string) {
  await db
    .update(invitation)
    .set({ status: "rejected", token: crypto.randomBytes(32).toString("hex") })
    .where(eq(invitation.token, token));
}

export async function resendInvitation(inviteId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  if (!isFullAdmin(session.user)) {
    throw new Error("Only Full Admins can send invitations");
  }

  const [existing] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.id, inviteId))
    .limit(1);

  if (!existing || existing.status !== "pending") {
    throw new Error("Invitation not found or not pending");
  }

  const token = crypto.randomBytes(32).toString("hex");

  await db
    .update(invitation)
    .set({ token, updatedAt: new Date() })
    .where(eq(invitation.id, inviteId));

  const inviteUrl = `${process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/invite?token=${token}`;

  await sendEmail({
    email: existing.email,
    subject: "Reminder: You have been invited to join the team",
    text: `You have been invited to join the team. Click the link to accept or reject the invitation: ${inviteUrl}`,
    react: React.createElement(InvitationEmail, { inviteUrl }),
  });

  revalidatePath("/teams");
}

export async function revokeInvitation(inviteId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  if (!isFullAdmin(session.user)) {
    throw new Error("Only Full Admins can revoke invitations");
  }

  await db
    .delete(invitation)
    .where(eq(invitation.id, inviteId));

  revalidatePath("/teams");
}
