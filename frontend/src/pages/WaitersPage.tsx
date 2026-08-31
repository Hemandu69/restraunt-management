import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../api/client";
import * as waitersApi from "../api/waiters";
import type { User } from "../types/user";
import { Modal } from "../components/Modal";
import { Alert } from "../components/Alert";
import { RoleBadge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";

interface CreateFormState {
  name: string;
  email: string;
  password: string;
}

const EMPTY_CREATE_FORM: CreateFormState = { name: "", email: "", password: "" };

// Manager-only. Deliberately has no activate/deactivate workflow -
// deactivation is not a current application feature (see backend: the
// `status` column and login-time ACTIVE check still exist for possible
// future account administration, but nothing here writes to it).
export function WaitersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [createTouched, setCreateTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [editTouched, setEditTouched] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadWaiters = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await waitersApi.listWaiters();
      setUsers(data);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Could not load waiters. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWaiters();
  }, [loadWaiters]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  const createEmailValid = /^\S+@\S+\.\S+$/.test(createForm.email);
  const createNameValid = createForm.name.trim().length > 0;
  const createPasswordValid = createForm.password.length >= 8;
  const createFormValid = createEmailValid && createNameValid && createPasswordValid;

  function closeCreate() {
    setIsCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateTouched(false);
    setCreateError(null);
  }

  async function handleCreateSubmit(event: FormEvent) {
    event.preventDefault();
    setCreateTouched(true);
    setCreateError(null);
    if (!createFormValid) return;

    setIsCreating(true);
    try {
      await waitersApi.createWaiter(createForm);
      const name = createForm.name;
      closeCreate();
      setBanner({ type: "success", text: `${name} was added as a waiter.` });
      await loadWaiters();
    } catch (err) {
      setCreateError(getApiErrorMessage(err, "Could not create the waiter account."));
    } finally {
      setIsCreating(false);
    }
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email });
    setEditTouched(false);
    setEditError(null);
  }

  const editNameValid = editForm.name.trim().length > 0;
  const editEmailValid = /^\S+@\S+\.\S+$/.test(editForm.email);

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    setEditTouched(true);
    if (!editingUser || !editNameValid || !editEmailValid) return;
    setEditError(null);
    setIsSavingEdit(true);
    try {
      await waitersApi.updateWaiter(editingUser.id, editForm);
      setEditingUser(null);
      setBanner({ type: "success", text: `${editForm.name}'s details were updated.` });
      await loadWaiters();
    } catch (err) {
      setEditError(getApiErrorMessage(err, "Could not update this waiter."));
    } finally {
      setIsSavingEdit(false);
    }
  }

  const hasUsers = users.length > 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Waiters</h1>
          <p className="muted">Manage waiter accounts and view operational activity.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          + Add Waiter
        </button>
      </div>

      {banner && <Alert tone={banner.type}>{banner.text}</Alert>}

      <div
        className="card"
        style={{ marginTop: banner ? "1rem" : 0, padding: isLoading || loadError || !hasUsers ? "1.5rem" : 0 }}
      >
        {isLoading && <WaitersTableSkeleton />}

        {!isLoading && loadError && (
          <div style={{ padding: "0.5rem" }}>
            <Alert tone="error">{loadError}</Alert>
            <button type="button" className="btn btn-secondary" style={{ marginTop: "1rem" }} onClick={loadWaiters}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !loadError && !hasUsers && (
          <EmptyState
            icon="◎"
            title="No waiters yet"
            description="Add your first waiter to start managing restaurant operations."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
                + Add Waiter
              </button>
            }
          />
        )}

        {!isLoading && !loadError && hasUsers && (
          <div className="table-wrapper">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th scope="col">Waiter</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Last Login</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const canManage = user.role === "WAITER";
                  return (
                    <tr key={user.id}>
                      <td data-label="Waiter">
                        <div className="identity">
                          <Avatar name={user.name} />
                          <span className="identity-name">{user.name}</span>
                        </div>
                      </td>
                      <td data-label="Email">{user.email}</td>
                      <td data-label="Role">
                        <RoleBadge role={user.role} />
                      </td>
                      <td data-label="Last Login" className="muted">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                      </td>
                      <td data-label="Actions" className="cell-actions">
                        {canManage ? (
                          <div className="table-actions">
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(user)}>
                              Edit
                            </button>
                          </div>
                        ) : isSelf ? (
                          <span className="badge badge-you">You</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <Modal
          title="Add Waiter"
          description="Create a new waiter account. They'll sign in with this email."
          onClose={closeCreate}
        >
          <form className="stack" onSubmit={handleCreateSubmit} noValidate>
            {createError && <Alert tone="error">{createError}</Alert>}
            <div className="field">
              <label htmlFor="create-name">
                Full name <span className="required-mark">*</span>
              </label>
              <input
                id="create-name"
                placeholder="Jane Doe"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                data-touched={createTouched}
                aria-invalid={createTouched && !createNameValid}
                aria-describedby={createTouched && !createNameValid ? "create-name-error" : undefined}
                required
              />
              {createTouched && !createNameValid && (
                <span className="field-error" id="create-name-error">
                  Name is required.
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="create-email">
                Email <span className="required-mark">*</span>
              </label>
              <input
                id="create-email"
                type="email"
                placeholder="jane@restaurant.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                data-touched={createTouched}
                aria-invalid={createTouched && !createEmailValid}
                aria-describedby={createTouched && !createEmailValid ? "create-email-error" : undefined}
                required
              />
              {createTouched && !createEmailValid && (
                <span className="field-error" id="create-email-error">
                  Enter a valid email address.
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="create-password">
                Temporary password <span className="required-mark">*</span>
              </label>
              <input
                id="create-password"
                type="password"
                placeholder="At least 8 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                data-touched={createTouched}
                aria-invalid={createTouched && !createPasswordValid}
                aria-describedby={createTouched && !createPasswordValid ? "create-password-error" : "create-password-hint"}
                required
              />
              {createTouched && !createPasswordValid ? (
                <span className="field-error" id="create-password-error">
                  Password must be at least 8 characters.
                </span>
              ) : (
                <span className="field-hint" id="create-password-hint">
                  Share this with them directly - they can change it after signing in.
                </span>
              )}
            </div>
            <p className="form-note">New accounts are always created with the Waiter role.</p>
            <div className="table-actions">
              <button type="submit" className="btn btn-primary" disabled={isCreating}>
                {isCreating ? "Adding…" : "Add Waiter"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeCreate} disabled={isCreating}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingUser && (
        <Modal title={`Edit ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <form className="stack" onSubmit={handleEditSubmit} noValidate>
            {editError && <Alert tone="error">{editError}</Alert>}
            <div className="field">
              <label htmlFor="edit-name">
                Full name <span className="required-mark">*</span>
              </label>
              <input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                data-touched={editTouched}
                aria-invalid={editTouched && !editNameValid}
                required
              />
              {editTouched && !editNameValid && <span className="field-error">Name is required.</span>}
            </div>
            <div className="field">
              <label htmlFor="edit-email">
                Email <span className="required-mark">*</span>
              </label>
              <input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                data-touched={editTouched}
                aria-invalid={editTouched && !editEmailValid}
                required
              />
              {editTouched && !editEmailValid && <span className="field-error">Enter a valid email address.</span>}
            </div>
            <div className="table-actions">
              <button type="submit" className="btn btn-primary" disabled={isSavingEdit}>
                {isSavingEdit ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)} disabled={isSavingEdit}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function WaitersTableSkeleton() {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th scope="col">Waiter</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Last Login</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i} className="skeleton-row" aria-hidden="true">
              <td>
                <div className="identity">
                  <span className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                  <span className="skeleton skeleton-line" style={{ width: 110 }} />
                </div>
              </td>
              <td>
                <span className="skeleton skeleton-line" style={{ width: 150 }} />
              </td>
              <td>
                <span className="skeleton skeleton-line" style={{ width: 70 }} />
              </td>
              <td>
                <span className="skeleton skeleton-line" style={{ width: 80 }} />
              </td>
              <td>
                <span className="skeleton skeleton-line" style={{ width: 100 }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only" role="status">
        Loading waiters…
      </span>
    </div>
  );
}
