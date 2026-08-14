export interface BoardColumn {
  _id: string;
  name: string;
  order: number;
  isDone: boolean;
}

export interface Board {
  _id: string;
  workspaceId: string;
  name: string;
  description?: string;
  columns: BoardColumn[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
