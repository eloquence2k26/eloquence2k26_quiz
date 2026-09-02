import React, { useState } from 'react';
import { Users, Search, UserCheck, Shield, Filter } from 'lucide-react';
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
      <section className="glass-panel-light rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" /> User Directory
            </div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white">
              Registered Participants
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage all student participants and administrators registered in Eloquence 2K26.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold rounded-xl text-xs">
              Total: {dummyUsers.length} Users
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
      <section className="glass-panel-light rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-100/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Participant</th>
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
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        u.role === 'Admin'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800'
                      }`}>
                        {u.role === 'Admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-300">
                      {u.quizzesAttempted} Quizzes
                    </td>
                    <td className="px-6 py-4 font-black text-zinc-900 dark:text-zinc-100">
                      {u.score} pts
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        u.status === 'Active'
                          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-800'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-zinc-500 font-medium">
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
