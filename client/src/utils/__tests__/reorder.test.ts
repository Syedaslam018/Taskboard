import { describe, it, expect } from "vitest";
import { reorderColumns } from "../reorder";
import { Task } from "@/types/task";

function makeTask(id: string, columnId: string, position: number): Task {
  return {
    _id: id,
    boardId: "board1",
    columnId,
    title: id,
    priority: "MEDIUM",
    createdBy: "user1",
    labels: [],
    position,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("reorderColumns", () => {
  it("reorders tasks within the same column", () => {
    const columns = {
      col1: [makeTask("A", "col1", 0), makeTask("B", "col1", 1), makeTask("C", "col1", 2)],
    };

    const result = reorderColumns(columns, {
      sourceColumnId: "col1",
      sourceIndex: 0,
      destColumnId: "col1",
      destIndex: 2,
    });

    expect(result.col1.map((t) => t._id)).toEqual(["B", "C", "A"]);
  });

  it("moves a task from one column to another at the target index", () => {
    const columns = {
      col1: [makeTask("A", "col1", 0), makeTask("B", "col1", 1)],
      col2: [makeTask("C", "col2", 0)],
    };

    const result = reorderColumns(columns, {
      sourceColumnId: "col1",
      sourceIndex: 0,
      destColumnId: "col2",
      destIndex: 0,
    });

    expect(result.col1.map((t) => t._id)).toEqual(["B"]);
    expect(result.col2.map((t) => t._id)).toEqual(["A", "C"]);
  });

  it("does not mutate the original columns object", () => {
    const columns = { col1: [makeTask("A", "col1", 0)], col2: [] as Task[] };
    const original = JSON.parse(JSON.stringify(columns));

    reorderColumns(columns, { sourceColumnId: "col1", sourceIndex: 0, destColumnId: "col2", destIndex: 0 });

    expect(columns).toEqual(original);
  });
});
