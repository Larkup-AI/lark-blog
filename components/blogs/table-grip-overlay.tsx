"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  GripVertical,
  GripHorizontal,
  Plus,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Trash2,
  Heading,
  Rows,
  Columns,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Target = {
  tableDom: HTMLTableElement;
  rowDom: HTMLTableRowElement;
  colIndex: number;
  tableRect: DOMRect;
  rowRect: DOMRect;
  cellRect: DOMRect;
};

type MenuState = {
  open: boolean;
  kind: "row" | "col" | null;
  top: number;
  left: number;
};

const PRESET_COLORS = [
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

const GUTTER = 20; // px gutter outside the table for grips

export function TableGripOverlay({ editor }: { editor: Editor }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [menu, setMenu] = useState<MenuState>({
    open: false,
    kind: null,
    top: 0,
    left: 0,
  });
  const [colorOpen, setColorOpen] = useState(false);
  const customColorRef = useRef<HTMLInputElement>(null);
  const insideOverlay = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = setTimeout(() => {
      if (!insideOverlay.current) setTarget(null);
    }, 200);
  }, [clearHide]);

  // Close menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".tgo")) {
        setMenu((m) => ({ ...m, open: false }));
        setColorOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Mousemove inside editor DOM
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;

    const onMove = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest(".tgo")) {
        clearHide();
        return;
      }

      const td = el.closest("td, th") as HTMLTableCellElement | null;
      const tr = el.closest("tr") as HTMLTableRowElement | null;
      const table = el.closest("table") as HTMLTableElement | null;

      if (!td || !tr || !table) {
        scheduleHide();
        return;
      }
      clearHide();

      const cells = Array.from(tr.children) as HTMLElement[];
      setTarget({
        tableDom: table,
        rowDom: tr,
        colIndex: cells.indexOf(td as HTMLElement),
        tableRect: table.getBoundingClientRect(),
        rowRect: tr.getBoundingClientRect(),
        cellRect: td.getBoundingClientRect(),
      });
    };

    dom.addEventListener("mousemove", onMove);
    dom.addEventListener("mouseleave", scheduleHide);
    return () => {
      dom.removeEventListener("mousemove", onMove);
      dom.removeEventListener("mouseleave", scheduleHide);
      clearHide();
    };
  }, [editor, clearHide, scheduleHide]);

  // ── helpers ──────────────────────────────────────────────────────────────
  const posOf = (el: Element | null | undefined) =>
    el ? editor.view.posAtDOM(el, 0) : null;
  const rowFirstCell = () => target?.rowDom?.firstElementChild ?? null;
  const colCell = () =>
    target ? (target.rowDom?.children[target.colIndex] ?? null) : null;

  const closeMenu = () => {
    setMenu((m) => ({ ...m, open: false }));
    setColorOpen(false);
  };

  const withRow = (
    cmd: (
      c: ReturnType<typeof editor.chain>,
    ) => ReturnType<typeof editor.chain>,
  ) => {
    const pos = posOf(rowFirstCell());
    if (pos == null) return;
    cmd(editor.chain().focus(pos)).run();
    closeMenu();
  };
  const withCol = (
    cmd: (
      c: ReturnType<typeof editor.chain>,
    ) => ReturnType<typeof editor.chain>,
  ) => {
    const pos = posOf(colCell());
    if (pos == null) return;
    cmd(editor.chain().focus(pos)).run();
    closeMenu();
  };

  const selectRow = () => {
    const f = target?.rowDom?.firstElementChild,
      l = target?.rowDom?.lastElementChild;
    if (!f || !l) return;
    editor.commands.setCellSelection({
      anchorCell: editor.view.posAtDOM(f, 0) - 1,
      headCell: editor.view.posAtDOM(l, 0) - 1,
    });
    editor.view.focus();
  };
  const selectCol = () => {
    if (!target || target.colIndex < 0) return;
    const rows = target.tableDom.querySelectorAll("tr");
    const f = rows[0]?.children[target.colIndex],
      l = rows[rows.length - 1]?.children[target.colIndex];
    if (!f || !l) return;
    editor.commands.setCellSelection({
      anchorCell: editor.view.posAtDOM(f, 0) - 1,
      headCell: editor.view.posAtDOM(l, 0) - 1,
    });
    editor.view.focus();
  };

  const setColor = (c: string | null) => {
    editor.chain().focus().setCellAttribute("backgroundColor", c).run();
    closeMenu();
  };
  const openMenu = (kind: "row" | "col", top: number, left: number) => {
    kind === "row" ? selectRow() : selectCol();
    setColorOpen(false);
    setMenu({ open: true, kind, top, left });
  };

  const clampL = (l: number) =>
    Math.max(8, Math.min(l, window.innerWidth - 208));
  const clampT = (t: number) =>
    Math.max(8, Math.min(t, window.innerHeight - 320));

  const onOEnter = () => {
    insideOverlay.current = true;
    clearHide();
  };
  const onOLeave = () => {
    insideOverlay.current = false;
    scheduleHide();
  };

  // ── render ────────────────────────────────────────────────────────────────
  const menuEl = menu.open ? (
    <MenuPanel
      menu={menu}
      colorOpen={colorOpen}
      setColorOpen={setColorOpen}
      customColorRef={customColorRef}
      withRow={withRow}
      withCol={withCol}
      setColor={setColor}
      closeMenu={closeMenu}
    />
  ) : null;

  if (!target) return menuEl;

  const { tableRect, rowRect, cellRect } = target;

  // Row grip: left gutter, full row height
  const rowGrip: React.CSSProperties = {
    position: "fixed",
    top: rowRect.top,
    left: tableRect.left - GUTTER,
    width: GUTTER - 2,
    height: rowRect.height,
  };
  // Col grip: top gutter, full cell width
  const colGrip: React.CSSProperties = {
    position: "fixed",
    top: tableRect.top - GUTTER,
    left: cellRect.left,
    width: cellRect.width,
    height: GUTTER - 2,
  };
  // + row bar: full table width at bottom
  const plusRow: React.CSSProperties = {
    position: "fixed",
    top: tableRect.bottom - 1,
    left: tableRect.left,
    width: tableRect.width,
    height: 12,
    cursor: "pointer",
  };
  // + col bar: full table height at right
  const plusCol: React.CSSProperties = {
    position: "fixed",
    top: tableRect.top,
    left: tableRect.right - 1,
    width: 12,
    height: tableRect.height,
    cursor: "pointer",
  };

  const gripCls =
    "tgo pointer-events-auto flex items-center justify-center cursor-pointer rounded-sm text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100/90 transition-colors duration-100";

  return (
    <div
      className="tgo pointer-events-none fixed inset-0 z-40"
      onMouseEnter={onOEnter}
      onMouseLeave={onOLeave}
    >
      {/* Row grip */}
      <div
        className={gripCls}
        style={rowGrip}
        onClick={() =>
          openMenu("row", clampT(rowRect.top), clampL(tableRect.left + 4))
        }
        title="Row options"
      >
        <GripVertical className="h-3 w-3" />
      </div>

      {/* Col grip */}
      <div
        className={gripCls}
        style={colGrip}
        onClick={() =>
          openMenu(
            "col",
            clampT(tableRect.top + 4),
            clampL(cellRect.left + cellRect.width / 2 - 96),
          )
        }
        title="Column options"
      >
        <GripHorizontal className="h-3 w-3" />
      </div>

      {/* + Add row bar */}
      <div
        className="tgo pointer-events-auto group"
        style={plusRow}
        onClick={() => {
          const pos = posOf(target.rowDom?.lastElementChild ?? rowFirstCell());
          if (pos != null) editor.chain().focus(pos).addRowAfter().run();
        }}
        title="Add row"
      >
        {/* The line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-transparent group-hover:bg-blue-400 transition-colors" />
        {/* The + badge, centred */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          flex h-[14px] w-[14px] items-center justify-center
          rounded-full bg-background border border-border
          group-hover:border-blue-400 group-hover:text-blue-500
          text-muted-foreground/50  transition-colors opacity-0 group-hover:opacity-100"
        >
          <Plus className="h-2 w-2" />
        </div>
      </div>

      {/* + Add col bar */}
      <div
        className="tgo pointer-events-auto group"
        style={plusCol}
        onClick={() => {
          const pos = posOf(colCell());
          if (pos != null) editor.chain().focus(pos).addColumnAfter().run();
        }}
        title="Add column"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-transparent group-hover:bg-blue-400 transition-colors" />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          flex h-[14px] w-[14px] items-center justify-center
          rounded-full bg-background border border-border
          group-hover:border-blue-400 group-hover:text-blue-500
          text-muted-foreground/50  transition-colors opacity-0 group-hover:opacity-100"
        >
          <Plus className="h-2 w-2" />
        </div>
      </div>

      {menuEl}
    </div>
  );
}

// ── Menu panel ────────────────────────────────────────────────────────────────
function MenuPanel({
  menu,
  colorOpen,
  setColorOpen,
  customColorRef,
  withRow,
  withCol,
  setColor,
  closeMenu,
}: {
  menu: MenuState;
  colorOpen: boolean;
  setColorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  customColorRef: React.RefObject<HTMLInputElement | null>;
  withRow: (
    cmd: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>,
  ) => void;
  withCol: (
    cmd: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>,
  ) => void;
  setColor: (c: string | null) => void;
  closeMenu: () => void;
}) {
  return (
    <div
      className="tgo pointer-events-auto fixed z-50 w-48 rounded-lg border border-border bg-background py-1 text-sm"
      style={{ top: menu.top, left: menu.left }}
    >
      {menu.kind === "row" ? (
        <>
          <Label icon={<Rows className="h-3 w-3" />} text="Row" />
          <Btn
            onClick={() => withRow((c) => c.addRowBefore())}
            icon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
            label="Insert above"
          />
          <Btn
            onClick={() => withRow((c) => c.addRowAfter())}
            icon={<ArrowDownFromLine className="h-3.5 w-3.5" />}
            label="Insert below"
          />
          <Btn
            onClick={() => withRow((c) => c.toggleHeaderRow())}
            icon={<Heading className="h-3.5 w-3.5" />}
            label="Toggle header"
          />
          <Hr />
          <ColorSection
            open={colorOpen}
            onToggle={() => setColorOpen((v) => !v)}
            onColor={setColor}
            colorRef={customColorRef}
          />
          <Hr />
          <Btn
            onClick={() => withRow((c) => c.deleteRow())}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Delete row"
            danger
          />
        </>
      ) : (
        <>
          <Label icon={<Columns className="h-3 w-3" />} text="Column" />
          <Btn
            onClick={() => withCol((c) => c.addColumnBefore())}
            icon={<ArrowLeftFromLine className="h-3.5 w-3.5" />}
            label="Insert left"
          />
          <Btn
            onClick={() => withCol((c) => c.addColumnAfter())}
            icon={<ArrowRightFromLine className="h-3.5 w-3.5" />}
            label="Insert right"
          />
          <Btn
            onClick={() => withCol((c) => c.toggleHeaderColumn())}
            icon={<Heading className="h-3.5 w-3.5" />}
            label="Toggle header"
          />
          <Hr />
          <ColorSection
            open={colorOpen}
            onToggle={() => setColorOpen((v) => !v)}
            onColor={setColor}
            colorRef={customColorRef}
          />
          <Hr />
          <Btn
            onClick={() => withCol((c) => c.deleteColumn())}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Delete column"
            danger
          />
        </>
      )}
    </div>
  );
}

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
      {icon} {text}
    </p>
  );
}
function Hr() {
  return <div className="my-1 h-px bg-neutral-100" />;
}
function Btn({
  onClick,
  icon,
  label,
  danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tgo flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors",
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-neutral-700 hover:bg-neutral-50",
      )}
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      {label}
    </button>
  );
}
function ColorSection({
  open,
  onToggle,
  onColor,
  colorRef,
}: {
  open: boolean;
  onToggle: () => void;
  onColor: (c: string | null) => void;
  colorRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <button
        onClick={onToggle}
        className="tgo flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 opacity-70" /> Background
        </span>
        <span className="text-neutral-400 text-[10px]">{open ? "▲" : "▶"}</span>
      </button>
      {open && (
        <div className="tgo px-3 pb-2">
          <div className="grid grid-cols-5 gap-1 mt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => onColor(c.value)}
                title={c.name}
                className={cn(
                  "h-5 w-full rounded-sm border border-neutral-200 hover:ring-1 hover:ring-neutral-400 transition-all",
                  !c.value &&
                    "flex items-center justify-center text-[9px] text-neutral-400",
                )}
                style={c.value ? { backgroundColor: c.value } : {}}
              >
                {!c.value && "✕"}
              </button>
            ))}
          </div>
          <input
            type="color"
            ref={colorRef}
            className="w-0 h-0 opacity-0 absolute pointer-events-none"
            onChange={(e) => onColor(e.target.value)}
          />
          <button
            onClick={() => colorRef.current?.click()}
            className="tgo mt-1.5 w-full text-[11px] text-neutral-400 border border-neutral-200 rounded py-0.5 hover:bg-neutral-50"
          >
            Custom color…
          </button>
        </div>
      )}
    </>
  );
}
