import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Users, 
  Search, 
  UserCheck, 
  Shield, 
  UserPlus, 
  Phone, 
  Mail, 
  Lock, 
  X, 
  CheckCircle2, 
  FileUp, 
  FileText, 
  Edit3, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Upload,
  RefreshCw
} from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { parseUserFile, derivePasswordFromPhone } from '../utils/fileParser';

export const UsersPage = () => {
  const { 
    registeredUsers, 
    registerUser, 
    bulkImportUsers, 
    updateUser, 
    toggleUserStatus, 
    deleteUser, 
    fetchUsers, 
    role 
  } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Form states for manual registration / editing
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formStatus, setFormStatus] = useState('Active');

  // File import state
  const [importedFile, setImportedFile] = useState(null);
  const [parsedPreviewUsers, setParsedPreviewUsers] = useState([]);
  const [isParsing, setIsParsing] = useState(false);

  // Password visibility state
  const [showPasswords, setShowPasswords] = useState({});

  const togglePasswordVisibility = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      toast.error(msg);
      setTimeout(() => setErrorMsg(''), 6000);
    } else {
      setSuccessMsg(msg);
      toast.success(msg);
      setTimeout(() => setSuccessMsg(''), 6000);
    }
  };

  // Open Edit Modal
  const openEditModal = (u) => {
    setEditingUser(u);
    setFormName(u.name || '');
    setFormPhone(u.phone || '');
    setFormEmail(u.email || '');
    setFormPassword(u.password || derivePasswordFromPhone(u.phone));
    setFormRole(u.role || 'user');
    setFormStatus(u.status || 'Active');
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      showNotification('Please provide Name and Phone number.', true);
      return;
    }

    const newPass = formPassword || derivePasswordFromPhone(formPhone);

    const newUser = await registerUser({
      name: formName,
      phone: formPhone,
      email: formEmail,
      password: newPass,
      role: formRole,
      status: formStatus
    });

    showNotification(`User "${newUser.name}" successfully registered into the database! Default Password: "${newUser.password || newPass}"`);
    setIsRegisterModalOpen(false);
    resetForm();
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser || !formName || !formPhone) return;

    await updateUser(editingUser.id, {
      name: formName,
      phone: formPhone,
      email: formEmail,
      password: formPassword || derivePasswordFromPhone(formPhone),
      role: formRole,
      status: formStatus
    });

    showNotification(`Updated user details for "${formName}".`);
    setEditingUser(null);
    resetForm();
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    await deleteUser(deletingUser.id);
    showNotification(`User "${deletingUser.name}" deleted from database.`);
    setDeletingUser(null);
  };

  // Handle File Selection for Import
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportedFile(file);
    setIsParsing(true);
    setErrorMsg('');

    try {
      const parsedUsers = await parseUserFile(file);
      if (!parsedUsers || parsedUsers.length === 0) {
        showNotification('No valid user records with Name and Phone number could be extracted from this file.', true);
        setParsedPreviewUsers([]);
      } else {
        setParsedPreviewUsers(parsedUsers);
      }
    } catch (err) {
      showNotification(`File parsing error: ${err.message}`, true);
      setParsedPreviewUsers([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm Bulk Import
  const handleBulkImportConfirm = async () => {
    if (parsedPreviewUsers.length === 0) return;

    setIsParsing(true);
    try {
      const imported = await bulkImportUsers(parsedPreviewUsers);
      showNotification(`Successfully imported ${imported.length || parsedPreviewUsers.length} users into the database! Password for each user is the first 4 digits of their phone number.`);
      setIsImportModalOpen(false);
      setImportedFile(null);
      setParsedPreviewUsers([]);
    } catch (err) {
      showNotification(`Failed to import users: ${err.message}`, true);
    } finally {
      setIsParsing(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('user');
    setFormStatus('Active');
  };

  // Filter users by search term
  const filteredUsers = (registeredUsers || []).filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.phone && u.phone.includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.status && u.status.toLowerCase().includes(term))
    );
  });

  const activeCount = (registeredUsers || []).filter((u) => u.status === 'Active' || !u.status).length;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" /> Database User Directory
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              User Management & Registration
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Import user lists directly from PDF/CSV, manage student participants, search, edit, and toggle active status in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchUsers()}
              title="Refresh Users"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl transition-all border border-slate-200 dark:border-zinc-800 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <span className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold rounded-xl text-xs shadow-sm">
              Active: <strong className="text-emerald-600 dark:text-emerald-400">{activeCount}</strong> / {registeredUsers.length}
            </span>

            {role === 'admin' && (
              <>
                <Button
                  variant="secondary"
                  icon={Upload}
                  onClick={() => setIsImportModalOpen(true)}
                >
                  Import PDF / List
                </Button>

                <Button
                  variant="primary"
                  icon={UserPlus}
                  onClick={() => {
                    resetForm();
                    setIsRegisterModalOpen(true);
                  }}
                >
                  Register User
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="pt-2">
          <Input
            id="user-search"
            type="text"
            placeholder="Search users by name, phone number, email, role, or active status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>
      </section>

      {/* Users Table */}
      <section className="basic-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/90 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Participant Details</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Auto Password</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                {role === 'admin' && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const derivedPwd = u.password || derivePasswordFromPhone(u.phone);
                  const isPwdVisible = showPasswords[u.id];

                  return (
                    <tr key={u.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        <div>{u.name}</div>
                        <div className="text-[11px] font-normal text-slate-500 dark:text-zinc-400">{u.email}</div>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-zinc-200">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.phone || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-slate-700 dark:text-zinc-300">
                        <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                          <span>{isPwdVisible ? derivedPwd : '••••'}</span>
                          <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                            title="Toggle Password Visibility"
                          >
                            {isPwdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin' || u.role === 'Admin'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                        }`}>
                          {u.role === 'admin' || u.role === 'Admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {u.role === 'admin' || u.role === 'Admin' ? 'Admin' : 'Student'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          disabled={role !== 'admin'}
                          onClick={() => toggleUserStatus(u.id, u.status || 'Active')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            u.status === 'Active' || !u.status
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {u.status === 'Active' || !u.status ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {role === 'admin' && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit User Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 text-slate-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400 font-medium">
                    No users matching "{searchTerm}" found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PDF / File Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Import User List</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Support for PDF, CSV, TXT, or JSON file format</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPreviewUsers([]);
                  setImportedFile(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 text-center space-y-3 transition-colors bg-slate-50/50 dark:bg-zinc-900/50">
                <FileText className="w-10 h-10 mx-auto text-blue-600 dark:text-blue-400" />
                <div>
                  <label htmlFor="user-file-upload" className="cursor-pointer font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Click to select file
                  </label>
                  <span className="text-slate-500 dark:text-zinc-400 text-xs block mt-1">PDF, CSV, TXT, or JSON (Extracts Name & Phone Number)</span>
                </div>
                <input
                  id="user-file-upload"
                  type="file"
                  accept=".pdf,.csv,.txt,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {importedFile && (
                  <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 inline-block">
                    Selected File: {importedFile.name} ({(importedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Parsing status indicator */}
              {isParsing && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-center text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing file & extracting user entries...</span>
                </div>
              )}

              {/* Preview Table */}
              {parsedPreviewUsers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                      Extracted Users Preview ({parsedPreviewUsers.length} found)
                    </h4>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      Password auto-generated: 1st 4 digits of Phone
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-zinc-900 font-semibold text-slate-700 dark:text-zinc-300">
                        <tr>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Phone</th>
                          <th className="px-4 py-2">Generated Password</th>
                          <th className="px-4 py-2">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                        {parsedPreviewUsers.map((u, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50">
                            <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{u.name}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-zinc-300">{u.phone}</td>
                            <td className="px-4 py-2 font-mono font-bold text-blue-600 dark:text-blue-400">{u.password}</td>
                            <td className="px-4 py-2 text-slate-500 dark:text-zinc-400">{u.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPreviewUsers([]);
                  setImportedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={Upload}
                disabled={parsedPreviewUsers.length === 0 || isParsing}
                onClick={handleBulkImportConfirm}
              >
                Confirm & Save {parsedPreviewUsers.length} Users
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Register User Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Register Single User</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Direct registration into the database</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <Input
                id="reg-name"
                label="Full Name / Username"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                icon={Users}
                required
              />

              <Input
                id="reg-phone"
                label="Phone Number"
                type="tel"
                placeholder="e.g. 9876543210"
                value={formPhone}
                onChange={(e) => {
                  setFormPhone(e.target.value);
                  if (!formPassword) {
                    setFormPassword(derivePasswordFromPhone(e.target.value));
                  }
                }}
                icon={Phone}
                required
              />

              <Input
                id="reg-email"
                label="Email Address (Optional)"
                type="email"
                placeholder="e.g. rahul@eloquence.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                icon={Mail}
              />

              <Input
                id="reg-password"
                label="Password (Default: 1st 4 digits of phone)"
                type="text"
                placeholder="e.g. 9876"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                icon={Lock}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">User Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Student Participant</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsRegisterModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  icon={UserPlus}
                >
                  Save User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit User Account</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Modify registered user details</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                id="edit-name"
                label="Full Name / Username"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                icon={Users}
                required
              />

              <Input
                id="edit-phone"
                label="Phone Number"
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                icon={Phone}
                required
              />

              <Input
                id="edit-email"
                label="Email Address"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                icon={Mail}
              />

              <Input
                id="edit-password"
                label="Password"
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                icon={Lock}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">User Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Student Participant</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  icon={Edit3}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete User Account</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deletingUser.name}</strong> ({deletingUser.email || deletingUser.phone}) from the database?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setDeletingUser(null)}
              >
                Cancel
              </Button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
