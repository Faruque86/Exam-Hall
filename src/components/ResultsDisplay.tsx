import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, FileText, Send, RotateCcw, 
  ChevronDown, ChevronUp, AlertCircle, Award, Hourglass 
} from 'lucide-react';
import { Quiz, QuizAttempt, Language } from '../types';
import { translations } from '../localization';

interface ResultsDisplayProps {
  quiz: Quiz;
  attempt: QuizAttempt;
  lang: Language;
  onRestart: () => void;
}

export default function ResultsDisplay({ quiz, attempt, lang, onRestart }: ResultsDisplayProps) {
  const t = translations[lang];
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailValue, setEmailValue] = useState(attempt.userEmail || '');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [expandAll, setExpandAll] = useState(false);

  // Format date readable
  const formattedDate = new Date(attempt.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'bn-BD', {
    yaw: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  } as any);

  // Calculate percentages
  const parsedScore = attempt.score;
  const isPassed = attempt.isPassed;
  const correct = attempt.correctCount;
  const wrong = attempt.wrongCount;
  const total = attempt.totalQuestions;

  // Donut SVG configuration
  const strokeDash = 251.2; // 2 * PI * radius (40)
  const scorePercent = parsedScore / 100;
  const strokeOffset = strokeDash - (strokeDash * scorePercent);

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValue) return;
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('success');
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailStatus('idle');
      }, 2000);
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto my-4 space-y-6 print:space-y-4 print:p-0">
      {/* Visual Result Hero Jumbotron */}
      <div className={`p-6 lg:p-10 rounded-3xl border text-center relative overflow-hidden transition-all print:border-none print:shadow-none ${
        isPassed 
          ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/30 border-emerald-100' 
          : 'bg-gradient-to-br from-rose-50 via-orange-50 to-rose-100/30 border-rose-100'
      }`}>
        <div className="absolute top-4 right-4 print:hidden">
          <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase px-4 py-1.5 rounded-full border shadow-sm ${
            isPassed 
              ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200' 
              : 'bg-rose-100/80 text-rose-800 border-rose-200'
          }`}>
            {isPassed ? t.passedStatus : t.failedStatus}
          </span>
        </div>

        {/* Big Badge Indicator */}
        <div className="flex flex-col items-center justify-center">
          <div className="mb-6 relative h-32 w-32 flex items-center justify-center print:h-24 print:w-24">
            {/* Native SVG responsive progress donut */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="44"
                className="stroke-slate-100 fill-none"
                strokeWidth="10"
              />
              <circle
                cx="64"
                cy="64"
                r="44"
                className={`fill-none transition-all duration-1000 ${
                  isPassed ? 'stroke-emerald-500' : 'stroke-rose-500'
                }`}
                strokeWidth="10"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900 leading-none font-mono">{parsedScore}%</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Accuracy</span>
            </div>
          </div>

          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">
            {t.quizResultsTitle}
          </span>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-snug">
            {attempt.quizTitle}
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">
            {lang === 'en' ? 'Attempt evaluated on' : 'পরীক্ষার মূল্যায়ন তারিখ'}: {formattedDate}
          </p>

          <div className="flex items-center gap-2 mt-4 inline-flex px-4 py-1.5 bg-white/70 backdrop-blur border border-slate-200/50 rounded-xl text-xs font-bold text-slate-600">
            <Hourglass className="w-3.5 h-3.5" />
            {t.timeSpent}: {Math.floor(attempt.timeSpentSeconds / 60)} {lang === 'en' ? 'minutes' : 'মিনিট'} {attempt.timeSpentSeconds % 60} {lang === 'en' ? 'seconds' : 'সেকেন্ড'}
          </div>
        </div>

        {/* Quick Analytical breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <div className="bg-white/80 p-4 rounded-2xl border border-slate-100 text-center font-mono">
            <span className="block text-2xl font-black text-slate-900">{total}</span>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Total MCQs</span>
          </div>
          <div className="bg-white/80 p-4 rounded-2xl border border-emerald-100 text-center font-mono">
            <span className="block text-2xl font-black text-emerald-600 flex items-center justify-center gap-1.5">
              <CheckCircle className="w-5 h-5" />
              {correct}
            </span>
            <span className="block text-[10px] uppercase font-semibold text-emerald-600/75 tracking-wider mt-1">{t.correctAnswers}</span>
          </div>
          <div className="bg-white/80 p-4 rounded-2xl border border-rose-100 text-center font-mono">
            <span className="block text-2xl font-black text-rose-500 flex items-center justify-center gap-1.5">
              <XCircle className="w-5 h-5" />
              {wrong}
            </span>
            <span className="block text-[10px] uppercase font-semibold text-rose-500/75 tracking-wider mt-1">{t.wrongAnswers}</span>
          </div>
          <div className="bg-white/80 p-4 rounded-2xl border border-indigo-100 text-center font-mono">
            <span className="block text-2xl font-black text-indigo-600 flex items-center justify-center gap-1">
              <Award className="w-5 h-5" />
              {attempt.score >= 50 ? 'A+' : 'F'}
            </span>
            <span className="block text-[10px] uppercase font-bold text-indigo-400 tracking-wider mt-1">{lang === 'en' ? 'Letter Grade' : 'লেটার গ্রেড'}</span>
          </div>
        </div>

        {/* Extra Action Buttons (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 px-5 rounded-xl block cursor-pointer transition shadow-lg shadow-indigo-600/10"
          >
            <FileText className="w-4 h-4" />
            {t.downloadPDF}
          </button>
          
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-indigo-600 text-xs font-bold py-3 px-5 rounded-xl border border-slate-200 block cursor-pointer transition"
          >
            <Send className="w-4 h-4" />
            {t.emailResultBtn}
          </button>

          <button
            onClick={onRestart}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-600 text-xs font-bold py-3 px-5 rounded-xl block cursor-pointer transition"
          >
            <RotateCcw className="w-4 h-4" />
            {t.returnDashboard}
          </button>
        </div>
      </div>

      {/* Answer matrix detailed heading review */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-5">
          <h3 className="font-extrabold text-slate-950 text-lg tracking-tight">
            {t.detailedReview}
          </h3>
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer print:hidden"
          >
            {expandAll 
              ? (lang === 'en' ? 'Collapse Explanations' : 'ব্যাখ্যা গুটিয়ে রাখুন') 
              : (lang === 'en' ? 'Expand Explanations' : 'সব ব্যাখ্যা দেখান')}
          </button>
        </div>

        {/* List of questions with correct indicator */}
        <div className="space-y-6">
          {quiz.questions.map((q, idx) => {
            const userAns = attempt.answers[q.id] || '';
            const isCorrect = userAns === q.correctAnswer;
            
            return (
              <div 
                key={q.id} 
                className={`p-5 rounded-2xl border transition ${
                  isCorrect 
                    ? 'bg-emerald-50/20 border-emerald-100/70 hover:bg-emerald-50/40' 
                    : 'bg-rose-50/10 border-rose-100/50 hover:bg-rose-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex gap-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md shrink-0 h-fit">
                      Q{idx + 1}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm lg:text-base leading-snug">
                      {q.text}
                    </h4>
                  </div>

                  <span className={`text-xs inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold uppercase shrink-0 ${
                    isCorrect 
                      ? 'bg-emerald-150 text-emerald-700' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                {/* Grid for Options display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                    const isSelected = userAns === letter;
                    const isRight = q.correctAnswer === letter;
                    
                    return (
                      <div 
                        key={letter}
                        className={`p-3.5 rounded-xl border text-xs flex items-center ${
                          isRight 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' 
                            : isSelected 
                              ? 'bg-rose-50 border-rose-400 text-rose-950 font-medium' 
                              : 'bg-white border-slate-100 text-slate-600'
                        }`}
                      >
                        <span className={`h-5 w-5 rounded-md text-[10px] font-mono font-black flex items-center justify-center mr-3 border shrink-0 ${
                          isRight 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : isSelected 
                              ? 'bg-rose-500 text-white border-rose-500' 
                              : 'bg-slate-50 text-slate-400'
                        }`}>
                          {letter}
                        </span>
                        <span className="flex-1 leading-normal">{q.options[letter]}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Score mapping summaries */}
                <div className="flex flex-wrap gap-4 text-xs font-bold mb-3 border-b border-dashed border-slate-100 pb-3">
                  <span className="text-slate-500">
                    {t.yourAnswer}:{' '}
                    <span className={`font-mono text-sm uppercase ${isCorrect ? 'text-emerald-600 font-black' : 'text-rose-500 font-black'}`}>
                      {userAns || 'Skipped ∅'} {isCorrect ? '🟢' : '🔴'}
                    </span>
                  </span>
                  
                  <span className="text-slate-500">
                    {t.correctAnswer}:{' '}
                    <span className="font-mono text-sm text-emerald-600 uppercase font-black">
                      {q.correctAnswer} 🟢
                    </span>
                  </span>
                </div>

                {/* Explanation text collapsing */}
                {(expandAll || q.explanation) && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-slate-600 text-xs leading-relaxed flex gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-700 mb-0.5">{t.explanationLabel}:</span>
                      {q.explanation || (lang === 'en' ? 'Standard textbook validation guide matches core option definition.' : 'পাঠ্যবইয়ের স্ট্যান্ডার্ড নির্দেশিকা অনুযায়ী সঠিক উত্তরটি চিহ্নিত করা হয়েছে।')}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Email result simulation modal popup */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-none print:hidden">
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center p-3 mb-5 mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-950 text-center mb-1.5 tracking-tight">
              {t.emailResultBtn}
            </h3>
            <p className="text-slate-400 text-xs text-center mb-6">
              {lang === 'en' ? "We will dispatch a fully compiled scorecard summarizing all corrections, percentages and question-by-question review parameters directly." : "আমরা সমস্ত সঠিক-ভুল উত্তর, অর্জিত নম্বর এবং মূল্যায়ন প্যারামিটার সম্বলিত পূর্ণাঙ্গ কার্ড সরাসরি পাঠিয়ে দেব।"}
            </p>

            {emailStatus === 'success' ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-semibold text-center rounded-xl border border-emerald-100">
                {t.emailSuccess}
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.email}</label>
                  <input
                    type="email"
                    required
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    placeholder="student@school.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 text-slate-800 text-sm outline-none transition"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-200 transition cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    disabled={emailStatus === 'sending'}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-indigo-600/10 cursor-pointer transition"
                  >
                    {emailStatus === 'sending' ? 'Sending...' : 'Confirm Dispatch'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
