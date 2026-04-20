"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

export type MasterLedgerRow = {
  id: string;
  name: string;
  category: string;
  fat_pct: number;
  sugar_pct: number;
  total_solids_pct: number;
  pac_value: number;
  pod_value: number;
  cost_per_container: number;
  container_size_g: number;
  user_id: string | null;
  is_global: boolean;
  is_verified: boolean;
};

type ToastState = {
  tone: "saving" | "success" | "error";
  message: string;
} | null;

type MasterLedgerProps = {
  initialRows: MasterLedgerRow[];
  currentUserId: string | null;
};

type FilterKey = "all" | "sugars" | "fruits" | "verified-bases";

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "sugars", label: "Sugars" },
  { key: "fruits", label: "Fruits" },
  { key: "verified-bases", label: "Verified Bases" },
];

const CATEGORY_STYLES: Record<string, string> = {
  Fruit: "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  "Fresh Fruit": "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  Sugar: "border border-blue-400/20 bg-blue-400/10 text-blue-200",
  Fats: "border border-rose-400/20 bg-rose-400/10 text-rose-200",
  Dairy: "border border-amber-300/20 bg-amber-300/10 text-amber-100",
  Base: "border border-neutral-300/20 bg-white/8 text-neutral-100",
  "Base/Stabilizer": "border border-violet-400/20 bg-violet-400/10 text-violet-200",
  "Flavor Paste": "border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
  Other: "border border-white/10 bg-white/6 text-neutral-200",
};

function formatCostPerGram(costPerContainer: number, containerSizeG: number) {
  if (costPerContainer <= 0 || containerSizeG <= 0) {
    return "0.0000";
  }

  return (costPerContainer / containerSizeG).toFixed(4);
}

function EditableMoneyCell({
  row,
  field,
  onSave,
  disabled,
}: {
  row: MasterLedgerRow;
  field: "cost_per_container" | "container_size_g";
  onSave: (rowId: string, field: "cost_per_container" | "container_size_g", value: number) => Promise<void>;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(String(row[field] ?? 0));

  useEffect(() => {
    setDraft(String(row[field] ?? 0));
  }, [field, row]);

  async function commit() {
    const nextValue = Number(draft);

    if (Number.isNaN(nextValue) || nextValue === row[field]) {
      setDraft(String(row[field] ?? 0));
      return;
    }

    await onSave(row.id, field, nextValue);
  }

  return (
    <input
      type="number"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void commit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }

        if (event.key === "Escape") {
          setDraft(String(row[field] ?? 0));
          event.currentTarget.blur();
        }
      }}
      readOnly={disabled}
      title={disabled ? "This row is read-only." : undefined}
      className={`w-24 rounded px-2 py-1 text-right font-mono text-lg [appearance:textfield] outline-none transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
        disabled
          ? "cursor-not-allowed border-b border-transparent bg-transparent text-white/35"
          : "border-b border-transparent bg-transparent text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.4)] focus:border-[#00E676]/50 focus:bg-[#00E676]/10"
      }`}
    />
  );
}

export function MasterLedger({ initialRows, currentUserId }: MasterLedgerProps) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (!toast || toast.tone === "saving") {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch = query
        ? [row.name, row.category].join(" ").toLowerCase().includes(query)
        : true;

      if (!matchesSearch) {
        return false;
      }

      if (filter === "sugars") {
        return row.category === "Sugar";
      }

      if (filter === "fruits") {
        return row.category === "Fruit" || row.category === "Fresh Fruit";
      }

      if (filter === "verified-bases") {
        return row.is_verified && (row.category === "Base" || row.category === "Base/Stabilizer");
      }

      return true;
    });
  }, [filter, rows, search]);

  async function saveField(
    rowId: string,
    field: "cost_per_container" | "container_size_g",
    value: number
  ) {
    setToast({ tone: "saving", message: "Saving..." });

    const previous = rows;
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );

    const response = await fetch(`/api/portal/pantry/${rowId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ [field]: value }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setRows(previous);
      setToast({
        tone: "error",
        message: payload?.error ?? "Unable to save ingredient pricing.",
      });
      return;
    }

    const payload = (await response.json()) as { item?: Partial<MasterLedgerRow> };
    const updatedItem = payload.item;

    if (updatedItem) {
      setRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? {
                ...row,
                cost_per_container: Number(updatedItem.cost_per_container ?? row.cost_per_container),
                container_size_g: Number(updatedItem.container_size_g ?? row.container_size_g),
              }
            : row
        )
      );
    }

    setToast({ tone: "success", message: "Ledger updated." });
  }

  const columns = useMemo<ColumnDef<MasterLedgerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{row.original.name}</span>
              {row.original.is_verified ? (
                <BadgeCheck
                  size={15}
                  color="#00E5FF"
                  className="drop-shadow-[0_0_5px_rgba(0,229,255,0.8)]"
                  aria-label="Verified Chemical Specs (Gelato Miracoli Standard)"
                />
              ) : null}
            </div>
            {row.original.is_global ? (
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Shared Foundation
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
              CATEGORY_STYLES[row.original.category] ?? CATEGORY_STYLES.Other
            }`}
          >
            {row.original.category}
          </span>
        ),
      },
      {
        accessorKey: "fat_pct",
        header: "Fat",
        cell: ({ row }) => <span className="text-center font-mono text-sm text-gray-500">{row.original.fat_pct.toFixed(1)}%</span>,
      },
      {
        accessorKey: "pac_value",
        header: "PAC",
        cell: ({ row }) => <span className="text-center font-mono text-sm text-gray-500">{row.original.pac_value.toFixed(1)}</span>,
      },
      {
        accessorKey: "pod_value",
        header: "POD",
        cell: ({ row }) => <span className="text-center font-mono text-sm text-gray-500">{row.original.pod_value.toFixed(1)}</span>,
      },
      {
        accessorKey: "total_solids_pct",
        header: "Solids",
        cell: ({ row }) => <span className="text-center font-mono text-sm text-gray-500">{row.original.total_solids_pct.toFixed(1)}%</span>,
      },
      {
        id: "cost_per_container",
        header: "Cost / Container",
        cell: ({ row }) => (
          <EditableMoneyCell
            row={row.original}
            field="cost_per_container"
            onSave={saveField}
            disabled={!row.original.is_global && row.original.user_id !== currentUserId}
          />
        ),
      },
      {
        id: "container_size_g",
        header: "Container g",
        cell: ({ row }) => (
          <EditableMoneyCell
            row={row.original}
            field="container_size_g"
            onSave={saveField}
            disabled={!row.original.is_global && row.original.user_id !== currentUserId}
          />
        ),
      },
      {
        id: "cost_per_gram",
        header: "Cost / g",
        cell: ({ row }) => (
          <span className="block text-right font-mono text-lg text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.4)]">
            {formatCostPerGram(row.original.cost_per_container, row.original.container_size_g)}
          </span>
        ),
      },
    ],
    [currentUserId]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="relative px-4 py-6 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-2xl"
      >
        <div className="px-6 py-6 sm:px-8">
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                Current Inventory &amp; Economics
              </p>
              <h2
                className="mt-3 text-4xl tracking-[-0.05em] text-white"
                style={{ fontFamily: "var(--font-miracoli-serif)" }}
              >
                MASTER LEDGER
              </h2>
            </div>

            <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center">
              <div className="w-full max-w-md rounded-full border border-white/10 bg-white/5 px-6 py-3 transition-all focus-within:border-[#00E5FF]/50 focus-within:shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ingredients, categories, codes..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {FILTER_OPTIONS.map((option) => {
                  const active = filter === option.key;

                  return (
                    <motion.button
                      key={option.key}
                      type="button"
                      onClick={() => setFilter(option.key)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                        active
                          ? "border-[#00E5FF]/25 bg-[#00E5FF]/10 text-white"
                          : "border-white/10 bg-white/5 text-white/56 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`sticky top-0 z-10 border-b border-white/10 bg-black/60 px-5 py-4 text-xs uppercase tracking-widest text-gray-400 backdrop-blur-xl ${
                        header.column.id === "name" || header.column.id === "category"
                          ? "text-left"
                          : header.column.id === "cost_per_container" ||
                              header.column.id === "container_size_g" ||
                              header.column.id === "cost_per_gram"
                            ? "text-right"
                            : "text-center"
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="group border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.04]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`border-b border-white/5 px-5 py-4 align-middle ${
                        cell.column.id === "name" || cell.column.id === "category"
                          ? "text-left"
                          : cell.column.id === "cost_per_container" ||
                              cell.column.id === "container_size_g" ||
                              cell.column.id === "cost_per_gram"
                            ? "text-right"
                            : "text-center"
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {toast ? (
        <div
          className={`fixed bottom-6 right-6 rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl ${
            toast.tone === "error"
              ? "border-rose-400/30 bg-rose-400/12 text-rose-100"
              : toast.tone === "success"
                ? "border-[#00E676]/30 bg-[#00E676]/12 text-[#B7FFD8]"
                : "border-white/12 bg-white/8 text-white"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
