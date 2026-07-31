"use client";

import { useState, useEffect } from "react";
import { ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ArticleToc } from "@/components/blog/article-toc";
import { ShareButtons } from "@/components/blog/share-buttons";
import { cn } from "@/lib/utils";

export function TocSheet({
  title,
  buttonClassName,
}: {
  title: string;
  buttonClassName?: string;
}) {
  const [hasHeadings, setHasHeadings] = useState(false);

  // Only show the button if there are actually headings to navigate
  useEffect(() => {
    const article = document.getElementById("article-body");
    if (!article) return;

    const checkHeadings = () => {
      const nodes = article.querySelectorAll("h1, h2, h3");
      setHasHeadings(nodes.length > 0);
    };

    checkHeadings();

    const mutationObserver = new MutationObserver(checkHeadings);
    mutationObserver.observe(article, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => mutationObserver.disconnect();
  }, []);

  if (!hasHeadings) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "fixed bottom-6 right-4 z-40 gap-2  lg:hidden",
            buttonClassName,
          )}
        >
          <ListTree className="h-4 w-4" />
          Contents
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 overflow-y-auto px-6 py-8">
        <SheetHeader className="mb-4 p-0">
          <SheetTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            On this page
          </SheetTitle>
        </SheetHeader>
        <ArticleToc />
        <div className="mt-8">
          <ShareButtons title={title} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
