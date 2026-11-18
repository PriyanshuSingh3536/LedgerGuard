import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { me, logout } = useAuth();
  return (
    <div style={{ padding: 24 }}>
      <h2>Dashboard</h2>
      <p>Organization: <b>{me?.organizationId}</b> | Role: {me?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}