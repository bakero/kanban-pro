import React, { useState } from "react";

interface DragListProps<T> {
  items: T[];
  renderItem: (item: T, i: number) => React.ReactNode;
  onReorder: (items: T[]) => void;
  keyFn: (item: T) => string;
}

export function DragList<T>({ items, renderItem, onReorder, keyFn }: DragListProps<T>) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver]         = useState<number | null>(null);

  function drop(toIdx: number) {
    if (dragging === null || dragging === toIdx) return;
    const next = [...items];
    const [moved] = next.splice(dragging, 1);
    next.splice(toIdx, 0, moved);
    onReorder(next);
    setDragging(null);
    setOver(null);
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={keyFn(item)} draggable
          onDragStart={e => { e.stopPropagation(); setDragging(i); }}
          onDragOver={e  => { e.preventDefault(); setOver(i); }}
          onDrop={e      => { e.preventDefault(); drop(i); }}
          onDragEnd={()  => { setDragging(null); setOver(null); }}
          style={{
            opacity: dragging === i ? 0.4 : 1,
            outline: over === i && dragging !== i ? "2px solid #7F77DD" : "none",
            borderRadius: 10,
          }}>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
}
