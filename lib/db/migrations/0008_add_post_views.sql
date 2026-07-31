CREATE TABLE "post_views" (
  "id" serial PRIMARY KEY NOT NULL,
  "postId" integer NOT NULL,
  "visitorId" text NOT NULL,
  "viewedAt" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "post_views_postId_posts_id_fk"
    FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX "post_views_post_id_viewed_at_idx" ON "post_views" USING btree ("postId", "viewedAt");
--> statement-breakpoint
CREATE INDEX "post_views_viewed_at_idx" ON "post_views" USING btree ("viewedAt");
