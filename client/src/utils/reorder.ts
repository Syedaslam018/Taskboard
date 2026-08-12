import { Task } from "@/types/task";

/**
 * Pure function extracted from BoardPage's onDragEnd so the reorder logic
 * can be unit tested without mounting @hello-pangea/dnd or the whole page.
 * Splices `moved` out of the source column and into the destination column
 * at the given index - purely a client-side array operation; the actual
 * position numbers are recalculated server-side (see task.service.ts).
 */
export function reorderColumns(
  columns: Record<string, Task[]>,
  params: { sourceColumnId: string; sourceIndex: number; destColumnId: string; destIndex: number }
): Record<string, Task[]> {
  const { sourceColumnId, sourceIndex, destColumnId, destIndex } = params;
  const next: Record<string, Task[]> = { ...columns };

  const sourceList = Array.from(next[sourceColumnId] ?? []);
  const [moved] = sourceList.splice(sourceIndex, 1);
  next[sourceColumnId] = sourceList;

  const destList = sourceColumnId === destColumnId ? sourceList : Array.from(next[destColumnId] ?? []);
  destList.splice(destIndex, 0, moved);
  next[destColumnId] = destList;

  return next;
}
