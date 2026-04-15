import React, { useState } from 'react';
import { Users, Plus, Edit, Key, UserCheck, UserX, Shield } from 'lucide-react';
import { useFetch, apiPost, apiPut } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const ROLES = ['admin', 'manager', 'viewer', 'operator'];
const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-700',
  operator: 'bg-green-100 text-green-700',
};
const ROLE_DESCRIPTIONS = {
  admin: 'Full access to all features',
  manager: 'Edit complaints, CCRs, SOPs',
  viewer: 'Read-only access',
  operator: 'View assigned SOPs only',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { data: users, loading, error, refetch } = useFetch('/api/users');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showResetPw, setShowResetPw] = useState(null);
  const [createForm, setCreateForm] = useState({ username: '', password: '', display_name: '', role: 'viewer' });
  const [editForm, setEditForm] = useState({});
  const [resetPw, setResetPw] = useState('');
  const [formError, setFormError] = useState('');

  if (loading) return <LoadingSpinner message="Loading users..." />;
  if (error) return <div className="text-center py-16 text-red-600">Failed to load users: {error}</div>;

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await apiPost('/api/users', createForm);
      setShowCreate(false);
      setCreateForm({ username: '', password: '', display_name: '', role: 'viewer' });
      refetch();
    } catch (err) { setFormError(err.message); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await apiPut(`/api/users/${showEdit.id}`, editForm);
      setShowEdit(null);
      refetch();
    } catch (err) { setFormError(err.message); }
  };

  const handleToggleActive = async (user) => {
    try {
      await apiPut(`/api/users/${user.id}`, { active: !user.active });
      refetch();
    } catch (err) { alert(err.message); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await apiPost(`/api/users/${showResetPw.id}/reset-password`, { password: resetPw });
      setShowResetPw(null);
      setResetPw('');
    } catch (err) { setFormError(err.message); }
  };

  const openEdit = (user) => {
    setEditForm({ display_name: user.display_name, role: user.role });
    setShowEdit(user);
    setFormError('');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system users and roles</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setFormError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {ROLES.map(role => (
          <div key={role} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role]}`}>{role}</span>
            </div>
            <p className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(users || []).map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.active ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-navy-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.display_name}</p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.active ? 'text-green-600' : 'text-red-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setShowResetPw(u); setResetPw(''); setFormError(''); }}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Reset password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-1.5 rounded-lg transition-colors ${u.active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                        title={u.active ? 'Disable user' : 'Enable user'}
                      >
                        {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create User">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" required value={createForm.username} onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input type="text" value={createForm.display_name} onChange={e => setCreateForm(f => ({ ...f, display_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required minLength={6} value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">Create User</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title={`Edit ${showEdit?.username || 'User'}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input type="text" value={editForm.display_name || ''} onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={editForm.role || 'viewer'} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEdit(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!showResetPw} onClose={() => setShowResetPw(null)} title={`Reset Password: ${showResetPw?.username || ''}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" required minLength={6} value={resetPw} onChange={e => setResetPw(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" placeholder="Enter new password (min 6 chars)" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowResetPw(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">Reset Password</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
