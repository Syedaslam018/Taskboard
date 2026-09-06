import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Board } from "@/types/board";
import { useUpdateBoard, useDeleteBoard } from "@/hooks/useBoards";
import { getErrorMessage } from "@/utils/getErrorMessage";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Spinner from "@/components/ui/Spinner";

// Board rename / delete menu shown in the TopBar actions slot. Only mounted
// for ADMIN/OWNER (see BoardPage) since both actions are ADMIN-gated
// server-side. Delete navigates back to the parent workspace on success.
export default function BoardActionsMenu({ board }: { board: Board }) {
  const navigate = useNavigate();
  const updateBoard = useUpdateBoard(board._id);
  const deleteBoard = useDeleteBoard(board._id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openRename = () => {
    setName(board.name);
    setDescription(board.description ?? "");
    setRenameError(null);
    setRenaming(true);
    setMenuOpen(false);
  };

  const submitRename = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRenameError(null);
    try {
      await updateBoard.mutateAsync({ name: trimmed, description: description.trim() || undefined });
      setRenaming(false);
    } catch (err) {
      setRenameError(getErrorMessage(err, "Could not update the board."));
    }
  };

  const onConfirmDelete = async () => {
    setDeleteError(null);
    try {
      await deleteBoard.mutateAsync();
      navigate(`/workspaces/${board.workspaceId}`);
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Could not delete this board."));
    }
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Board options"
          className="tb-icon-button"
        >
          <Icon name="more-horizontal" size={20} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="tb-menu absolute right-0 z-50 mt-2 w-44 origin-top-right animate-scale-in">
              <button className="tb-menu-item" onClick={openRename}>
                <Icon name="pencil" size={16} />
                Rename board
              </button>
              <button
                className="tb-menu-item text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteError(null);
                  setConfirmingDelete(true);
                }}
              >
                <Icon name="trash" size={16} />
                Delete board
              </button>
            </div>
          </>
        )}
      </div>

      {renaming && (
        <Modal
          title="Rename board"
          size="sm"
          onClose={() => setRenaming(false)}
          footer={
            <>
              <button type="button" className="tb-btn-secondary" onClick={() => setRenaming(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="tb-btn-primary"
                onClick={submitRename}
                disabled={updateBoard.isPending || !name.trim()}
              >
                {updateBoard.isPending && <Spinner size={16} />}
                Save
              </button>
            </>
          }
        >
          <label className="tb-label">Board name</label>
          <input
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
            className="tb-input"
          />
          <label className="tb-label mt-3">Description</label>
          <textarea
            value={description}
            rows={2}
            maxLength={280}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="tb-textarea"
          />
          {renameError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{renameError}</p>}
        </Modal>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete board"
          danger
          confirmLabel="Delete"
          loading={deleteBoard.isPending}
          onConfirm={onConfirmDelete}
          onClose={() => setConfirmingDelete(false)}
          message={
            <>
              Delete <span className="font-medium">&ldquo;{board.name}&rdquo;</span> and all of its columns and
              tasks? This can&apos;t be undone.
              {deleteError && (
                <span className="mt-2 block font-medium text-red-600 dark:text-red-400">{deleteError}</span>
              )}
            </>
          }
        />
      )}
    </>
  );
}
