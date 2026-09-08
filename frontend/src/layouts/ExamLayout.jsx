import React from 'react';
import { Outlet } from 'react-router-dom';

export default function ExamLayout() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col exam-arena-no-select transition-colors duration-200">
      <Outlet />
    </div>
  );
}
