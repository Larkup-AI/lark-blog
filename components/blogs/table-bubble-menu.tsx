import { useRef } from "react";
import { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  Trash2,
  Rows,
  Columns,
  Palette,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Trash,
  SplitSquareHorizontal,
  Merge,
  Heading,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  { name: "Default", value: null },
  { name: "Gray", value: "#F3F4F6" },
  { name: "Brown", value: "#F3E8E0" },
  { name: "Orange", value: "#FFEDD5" },
  { name: "Yellow", value: "#FEF9C3" },
  { name: "Green", value: "#DCFCE7" },
  { name: "Blue", value: "#DBEAFE" },
  { name: "Purple", value: "#F3E8FF" },
  { name: "Pink", value: "#FCE7F3" },
  { name: "Red", value: "#FEE2E2" },
];

export function TableBubbleMenu({ editor }: { editor: Editor }) {
  const customColorInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) => editor.isActive("table")}
      options={{ placement: "top" }}
      className="flex items-center gap-1 bg-background/80 backdrop-blur px-2 py-1.5 rounded-lg border border-border/50 "
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Rows className="h-4 w-4" />
            <span className="text-xs font-medium">Row</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().addRowBefore().run()}
          >
            <ArrowUpFromLine className="mr-2 h-4 w-4" /> Insert above
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <ArrowDownFromLine className="mr-2 h-4 w-4" /> Insert below
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="text-red-600"
          >
            <Trash className="mr-2 h-4 w-4" /> Delete row
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Columns className="h-4 w-4" />
            <span className="text-xs font-medium">Column</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().addColumnBefore().run()}
          >
            <ArrowLeftFromLine className="mr-2 h-4 w-4" /> Insert left
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <ArrowRightFromLine className="mr-2 h-4 w-4" /> Insert right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="text-red-600"
          >
            <Trash className="mr-2 h-4 w-4" /> Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Table className="h-4 w-4" />
            <span className="text-xs font-medium">Table</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          >
            <Heading className="mr-2 h-4 w-4" /> Toggle header row
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          >
            <Heading className="mr-2 h-4 w-4" /> Toggle header column
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().mergeCells().run()}
          >
            <Merge className="mr-2 h-4 w-4" /> Merge cells
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().splitCell().run()}
          >
            <SplitSquareHorizontal className="mr-2 h-4 w-4" /> Split cell
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-border mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
            title="Background Color"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-48 p-2">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              Background color
            </div>
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    if (c.value) {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("backgroundColor", c.value)
                        .run();
                    } else {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("backgroundColor", null)
                        .run();
                    }
                  }}
                  className={cn(
                    "h-6 w-full rounded-sm border border-border/50 flex items-center justify-center transition-colors hover:ring-1 hover:ring-ring focus:outline-none",
                    !c.value &&
                      "bg-transparent text-[10px] text-muted-foreground",
                  )}
                  style={c.value ? { backgroundColor: c.value } : {}}
                  title={c.name}
                >
                  {!c.value && "X"}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
              <input
                type="color"
                ref={customColorInputRef}
                className="w-0 h-0 opacity-0 absolute pointer-events-none"
                onChange={(e) =>
                  editor
                    .chain()
                    .focus()
                    .setCellAttribute("backgroundColor", e.target.value)
                    .run()
                }
              />
              <button
                onClick={() => customColorInputRef.current?.click()}
                className="w-full text-xs font-medium text-muted-foreground border border-border/50 rounded-sm py-1 hover:bg-muted transition-colors flex items-center justify-center gap-1"
              >
                Custom Color
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </BubbleMenu>
  );
}
