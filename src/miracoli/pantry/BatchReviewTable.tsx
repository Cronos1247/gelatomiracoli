"use client";

import { Fragment, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { BatchIngestionItem } from "./processBatchUpload";

const columnHelper = createColumnHelper<BatchIngestionItem>();

function StatusChip({ item }: { item: BatchIngestionItem }) {
  if (item.status === "verified" || item.status === "committed") {
    return (
      <span className="inline-flex rounded-[4px] border border-[#262626] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
        [ VERIFIED ]
      </span>
    );
  }

  if (item.status === "warning") {
    return (
      <span className="inline-flex rounded-[4px] border border-[#262626] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#a5b4fc]">
        [ WARNING ]
      </span>
    );
  }

  if (item.status === "processing" || item.status === "committing") {
    return (
      <span className="inline-flex rounded-[4px] border border-[#262626] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#a5b4fc]">
        [ SCANNING ]
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[4px] border border-[#262626] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--danger)]">
      [ ! ERROR ]
    </span>
  );
}

function BalancingBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex rounded-[4px] border border-[#262626] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white">
      {label}: <span className="ml-1 text-white">{value}%</span>
    </span>
  );
}

type BatchReviewTableProps = {
  items: BatchIngestionItem[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onCommitAllVerified: () => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (id: string) => void;
  isCommitting: boolean;
  verifiedCount: number;
};

export function BatchReviewTable({
  items,
  searchTerm,
  onSearchTermChange,
  onCommitAllVerified,
  onDeleteItem,
  onEditItem,
  isCommitting,
  verifiedCount,
}: BatchReviewTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const name = item.parsed?.extracted.name ?? "";
      const productCode = item.parsed?.extracted.product_code ?? "";

      return [item.fileName, name, productCode].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [items, searchTerm]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <StatusChip item={row.original} />
            <div>
              <p className="text-sm font-medium text-white">
                {row.original.validation?.label ?? "Queued"}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {row.original.status}
              </p>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: "product",
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-white">
              {row.original.parsed?.extracted.name ?? row.original.fileName}
            </p>
            <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-white/70">
              {row.original.parsed?.extracted.product_code || "No product code"}
            </p>
            {row.original.parsed?.extracted.extraction_source ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {row.original.parsed.extracted.extraction_source}
              </p>
            ) : null}
          </div>
        ),
      }),
      columnHelper.display({
        id: "balancing",
        header: "Balancing",
        cell: ({ row }) =>
          row.original.parsed ? (
            <div className="flex flex-wrap gap-2">
              <BalancingBadge label="Fat" value={row.original.parsed.extracted.fat_pct} />
              <BalancingBadge label="Sugar" value={row.original.parsed.extracted.sugar_pct} />
              <BalancingBadge
                label="Solids"
                value={row.original.parsed.extracted.total_solids_pct}
              />
            </div>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">Awaiting OCR</span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setExpandedId((current) =>
                  current === row.original.id ? null : row.original.id
                )
              }
              className="rounded-[4px] border border-[#262626] px-4 py-2 text-xs uppercase tracking-[0.16em] text-white"
            >
              {expandedId === row.original.id ? "Hide" : "Debug"}
            </button>
            <button
              type="button"
              onClick={() => onEditItem(row.original.id)}
              className="rounded-[4px] border border-[#262626] px-4 py-2 text-xs uppercase tracking-[0.16em] text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDeleteItem(row.original.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#262626] text-[var(--danger)]"
              aria-label={`Delete ${row.original.fileName}`}
            >
              ×
            </button>
          </div>
        ),
      }),
    ],
    [expandedId, onDeleteItem, onEditItem]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="rounded-[8px] border border-[#262626] bg-black">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 rounded-t-[8px] border-b border-[#262626] bg-[#0a0a0a] px-6 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Batch Review
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Review Table
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search name or product code"
            className="rounded-[4px] border border-[#262626] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            type="button"
            onClick={onCommitAllVerified}
            disabled={!verifiedCount || isCommitting}
            className="rounded-[4px] bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {isCommitting ? "Committing..." : "Commit All Verified"}
          </button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto">
        <table className="min-w-full divide-y divide-[#262626]">
          <thead className="bg-[#0a0a0a]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-left text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className="bg-black align-top transition hover:bg-[#121212]">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expandedId === row.original.id && row.original.parsed ? (
                    <tr className="bg-[#050505]">
                      <td colSpan={columns.length} className="px-6 pb-5 pt-0">
                        <div className="grid gap-4 rounded-[8px] border border-[#262626] bg-black p-4 lg:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              Parsed Values
                            </p>
                            <pre className="mt-3 overflow-auto rounded-[4px] border border-[#262626] bg-[#050505] p-4 text-xs leading-6 text-white/80">
{JSON.stringify(
  {
    warningFlags: row.original.parsed.warningFlags,
    balancingValues: row.original.parsed.debug.balancingValues,
    nutritionValues: row.original.parsed.debug.nutritionValues,
    extracted: row.original.parsed.extracted,
  },
  null,
  2
)}
                            </pre>
                          </div>
                          <div className="grid gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                Balancing Snippet
                              </p>
                              <pre className="mt-3 max-h-48 overflow-auto rounded-[4px] border border-[#262626] bg-[#050505] p-4 text-xs leading-6 text-white/80">
{row.original.parsed.debug.balancingSection ?? "No balancing section found."}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                Nutrition Snippet
                              </p>
                              <pre className="mt-3 max-h-48 overflow-auto rounded-[4px] border border-[#262626] bg-[#050505] p-4 text-xs leading-6 text-white/80">
{row.original.parsed.debug.nutritionSection ?? "No nutrition section found."}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-[var(--text-muted)]"
                >
                  No rows match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
