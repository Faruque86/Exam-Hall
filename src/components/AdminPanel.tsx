import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Eye, Trash, Upload, Check, AlertCircle, Save, 
  HelpCircle, ChevronDown, ListCheck, Play, Pause, BarChart4, Users, Archive, Landmark, RefreshCw,
  CheckCircle, XCircle, Clock, Lock, ArrowUp, ArrowDown, Sparkles, Image
} from 'lucide-react';
import { Quiz, Question, Language, QuizApproval, SubMenu } from '../types';
import { QuizAPI, AnalyticsAPI, ApprovalsAPI, SubMenusAPI, AuthAPI } from '../api';
import { translations } from '../localization';

interface AdminPanelProps {
  lang: Language;
  user: { id: string; name: string; email: string; role: 'admin' | 'user' };
}

export default function AdminPanel({ lang, user }: AdminPanelProps) {
  const userId = user.id;
  const isDevAdmin = user.email === 'admin@quiz.com' || (user.role as string) === 'dev_admin';
  const t = translations[lang];
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'csv' | 'approvals' | 'submenus' | 'users'>('manage');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Enrolled Users State (For User Admin Portal)
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setError('');
      const res = await AuthAPI.getUsers();
      setAllUsers(res);
    } catch (err: any) {
      console.error("Failed to fetch users", err);
      setError(err.message || "Failed to load users list.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && isDevAdmin) {
      fetchUsers();
    }
  }, [activeTab]);

  // Re-participation Approvals State
  const [approvals, setApprovals] = useState<QuizApproval[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Dynamic Submenus State
  const [subMenus, setSubMenus] = useState<SubMenu[]>([]);
  const [loadingSubMenus, setLoadingSubMenus] = useState(false);
  const [selectedSubMenuId, setSelectedSubMenuId] = useState<string>('');
  const [selectedCsvSubMenuId, setSelectedCsvSubMenuId] = useState<string>('');
  
  // Custom inputs for creation
  const [newSubMenuParentClass, setNewSubMenuParentClass] = useState<string>('Class 6');
  const [newSubMenuEn, setNewSubMenuEn] = useState<string>('');
  const [newSubMenuBn, setNewSubMenuBn] = useState<string>('');

  // Editing quiz state (null means creating new)
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  // Form Fields
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSubject, setQuizSubject] = useState('Computer Science');
  const [quizDuration, setQuizDuration] = useState(15);
  const [quizDesc, setQuizDesc] = useState('');
  const [formQuestions, setFormQuestions] = useState<Question[]>([
    {
      id: "q_1",
      text: "",
      options: { A: "", B: "", C: "", D: "" },
      correctAnswer: "A",
      explanation: ""
    }
  ]);

  // CSV Field
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<Question[]>([]);
  const [csvQuizTitle, setCsvQuizTitle] = useState('');
  const [csvSubject, setCsvSubject] = useState('Computer Science');
  const [csvDuration, setCsvDuration] = useState(15);
  const [csvDesc, setCsvDesc] = useState('');

  // AI Question Generation Fields
  const [aiCommand, setAiCommand] = useState('');
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const [aiImageMimeType, setAiImageMimeType] = useState<string | null>(null);
  const [aiImageFileName, setAiImageFileName] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file.");
      return;
    }

    setAiImageFileName(file.name);
    setAiImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      setAiImageBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAiImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file.");
      return;
    }

    setAiImageFileName(file.name);
    setAiImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      setAiImageBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAiGenerate = async () => {
    if (!aiCommand.trim() && !aiImageBase64) {
      alert(lang === 'en' ? "Please specify an instruction command or attach a textbook image first." : "অনুগ্ৰহ করে একটি নির্দেশ বা পাঠ্যবইয়ের ছবি সংযুক্ত করুন।");
      return;
    }

    setAiGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await QuizAPI.aiGenerate({
        command: aiCommand,
        image: aiImageBase64 || undefined,
        imageMimeType: aiImageMimeType || undefined
      });

      if (response && response.questions && response.questions.length > 0) {
        setCsvPreview(response.questions);
        
        // Populate settings
        if (!csvQuizTitle) {
          const defaultTitle = aiCommand 
            ? `AI Generated: ${aiCommand.slice(0, 40)}${aiCommand.length > 40 ? '...' : ''}` 
            : `AI Image Question Synthesis`;
          setCsvQuizTitle(defaultTitle);
        }
        
        if (!csvDesc) {
          setCsvDesc(`Automated MCQs synthesized by Gemini AI on ${new Date().toLocaleDateString()}`);
        }

        setSuccess(lang === 'en' 
          ? `Successfully generated ${response.questions.length} questions! Check them in the preview table below.` 
          : `সফলভাবে ${response.questions.length}টি প্রশ্ন তৈরি করা হয়েছে! নিচের প্রিভিউ টেবিলে দেখুন।`
        );
        // Clear inputs after success
        setAiCommand('');
        setAiImageBase64(null);
        setAiImageMimeType(null);
        setAiImageFileName('');
      } else {
        throw new Error("No questions returned in the AI response.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during AI Question Generation.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleClearAiImage = () => {
    setAiImageBase64(null);
    setAiImageMimeType(null);
    setAiImageFileName('');
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const allQuizzes = await QuizAPI.getAll({ admin: true });
      setQuizzes(allQuizzes);
      const overallStats = await AnalyticsAPI.getStats();
      setStats(overallStats);
      await fetchApprovals();
      await fetchSubMenus();
    } catch (err: any) {
      setError("Failed to synchronize admin dashboards.");
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const allApprovals = await ApprovalsAPI.getAll();
      setApprovals(allApprovals || []);
    } catch (err) {
      console.error("Failed to load approvals:", err);
    } finally {
      setLoadingApprovals(false);
    }
  };

  const fetchSubMenus = async () => {
    setLoadingSubMenus(true);
    try {
      const allSubMenus = await SubMenusAPI.getAll();
      setSubMenus(allSubMenus || []);
    } catch (err) {
      console.error("Failed to load sub-menus:", err);
    } finally {
      setLoadingSubMenus(false);
    }
  };

  const handleAddNewSubMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubMenuEn.trim() || !newSubMenuBn.trim()) {
      alert("Sub-menu title translations are required.");
      return;
    }
    try {
      setLoadingSubMenus(true);
      await SubMenusAPI.create({
        parentClass: newSubMenuParentClass,
        en: newSubMenuEn.trim(),
        bn: newSubMenuBn.trim()
      });
      setSuccess("New sub-menu added successfully! ✅");
      setTimeout(() => setSuccess(''), 3000);
      setNewSubMenuEn('');
      setNewSubMenuBn('');
      await fetchSubMenus();
    } catch (err: any) {
      setError("Failed to create sub-menu: " + err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoadingSubMenus(false);
    }
  };

  const handleDeleteSubMenu = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this sub-menu? All mapped exams will be unlinked.")) return;
    try {
      setLoadingSubMenus(true);
      await SubMenusAPI.delete(id);
      setSuccess("Sub-menu deleted successfully! 🗑️");
      setTimeout(() => setSuccess(''), 3000);
      await fetchSubMenus();
      await fetchAdminData(); // Refresh quizzes list
    } catch (err: any) {
      setError("Failed to delete sub-menu: " + err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoadingSubMenus(false);
    }
  };

  const handleMoveSubMenu = async (cls: string, index: number, direction: 'up' | 'down') => {
    const filtered = subMenus.filter(sm => sm.parentClass === cls);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === filtered.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap inside the filtered array
    const updatedFiltered = [...filtered];
    const temp = updatedFiltered[index];
    updatedFiltered[index] = updatedFiltered[targetIndex];
    updatedFiltered[targetIndex] = temp;

    // Reconstruct the global array replacing only elements matching the class 'cls'
    let filteredPointer = 0;
    const nextSubMenus = subMenus.map(sm => {
      if (sm.parentClass === cls) {
        return updatedFiltered[filteredPointer++];
      }
      return sm;
    });

    // Optimistic UI state update
    setSubMenus(nextSubMenus);

    try {
      const orderedIds = nextSubMenus.map(sm => sm.id);
      await SubMenusAPI.reorder(orderedIds);
    } catch (err: any) {
      setError("Failed to save reordered sub-menus: " + err.message);
      setTimeout(() => setError(''), 4000);
      // Rollback on failure
      await fetchSubMenus();
    }
  };

  const handleResolveApproval = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      await ApprovalsAPI.resolve(id, status);
      setSuccess(status === 'approved' ? "Retake request approved successfully! ✅" : "Retake request rejected. ❌");
      setTimeout(() => setSuccess(''), 3000);
      await fetchApprovals();
    } catch (err: any) {
      setError("Failed to resolve approval: " + err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchApprovals();
    }
    fetchSubMenus();
  }, [activeTab]);

  const handlePublishToggle = async (quiz: Quiz) => {
    try {
      await QuizAPI.update(quiz.id, { isPublished: !quiz.isPublished });
      setSuccess(`${quiz.title} status has been updated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message || "Failed to toggle quiz publish state.");
    }
  };

  const handleDeleteQuiz = async (quiz: Quiz) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${quiz.title}? This cannot be undone.`)) return;
    try {
      await QuizAPI.delete(quiz.id);
      setSuccess("Quiz has been removed permanently!");
      setTimeout(() => setSuccess(''), 3000);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message || "Failed to remove quiz.");
    }
  };

  const handleEditInit = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setQuizTitle(quiz.title);
    setQuizSubject(quiz.subject);
    setQuizDuration(quiz.duration);
    setQuizDesc(quiz.description);
    setSelectedSubMenuId(quiz.subMenuId || '');
    setFormQuestions(JSON.parse(JSON.stringify(quiz.questions))); // deep clone
    setActiveTab('create');
  };

  const handleAddQuestionField = () => {
    setFormQuestions(prev => [
      ...prev,
      {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        text: "",
        options: { A: "", B: "", C: "", D: "" },
        correctAnswer: "A",
        explanation: ""
      }
    ]);
  };

  const handleRemoveQuestionField = (idx: number) => {
    if (formQuestions.length <= 1) return alert("A quiz must have at least one question.");
    setFormQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (questionIndex: number, field: keyof Question, value: any) => {
    setFormQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex) {
        return {
          ...q,
          [field]: value
        };
      }
      return q;
    }));
  };

  const handleOptionChange = (questionIndex: number, letter: 'A' | 'B' | 'C' | 'D', value: string) => {
    setFormQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex) {
        return {
          ...q,
          options: {
            ...q.options,
            [letter]: value
          }
        };
      }
      return q;
    }));
  };

  // Seed standard 20 questions builder dynamically for easy testing
  const handleAutofill20Questions = () => {
    const twentyQuestions: Question[] = Array.from({ length: 20 }, (_, idx) => ({
      id: `seeded_q_${idx + 1}`,
      text: `Academic Knowledge Standard Exercise #${idx + 1}?`,
      options: {
        A: `Rigorous validation option A (Specimen #${idx + 1})`,
        B: `Strategic distraction option B (Specimen #${idx + 1})`,
        C: `Core exact correct option C (Specimen #${idx + 1})`,
        D: `Unrelated filler option D (Specimen #${idx + 1})`
      },
      correctAnswer: "C",
      explanation: `Detailed evaluation criteria indicates option C as the standard correct specification for exercise #${idx + 1}.`
    }));
    setFormQuestions(twentyQuestions);
    setSuccess("Seeded 20 fully structured MCQ questions and answers!");
    setTimeout(() => setSuccess(''), 3500);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle || !quizSubject || formQuestions.some(q => !q.text)) {
      alert("Please ensure Quiz Title, Subject, and all Question Statements are fully completed.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        title: quizTitle,
        subject: quizSubject,
        description: quizDesc,
        duration: quizDuration,
        questions: formQuestions,
        createdBy: userId,
        isPublished: true,
        subMenuId: selectedSubMenuId || undefined
      };

      if (editingQuizId) {
        await QuizAPI.update(editingQuizId, payload);
        setSuccess("Quiz updated successfully!");
      } else {
        await QuizAPI.create(payload);
        setSuccess("New quiz created and published successfully!");
      }

      setTimeout(() => setSuccess(''), 3000);
      
      // Reset
      setQuizTitle('');
      setQuizSubject('Computer Science');
      setQuizDuration(15);
      setQuizDesc('');
      setSelectedSubMenuId('');
      setFormQuestions([{ id: "q_1", text: "", options: { A: "", B: "", C: "", D: "" }, correctAnswer: "A" }]);
      setEditingQuizId(null);
      setActiveTab('manage');
      fetchAdminData();
    } catch (err: any) {
      setError(err.message || "Failed to save manual quiz.");
    } finally {
      setLoading(false);
    }
  };

  // Validate CSV
  const handleValidateCSV = async () => {
    if (!csvText) return alert("Pasted CSV text input is required to parse.");
    setError('');
    setSuccess('');
    try {
      const response = await QuizAPI.importParse(csvText);
      setCsvPreview(response.questions);
      setSuccess(`${response.questions.length} questions mapped successfully! Verify in the preview below.`);
    } catch (err: any) {
      setError(err.message || "Failed to parse CSV structures.");
    }
  };

  // Publish from CSV
  const handlePublishCSV = async () => {
    if (!csvQuizTitle || csvPreview.length === 0) {
      return alert("Ensure Quiz Title is filled and CSV has been validated successfully from the preview grid.");
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        title: csvQuizTitle,
        subject: csvSubject,
        description: csvDesc,
        duration: csvDuration,
        questions: csvPreview,
        createdBy: userId,
        isPublished: true,
        subMenuId: selectedCsvSubMenuId || undefined
      };

      await QuizAPI.create(payload);
      setSuccess(`Successfully imported and published: ${csvQuizTitle}!`);
      setTimeout(() => setSuccess(''), 3000);

      // Reset CSV Screen
      setCsvText('');
      setCsvPreview([]);
      setCsvQuizTitle('');
      setCsvDesc('');
      setCsvDuration(15);
      setSelectedCsvSubMenuId('');
      setActiveTab('manage');
      fetchAdminData();
    } catch (err: any) {
      setError(err.message || "Failed to publish imported quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetSampleCSV = () => {
    const sample = `"What is the capital of Bangladesh?","Dhaka","Chittagong","Sylhet","Rajshahi","A","Dhaka has been the capital city of Bangladesh since the liberation of the nation."
"Which gas elements are required for basic human respiration?","Oxygen","Nitrogen","Carbon Dioxide","Helium","A","Human lungs extract Oxygen element to saturate blood cell hemoglobin."
"How many bits make up one standard byte structure?","8","16","4","32","A","One standard digital byte consists of exactly eight binary bits."
"Which core variable declaration type is block-scoped in JavaScript?","let","var","global","define","A","Modern ES6 uses 'let' keyword to declare block-scoped variables."
"Which markup describes React inline visual frameworks?","JSX","HTML5","XML","CSS3","A","React elements are declared using declarative JSX markup."`;
    setCsvText(sample);
    setCsvQuizTitle("Quick Core Knowledge Screening Series");
    setCsvDesc("Fast objective assessment generated from automated CSV upload parses.");
    setSuccess("Imported 5 standard specimen questions for review!");
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto my-4">
      {/* Platform-wide Health Analytics */}
      {stats && (
        <div className="space-y-6">
          <div className="flex justify-between items-center sm:mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart4 className="w-5 h-5 text-indigo-600" />
                {t.adminStatsTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Automated synchronization on user completions</p>
            </div>
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 py-1.5 px-3 rounded-lg hover:bg-indigo-100 cursor-pointer transition"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Sync Stats
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-2xl font-black text-slate-900 font-mono">{stats.totalUsers}</span>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">{t.totalUsers}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-2xl font-black text-slate-900 font-mono">{stats.totalQuizzes}</span>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">{t.totalQuizzes}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <ListCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-2xl font-black text-slate-900 font-mono">{stats.totalAttempts}</span>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">{t.totalAttempts}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-2xl font-black text-slate-900 font-mono">{stats.averageScore}%</span>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">{t.averagePlatformScore}</span>
              </div>
            </div>
          </div>

          {/* Custom Graphical Representation (SVGs) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Range Distribution SVG */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                {t.scoreDistribution}
              </h4>
              <div className="h-44 w-full flex items-end justify-between px-4 pb-2 border-b border-l border-slate-100">
                {/* Outstanding bar */}
                <div className="flex flex-col items-center w-12 group">
                  <div className="text-xs font-bold text-slate-800 mb-1.5 font-mono">{stats.scoreRanges.excellent}</div>
                  <div 
                    className="w-8 bg-indigo-600 rounded-t-lg transition-all duration-500 hover:opacity-80" 
                    style={{ height: `${stats.totalAttempts > 0 ? (stats.scoreRanges.excellent / stats.totalAttempts) * 120 + 8 : 8}px` }}
                  />
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider mt-2">85%+ Score</span>
                </div>
                {/* Good bar */}
                <div className="flex flex-col items-center w-12 group">
                  <div className="text-xs font-bold text-slate-800 mb-1.5 font-mono">{stats.scoreRanges.good}</div>
                  <div 
                    className="w-8 bg-teal-500 rounded-t-lg transition-all duration-500 hover:opacity-80" 
                    style={{ height: `${stats.totalAttempts > 0 ? (stats.scoreRanges.good / stats.totalAttempts) * 120 + 8 : 8}px` }}
                  />
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider mt-2">70%-84%</span>
                </div>
                {/* Average bar */}
                <div className="flex flex-col items-center w-12 group">
                  <div className="text-xs font-bold text-slate-800 mb-1.5 font-mono">{stats.scoreRanges.average}</div>
                  <div 
                    className="w-8 bg-amber-500 rounded-t-lg transition-all duration-500 hover:opacity-80" 
                    style={{ height: `${stats.totalAttempts > 0 ? (stats.scoreRanges.average / stats.totalAttempts) * 120 + 8 : 8}px` }}
                  />
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider mt-2">50%-69%</span>
                </div>
                {/* Failed bar */}
                <div className="flex flex-col items-center w-12 group">
                  <div className="text-xs font-bold text-slate-800 mb-1.5 font-mono">{stats.scoreRanges.failed}</div>
                  <div 
                    className="w-8 bg-rose-500 rounded-t-lg transition-all duration-500 hover:opacity-80" 
                    style={{ height: `${stats.totalAttempts > 0 ? (stats.scoreRanges.failed / stats.totalAttempts) * 120 + 8 : 8}px` }}
                  />
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider mt-2">Failed (&lt;50%)</span>
                </div>
              </div>
            </div>

            {/* Subject Breakdown SVG */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                {t.subjectDistribution}
              </h4>
              <div className="space-y-3.5 pt-3.5">
                {Object.keys(stats.subjectDistribution).length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-10">No category attempt data available.</div>
                ) : (
                  Object.keys(stats.subjectDistribution).map((subKey) => {
                    const item = stats.subjectDistribution[subKey];
                    // percentage of total attempts
                    const rawPCT = stats.totalAttempts > 0 ? (item.attempts / stats.totalAttempts) * 100 : 0;
                    return (
                      <div key={subKey} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800">{subKey}</span>
                          <span className="text-slate-500 font-mono">{item.attempts} attempts ({item.avgScore}% Avg)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full" 
                            style={{ width: `${Math.max(rawPCT, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Action Menu Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('manage'); setEditingQuizId(null); }}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
              activeTab === 'manage' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'
            }`}
          >
            {t.manageQuizzes}
          </button>
          
          <button
            onClick={() => {
              setActiveTab('create');
              if (!editingQuizId) {
                // Initialize clean form
                setQuizTitle('');
                setQuizSubject('Computer Science');
                setQuizDuration(15);
                setQuizDesc('');
                setFormQuestions([{ id: "q_1", text: "", options: { A: "", B: "", C: "", D: "" }, correctAnswer: "A" }]);
              }
            }}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
              activeTab === 'create' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'
            }`}
          >
            {editingQuizId ? t.editQuiz : t.createQuizManual}
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
              activeTab === 'csv' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'
            }`}
          >
            {t.uploadQuestionsCSV}
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3.5 sm:px-4.5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'approvals' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t.approvalsTab}</span>
            {approvals.filter(a => a.status === 'pending').length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                {approvals.filter(a => a.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('submenus')}
            className={`px-3.5 sm:px-4.5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'submenus' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.subMenusTab}</span>
          </button>

          {isDevAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 sm:px-4.5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === 'users' 
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/10' 
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-rose-500" />
              <span>User Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 text-xs rounded-lg font-bold leading-relaxed mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border-l-4 border-rose-500 text-xs rounded-lg font-medium leading-relaxed mb-4">
          {error}
        </div>
      )}

      {/* 1. MANAGE QUIZZES SCREEN */}
      {activeTab === 'manage' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                  <th className="py-4 px-5">{t.quizTitleLabel}</th>
                  <th className="py-4 px-5">{t.subjectLabel}</th>
                  <th className="py-4 px-5 text-center">{t.questionsCount}</th>
                  <th className="py-4 px-5 text-center">{t.durationLabel}</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
                {quizzes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No assessments registered on this platform yet. Create one above!
                    </td>
                  </tr>
                ) : (
                  quizzes.map((quiz) => {
                    const isOwner = !quiz.createdBy || quiz.createdBy === 'system' || quiz.createdBy === userId;
                    const canModify = isDevAdmin || isOwner;
                    return (
                      <tr key={quiz.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-5">
                          <div className="text-slate-900 font-bold text-sm lg:text-base flex items-center gap-2">
                            <span>{quiz.title}</span>
                            {!isOwner && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-200">
                                Other's Quiz
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 line-clamp-1 truncate max-w-sm font-medium">{quiz.description || 'No summary text.'}</div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-flex bg-slate-100 text-slate-705 px-2.5 py-1 rounded text-xs font-bold">
                            {quiz.subject}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center font-mono font-bold text-slate-800">
                          {quiz.questions.length}
                        </td>
                        <td className="py-4 px-5 text-center font-mono font-bold">
                          {quiz.duration} mins
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => {
                              if (!canModify) {
                                setError("Access Denied: You cannot toggle publish states on quizzes created by other administrators.");
                                return;
                              }
                              handlePublishToggle(quiz);
                            }}
                            disabled={!canModify}
                            title={canModify ? "Click to toggle publishing status" : "Restricted: Created by other administrator"}
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold transition ${
                              !canModify 
                                ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-60'
                                : quiz.isPublished 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer' 
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-pointer'
                            }`}
                          >
                            {quiz.isPublished ? t.publishQuiz : t.unpublishQuiz}
                          </button>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                if (!canModify) {
                                  setError("Access Denied: You cannot edit quizzes created by other administrators.");
                                  return;
                                }
                                handleEditInit(quiz);
                              }}
                              className={`p-2 rounded-lg transition ${
                                canModify 
                                  ? 'text-indigo-600 hover:bg-indigo-50 border border-indigo-100 cursor-pointer' 
                                  : 'text-slate-300 bg-slate-50 border border-slate-150 cursor-not-allowed opacity-60'
                              }`}
                              disabled={!canModify}
                              title={canModify ? "Edit" : "Restricted: Created by other administrator"}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (!canModify) {
                                  setError("Access Denied: You cannot delete quizzes created by other administrators.");
                                  return;
                                }
                                handleDeleteQuiz(quiz);
                              }}
                              className={`p-2 rounded-lg transition ${
                                canModify 
                                  ? 'text-rose-500 hover:bg-rose-50 border border-rose-100 cursor-pointer' 
                                  : 'text-slate-300 bg-slate-50 border border-slate-150 cursor-not-allowed opacity-60'
                              }`}
                              disabled={!canModify}
                              title={canModify ? "Delete" : "Restricted: Created by other administrator"}
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CREATE MANUAL QUIZ SCREEN */}
      {activeTab === 'create' && (
        <form onSubmit={handleSaveQuiz} className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                {editingQuizId ? t.editQuiz : t.createQuizManual}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Define your parameters, multiple choices, and correct options</p>
            </div>
            
            {/* Seed 20 MCQ button */}
            {!editingQuizId && (
              <button
                type="button"
                onClick={handleAutofill20Questions}
                className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-lg hover:bg-amber-100 transition cursor-pointer"
              >
                ⚡ Autofill 20 Specimen Questions
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.quizTitleLabel}</label>
              <input
                type="text"
                required
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Database Query Optimization Basics"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-4 text-slate-800 text-sm outline-none transition"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.subjectLabel}</label>
              <select
                value={quizSubject}
                onChange={(e) => setQuizSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-4 text-slate-800 text-sm outline-none transition"
              >
                <option value="Class 6">Class 6</option>
                <option value="Class 7">Class 7</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="HSC">HSC</option>
                <option value="BCS">BCS</option>
                <option value="Jobs">Jobs</option>
                <option value="Computer Science">Computer Science</option>
                <option value="General Knowledge">General Knowledge</option>
                <option value="Science">Science</option>
                <option value="Maths">Mathematics</option>
                <option value="History">History & Culture</option>
              </select>
            </div>

            {/* Show Sub-menu dropdown if Class 6 to 10 is selected */}
            {(quizSubject === 'Class 6' || quizSubject === 'Class 7' || quizSubject === 'Class 8' || quizSubject === 'Class 9' || quizSubject === 'Class 10') && (
              <div className="md:col-span-3">
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.linkedSubMenuLabel}</label>
                <select
                  value={selectedSubMenuId}
                  onChange={(e) => setSelectedSubMenuId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-4 text-slate-800 text-sm outline-none transition"
                >
                  <option value="">{t.selectSubMenuDefault}</option>
                  {subMenus
                    .filter(sm => sm.parentClass === quizSubject)
                    .map(sm => (
                      <option key={sm.id} value={sm.id}>
                        {lang === 'en' ? sm.en : sm.bn}
                      </option>
                    ))
                  }
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3">
              <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.descriptionLabel}</label>
              <input
                type="text"
                value={quizDesc}
                onChange={(e) => setQuizDesc(e.target.value)}
                placeholder="Intermediate screening assessment verifying relational databases, queries, indexes and storage..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-4 text-slate-800 text-sm outline-none transition"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.durationInput}</label>
              <input
                type="number"
                min="1"
                max="300"
                required
                value={quizDuration}
                onChange={(e) => setQuizDuration(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-4 text-slate-800 text-sm outline-none transition font-sans"
              />
            </div>
          </div>

          {/* Manually added Questions Stack */}
          <div className="space-y-6 pt-4 border-t border-slate-100">
            <h4 className="font-extrabold text-slate-900 border-b border-dashed border-slate-200 pb-2 text-sm uppercase tracking-wide flex justify-between items-center">
              <span>{lang === 'en' ? 'Quiz Assessment Question Sheets' : 'প্রশ্ন এবং বহুনির্বাচনী অপশন তালিকা'} ({formQuestions.length})</span>
              <button
                type="button"
                onClick={handleAddQuestionField}
                className="text-xs font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 py-1 px-2.5 rounded shadow-sm transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.addQuestionBtn}
              </button>
            </h4>

            <div className="space-y-6 text-slate-700">
              {formQuestions.map((question, qIdx) => (
                <div key={question.id || qIdx} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="h-7 w-7 rounded-lg bg-indigo-600 text-white font-mono text-xs font-black flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <div className="flex-1">
                      <label className="block text-slate-600 text-xs font-black mb-1">{t.questionText}</label>
                      <input
                        type="text"
                        required
                        value={question.text}
                        onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                        placeholder="What criteria defines index selection in database schemas?"
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-slate-800 text-sm outline-none transition"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestionField(qIdx)}
                      className="text-xs font-bold text-rose-500 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2 py-1 rounded transition shrink-0"
                    >
                      {t.deleteQuestion}
                    </button>
                  </div>

                  {/* MCQ Options A, B, C, D input fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                      <div key={letter} className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-slate-100 border text-slate-500 h-6 w-6 rounded flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <input
                          type="text"
                          required
                          value={question.options[letter]}
                          onChange={(e) => handleOptionChange(qIdx, letter, e.target.value)}
                          placeholder={`Option value ${letter}`}
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-slate-800 text-xs outline-none transition"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Correct Option binding picker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10 border-t border-dashed border-slate-200/50 pt-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-600 uppercase tracking-wide">{t.correctAnswerLabel}:</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => handleQuestionChange(qIdx, 'correctAnswer', letter)}
                            className={`h-7 w-7 rounded font-black cursor-pointer transition ${
                              question.correctAnswer === letter 
                                ? 'bg-indigo-650 bg-indigo-650 text-white font-bold ring-2 ring-indigo-505/20' 
                                : 'bg-white border hover:bg-slate-50 text-slate-400'
                            }`}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600 shrink-0">Explanation:</span>
                      <input
                        type="text"
                        value={question.explanation || ""}
                        onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                        placeholder="Indexes decrease seek times by modeling logical search patterns..."
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-slate-850 text-xs outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3.5 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() => { setActiveTab('manage'); setEditingQuizId(null); }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-201 text-slate-600 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer transition"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : t.saveQuizBtn}
            </button>
          </div>
        </form>
      )}

      {/* 3. CSV QUESTIONS LOADER BULK IMPORT SCREEN */}
      {activeTab === 'csv' && (
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                {t.bulkUploadTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Quickly import 20-100 questions format at once using standard syntax rules</p>
            </div>
            
            {/* Specimen file loader trigger */}
            <button
              onClick={handleSetSampleCSV}
              className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 py-1.5 px-3 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
            >
              ⚡ Paste Sample Specimen CSV Data
            </button>
          </div>

          {/* Settings Grid for CSV Imported Quiz */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-slate-750 text-xs font-bold uppercase mb-1">{t.quizTitleLabel}</label>
              <input
                type="text"
                value={csvQuizTitle}
                onChange={(e) => setCsvQuizTitle(e.target.value)}
                placeholder="Enter Imported Quiz Title"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-slate-800 text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-755 text-xs font-bold uppercase mb-1">{t.subjectLabel}</label>
              <select
                value={csvSubject}
                onChange={(e) => setCsvSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-slate-800 text-xs outline-none"
              >
                <option value="Class 6">Class 6</option>
                <option value="Class 7">Class 7</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="HSC">HSC</option>
                <option value="BCS">BCS</option>
                <option value="Jobs">Jobs</option>
                <option value="Computer Science">Computer Science</option>
                <option value="General Knowledge">General Knowledge</option>
                <option value="Science">Science</option>
                <option value="Maths">Mathematics</option>
              </select>
            </div>

            {/* Show Sub-menu dropdown for CSV if Class 6 to 10 selected */}
            {(csvSubject === 'Class 6' || csvSubject === 'Class 7' || csvSubject === 'Class 8' || csvSubject === 'Class 9' || csvSubject === 'Class 10') && (
              <div className="md:col-span-4 mt-1">
                <label className="block text-slate-750 text-xs font-bold uppercase mb-1">{t.linkedSubMenuLabel}</label>
                <select
                  value={selectedCsvSubMenuId}
                  onChange={(e) => setSelectedCsvSubMenuId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-slate-800 text-xs outline-none"
                >
                  <option value="">{t.selectSubMenuDefault}</option>
                  {subMenus
                    .filter(sm => sm.parentClass === csvSubject)
                    .map(sm => (
                      <option key={sm.id} value={sm.id}>
                        {lang === 'en' ? sm.en : sm.bn}
                      </option>
                    ))
                  }
                </select>
              </div>
            )}
            <div>
              <label className="block text-slate-750 text-xs font-bold uppercase mb-1">{t.durationInput}</label>
              <input
                type="number"
                value={csvDuration}
                onChange={(e) => setCsvDuration(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-1.5 px-3 text-slate-800 text-xs outline-none"
              />
            </div>
          </div>

          {/* Description summary */}
          <div>
            <label className="block text-slate-750 text-xs font-bold uppercase mb-1">{t.descriptionLabel}</label>
            <input
              type="text"
              value={csvDesc}
              onChange={(e) => setCsvDesc(e.target.value)}
              placeholder="Provide a general summary..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-slate-800 text-xs outline-none"
            />
          </div>

          {/* CSV Input Paste Text area */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-750">{t.csvPasteLabel}</label>
              <span className="text-slate-400 font-mono">Format: Question,OptA,OptB,OptC,OptD,Answer(A/B/C/D),Explanation</span>
            </div>
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={t.csvPlaceholder}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl p-4 text-slate-700 text-xs font-mono outline-none transition"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleValidateCSV}
              className="bg-indigo-50 hover:bg-indigo-150 border border-indigo-200 text-indigo-700 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <HelpCircle className="w-4 h-4" />
              {t.validateCSVBtn}
            </button>
          </div>

          {/* AI AUTO GENERATION PANEL */}
          <div className="mt-8 pt-8 border-t border-slate-100 space-y-5">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-55 p-2 rounded-lg text-indigo-600">
                <Sparkles className="w-5 h-5 text-indigo-650" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  <span>{lang === 'en' ? '✨ AI Question Auto-Generation Hub' : '✨ এআই প্রশ্ন অটো-জেনারেশন হাব'}</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Gemini 3.5-Flash</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'en' 
                    ? 'Upload an image / textbook page, or specify instruction commands to automatically generate quiz questions.' 
                    : 'একটি ছবি / পাঠ্যবইয়ের পাতা আপলোড করুন অথবা নির্দেশ প্রদান করে সয়ংক্রিয়ভাবে কুইজ প্রশ্ন তৈরি করুন।'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Input Prompt/Command */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">
                    {lang === 'en' ? 'Command Prompt / Instructions' : 'নির্দেশনা প্রদান করুন'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Supports Eng & Bangla</span>
                </div>
                <textarea
                  rows={4}
                  value={aiCommand}
                  onChange={(e) => setAiCommand(e.target.value)}
                  placeholder={lang === 'en' 
                    ? 'e.g. Generate 5 multiple-choice questions about high school photosynthesis in Bangla...' 
                    : 'যেমন: সালোকসংশ্লেষণ নিয়ে ৫টি বহু নির্বাচনী প্রশ্ন ও ব্যাখ্যা তৈরি করুন...'}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl p-3.5 text-slate-700 text-xs outline-none transition"
                />

                {/* Quick Prompts Suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center font-semibold">Quick:</span>
                  <button
                    type="button"
                    onClick={() => setAiCommand(lang === 'en' ? 'Generate 5 MCQs on Newtonian Mechanics for Class 9.' : 'নবম শ্রেণীর নিউটনীয় বলবিদ্যা নিয়ে ৫টি প্রশ্ন ও ব্যাখ্যা তৈরি করো।')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-250 text-slate-650 px-2.5 py-1 rounded-full transition cursor-pointer"
                  >
                    🚀 Mechanics
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiCommand(lang === 'en' ? 'Generate 5 MCQ on general science for Class 8.' : 'অষ্টম শ্রেণীর সাধারণ বিজ্ঞান নিয়ে ৫টি এমসিকিউ প্রশ্ন ও ব্যাখ্যা তৈরি করো।')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-250 text-slate-650 px-2.5 py-1 rounded-full transition cursor-pointer"
                  >
                    🌿 Science MCQ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiCommand(lang === 'en' ? 'Generate 5 general knowledge questions on the history of Bangladesh.' : 'বাংলাদেশের ইতিহাস নিয়ে ৫টি সাধারণ জ্ঞান প্রশ্ন ও ব্যাখ্যা তৈরি করো।')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-250 text-slate-650 px-2.5 py-1 rounded-full transition cursor-pointer"
                  >
                    🇧🇩 Bangladesh History
                  </button>
                </div>
              </div>

              {/* Right Column: Visual / Image Attachment Zone */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  {lang === 'en' ? 'Reference Image (Textbook, Schematic, Handwriting)' : 'রেফারেন্স ছবি সংযুক্ত করুন (পাঠ্যবই, চিত্র, হাতে লেখা)'}
                </label>
                
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleAiImageDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                    aiImageBase64 ? 'border-emerald-250 bg-emerald-50/20' : 'border-slate-205 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                  onClick={() => document.getElementById('ai-image-picker')?.click()}
                >
                  <input
                    type="file"
                    id="ai-image-picker"
                    accept="image/*"
                    onChange={handleAiImageUpload}
                    className="hidden"
                  />
                  
                  {aiImageBase64 ? (
                    <div className="space-y-2.5 w-full flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                        <img 
                          src={aiImageBase64} 
                          alt="AI Reference Upload" 
                          className="w-12 h-12 rounded-lg object-cover border border-emerald-100 bg-white"
                        />
                        <div className="text-left">
                          <p className="text-xs font-bold text-emerald-800 truncate max-w-[150px]">
                            {aiImageFileName || 'Uploaded Image'}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-mono">Ready for AI processing</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearAiImage();
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl transition cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash className="w-4 h-4 text-rose-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2">
                      <Upload className="w-7 h-7 text-slate-450 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">
                        {lang === 'en' ? 'Click or drag image file here' : 'এখানে ক্লিক করুন অথবা ছবি ড্র্যাগ করুন'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">PNG, JPG, JPEG up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiGenerating}
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50 transition"
              >
                <Sparkles className={`w-4 h-4 ${aiGenerating ? 'animate-pulse' : ''}`} />
                <span>
                  {aiGenerating 
                    ? (lang === 'en' ? 'AI Synthesizing Question Set...' : 'এআই প্রশ্ন ব্যাংক তৈরি করছে...')
                    : (lang === 'en' ? '⚡ Generate Questions with Gemini AI' : '⚡ জেমিনি এআই দিয়ে কুইজ প্রশ্ন তৈরি করুন')
                  }
                </span>
              </button>
            </div>
          </div>

          {/* CSV Validation Preview Grid Table */}
          {csvPreview.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <ListCheck className="w-5 h-5 text-indigo-600" />
                {t.previewTitle}
              </h4>
              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-105">
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4 w-1/3">Question</th>
                      <th className="py-2.5 px-4">[A]</th>
                      <th className="py-2.5 px-4">[B]</th>
                      <th className="py-2.5 px-4">[C]</th>
                      <th className="py-2.5 px-4">[D]</th>
                      <th className="py-2.5 px-4 text-center">Correct</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {csvPreview.map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{q.text}</td>
                        <td className="py-2.5 px-4">{q.options.A}</td>
                        <td className="py-2.5 px-4">{q.options.B}</td>
                        <td className="py-2.5 px-4">{q.options.C}</td>
                        <td className="py-2.5 px-4">{q.options.D}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="font-mono font-black bg-emerald-50 text-emerald-800 border-emerald-100 px-2 py-0.5 rounded">
                            {q.correctAnswer}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handlePublishCSV}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50 transition"
                >
                  {loading ? 'Publishing...' : t.importPublishBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. RE-PARTICIPATION LOCKOUT BYPASS APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                {t.adminApprovalsTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Approve or reject student lockout override requests so they can retake exams instantly</p>
            </div>
            
            <button
              onClick={fetchApprovals}
              disabled={loadingApprovals}
              className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingApprovals ? 'animate-spin' : ''}`} />
              <span>{lang === 'en' ? 'Refresh Requests' : 'অনুরোধ রিফ্রেশ'}</span>
            </button>
          </div>

          {loadingApprovals && approvals.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-slate-400 text-xs font-bold">Synchronizing override requests sheet...</p>
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-150 rounded-2xl space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
              <p className="text-slate-500 text-xs font-bold">{t.noPendingRequests}</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                    <th className="py-3 px-4">{t.studentLabel}</th>
                    <th className="py-3 px-4">{t.requestedExam}</th>
                    <th className="py-3 px-4">{t.requestDate}</th>
                    <th className="py-3 px-4 text-center">{t.statusCol}</th>
                    <th className="py-3 px-4 text-right">{t.actionsCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {approvals.map((app) => {
                    const reqDate = new Date(app.requestedAt).toLocaleString(lang === 'en' ? 'en-US' : 'bn-BD', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    });
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-4">
                          <div className="font-extrabold text-slate-800">{app.userName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{app.userEmail}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">
                          {app.quizTitle}
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-mono">
                          {reqDate}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {app.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200">
                              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                              {lang === 'en' ? 'Pending' : 'পেন্ডিং'}
                            </span>
                          )}
                          {app.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-250">
                              <Check className="w-3 h-3" />
                              {lang === 'en' ? 'Approved' : 'অনুমোদিত'}
                            </span>
                          )}
                          {app.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase border border-rose-250">
                              <XCircle className="w-3 h-3" />
                              {lang === 'en' ? 'Rejected' : 'প্রত্যাখ্যাত'}
                            </span>
                          )}
                          {app.status === 'used' && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase border border-slate-200">
                              {lang === 'en' ? 'Attempted' : 'ব্যবহৃত'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {app.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleResolveApproval(app.id, 'approved')}
                                disabled={processingId !== null}
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black py-1.5 px-3 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>{t.approveBtn}</span>
                              </button>
                              
                              <button
                                onClick={() => handleResolveApproval(app.id, 'rejected')}
                                disabled={processingId !== null}
                                className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black py-1.5 px-3 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>{t.rejectBtn}</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] font-bold">
                              {app.resolvedAt ? new Date(app.resolvedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'bn-BD') : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. SUB-MENUS MANAGEMENT PANEL */}
      {activeTab === 'submenus' && (
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
              {t.manageSubMenusTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add sub-menus/subjects to Class 6-10 categories. The dynamic sub-menus are initially hidden and will show when a user clicks on the Class menu button in the sidebar.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add New Sub-Menu Form */}
            <form onSubmit={handleAddNewSubMenu} className="lg:col-span-1 bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {t.addSubMenuBtn}
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-600 text-[11px] font-bold uppercase mb-1">{t.subMenuParentLabel}</label>
                  <select
                    value={newSubMenuParentClass}
                    onChange={(e) => setNewSubMenuParentClass(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-slate-800 text-xs outline-none transition"
                  >
                    <option value="Class 6">Class 6</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold uppercase mb-1">{t.subMenuTitleEn}</label>
                  <input
                    type="text"
                    required
                    value={newSubMenuEn}
                    onChange={(e) => setNewSubMenuEn(e.target.value)}
                    placeholder="e.g. Higher Math, Chemistry"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-slate-800 text-xs outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-bold uppercase mb-1">{t.subMenuTitleBn}</label>
                  <input
                    type="text"
                    required
                    value={newSubMenuBn}
                    onChange={(e) => setNewSubMenuBn(e.target.value)}
                    placeholder="উদা: উচ্চতর গণিত, রসায়ন"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-slate-800 text-xs outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingSubMenus}
                className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addSubMenuBtn}</span>
              </button>
            </form>

            {/* Existing Sub-menus list */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Archive className="w-4 h-4 text-slate-400" />
                <span>{t.existingSubMenusTitle}</span>
              </h4>

              {loadingSubMenus && subMenus.length === 0 ? (
                <div className="text-center py-6">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                </div>
              ) : subMenus.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-150 rounded-2xl text-slate-400 text-xs font-bold">
                  {t.noSubMenusFound}
                </div>
              ) : (
                <div className="space-y-6">
                  {["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"].map(cls => {
                    const filtered = subMenus.filter(sm => sm.parentClass === cls);
                    if (filtered.length === 0) return null;

                    return (
                      <div key={cls} className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
                            {cls}
                          </span>
                          <div className="h-[1px] bg-slate-100 flex-1" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filtered.map((sm, index) => (
                            <div key={sm.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-slate-200 transition group">
                              <div className="space-y-1">
                                <div className="font-extrabold text-slate-800 text-xs">
                                  {sm.en}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {sm.bn}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition">
                                {/* Move Up */}
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveSubMenu(cls, index, 'up')}
                                  className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>

                                {/* Move Down */}
                                <button
                                  type="button"
                                  disabled={index === filtered.length - 1}
                                  onClick={() => handleMoveSubMenu(cls, index, 'down')}
                                  className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete */}
                                {(() => {
                                  const isSubMenuActive = quizzes.some(q => q.subMenuId === sm.id);
                                  return (
                                    <button
                                      type="button"
                                      disabled={isSubMenuActive}
                                      onClick={() => handleDeleteSubMenu(sm.id)}
                                      className={`p-1.5 rounded-lg transition ml-1 ${
                                        isSubMenuActive 
                                          ? 'text-slate-200 cursor-not-allowed bg-slate-50' 
                                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                      }`}
                                      title={isSubMenuActive 
                                        ? (lang === 'en' ? "This sub-menu is linked to active quizzes and cannot be deleted" : "এই উপ-মেনুটি কুইজের সাথে সংযুক্ত এবং মুছে ফেলা যাবে না")
                                        : t.deleteSubMenuTooltip}
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. USER ROLE ADMIN PANEL */}
      {activeTab === 'users' && isDevAdmin && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Developer Admin & System Roles Portal</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'en' 
                ? 'Manage security privileges of platform members. View enrolled accounts, promote students to administrators, or revoke admin privileges instantly.'
                : 'প্ল্যাটফর্ম সদস্যদের নিরাপত্তা সুবিধা পরিচালনা করুন। নিবন্ধিত অ্যাকাউন্ট দেখুন, সাধারণ ব্যবহারকারীদের অ্যাডমিন করুন বা অ্যাডমিন থেকে অপসারণ করুন।'}
            </p>
          </div>

          {loadingUsers ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Synchronizing roles database...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                    <th className="py-4 px-5">User Profile</th>
                    <th className="py-4 px-5">Email Address</th>
                    <th className="py-4 px-5">Enrolled Date</th>
                    <th className="py-4 px-5 text-center">System Role</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {allUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    allUsers.map((u) => {
                      const isMaster = u.email === 'admin@quiz.com';
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-5">
                            <div className="text-slate-900 font-extrabold text-sm flex items-center gap-2">
                              {u.name}
                              {isMaster && (
                                <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-200">
                                  System Dev
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono font-bold block mt-0.5">ID: {u.id}</span>
                          </td>
                          <td className="py-4 px-5 font-mono text-xs text-slate-500">
                            {u.email}
                          </td>
                          <td className="py-4 px-5 text-slate-400 text-xs">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'bn-BD', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : 'Not Specified'}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border uppercase ${
                              u.role === 'admin'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-400'}`} />
                              {u.role === 'admin' ? 'Administrator' : 'Student'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            {isMaster ? (
                              <span className="text-[11px] text-rose-500 font-black italic select-none mr-4">Immune</span>
                            ) : (
                              <div className="flex justify-end gap-2">
                                {u.role === 'admin' ? (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        setError('');
                                        setSuccess('');
                                        const res = await AuthAPI.updateUserRole(u.id, 'user');
                                        if (res.success) {
                                          setSuccess(`Successfully demoted "${u.name}" to Student.`);
                                          fetchUsers();
                                        }
                                      } catch (err: any) {
                                        setError(err.message || 'Error occurred during role demotion.');
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-100 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                                    title="Revoke admin access, set to user"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Demote to Student</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        setError('');
                                        setSuccess('');
                                        const res = await AuthAPI.updateUserRole(u.id, 'admin');
                                        if (res.success) {
                                          setSuccess(`Successfully promoted "${u.name}" to Administrator.`);
                                          fetchUsers();
                                        }
                                      } catch (err: any) {
                                        setError(err.message || 'Error occurred during role promotion.');
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-100 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                                    title="Grant admin credentials"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Promote to Admin</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
