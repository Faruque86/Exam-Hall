import { useState, useEffect, useRef } from 'react';
import { Timer, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, Ban } from 'lucide-react';
import { Quiz, Question, Language } from '../types';
import { translations } from '../localization';
import ConfirmationModal from './ConfirmationModal';

interface QuizInterfaceProps {
  quiz: Quiz;
  lang: Language;
  onSubmit: (answers: Record<string, 'A' | 'B' | 'C' | 'D' | ''>, timeSpent: number) => void;
  onCancel: () => void;
}

export default function QuizInterface({ quiz, lang, onSubmit, onCancel }: QuizInterfaceProps) {
  const t = translations[lang];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D' | ''>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  // Timer State
  const initialSeconds = quiz.duration * 60;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Collect list of empty structures for all question IDs
    const init: Record<string, 'A' | 'B' | 'C' | 'D' | ''> = {};
    quiz.questions.forEach(q => {
      init[q.id] = '';
    });
    setAnswers(init);

    // Start clock countdown
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Pop up the time-finish submit warning
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quiz]);

  const handleSelectOption = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinalSubmit = (isTimeUp = false) => {
    const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    onSubmit(answers, Math.min(elapsedSeconds, quiz.duration * 60));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Aggregated details
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.values(answers).filter(v => v !== '').length;
  const progressPercentage = (answeredCount / totalQuestions) * 100;
  
  const currentQuestion = quiz.questions[currentIndex];
  const isTimeUrgent = secondsLeft < 120; // less than 2 minutes

  return (
    <div className="max-w-4xl mx-auto my-4 space-y-6 relative">
      {/* Sticky Banner with details and timer */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 lg:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-16 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 leading-tight truncate max-w-[280px] sm:max-w-sm md:max-w-md">{quiz.title}</h3>
            <p className="text-xs text-slate-400 font-medium">{quiz.subject}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* Progress Tracker Pill */}
          <div className="bg-slate-100 text-slate-700 py-1.5 px-3 rounded-full text-xs font-bold font-mono">
            {answeredCount} / {totalQuestions} {lang === 'en' ? 'Solved' : 'উত্তরকৃত'}
          </div>

          {/* Countdown Clock */}
          <div className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-2xl border transition ${
            isTimeUrgent 
              ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <Timer className="w-4 h-4" />
            <span className="font-mono text-sm leading-none">{formatTime(secondsLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress Line Bar */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Conditionally rendered Urgent Countdown Alert banner */}
      {secondsLeft <= 60 && (
        <div className="bg-rose-50 border border-rose-200/80 p-4 rounded-3xl text-rose-850 text-xs font-semibold flex items-center gap-3.5 animate-pulse shadow-sm">
          <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="font-extrabold text-rose-900 block text-xs uppercase tracking-wider mb-0.5">
              {lang === 'en' ? 'Time is running out!' : 'সময় প্রায় শেষ!'}
            </span>
            <p className="text-rose-700 font-medium">
              {lang === 'en' 
                ? 'Warning: Timer for each question is 1 minute. Total minutes are based on the total number of questions.' 
                : 'প্রতিটি প্রশ্নের জন্য নির্ধারিত সময় ১ মিনিট। মোট মিনিট প্রশ্ন সংখ্যার ওপর নির্ধারিত।'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar Matrix - Great for Desktop Reviews */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              {lang === 'en' ? 'Questions Sheet' : 'প্রশ্ন নির্দেশিকা'}
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, idx) => {
                const isSelected = idx === currentIndex;
                const isSolved = answers[q.id] !== '';
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 w-9 rounded-xl font-mono text-xs font-black flex items-center justify-center border transition cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-600/20' 
                        : isSolved 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm(lang === 'en' ? 'Exit active exam? No score will be grading.' : 'পরীক্ষা বাতিল করবেন?')) {
                onCancel();
              }
            }}
            className="w-full mt-6 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-200 hover:border-rose-200 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Ban className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Quit Exam' : 'পরীক্ষা বাতিল'}
          </button>
        </div>

        {/* Current Active Question Frame */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[300px] flex flex-col justify-between">
            {/* Core Question Statement */}
            <div className="space-y-6">
              <span className="inline-flex text-xs font-extrabold text-indigo-600 bg-indigo-50 py-1 px-2.5 rounded-md uppercase tracking-wider font-mono">
                {t.questionProgress} {currentIndex + 1} {t.of} {totalQuestions}
              </span>
              <h2 className="text-lg lg:text-xl font-bold text-slate-900 leading-snug">
                {currentQuestion.text}
              </h2>

              {/* Multiple Choice Option Grid (Responsive touch targets >= 44px) */}
              <div className="space-y-3.5">
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const labelOption = currentQuestion.options[letter];
                  const isChecked = answers[currentQuestion.id] === letter;
                  
                  return (
                    <button
                      key={letter}
                      onClick={() => handleSelectOption(currentQuestion.id, letter)}
                      className={`w-full p-4 rounded-2xl flex items-center border text-left cursor-pointer transition min-h-[52px] ${
                        isChecked 
                          ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900 font-extrabold ring-1 ring-indigo-500/30' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-lg font-mono text-xs font-black mr-4 flex items-center justify-center border rounded-md transition-all ${
                        isChecked 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}>
                        {letter}
                      </div>
                      <span className="text-sm font-medium leading-normal flex-1 pr-6">{labelOption}</span>
                      
                      {isChecked && (
                        <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 py-2.5 px-4 rounded-xl border border-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition"
              >
                <ChevronLeft className="w-4 h-4" />
                {t.previousBtn}
              </button>

              {currentIndex === totalQuestions - 1 ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 py-3 px-5 rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t.submitQuizBtn}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 py-2.5 px-4 rounded-xl border border-slate-200 cursor-pointer transition"
                >
                  {t.nextBtn}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal overlay dialog */}
      <ConfirmationModal
        id="quiz-submit-confirmation"
        isOpen={showConfirm}
        title={t.confirmSubmitTitle}
        description={
          answeredCount === totalQuestions 
            ? t.confirmSubmitDesc 
            : lang === 'en' 
              ? `You have answered ${answeredCount} of ${totalQuestions} questions. Unanswered questions will be counted as incorrect!` 
              : `আপনি ${totalQuestions}টি প্রশ্নের মধ্যে ${answeredCount}টির উত্তর দিয়েছেন। বাদবাকি প্রশ্ন ভুল হিসেবে গণ্য করা হবে!`
        }
        confirmText={t.yesSubmitBtn}
        cancelText={t.cancelBtn}
        onConfirm={() => {
          setShowConfirm(false);
          handleFinalSubmit();
        }}
        onCancel={() => setShowConfirm(false)}
        type="info"
      />

      {/* Time Up Forced Modal Overlay */}
      {isTimeUp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-5 animate-scale-up">
            <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center p-4 mx-auto animate-bounce">
              <Timer className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950 tracking-tight">
                {lang === 'en' ? 'Exam Time Finished!' : 'পরীক্ষার নির্ধারিত সময় শেষ!'}
              </h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                {lang === 'en' 
                  ? 'Your allotted assessment time has concluded. Your answered entries have been preserved. Please submit your exam sheet now.' 
                  : 'আপনার নির্ধারিত সময় শেষ হয়ে গিয়েছে। আপনার উত্তরকৃত প্রশ্নগুলো সংরক্ষিত হয়েছে। দয়া করে এখনই উত্তরপত্রটি সাবমিট করুন।'}
              </p>
            </div>
            
            <button
              onClick={() => handleFinalSubmit()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-4 rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{lang === 'en' ? 'Submit Exam Sheet Now' : 'পরীক্ষা সাবমিট করুন'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
