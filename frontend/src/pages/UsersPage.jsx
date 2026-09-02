import React, { useState } from 'react';
import { Users, Search, UserCheck, Shield } from 'lucide-react';
import { Input } from '../components/Input';

export const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const dummyUsers = [
    { id: 1, name: 'Alex Johnson', email: 'alex@eloquence.com', role: 'Student', quizzesAttempted: 3, score: 285, status: 'Active' },
    { id: 2, name: 'Sarah Miller', email: 'sarah@eloquence.com', role: 'Student', quizzesAttempted: 2, score: 190, status: 'Active' },
    { id: 3, name: 'Admin Coordinator', email: 'admin@eloquence.com', role: 'Admin', quizzesAttempted: 0, score: 0, status: 'Active' },
    { id: 4, name: 'David Smith', email: 'david@eloquence.com', role: 'Student', quizzesAttempted: 1, score: 95, status: 'Inactive' },
    { id: 5, name: 'Emily Davis', email: 'emily@eloquence.com', role: 'Student', quizzesAttempted: 3, score: 270, status: 'Active' }
  ];

  const filteredUsers = dummyUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Banner Header */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" /> User Directory
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Registered Participants
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">Manage all student participants and administrators registered in Eloquence 2K26.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold rounded-xl text-xs shadow-sm">
              Total: <strong className="text-blue-600 dark:text-blue-400">{dummyUsers.length}</strong> Users
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="pt-2">
          <Input
            id="search"
            type="text"
            placeholder="Search users by name or email..."
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
                <th className="px-6 py-4">Participant</th>
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
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'Admin'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                      }`}>
                        {u.role === 'Admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-zinc-300">
                      {u.quizzesAttempted} Quizzes
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {u.score} pts
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        u.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500 dark:text-zinc-400 font-medium">
                    No users matching "{searchTerm}" found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
