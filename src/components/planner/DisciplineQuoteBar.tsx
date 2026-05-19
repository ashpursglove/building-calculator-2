import { useProjectStore } from "@/store/projectStore";
import { QuoteClassificationBar } from "@/components/planner/QuoteClassificationBar";
import {
  defaultDisciplineClassifications,
  type DisciplineKey,
} from "@/domain/calculate/quoteRollup";

interface Props {
  discipline: DisciplineKey;
  rawUsd: number;
  label?: string;
  compact?: boolean;
}

export function DisciplineQuoteBar({
  discipline,
  rawUsd,
  label,
  compact,
}: Props) {
  const value = useProjectStore(
    (s) =>
      s.disciplineClassifications?.[discipline] ??
      defaultDisciplineClassifications()[discipline],
  );
  const setDisciplineClassification = useProjectStore(
    (s) => s.setDisciplineClassification,
  );

  return (
    <QuoteClassificationBar
      label={label}
      rawUsd={rawUsd}
      value={value}
      compact={compact}
      onChange={(patch) => setDisciplineClassification(discipline, patch)}
    />
  );
}
