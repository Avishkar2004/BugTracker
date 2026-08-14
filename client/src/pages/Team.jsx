import { useEffect, useState } from "react";
import api, { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, Avatar, Spinner } from "../components/ui.jsx";
import { ROLES } from "../lib/constants.js";
import { formatDate } from "../lib/format.js";

export default function Team() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api
      .get("/users")
      .then(({ data }) => setUsers(data.users))
      .catch((err) => setError(errorMessage(err, "Could not load the team")));
  }, []);

  const changeRole = async (id, role) => {
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u._id === id ? data.user : u)));
      setNotice(`${data.user.name} is now a ${data.user.role}.`);
    } catch (err) {
      setError(errorMessage(err, "Could not change that role"));
    }
  };

  if (!users) return <Spinner label="Loading the team…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-ink-500">Admins can change what each member is allowed to do.</p>
      </header>

      <Alert>{error}</Alert>
      {notice && <Alert tone="success">{notice}</Alert>}

      <ul className="card divide-y divide-ink-100">
        {users.map((member) => (
          <li key={member._id} className="flex items-center gap-3 p-4">
            <Avatar user={member} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{member.name}</p>
              <p className="truncate text-sm text-ink-500">{member.email}</p>
            </div>
            <span className="hidden text-xs text-ink-500 sm:block">
              joined {formatDate(member.createdAt)}
            </span>
            <select
              className="field w-36"
              value={member.role}
              disabled={member._id === user._id}
              title={member._id === user._id ? "You cannot change your own role" : undefined}
              onChange={(e) => changeRole(member._id, e.target.value)}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
