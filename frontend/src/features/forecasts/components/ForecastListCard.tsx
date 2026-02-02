import { forwardRef } from "react";

import type { ForecastGroup } from "../api";

import { ForecastDetailCard } from "./ForecastDetailCard";

interface ForecastListCardProps {
  group: ForecastGroup;
  onDelete: (forecastId: number) => void;
  isDeleting: boolean;
  isOpen: boolean;
  isActive: boolean;
  isFocused?: boolean;
  onToggle: () => void;
}

export const ForecastListCard = forwardRef<HTMLDivElement, ForecastListCardProps>(
  ({ group, onDelete, isDeleting, isOpen, isActive, isFocused, onToggle }, ref) => {
    const groupKey = `${group.group_key.customer_id}-${group.group_key.delivery_place_id}-${group.group_key.supplier_item_id}`;

    return (
      <div ref={ref} data-group-key={groupKey} className="scroll-mt-24">
        <ForecastDetailCard
          group={group}
          onDelete={onDelete}
          isDeleting={isDeleting}
          isOpen={isOpen}
          isActive={isActive}
          isFocused={isFocused}
          onToggle={onToggle}
        />
      </div>
    );
  },
);

ForecastListCard.displayName = "ForecastListCard";
