import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Search, UserCheck, Shield, UserPlus, Phone, Mail, Lock, X, CheckCircle2 } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const UsersPage = () => {
  const { registeredUsers, registerUser, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('user123');
  const [userRole, setUserRole] = useState('user');

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    const newUser = registerUser({
      name,
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@eloquence.com`,
      password: password || 'user123',
      role: userRole
    });

    setSuccessMsg(`User "${newUser.name}" successfully registered! They can now log in using email/phone.`);
    setName('');
    setPhone('');
    setEmail('');
    setPassword('user123');
    setUserRole('user');
    setIsModalOpen(false);

    setTimeout(() => {
      setSuccessMsg('');
    }, 5000);
  };

  const filteredUsers = (registeredUsers || []).filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  );

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Banner Header */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" /> User Directory & Registration
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Registered Participants
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Manage student participants and administrators registered in Eloquence 2K26.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold rounded-xl text-xs shadow-sm">
              Total: <strong className="text-blue-600 dark:text-blue-400">{filteredUsers.length}</strong> Users
            </span>

            {role === 'admin' && (
              <Button
                variant="primary"
                icon={UserPlus}
                onClick={() => setIsModalOpen(true)}
              >
                Register New User
              </Button>
            )}
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="pt-2">
          <Input
            id="search"
            type="text"
            placeholder="Search users by name, phone number, or email..."
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
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Quizzes Done</th>
                <th className="px-6 py-4">Total Score</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
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
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-zinc-300">
                      {u.quizzesAttempted || 0} Quizzes
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {u.score || 0} pts
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        u.status === 'Active' || !u.status
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
                      }`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500 dark:text-zinc-400 font-medium">
                    No users matching "{searchTerm}" found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Admin Registration Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Register User Account</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Admin entry for participant credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <Input
                id="username"
                label="Username / Full Name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={Users}
                required
              />

              <Input
                id="phone"
                label="Phone Number"
                type="tel"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                icon={Phone}
                required
              />

              <Input
                id="userEmail"
                label="Email Address (Optional)"
                type="email"
                placeholder="e.g. rahul@eloquence.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
              />

              <Input
                id="userPassword"
                label="Login Password"
                type="password"
                placeholder="default: user123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                required
              />

              {/* Role Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">User Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserRole('user')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      userRole === 'user'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" /> Participant
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('admin')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      userRole === 'admin'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    <Shield className="w-4 h-4" /> Admin
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  icon={UserPlus}
                >
                  Register User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
