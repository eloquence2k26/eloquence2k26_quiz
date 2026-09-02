import React, { useState } from 'react';
import { PlusCircle, HelpCircle, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Link } from 'react-router-dom';

export const AddQuestionPage = () => {
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');
  const [category, setCategory] = useState('General Technology');
  const [points, setPoints] = useState('10');
  const [timerSeconds, setTimerSeconds] = useState('30');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!questionText || !optionA || !optionB || !optionC || !optionD) {
      setErrorMessage('Please fill in all options and question details.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage('Question added successfully to the Eloquence 2K26 Question Bank!');
      // Reset form fields
      setQuestionText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectOption('A');
    }, 600);
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Top Banner Header */}
      <section className="glass-panel-light rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex justify-between items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider">
            <PlusCircle className="w-3.5 h-3.5" /> Question Builder
          </div>
          <Link to="/dashboard" className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>

        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white">
            Add New Quiz Question
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Create multiple choice questions for Eloquence 2K26 quiz rounds.</p>
        </div>
      </section>

      {/* Form Container */}
      <div className="glass-panel-light rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Success Alert */}
        {successMessage && (
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
              Question Prompt <span className="text-zinc-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Enter the question statement here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="block w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm p-4 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
            />
          </div>

          {/* Multiple Choice Options Grid */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
              Answer Options <span className="text-zinc-500">*</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="optionA"
                label="Option A"
                placeholder="First answer choice"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                required
              />

              <Input
                id="optionB"
                label="Option B"
                placeholder="Second answer choice"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                required
              />

              <Input
                id="optionC"
                label="Option C"
                placeholder="Third answer choice"
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                required
              />

              <Input
                id="optionD"
                label="Option D"
                placeholder="Fourth answer choice"
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Correct Option & Category Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Correct Option Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
                Correct Answer <span className="text-zinc-500">*</span>
              </label>
              <select
                value={correctOption}
                onChange={(e) => setCorrectOption(e.target.value)}
                className="block w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all font-bold"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            {/* Category / Round */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
                Quiz Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all font-bold"
              >
                <option value="General Technology">General Technology</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Aptitude">Aptitude & Logic</option>
              </select>
            </div>

            {/* Points / Score Weight */}
            <Input
              id="points"
              label="Points / Marks"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              icon={PlusCircle}
            >
              Add Question to Bank
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
