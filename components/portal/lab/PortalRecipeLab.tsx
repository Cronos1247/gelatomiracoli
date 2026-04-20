"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FlaskConical, Loader2, Save, Sparkles } from "lucide-react";
import { TelemetryHUD } from "./TelemetryHUD";

export type PortalLabIngredient = {
  id: string;
  name: string;
  category: string;
  pac_value: number;
  pod_value: number;
  total_solids_pct: number;
};

type ActiveRecipeItem = PortalLabIngredient & {
  instanceId: string;
  weightGrams: number;
};

type SaveState = "idle" | "saving" | "success";
type ToastState =
  | {
      tone: "success" | "error";
      message: string;
    }
  | null;

function createInstanceId(sourceId: string) {
  return `${sourceId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatMetric(value: number) {
  return Math.round(value);
}

function calculateTotals(items: ActiveRecipeItem[]) {
  return items.reduce(
    (totals, item) => {
      totals.pac += (item.weightGrams / 100) * item.pac_value;
      totals.pod += (item.weightGrams / 100) * item.pod_value;
      totals.solids += (item.weightGrams / 100) * item.total_solids_pct;
      totals.weight += item.weightGrams;
      return totals;
    },
    { pac: 0, pod: 0, solids: 0, weight: 0 }
  );
}

function DraggableIngredient({
  ingredient,
}: {
  ingredient: PortalLabIngredient;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shelf:${ingredient.id}`,
    data: {
      source: "shelf",
      ingredient,
    },
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      whileTap={{ scale: 0.98 }}
      animate={{
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging ? "0px 20px 40px rgba(0,0,0,0.5)" : "0px 0px 0px rgba(0,0,0,0)",
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      className="cursor-grab rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-cyan-200/80" />
        <span className="text-sm">{ingredient.name}</span>
      </div>
    </motion.div>
  );
}

function SortableRecipeItem({
  item,
  onWeightChange,
}: {
  item: ActiveRecipeItem;
  onWeightChange: (instanceId: string, nextWeight: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      animate={{
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging ? "0px 20px 40px rgba(0,0,0,0.38)" : "0px 0px 0px rgba(0,0,0,0)",
      }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="group rounded-[1.5rem] border border-white/8 bg-white/[0.04] px-5 py-4"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-base text-white">{item.name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/38">
            {item.category}
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-transparent bg-white/[0.02] px-3 py-2 opacity-70 transition group-hover:border-white/10 group-hover:opacity-100 group-focus-within:border-white/10 group-focus-within:opacity-100">
          <input
            type="number"
            value={item.weightGrams}
            min={0}
            step={5}
            onChange={(event) => onWeightChange(item.instanceId, Number(event.target.value))}
            className="w-28 bg-transparent text-right font-mono text-2xl font-bold text-[#00E5FF] outline-none"
          />
          <span className="text-xs uppercase tracking-[0.2em] text-white/35">g</span>
        </label>
      </div>
    </motion.div>
  );
}

function VatDropZone({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "recipe-vat",
  });
  const { active } = useDndContext();
  const highlighted = Boolean(active) && isOver;

  return (
    <motion.div
      ref={setNodeRef}
      animate={{
        borderColor: highlighted ? "rgba(6, 182, 212, 0.5)" : "rgba(255,255,255,0.05)",
        backgroundColor: highlighted ? "rgba(8, 47, 73, 0.14)" : "rgba(0,0,0,0.2)",
      }}
      transition={{ type: "spring", stiffness: 110, damping: 18 }}
      className="rounded-3xl border p-3"
    >
      {children}
    </motion.div>
  );
}

export function PortalRecipeLab({
  ingredients,
}: {
  ingredients: PortalLabIngredient[];
}) {
  const [recipeName, setRecipeName] = useState("Untitled Formula");
  const [activeItems, setActiveItems] = useState<ActiveRecipeItem[]>([]);
  const [draggedIngredient, setDraggedIngredient] = useState<PortalLabIngredient | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [toast, setToast] = useState<ToastState>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const totals = useMemo(() => calculateTotals(activeItems), [activeItems]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (saveState !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => setSaveState("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  function handleDragStart(event: DragStartEvent) {
    const ingredient = event.active.data.current?.ingredient as PortalLabIngredient | undefined;
    setDraggedIngredient(ingredient ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedIngredient(null);

    const source = event.active.data.current?.source;
    const ingredient = event.active.data.current?.ingredient as PortalLabIngredient | undefined;

    if (source === "shelf" && ingredient && event.over?.id === "recipe-vat") {
      setActiveItems((current) => [
        ...current,
        {
          ...ingredient,
          instanceId: createInstanceId(ingredient.id),
          weightGrams: 100,
        },
      ]);
      return;
    }

    if (source === "shelf" || !event.over || event.active.id === event.over.id) {
      return;
    }

    setActiveItems((current) => {
      const oldIndex = current.findIndex((item) => item.instanceId === event.active.id);
      const newIndex = current.findIndex((item) => item.instanceId === event.over?.id);

      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function updateWeight(instanceId: string, nextWeight: number) {
    const safeWeight = Number.isFinite(nextWeight) ? Math.max(0, nextWeight) : 0;
    setActiveItems((current) =>
      current.map((item) =>
        item.instanceId === instanceId ? { ...item, weightGrams: safeWeight } : item
      )
    );
  }

  async function saveToVault() {
    if (saveState === "saving") {
      return;
    }

    if (!recipeName.trim() || activeItems.length === 0) {
      setToast({
        tone: "error",
        message: "Add a recipe name and at least one ingredient before saving.",
      });
      return;
    }

    setSaveState("saving");

    try {
      const payload = {
        recipeName: recipeName.trim(),
        ingredients: activeItems.map((item) => ({
          ingredientId: item.id,
          name: item.name,
          grams: item.weightGrams,
          percentage: totals.weight > 0 ? (item.weightGrams / totals.weight) * 100 : 0,
          category: item.category,
        })),
        totalPac: totals.pac,
        totalPod: totals.pod,
        totalSolids: totals.solids,
        totalMixWeight: totals.weight,
      };

      const [response] = await Promise.all([
        fetch("/api/portal/lab", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 500)),
      ]);

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to save this recipe.");
      }

      setSaveState("success");
      setToast({
        tone: "success",
        message: `Recipe Saved: PAC ${formatMetric(totals.pac)} / POD ${formatMetric(totals.pod)}`,
      });
    } catch (error) {
      setSaveState("idle");
      setToast({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save this recipe right now.",
      });
    }
  }

  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                  Ingredient Shelf
                </p>
                <h1
                  className="mt-3 text-3xl text-white"
                  style={{ fontFamily: "var(--font-miracoli-serif)" }}
                >
                  Magnetic Drag & Drop Lab
                </h1>
              </div>
              <FlaskConical className="text-cyan-200/80" />
            </div>
            <p className="mt-4 text-sm leading-7 text-white/55">
              Pull ingredients from the shelf and drop them into the vat to build a live formula.
            </p>

            <div className="mt-6 max-h-[72vh] space-y-3 overflow-y-auto pr-2">
              {ingredients.map((ingredient) => (
                <DraggableIngredient key={ingredient.id} ingredient={ingredient} />
              ))}
            </div>
          </section>

          <section>
            <VatDropZone>
              <div className="overflow-hidden rounded-[1.55rem]">
                <TelemetryHUD totalPac={totals.pac} totalPod={totals.pod} />

                <div className="space-y-4 p-5">
                  <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.24em] text-white/36">
                        Formula Name
                      </span>
                      <input
                        value={recipeName}
                        onChange={(event) => setRecipeName(event.target.value)}
                        className="mt-3 w-full bg-transparent text-2xl text-white outline-none"
                      />
                    </label>
                  </div>

                  {activeItems.length ? (
                    <SortableContext
                      items={activeItems.map((item) => item.instanceId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {activeItems.map((item) => (
                          <SortableRecipeItem
                            key={item.instanceId}
                            item={item}
                            onWeightChange={updateWeight}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-white/45">
                      Drop ingredients here to start building your recipe.
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-white/8 bg-black/20 px-5 py-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/36">
                        Batch Summary
                      </p>
                      <p className="mt-2 font-mono text-2xl text-[#00E5FF]">
                        {totals.weight.toFixed(0)}g
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => void saveToVault()}
                      disabled={saveState === "saving"}
                      layout
                      whileHover={saveState === "idle" ? { scale: 1.02 } : undefined}
                      whileTap={saveState === "idle" ? { scale: 0.96 } : undefined}
                      className={`inline-flex min-w-44 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition ${
                        saveState === "success"
                          ? "border-[#00E676]/30 bg-[#00E676]/20 text-[#C9FFDD]"
                          : "border-white/15 bg-white/10 text-white hover:bg-white/20"
                      } ${saveState === "saving" ? "cursor-wait" : ""}`}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {saveState === "saving" ? (
                          <motion.span
                            key="saving"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-2"
                          >
                            <Loader2 className="animate-spin text-[#00E5FF]" size={16} />
                          </motion.span>
                        ) : saveState === "success" ? (
                          <motion.span
                            key="success"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-2"
                          >
                            <Check size={16} />
                            <span>Vaulted</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="idle"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-2"
                          >
                            <Save size={16} />
                            <span>Save to Vault</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
              </div>
            </VatDropZone>
          </section>
        </div>

        <DragOverlay>
          {draggedIngredient ? <DraggableIngredient ingredient={draggedIngredient} /> : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-6 py-3 shadow-2xl backdrop-blur-2xl ${
              toast.tone === "success"
                ? "border-white/10 bg-black/60 text-white"
                : "border-rose-400/20 bg-black/70 text-rose-100"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.tone === "success" ? (
                <Check size={16} className="text-[#00E676]" />
              ) : (
                <Loader2 size={16} className="text-rose-300" />
              )}
              <span className="text-sm text-white/88">{toast.message}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
