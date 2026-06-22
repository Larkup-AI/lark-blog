// import type { Metadata } from "next";
// import Link from "next/link";
// import { SiteHeader } from "@/components/site-header";
// import { SiteFooter } from "@/components/site-footer";
// import { getPublishedPosts, formatDate } from "@/lib/posts";

// export const metadata: Metadata = {
//   title: "Blog",
//   description: "Notes, releases, and engineering writing.",
// };

// export const dynamic = "force-dynamic";

// export default async function BlogIndexPage() {
//   const posts = await getPublishedPosts();
//   const [featured, ...rest] = posts;

//   return (
//     <div className="min-h-svh flex flex-col">
//       <SiteHeader />
//       <main className="flex-1">
//         {/* Header */}
//         <section className="border-b border-border">
//           <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
//             <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
//               Writing
//             </span>
//             <h1 className="mt-4 max-w-3xl text-balance font-sans text-4xl font-medium leading-[1.05] tracking-tight text-foreground md:text-5xl">
//               Blog
//             </h1>
//             <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
//               Latest news, thoughts, and writing.
//             </p>
//           </div>
//         </section>

//         {posts.length === 0 ? (
//           <div className="mx-auto max-w-6xl px-6 py-24">
//             <p className="text-muted-foreground">
//               No posts published yet. Check back soon.
//             </p>
//           </div>
//         ) : (
//           <>
//             {/* Featured post */}
//             {featured && (
//               <section className="border-b border-border">
//                 <Link
//                   href={`/blog/${featured.slug}`}
//                   className="group block transition-colors hover:bg-secondary/40"
//                 >
//                   <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-2 md:py-16">
//                     <div className="flex aspect-16/10 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
//                       {featured.coverImage ? (
//                         // eslint-disable-next-line @next/next/no-img-element
//                         <img
//                           src={featured.coverImage || "/placeholder.svg"}
//                           alt=""
//                           className="h-full w-full object-cover"
//                         />
//                       ) : (
//                         <span className="font-serif text-3xl text-muted-foreground">
//                           {featured.title.slice(0, 1)}
//                         </span>
//                       )}
//                     </div>
//                     <div className="flex flex-col justify-center">
//                       {featured.category && (
//                         <span className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
//                           {featured.category}
//                         </span>
//                       )}
//                       <h2 className="mt-3 text-balance font-sans text-3xl font-medium leading-tight tracking-tight text-foreground md:text-4xl">
//                         {featured.title}
//                       </h2>
//                       <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
//                         {featured.authorName && (
//                           <>
//                             <span className="text-foreground/80">
//                               {featured.authorName}
//                             </span>
//                             <span>·</span>
//                           </>
//                         )}
//                         <span>{formatDate(featured.publishedAt)}</span>
//                         {featured.readingTime ? (
//                           <>
//                             <span>·</span>
//                             <span>{featured.readingTime} min read</span>
//                           </>
//                         ) : null}
//                       </div>
//                     </div>
//                   </div>
//                 </Link>
//               </section>
//             )}

//             {/* Grid */}
//             {rest.length > 0 && (
//               <section>
//                 <div className="mx-auto max-w-6xl px-6">
//                   <div className="grid gap-px overflow-hidden border-x border-border bg-border md:grid-cols-3">
//                     {rest.map((post) => (
//                       <Link
//                         key={post.id}
//                         href={`/blog/${post.slug}`}
//                         className="group flex flex-col bg-background p-6 transition-colors hover:bg-secondary/40 md:p-8"
//                       >
//                         {post.category && (
//                           <span className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
//                             {post.category}
//                           </span>
//                         )}
//                         <h3 className="mt-3 text-pretty font-sans text-xl font-medium leading-snug tracking-tight text-foreground">
//                           {post.title}
//                         </h3>
//                         <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
//                           <span>{formatDate(post.publishedAt)}</span>
//                           {post.readingTime ? (
//                             <>
//                               <span>·</span>
//                               <span>{post.readingTime} min read</span>
//                             </>
//                           ) : null}
//                         </div>
//                       </Link>
//                     ))}
//                   </div>
//                 </div>
//               </section>
//             )}
//           </>
//         )}
//       </main>
//       <SiteFooter />
//     </div>
//   );
// }
