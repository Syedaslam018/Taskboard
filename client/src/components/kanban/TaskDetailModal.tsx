import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Task } from "@/types/task";
import { Comment } from "@/types/comment";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from "@/hooks/useComments";
import { useCurrentUser } from "@/hooks/useAuth";
import { timeAgo } from "@/utils/timeAgo";
import { getErrorMessage } from "@/utils/getErrorMessage";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Spinner from "@/components/ui/Spinner";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import Icon from "@/components/ui/Icon";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  assignee: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// Matches the server's comment validator (z.string().trim().min(1).max(3000)),
// so we reject over-long content client-side before the request.
const MAX_COMMENT = 3000;

interface Props {
  boardId: string;
  workspaceId: string;
  task: Task;
  // From the caller's workspace role (threaded through BoardPage). Task delete
  // is ADMIN-gated server-side; commenting requires MEMBER or above.
  canAdmin?: boolean;
  canComment?: boolean;
  onClose: () => void;
}

export default function TaskDetailModal({ boardId, workspaceId, task, canAdmin, canComment, onClose }: Props) {
  const updateTask = useUpdateTask(boardId);
  const deleteTask = useDeleteTask(boardId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: currentUser } = useCurrentUser();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assignee: task.assignee ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await updateTask.mutateAsync({
      taskId: task._id,
      updates: {
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        assignee: values.assignee || null,
      },
    });
    onClose();
  });

  const onConfirmDelete = async () => {
    setDeleteError(null);
    try {
      await deleteTask.mutateAsync(task._id);
      onClose();
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Could not delete this task."));
    }
  };

  return (
    <Modal
      title="Task details"
      size="lg"
      onClose={onClose}
      footer={
        <>
          {canAdmin && (
            <button type="button" className="tb-btn-danger mr-auto" onClick={() => setConfirmingDelete(true)}>
              <Icon name="trash" size={16} />
              Delete
            </button>
          )}
          <button type="button" className="tb-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="tb-btn-primary" onClick={onSubmit} disabled={updateTask.isPending}>
            {updateTask.isPending && <Spinner size={16} />}
            Save changes
          </button>
        </>
      }
    >
      <form id="task-edit-form" onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="tb-label">Title</label>
          <input {...register("title")} className="tb-input" />
          {errors.title && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title.message}</p>}
        </div>
        <div>
          <label className="tb-label">Description</label>
          <textarea {...register("description")} rows={3} className="tb-textarea" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label className="tb-label">Priority</label>
            <select {...register("priority")} className="tb-select">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="tb-label">Due date</label>
            <input type="date" {...register("dueDate")} className="tb-input" />
          </div>
        </div>
        <div>
          <label className="tb-label">Assignee</label>
          <select {...register("assignee")} className="tb-select">
            <option value="">Unassigned</option>
            {members?.map((m) => (
              <option key={m.user._id} value={m.user._id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>
      </form>

      <hr className="my-5 border-slate-200 dark:border-slate-800" />

      <CommentsSection taskId={task._id} canComment={Boolean(canComment)} currentUserId={currentUser?._id} />

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete task"
          danger
          confirmLabel="Delete"
          loading={deleteTask.isPending}
          onConfirm={onConfirmDelete}
          onClose={() => setConfirmingDelete(false)}
          message={
            <>
              Delete <span className="font-medium">&ldquo;{task.title}&rdquo;</span>? This can&apos;t be undone.
              {deleteError && (
                <span className="mt-2 block font-medium text-red-600 dark:text-red-400">{deleteError}</span>
              )}
            </>
          }
        />
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

function CommentsSection({
  taskId,
  canComment,
  currentUserId,
}: {
  taskId: string;
  canComment: boolean;
  currentUserId?: string;
}) {
  const { data: comments, isLoading } = useComments(taskId);

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Icon name="users" size={16} className="text-slate-400 dark:text-slate-500" />
        Comments
        {comments && comments.length > 0 && (
          <span className="font-normal text-slate-400 dark:text-slate-500">({comments.length})</span>
        )}
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : comments && comments.length > 0 ? (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              taskId={taskId}
              isOwn={Boolean(currentUserId) && comment.author._id === currentUserId}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500">No comments yet.</p>
      )}

      {canComment ? (
        <CommentComposer taskId={taskId} />
      ) : (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          You have view-only access and can&apos;t comment on this board.
        </p>
      )}
    </section>
  );
}

function CommentComposer({ taskId }: { taskId: string }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createComment = useCreateComment(taskId);

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_COMMENT) {
      setError(`Comments must be ${MAX_COMMENT} characters or fewer.`);
      return;
    }
    setError(null);
    try {
      await createComment.mutateAsync(trimmed);
      setContent("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not post your comment."));
    }
  };

  return (
    <div className="mt-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter to submit, matching common comment UX.
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        placeholder="Write a comment..."
        className="tb-textarea"
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="tb-btn-primary text-sm"
          onClick={submit}
          disabled={createComment.isPending || !content.trim()}
        >
          {createComment.isPending ? <Spinner size={16} /> : <Icon name="send" size={16} />}
          Comment
        </button>
      </div>
    </div>
  );
}

function CommentItem({ comment, taskId, isOwn }: { comment: Comment; taskId: string; isOwn: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(comment.content);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const updateComment = useUpdateComment(taskId);
  const deleteComment = useDeleteComment(taskId);

  const edited = comment.updatedAt !== comment.createdAt;

  const submitEdit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_COMMENT) {
      setError(`Comments must be ${MAX_COMMENT} characters or fewer.`);
      return;
    }
    setError(null);
    try {
      await updateComment.mutateAsync({ commentId: comment._id, content: trimmed });
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the comment."));
    }
  };

  const onConfirmDelete = async () => {
    setDeleteError(null);
    try {
      await deleteComment.mutateAsync(comment._id);
      setConfirmingDelete(false);
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Could not delete the comment."));
    }
  };

  return (
    <li className="flex gap-3">
      <Avatar name={comment.author.name} src={comment.author.avatar} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{comment.author.name}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(comment.createdAt)}</span>
          {edited && <span className="text-xs text-slate-400 dark:text-slate-500">(edited)</span>}
        </div>

        {editing ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={2}
              className="tb-textarea"
            />
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                className="tb-btn-primary px-3 py-1 text-xs"
                onClick={submitEdit}
                disabled={updateComment.isPending || !value.trim()}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => {
                  setEditing(false);
                  setValue(comment.content);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">
            {comment.content}
          </p>
        )}

        {isOwn && !editing && (
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              className="text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              onClick={() => {
                setValue(comment.content);
                setError(null);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="text-xs font-medium text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              onClick={() => {
                setDeleteError(null);
                setConfirmingDelete(true);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete comment"
          danger
          confirmLabel="Delete"
          loading={deleteComment.isPending}
          onConfirm={onConfirmDelete}
          onClose={() => setConfirmingDelete(false)}
          message={
            <>
              Delete this comment? This can&apos;t be undone.
              {deleteError && (
                <span className="mt-2 block font-medium text-red-600 dark:text-red-400">{deleteError}</span>
              )}
            </>
          }
        />
      )}
    </li>
  );
}
