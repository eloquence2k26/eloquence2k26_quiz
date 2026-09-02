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
      <section className="glass-panel-light rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" /> User Directory & Registration
            </div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white">
              Registered Participants
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Manage student participants and administrators registered in Eloquence 2K26.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold rounded-2xl text-xs">
              Total: {filteredUsers.length} Users
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
      <section className="glass-panel-light rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-100/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Participant Details</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Quizzes Done</th>
                <th className="px-6 py-4">Total Score</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                      <div>{u.name}</div>
                      <div className="text-[11px] font-medium text-zinc-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{u.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        u.role === 'admin' || u.role === 'Admin'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800'
                      }`}>
                        {u.role === 'admin' || u.role === 'Admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {u.role === 'admin' || u.role === 'Admin' ? 'Admin' : 'Student'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-300">
                      {u.quizzesAttempted || 0} Quizzes
                    </td>
                    <td className="px-6 py-4 font-black text-zinc-900 dark:text-zinc-100">
                      {u.score || 0} pts
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        u.status === 'Active' || !u.status
                          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-800'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-zinc-500 font-medium">
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
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white">Register User Account</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Admin entry for participant credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors"
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
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">User Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserRole('user')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      userRole === 'user'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" /> Participant
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('admin')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      userRole === 'admin'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800'
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
