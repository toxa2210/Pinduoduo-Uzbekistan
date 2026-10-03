import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

type VirtualProductGridProps<T> = {
  items: T[];
  columns: 2 | 3 | 4;
  className?: string;
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
};

function useEffectiveColumns(columns: 2 | 3 | 4): number {
  const [effectiveColumns, setEffectiveColumns] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 620px)").matches
      ? Math.min(columns, 2)
      : typeof window !== "undefined" && window.matchMedia("(max-width: 980px)").matches
        ? Math.min(columns, 2)
        : columns,
  );

  useEffect(() => {
    const updateColumns = () => {
      const available = window.matchMedia("(max-width: 980px)").matches ? 2 : 4;
      setEffectiveColumns(Math.min(columns, available));
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [columns]);

  return effectiveColumns;
}

export function VirtualProductGrid<T>({
  items,
  columns,
  className = "",
  getKey,
  renderItem,
}: VirtualProductGridProps<T>) {
  const effectiveColumns = useEffectiveColumns(columns);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const rowCount = Math.ceil(items.length / effectiveColumns);
  useLayoutEffect(() => {
    const updateOffset = () => {
      if (containerRef.current) setScrollMargin(containerRef.current.getBoundingClientRect().top + window.scrollY);
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [items.length, effectiveColumns]);
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 440,
    overscan: 3,
    gap: 14,
    scrollMargin,
    getItemKey: (rowIndex) => items
      .slice(rowIndex * effectiveColumns, (rowIndex + 1) * effectiveColumns)
      .map(getKey)
      .join(":"),
  });

  return (
    <div
      ref={containerRef}
      className={`virtual-product-grid ${className}`}
      style={{ height: Math.max(0, virtualizer.getTotalSize() - scrollMargin) }}
    >
      {virtualizer.getVirtualItems().map((row) => (
        <div
          key={row.key}
          ref={virtualizer.measureElement}
          data-index={row.index}
          className="virtual-product-row"
          style={{
            gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
            transform: `translateY(${row.start - scrollMargin}px)`,
          }}
        >
          {items.slice(row.index * effectiveColumns, (row.index + 1) * effectiveColumns)
            .map((item, columnIndex) => renderItem(item, row.index * effectiveColumns + columnIndex))}
        </div>
      ))}
    </div>
  );
}
