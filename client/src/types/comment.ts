export interface CommentAuthor {
  _id: string;
  name: string;
  avatar?: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  // Populated server-side ("author", "name avatar"); the socket payload and
  // REST responses both send this shape.
  author: CommentAuthor;
  content: string;
  createdAt: string;
  updatedAt: string;
}
