import type { ConcreteElementType } from "@/domain/calculate/concrete";

/** Human-readable concrete element combo labels (tabs + PDF). */
export const CONCRETE_ELEMENT_LABELS = [
  "Slab / Base",
  "Strip Footing",
  "Wall",
  "Isolated Footing",
] as const;

const TYPE_LABELS: Record<ConcreteElementType, string> = {
  slab: "Slab / Base",
  strip: "Strip Footing",
  wall: "Wall",
  isolated: "Isolated Footing",
};

export function concreteLabelFromIndex(i: number): string {
  return CONCRETE_ELEMENT_LABELS[
    Math.max(0, Math.min(CONCRETE_ELEMENT_LABELS.length - 1, i))
  ];
}

export function concreteLabelFromType(t: ConcreteElementType): string {
  return TYPE_LABELS[t];
}
