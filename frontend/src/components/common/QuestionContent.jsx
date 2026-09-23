import React from 'react';
import { Code, Image as ImageIcon } from 'lucide-react';

export default function QuestionContent({ question, className = '', textClassName = '' }) {
  if (!question) return null;

  const rawText = question.question_text || '';
  let imageUrl = question.image_url || question.image || '';
  let codeSnippet = question.code_snippet || '';
  let displayPrompt = rawText;

  // Extract inline image or code snippet from question_text if not separated
  if (!imageUrl) {
    const imgMatch = rawText.match(/(?:!\[.*?\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)|\[(?:Image|Img|Picture|Photo):\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]|(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp|svg))|(data:image\/(?:png|jpeg|jpg|gif|webp|svg)\+xml;base64,[A-Za-z0-9+/=]+))/i);
    if (imgMatch) {
      imageUrl = imgMatch[1] || imgMatch[2] || imgMatch[3] || imgMatch[4] || '';
      displayPrompt = displayPrompt
        .replace(/!\[.*?\]\(https?:\/\/.*?\)|!\[.*?\]\(data:image\/.*?\)/gi, '')
        .replace(/\[(?:Image|Img|Picture|Photo):\s*https?:\/\/.*?\]|\[(?:Image|Img|Picture|Photo):\s*data:image\/.*?\]/gi, '')
        .trim();
    }
  }

  if (!codeSnippet) {
    const codeBlockMatch = displayPrompt.match(/```(?:[a-zA-Z0-9_-]*)\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      codeSnippet = codeBlockMatch[1].trim();
      displayPrompt = displayPrompt.replace(/```(?:[a-zA-Z0-9_-]*)\n?[\s\S]*?```/g, '').trim();
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary Question Prompt */}
      {displayPrompt && (
        <div className={`whitespace-pre-wrap leading-relaxed ${textClassName || 'text-xs sm:text-sm font-bold text-slate-900 dark:text-white'}`}>
          {displayPrompt}
        </div>
      )}

      {/* Image Container (Visual/Image Type Questions) */}
      {imageUrl && (
        <div className="my-3 max-w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 sm:p-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 self-start">
            <ImageIcon className="w-3.5 h-3.5 text-brand-500" />
            <span>Question Image / Diagram</span>
          </div>
          <img
            src={imageUrl}
            alt="Question Illustration"
            className="max-h-72 sm:max-h-96 w-auto object-contain rounded-xl shadow-sm hover:scale-[1.01] transition-transform duration-200"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Code Block Container (Programmer / Code Type Questions) */}
      {codeSnippet && (
        <div className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-md">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="ml-2 font-bold uppercase text-brand-400 flex items-center gap-1">
                <Code className="w-3 h-3" />
                Program Code Structure
              </span>
            </div>
          </div>
          <pre className="p-4 text-xs sm:text-sm font-mono leading-relaxed overflow-x-auto whitespace-pre text-emerald-400 selection:bg-brand-900 selection:text-brand-100">
            <code>{codeSnippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
