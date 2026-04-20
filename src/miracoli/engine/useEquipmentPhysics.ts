"use client";

import { useMemo, useState } from "react";
import { displayTypePacRanges, type DisplayType, type Equipment } from "@/lib/default-data";

export type OutputViewMode = "Weight" | "Liters";

type UseEquipmentPhysicsOptions = {
  selectedEquipment: Equipment;
  displayType: DisplayType;
};

export function useEquipmentPhysics({
  selectedEquipment,
  displayType,
}: UseEquipmentPhysicsOptions) {
  const [outputView, setOutputView] = useState<OutputViewMode>("Weight");

  const physics = useMemo(() => {
    const defaultOverrunPct = selectedEquipment.default_overrun_pct;
    const expansionFactor = 1 + defaultOverrunPct / 100;

    return {
      defaultOverrunPct,
      expansionFactor,
      pacRange: displayTypePacRanges[displayType],
      outputView,
      setOutputView,
    };
  }, [displayType, outputView, selectedEquipment.default_overrun_pct]);

  return physics;
}
