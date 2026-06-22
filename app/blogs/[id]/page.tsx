import { redirect, notFound } from "next/navigation";
import { getAdminUserId } from "@/lib/admin";
import { getPostById } from "@/app/actions/posts";
import { getSettings } from "@/app/actions/settings";
import { PostEditor } from "@/components/blogs/post-editor";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminId = await getAdminUserId();
  if (!adminId) redirect("/blogs/sign-in");

  const { id } = await params;
  const postId = Number(id);
  if (Number.isNaN(postId)) notFound();

  const post = await getPostById(postId);
  if (!post) notFound();

  const settings = await getSettings();

  return <PostEditor post={post} settings={settings} />;
}
