"use server";

import { pool } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isFullAdmin, getSession } from "@/lib/admin";
import { drizzle } from "drizzle-orm/node-postgres";
import { revalidatePath } from "next/cache";

const db = drizzle(pool);

export async function updateUserRole(userId: string, newRole: string) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  if (!isFullAdmin(session.user)) {
    throw new Error("Only Full Admins can update roles");
  }

  // Prevent users from changing their own role this way to avoid accidental lockouts
  if (session.user.id === userId) {
    throw new Error("Cannot change your own role here");
  }

  const validRoles = ["full_admin", "admin", "user"];
  if (!validRoles.includes(newRole)) {
    throw new Error("Invalid role");
  }

  await db
    .update(user)
    .set({ role: newRole })
    .where(eq(user.id, userId));

  revalidatePath("/teams");
}

export async function removeUser(userId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  if (!isFullAdmin(session.user)) {
    throw new Error("Only Full Admins can remove users");
  }

  if (session.user.id === userId) {
    throw new Error("Cannot remove yourself");
  }

  await db
    .delete(user)
    .where(eq(user.id, userId));

  revalidatePath("/teams");
}
