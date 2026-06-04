import { useState, useEffect } from 'react';
import { 
  BookOpen, Trophy, User, Languages, LogOut, Search, PlayCircle, 
  Award, TrendingUp, Calendar, ArrowRight, CheckCircle, RefreshCw, Star, Info,
  ListOrdered, X, FileText, Lock, Clock, Bookmark, CloudOff, Wifi, WifiOff,
  Share2, UserPlus
} from 'lucide-react';

import { Quiz, QuizAttempt, User as UserType, Language, QuizApproval, SubMenu } from './types';
import { QuizAPI, AnalyticsAPI, ApprovalsAPI, SubMenusAPI, AuthAPI } from './api';
import { translations } from './localization';

// Component Imports
import AuthScreen from './components/AuthScreen';
import QuizInterface from './components/QuizInterface';
import ResultsDisplay from './components/ResultsDisplay';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';
import ConfirmationModal from './components/ConfirmationModal';

const examMenuOptions = [
  { value: 'All', en: 'All Exams', bn: 'সব পরীক্ষা' },
  { value: 'Bookmarks', en: 'Bookmarks', bn: 'বুকমার্ক' },
  { value: 'Class 6', en: 'Class 6', bn: 'ষষ্ঠ শ্রেণী' },
  { value: 'Class 7', en: 'Class 7', bn: 'সপ্তম শ্রেণী' },
  { value: 'Class 8', en: 'Class 8', bn: 'অষ্টম শ্রেণী' },
  { value: 'Class 9', en: 'Class 9', bn: 'নবম শ্রেণী' },
  { value: 'Class 10', en: 'Class 10', bn: 'দশম শ্রেণী' },
  { value: 'HSC', en: 'HSC Prep', bn: 'এইচএসসি' },
  { value: 'BCS', en: 'BCS Exam', bn: 'বিসিএস প্রিলি' },
  { value: 'Jobs', en: 'Jobs Prep', bn: 'চাকরি প্রস্তুতি' },
  { value: 'Computer Science', en: 'Computer Science', bn: 'কম্পিউটার সায়েন্স' },
  { value: 'General Knowledge', en: 'General Knowledge', bn: 'সাধারণ জ্ঞান' },
] as const;

export default function App() {
  // Application Language Setup
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // User States
  const [user, setUser] = useState<UserType | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // General App View States: 'dashboard' | 'leaderboard' | 'admin' | 'profile' | 'quiz' | 'results'
  const [activeView, setActiveView] = useState<'dashboard' | 'leaderboard' | 'admin' | 'profile' | 'quiz' | 'results'>('dashboard');

  // Quizzes & Attempt history states
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [userHistory, setUserHistory] = useState<QuizAttempt[]>([]);
  const [userApprovals, setUserApprovals] = useState<QuizApproval[]>([]);
  const [requestingApprovalIds, setRequestingApprovalIds] = useState<Record<string, boolean>>({});
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizzesError, setQuizzesError] = useState('');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  
  // Dynamic Submenu states
  const [subMenus, setSubMenus] = useState<SubMenu[]>([]);
  const [selectedSubMenuId, setSelectedSubMenuId] = useState<string>('');
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // Bookmarks State
  const [bookmarkedQuizIds, setBookmarkedQuizIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('school_quiz_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save Bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('school_quiz_bookmarks', JSON.stringify(bookmarkedQuizIds));
    } catch (err) {
      console.error("Failed to save bookmarks:", err);
    }
  }, [bookmarkedQuizIds]);

  // Active Quiz taking states
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<QuizAttempt | null>(null);

  // Global Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText: string;
    cancelText: string;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);

  // Result Sheet popup states
  const [resultSheetQuiz, setResultSheetQuiz] = useState<Quiz | null>(null);
  const [resultSheetAttempts, setResultSheetAttempts] = useState<QuizAttempt[]>([]);
  const [loadingResultSheet, setLoadingResultSheet] = useState(false);
  const [searchInResultSheet, setSearchInResultSheet] = useState('');

  // Interactive profile settings
  const [profileSuccess, setProfileSuccess] = useState('');

  // Invite states for guest students
  const [inviteQuizId, setInviteQuizId] = useState<string | null>(null);
  const [invitedQuiz, setInvitedQuiz] = useState<Quiz | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestError, setGuestError] = useState('');
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);

  // User Administration states
  const [adminUsersList, setAdminUsersList] = useState<any[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState('');
  const [adminUsersSuccess, setAdminUsersSuccess] = useState('');

  const fetchAdminUsersList = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      setLoadingAdminUsers(true);
      setAdminUsersError('');
      const data = await AuthAPI.getUsers();
      setAdminUsersList(data);
    } catch (err: any) {
      setAdminUsersError(err.message || 'Failed to fetch platform users list.');
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  useEffect(() => {
    if (activeView === 'profile' && user?.role === 'admin') {
      fetchAdminUsersList();
    }
  }, [activeView, user]);

  // Offline Sync and Connectivity States
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [offlineSyncCount, setOfflineSyncCount] = useState<number>(() => {
    try {
      const pending = localStorage.getItem('school_quiz_offline_attempts');
      return pending ? JSON.parse(pending).length : 0;
    } catch {
      return 0;
    }
  });

  // Track proactively downloaded apps
  const [offlineQuizIds, setOfflineQuizIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('school_quiz_offline_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDownloadQuizOffline = (quiz: Quiz) => {
    try {
      const nextIds = offlineQuizIds.includes(quiz.id) ? offlineQuizIds : [...offlineQuizIds, quiz.id];
      setOfflineQuizIds(nextIds);
      localStorage.setItem('school_quiz_offline_ids', JSON.stringify(nextIds));

      const cachedJson = localStorage.getItem('school_quiz_cached_quizzes');
      const currentCache: Quiz[] = cachedJson ? JSON.parse(cachedJson) : [];
      if (!currentCache.some(q => q.id === quiz.id)) {
        currentCache.push(quiz);
        localStorage.setItem('school_quiz_cached_quizzes', JSON.stringify(currentCache));
      }
      
      setProfileSuccess(lang === 'en' ? `Exam "${quiz.title}" downloaded for offline use!` : `"${quiz.title}" অফলাইন ব্যবহারের জন্য ডাউনলোড করা হয়েছে!`);
      setTimeout(() => setProfileSuccess(''), 3500);
      
      // Auto-update stats and records
      synchronizePortalData();
    } catch (e) {
      console.error("Failed to download quiz offline:", e);
    }
  };

  const triggerOfflineSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    try {
      const pendingJson = localStorage.getItem('school_quiz_offline_attempts');
      if (!pendingJson) return;
      const pendingAttempts: QuizAttempt[] = JSON.parse(pendingJson);
      if (pendingAttempts.length === 0) return;

      setIsSyncing(true);
      let syncedCount = 0;
      const remainingAttempts: QuizAttempt[] = [];

      for (const att of pendingAttempts) {
        try {
          await QuizAPI.submit(att.quizId, {
            userId: att.userId,
            userName: att.userName,
            userEmail: att.userEmail,
            answers: att.answers,
            timeSpentSeconds: att.timeSpentSeconds
          });
          syncedCount++;
        } catch (err) {
          console.error("Failed to sync offline attempt on server:", att.id, err);
          remainingAttempts.push(att);
        }
      }

      localStorage.setItem('school_quiz_offline_attempts', JSON.stringify(remainingAttempts));
      setOfflineSyncCount(remainingAttempts.length);

      if (syncedCount > 0) {
        setProfileSuccess(lang === 'en' 
          ? `Synced ${syncedCount} completed exam results with server!` 
          : `${syncedCount}টি ক্যাশড মূল্যায়ন সফলভাবে সার্ভার সিস্টেমে সিঙ্ক হয়েছে!`
        );
        setTimeout(() => setProfileSuccess(''), 5000);
        await synchronizePortalData();
      }
    } catch (err) {
      console.error("Connectivity sync session failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Monitor network connection state transitions
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerOfflineSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Attempt startup sync as fallback
    if (navigator.onLine) {
      triggerOfflineSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load user from localStorage on boot with invite link routing support
  useEffect(() => {
    try {
      const cached = localStorage.getItem('school_quiz_cur_user');
      const cachedLang = localStorage.getItem('school_quiz_cur_lang');
      
      let currentUser: UserType | null = null;
      if (cached) {
        currentUser = JSON.parse(cached);
        setUser(currentUser);
      }
      if (cachedLang && (cachedLang === 'en' || cachedLang === 'bn')) {
        setLang(cachedLang);
      }

      // Check if arriving via quiz invite link
      const params = new URLSearchParams(window.location.search);
      const invite = params.get('invite');
      if (invite) {
        setInviteQuizId(invite);
        setLoadingQuizzes(true);
        QuizAPI.getOne(invite)
          .then((q) => {
            setInvitedQuiz(q);
            // If user is already authenticated, bypass lobby and launch exam directly
            if (currentUser) {
              setActiveQuiz(q);
              setActiveView('quiz');
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch (e) {
                console.warn("Could not clean URL query parameters path", e);
              }
              setInviteQuizId(null);
              setInvitedQuiz(null);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch invited quiz on boot:", err);
            setGuestError(lang === 'en' ? "Unable to load the invited exam. It might have been unregistered/deleted." : "আমন্ত্রিত পরীক্ষাটি লোড করা সম্ভব হয়নি। এটি সার্ভার থেকে মুছে ফেলা হয়েছে।");
          })
          .finally(() => {
            setLoadingQuizzes(false);
          });
      }
    } catch (err) {
      console.error("Local storage read failure on startup:", err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const handleStartAsGuest = () => {
    if (!guestName.trim()) {
      setGuestError(lang === 'en' ? "Your full name is required to start the exam." : "পরীক্ষা শুরু করার জন্য আপনার পুরো নাম দেওয়া আবশ্যক।");
      return;
    }
    if (!invitedQuiz) {
      setGuestError(lang === 'en' ? "The invited exam could not be read. Please refresh and try again." : "আমন্ত্রিত পরীক্ষাটি পড়া যায়নি। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।");
      return;
    }

    // Provision a lightweight guest session
    const guestUser: UserType = {
      id: "guest_" + Math.random().toString(36).substr(2, 9),
      name: guestName.trim(),
      email: "guest_" + Math.random().toString(36).substr(2, 5) + "@guest.local",
      role: 'user',
      createdAt: new Date().toISOString()
    };

    // Commit guest user state
    setUser(guestUser);
    localStorage.setItem('school_quiz_cur_user', JSON.stringify(guestUser));

    // Clear invite variables
    setInviteQuizId(null);
    setInvitedQuiz(null);
    setGuestName('');
    setGuestError('');

    // Clear URL parameters
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch(e) {
      console.warn("Unable to clear search query path", e);
    }

    // Launch active exam player immediately
    setActiveQuiz(invitedQuiz);
    setActiveView('quiz');
  };

  const handleCopyInviteLink = (quizId: string) => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${quizId}`;
    navigator.clipboard.writeText(inviteUrl)
      .then(() => {
        setCopiedQuizId(quizId);
        setTimeout(() => setCopiedQuizId(null), 2500);
      })
      .catch((err) => {
        console.error("Unable to copy to system clipboard:", err);
        alert(lang === 'en' 
          ? `Could not auto copy. You can copy this manually: ${inviteUrl}`
          : `কপি করা যায়নি। আপনি ম্যানুয়ালি এটি কপি করতে পারেন: ${inviteUrl}`
        );
      });
  };

  // Fetch quizzes list and history logs with smart offline fallbacks
  const synchronizePortalData = async () => {
    if (!user) return;
    setLoadingQuizzes(true);
    setQuizzesError('');
    
    const isBookmarksView = selectedSubject === 'Bookmarks';

    if (navigator.onLine) {
      try {
        let quizzesList = await QuizAPI.getAll({
          admin: user.role === 'admin',
          subject: (selectedSubject !== 'All' && !isBookmarksView) ? selectedSubject : undefined,
          search: searchQuery || undefined
        });

        // Auto-save quizzes to cache to have robust content immediately reusable
        localStorage.setItem('school_quiz_cached_quizzes', JSON.stringify(quizzesList));

        if (isBookmarksView) {
          quizzesList = quizzesList.filter(q => bookmarkedQuizIds.includes(q.id));
        }
        if (selectedSubMenuId) {
          quizzesList = quizzesList.filter(q => q.subMenuId === selectedSubMenuId);
        }
        setQuizzes(quizzesList);

        const historyList = await AnalyticsAPI.getHistory(user.id);
        setUserHistory(historyList || []);
        localStorage.setItem(`school_quiz_cached_history_${user.id}`, JSON.stringify(historyList || []));

        if (user.role === 'user') {
          const approvalsList = await ApprovalsAPI.getUserApprovals(user.id);
          setUserApprovals(approvalsList || []);
          localStorage.setItem(`school_quiz_cached_approvals_${user.id}`, JSON.stringify(approvalsList || []));
        }
      } catch (err: any) {
        console.warn("Failed fetching live portal data, utilizing local cache fallback:", err);
        loadDataFromLocalCache(isBookmarksView);
      } finally {
        setLoadingQuizzes(false);
      }
    } else {
      loadDataFromLocalCache(isBookmarksView);
      setLoadingQuizzes(false);
    }
  };

  const loadDataFromLocalCache = (isBookmarksView: boolean) => {
    try {
      const cachedQuizzesJson = localStorage.getItem('school_quiz_cached_quizzes');
      if (cachedQuizzesJson) {
        let quizzesList: Quiz[] = JSON.parse(cachedQuizzesJson);
        if (selectedSubject !== 'All' && !isBookmarksView) {
          quizzesList = quizzesList.filter(q => q.subject === selectedSubject);
        }
        if (isBookmarksView) {
          quizzesList = quizzesList.filter(q => bookmarkedQuizIds.includes(q.id));
        }
        if (selectedSubMenuId) {
          quizzesList = quizzesList.filter(q => q.subMenuId === selectedSubMenuId);
        }
        setQuizzes(quizzesList);
      } else {
        setQuizzes([]);
      }

      if (user) {
        const cachedHistoryJson = localStorage.getItem(`school_quiz_cached_history_${user.id}`);
        if (cachedHistoryJson) {
          setUserHistory(JSON.parse(cachedHistoryJson));
        }
        const cachedApprovalsJson = localStorage.getItem(`school_quiz_cached_approvals_${user.id}`);
        if (cachedApprovalsJson) {
          setUserApprovals(JSON.parse(cachedApprovalsJson));
        }
      }
    } catch (e) {
      console.error("Local storage offline read error:", e);
    }
  };

  // Load dynamic submenus list (supporting local cache fallback)
  useEffect(() => {
    const fetchSubMenusList = async () => {
      if (navigator.onLine) {
        try {
          const allSubMenus = await SubMenusAPI.getAll();
          setSubMenus(allSubMenus || []);
          localStorage.setItem('school_quiz_cached_submenus', JSON.stringify(allSubMenus || []));
        } catch (err) {
          console.error("Failed to load submenus, falling back to cache:", err);
          const cached = localStorage.getItem('school_quiz_cached_submenus');
          if (cached) setSubMenus(JSON.parse(cached));
        }
      } else {
        const cached = localStorage.getItem('school_quiz_cached_submenus');
        if (cached) setSubMenus(JSON.parse(cached));
      }
    };
    if (user) {
      fetchSubMenusList();
    }
  }, [user, activeView, isOnline]);

  const handleRequestRetakeApproval = async (quiz: Quiz) => {
    if (!user) return;
    setRequestingApprovalIds(prev => ({ ...prev, [quiz.id]: true }));
    try {
      await ApprovalsAPI.request({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        quizId: quiz.id,
        quizTitle: quiz.title
      });
      
      setProfileSuccess(t.sendRequestSuccess);
      setTimeout(() => setProfileSuccess(''), 4000);
      
      const approvalsList = await ApprovalsAPI.getUserApprovals(user.id);
      setUserApprovals(approvalsList || []);
    } catch (err: any) {
      console.error("Failed to submit retake request:", err);
    } finally {
      setRequestingApprovalIds(prev => ({ ...prev, [quiz.id]: false }));
    }
  };

  useEffect(() => {
    synchronizePortalData();
  }, [user, searchQuery, selectedSubject, selectedSubMenuId, activeView, bookmarkedQuizIds]);

  const handleLanguageToggle = () => {
    const nextLang: Language = lang === 'en' ? 'bn' : 'en';
    setLang(nextLang);
    localStorage.setItem('school_quiz_cur_lang', nextLang);
  };

  const handleAuthSuccess = (loggedInUser: UserType) => {
    setUser(loggedInUser);
    localStorage.setItem('school_quiz_cur_user', JSON.stringify(loggedInUser));
    setActiveView('dashboard');
  };

  const handleSignOut = () => {
    setConfirmModal({
      isOpen: true,
      title: t.confirmSignOutTitle,
      description: t.confirmSignOutDesc,
      confirmText: lang === 'en' ? "Yes, Log Out" : "হ্যাঁ, লগ আউট করুন",
      cancelText: lang === 'en' ? "Keep Session" : "বাতিল করুন",
      type: "danger",
      onConfirm: () => {
        setUser(null);
        localStorage.removeItem('school_quiz_cur_user');
        setActiveView('dashboard');
        setActiveQuiz(null);
        setActiveAttempt(null);
        setConfirmModal(null);
      }
    });
  };

  // Convert role helper to demonstrate Admin features quickly
  const handleTestingRoleOverride = () => {
    if (!user) return;
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const updatedUser = {
      ...user,
      role: nextRole
    };
    setUser(updatedUser);
    localStorage.setItem('school_quiz_cur_user', JSON.stringify(updatedUser));
    setProfileSuccess(t.switchRoleToast);
    setTimeout(() => setProfileSuccess(''), 3000);
  };

  // Handle active assessment taking triggers
  const handleStartExam = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setActiveView('quiz');
  };

  const handleOpenResultSheet = async (quiz: Quiz) => {
    setResultSheetQuiz(quiz);
    setLoadingResultSheet(true);
    setSearchInResultSheet('');
    try {
      const attemptsList = await AnalyticsAPI.getQuizAttempts(quiz.id);
      setResultSheetAttempts(attemptsList);
    } catch (err) {
      console.error("Failed to load result sheets:", err);
    } finally {
      setLoadingResultSheet(false);
    }
  };

  // Finish with score submissions (supports seamless offline participation and local evaluation)
  const handleFinishedQuizAnswers = async (answers: Record<string, 'A' | 'B' | 'C' | 'D' | ''>, elapsedSeconds: number) => {
    if (!activeQuiz || !user) return;
    setLoadingQuizzes(true);

    if (navigator.onLine) {
      try {
        const attemptReport = await QuizAPI.submit(activeQuiz.id, {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          answers,
          timeSpentSeconds: elapsedSeconds
        });
        setActiveAttempt(attemptReport);
        setActiveView('results');
        
        // Refresh portal state to pull in updated statistics
        await synchronizePortalData();
      } catch (err) {
        console.warn("Failed standard submission route, initiating local grading fallback:", err);
        gradeAndSaveOffline(answers, elapsedSeconds);
      } finally {
        setLoadingQuizzes(false);
      }
    } else {
      gradeAndSaveOffline(answers, elapsedSeconds);
      setLoadingQuizzes(false);
    }
  };

  const gradeAndSaveOffline = (answers: Record<string, 'A' | 'B' | 'C' | 'D' | ''>, elapsedSeconds: number) => {
    if (!activeQuiz || !user) return;

    let correctCount = 0;
    let wrongCount = 0;
    const totalQuestions = activeQuiz.questions.length;

    activeQuiz.questions.forEach((q) => {
      const userAns = answers[q.id];
      if (userAns === q.correctAnswer) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const isPassed = percentage >= 50;

    const offlineAttempt: QuizAttempt = {
      id: "offline_" + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      subject: activeQuiz.subject,
      score: percentage,
      correctCount,
      wrongCount,
      totalQuestions,
      answers,
      isPassed,
      createdAt: new Date().toISOString(),
      timeSpentSeconds: elapsedSeconds
    };

    // Prepend to current session history state
    setUserHistory(prev => [offlineAttempt, ...prev]);

    try {
      // Save offline attempt to queue
      const pendingJson = localStorage.getItem('school_quiz_offline_attempts');
      const pendingArr: QuizAttempt[] = pendingJson ? JSON.parse(pendingJson) : [];
      pendingArr.push(offlineAttempt);
      localStorage.setItem('school_quiz_offline_attempts', JSON.stringify(pendingArr));
      setOfflineSyncCount(pendingArr.length);

      // Cache updated history
      const cachedHistKey = `school_quiz_cached_history_${user.id}`;
      const savedHistJson = localStorage.getItem(cachedHistKey);
      const savedHist: QuizAttempt[] = savedHistJson ? JSON.parse(savedHistJson) : [];
      localStorage.setItem(cachedHistKey, JSON.stringify([offlineAttempt, ...savedHist]));
    } catch (e) {
      console.error("Failed to enqueue offline attempt:", e);
    }

    setActiveAttempt(offlineAttempt);
    setActiveView('results');

    // Notify user of beautiful cached completion status
    setProfileSuccess(t.offlineAttemptSavedAlert);
    setTimeout(() => setProfileSuccess(''), 5500);
  };

  // Basic stats aggregation for students
  const studentTotalAttempts = userHistory.length;
  const studentBestScore = userHistory.length > 0 
    ? Math.max(...userHistory.map(h => h.score)) 
    : 0;
  const studentAvgScore = userHistory.length > 0 
    ? Math.round(userHistory.reduce((acc, h) => acc + h.score, 0) / userHistory.length) 
    : 0;

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-2 text-indigo-600" />
        <span className="text-sm font-semibold tracking-wide">Initializing Quiz Portal...</span>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (inviteQuizId) {
      return (
        <div className="min-h-screen bg-slate-50 p-4 flex flex-col justify-between">
          {/* Simple translation sticky bar at the top */}
          <div className="flex justify-end p-2.5 max-w-2xl mx-auto w-full">
            <button
              onClick={handleLanguageToggle}
              className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 bg-white shadow-sm border border-slate-100 py-2.5 px-4 rounded-xl hover:bg-slate-50 cursor-pointer transition"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'বাংলা সংস্করণ' : 'English Template'}</span>
            </button>
          </div>

          <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-8 space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Guest Header */}
            <div className="text-center space-y-2">
              <div className="p-3.5 bg-indigo-55 text-indigo-600 rounded-2xl inline-flex justify-center mx-auto mb-1">
                <UserPlus className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-xl font-black text-slate-950 tracking-tight">
                {t.guestHeaderTitle}
              </h2>
              <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">
                {t.guestHeaderDesc}
              </p>
            </div>

            {/* Error banners */}
            {(guestError || quizzesError) && (
              <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs rounded-xl font-bold">
                {guestError || quizzesError}
              </div>
            )}

            {/* Quiz Card Detail Spot */}
            {invitedQuiz ? (
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono">
                    {invitedQuiz.subject}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold whitespace-nowrap font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{invitedQuiz.duration} {lang === 'en' ? 'mins' : 'মিনিট'}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm line-clamp-1">{invitedQuiz.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {invitedQuiz.description || (lang === 'en' ? 'Syllabus evaluation and assessment sheet.' : 'মূল্যায়ন পরীক্ষা পত্র।')}
                  </p>
                </div>
                <div className="text-[10px] font-bold text-slate-500 flex justify-between items-center bg-white border border-slate-100/55 px-2.5 py-1.5 rounded-lg font-mono">
                  <span>Questions Count:</span>
                  <span className="text-indigo-650 font-black">{invitedQuiz.questions.length}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl gap-2">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-400 font-semibold">{lang === 'en' ? "Consulting target exam details..." : "পরীক্ষার তথ্য যাচাই করা হচ্ছে..."}</span>
              </div>
            )}

            {/* Guest Name input Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {t.guestInputName}
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t.guestInputNamePlaceholder}
                  className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStartAsGuest();
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleStartAsGuest}
                disabled={loadingQuizzes}
                className="w-full bg-indigo-605 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/15 transition cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <span>{t.startAsGuestBtn}</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setInviteQuizId(null);
                  setInvitedQuiz(null);
                  setGuestName('');
                  setGuestError('');
                  try {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  } catch (e) {
                    console.warn("Unable to clear path", e);
                  }
                }}
                className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline transition"
              >
                {t.orLoginRegister}
              </button>
            </div>
          </div>

          <div className="text-center py-4 text-[10px] text-slate-400 font-medium">
            © {new Date().getFullYear()} EXAMHALL Assessment Engine. Built for seamless guest access.
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 p-4 flex flex-col justify-between">
        {/* Simple translation sticky bar at the top */}
        <div className="flex justify-end p-2.5 max-w-6xl mx-auto w-full">
          <button
            onClick={handleLanguageToggle}
            className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 bg-white shadow-sm border border-slate-100 py-2.5 px-4 rounded-xl hover:bg-slate-50 cursor-pointer transition"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'বাংলা সংস্করণ' : 'English Template'}</span>
          </button>
        </div>

        <AuthScreen lang={lang} onAuthSuccess={handleAuthSuccess} />

        <div className="text-center py-4 text-[10px] text-slate-400 font-medium">
          © {new Date().getFullYear()} EXAMHALL Assessment Engine. Manufactured with ultimate craftsmanship.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between">
      {/* Visual Navigation Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-slate-950 block">{t.title}</span>
                
                {/* Live connection badge */}
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full select-none" title={t.onlineStatus}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-50 border border-amber-150 text-amber-700 px-1.5 py-0.5 rounded-full select-none" title={t.offlineStatus}>
                    <WifiOff className="w-2.5 h-2.5 text-amber-500" />
                    <span>{t.offlineStatus}</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Academics Screen</span>
            </div>

            {/* Offline sync banner button */}
            {offlineSyncCount > 0 && (
              <button
                onClick={triggerOfflineSync}
                disabled={isSyncing || !isOnline}
                className={`ml-2 inline-flex items-center gap-1.5 text-[10px] font-black py-1.5 px-3 rounded-full shadow-sm transition-all duration-300 border active:scale-95 cursor-pointer ${
                  isOnline 
                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80' 
                    : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                }`}
                title={lang === 'en' ? 'Sync results with server base' : 'সার্ভারের সাথে সিঙ্ক করুন'}
              >
                <RefreshCw className={`w-3 h-3 ${isOnline ? 'text-rose-600' : 'text-slate-400'} ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {offlineSyncCount} {t.offlineSyncPendingCount} {isOnline ? ' - Sync Now' : ''}
                </span>
              </button>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              onClick={() => { setActiveView('dashboard'); setActiveQuiz(null); setActiveAttempt(null); }}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                activeView === 'dashboard' || activeView === 'quiz' || activeView === 'results'
                  ? 'bg-indigo-50 text-indigo-700 font-black' 
                  : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              {t.navDashboard}
            </button>

            <button
              onClick={() => { setActiveView('leaderboard'); }}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                activeView === 'leaderboard' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              {t.navLeaderboard}
            </button>

            {user.role === 'admin' && (
              <button
                onClick={() => { setActiveView('admin'); }}
                className={`py-2 px-3.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                  activeView === 'admin' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                {t.navAdmin}
              </button>
            )}

            <button
              onClick={() => { setActiveView('profile'); }}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                activeView === 'profile' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              {t.navProfile}
              {user.role === 'admin' && (
                <span className="ml-1 text-[9px] bg-indigo-650 text-indigo-850 bg-indigo-100 text-indigo-750 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Admin</span>
              )}
            </button>
          </nav>

          {/* Lang & LogOut actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLanguageToggle}
              title="Switch Language"
              className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer"
            >
              <Languages className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-slate-100" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-extrabold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-100  py-2 px-3.5 rounded-xl cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Core Views Router */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-6">
        
        {/* Active Quiz arena taking viewport */}
        {activeView === 'quiz' && activeQuiz && (
          <QuizInterface
            quiz={activeQuiz}
            lang={lang}
            onSubmit={handleFinishedQuizAnswers}
            onCancel={() => { setActiveView('dashboard'); setActiveQuiz(null); }}
          />
        )}

        {/* Results assessment details scorecard view */}
        {activeView === 'results' && activeQuiz && activeAttempt && (
          <ResultsDisplay
            quiz={activeQuiz}
            attempt={activeAttempt}
            lang={lang}
            onRestart={() => { setActiveView('dashboard'); setActiveQuiz(null); setActiveAttempt(null); }}
          />
        )}

        {/* Leaderboard Elite users ranking view */}
        {activeView === 'leaderboard' && (
          <Leaderboard lang={lang} />
        )}

        {/* Admin manual quiz builder, csv parser analytics views */}
        {activeView === 'admin' && user.role === 'admin' && (
          <AdminPanel lang={lang} user={user} />
        )}

        {/* Profile and quick testing roles triggers views */}
        {activeView === 'profile' && (
          <div className={`${user.role === 'admin' ? 'max-w-3xl' : 'max-w-xl'} mx-auto bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-sm space-y-6`}>
            <div className="text-center relative">
              <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                <User className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
              
              <span className="inline-flex mt-3 bg-indigo-50 text-indigo-700 text-xs px-3.5 py-1 rounded-full font-bold border border-indigo-100 uppercase tracking-wide">
                Active System Role: {user.role === 'admin' ? 'Administrator' : 'Student'}
              </span>
            </div>

            {user.role === 'admin' && (
              <div className="p-5 border border-slate-150 rounded-2xl bg-slate-50/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                      <span>{lang === 'en' ? 'User Administration & Security Panel' : 'ব্যবহারকারী প্রশাসন এবং নিরাপত্তা প্যানেল'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'en' 
                        ? 'Promote registered student accounts to Administrator class or demote existing administrators.' 
                        : 'নিবন্ধিত সাধারণ শিক্ষার্থীদের অ্যাডমিন হিসেবে রোল অনুমোদন করুন বা অপসারণ করুন।'}
                    </p>
                  </div>
                  <button 
                    onClick={fetchAdminUsersList} 
                    disabled={loadingAdminUsers}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-150 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminUsers ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {adminUsersError && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs rounded-xl font-bold">
                    {adminUsersError}
                  </div>
                )}

                {adminUsersSuccess && (
                  <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-xl font-bold">
                    {adminUsersSuccess}
                  </div>
                )}

                {loadingAdminUsers ? (
                  <div className="text-center py-6">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-[10px] text-slate-400 mt-2">Loading system users...</p>
                  </div>
                ) : (
                  <div className="border border-slate-150 rounded-xl overflow-hidden bg-white max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                          <th className="py-2.5 px-4">User</th>
                          <th className="py-2.5 px-4">Email</th>
                          <th className="py-2.5 px-4 text-center">System Role</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {adminUsersList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-slate-400">
                              No registered users found.
                            </td>
                          </tr>
                        ) : (
                          adminUsersList.map((u) => {
                            const isSelf = u.id === user.id;
                            const isImmune = u.email === 'admin@quiz.com';
                            return (
                              <tr key={u.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-2.5 px-4">
                                  <span className="text-slate-900 font-bold block">{u.name}</span>
                                  {isSelf && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded font-extrabold uppercase border border-indigo-100">You</span>}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500 text-[10px]">
                                  {u.email}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                                    u.role === 'admin'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                    {u.role === 'admin' ? 'Admin' : 'Student'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  {isImmune ? (
                                    <span className="text-[10px] text-rose-500 font-black italic mr-3">Immune</span>
                                  ) : isSelf ? (
                                    <span className="text-[10px] text-slate-400 font-bold italic mr-3">-</span>
                                  ) : (
                                    <div className="flex justify-end gap-1.5">
                                      {u.role === 'admin' ? (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              setAdminUsersError('');
                                              setAdminUsersSuccess('');
                                              const res = await AuthAPI.updateUserRole(u.id, 'user');
                                              if (res.success) {
                                                setAdminUsersSuccess(`Successfully demoted "${u.name}" to Student.`);
                                                fetchAdminUsersList();
                                              }
                                            } catch (err: any) {
                                              setAdminUsersError(err.message || 'Error occurred during demotion.');
                                            }
                                          }}
                                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded-lg text-[10px] font-black tracking-tight border border-rose-150 transition cursor-pointer"
                                          title="Remove administrator role"
                                        >
                                          Remove Admin
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              setAdminUsersError('');
                                              setAdminUsersSuccess('');
                                              const res = await AuthAPI.updateUserRole(u.id, 'admin');
                                              if (res.success) {
                                                setAdminUsersSuccess(`Successfully promoted "${u.name}" to Administrator.`);
                                                fetchAdminUsersList();
                                              }
                                            } catch (err: any) {
                                              setAdminUsersError(err.message || 'Error occurred during promotion.');
                                            }
                                          }}
                                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 rounded-lg text-[10px] font-black tracking-tight border border-indigo-150 transition cursor-pointer"
                                          title="Approve administrator role"
                                        >
                                          Approve Admin
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

            {profileSuccess && (
              <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-xl font-bold leading-relaxed">
                {profileSuccess}
              </div>
            )}

            {/* Quick Testing override section */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 text-center space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Testing & Demonstration Box</span>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                {lang === 'en' 
                  ? 'Switch between Student (take exams, view rankings) and Admin (manual builder, stats graphs, CSV importing) roles immediately below:'
                  : 'নিচে বাটন ক্লিক করে অবিলম্বে অ্যাডমিন এবং স্টুডেন্ট রোল বা পদের পরিবর্তন করুন:'}
              </p>
              <button
                onClick={handleTestingRoleOverride}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl cursor-pointer transition shadow-md shadow-indigo-600/10"
              >
                <Star className="w-4 h-4 fill-white" />
                Override Active Role to {user.role === 'admin' ? 'Student' : 'Administrator'}
              </button>
            </div>

            {/* Personal attempts matrix list summary */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
                {t.userAttemptHistoryTitle}
              </h4>

              {userHistory.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                  {t.noHistoryYet}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userHistory.map((att) => (
                    <div key={att.id} className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="block font-bold text-slate-800 line-clamp-1">{att.quizTitle}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{new Date(att.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="block font-black font-mono text-sm text-slate-900">{att.score}%</span>
                        <span className={`block text-[9px] font-bold mt-0.5 uppercase ${att.isPassed ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {att.isPassed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard available assessments, category filters, diagnostic logs */}
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Upper Student Stats Jumbotron */}
            {userHistory.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-100 bg-white p-5 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3.5 p-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-2xl font-black text-slate-900 font-mono">{studentTotalAttempts}</span>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Completed Assessments</span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 md:border-l md:border-slate-100">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <Trophy className="w-6 h-6 text-amber-500 fill-amber-100" />
                  </div>
                  <div>
                    <span className="block text-2xl font-black text-slate-900 font-mono">{studentBestScore}%</span>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Highest Score Achieved</span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 md:border-l md:border-slate-100">
                  <div className="p-3 bg-indigo-50 text-emerald-600 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <span className="block text-2xl font-black text-slate-900 font-mono">{studentAvgScore}%</span>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Average Evaluation Grade</span>
                  </div>
                </div>
              </div>
            )}

            {/* Title introduction */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                  {lang === 'en' ? 'Syllabus & Course Registries' : 'পরীক্ষা ও সিলেবাস রেজিষ্ট্রি'}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">{t.subtitle}</p>
              </div>

              {/* Language feedback */}
              <div className="bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-xs px-3 py-1 bg-opacity-70 rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
                <BookOpen className="w-3.5 h-3.5" />
                <span>
                  {lang === 'en' ? `${examMenuOptions.length} Direct Categories` : `${examMenuOptions.length}টি প্রধান ক্যাটাগরি`}
                </span>
              </div>
            </div>

            {/* Layout grid containing side layout and cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Left Column: Exams Menu sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered className="w-4.5 h-4.5 text-indigo-600" />
                      <span>{lang === 'en' ? 'Exams Menu' : 'পরীক্ষা মেনু'}</span>
                    </h3>
                    <p className="text-slate-400 text-[10px] mt-1 uppercase font-semibold tracking-wider font-mono">
                      {lang === 'en' ? 'Class 6-10 & Prep' : 'শ্রেণী ৬-১০ ও প্রস্তুতি'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 max-h-[380px] overflow-y-auto pr-1">
                    {examMenuOptions.map((opt) => {
                      const isActive = selectedSubject === opt.value;
                      const isClassCategory = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].includes(opt.value);
                      const isExpanded = expandedClasses[opt.value];
                      
                      return (
                        <div key={opt.value} className="space-y-1">
                          <button
                            onClick={() => {
                              setSelectedSubject(opt.value);
                              setSelectedSubMenuId(''); // Reset sub-menu filter when selecting the main class category
                              if (isClassCategory) {
                                setExpandedClasses(prev => ({
                                  ...prev,
                                  [opt.value]: !prev[opt.value]
                                }));
                              }
                            }}
                            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-between cursor-pointer ${
                              isActive
                                ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/15 scale-[1.02]'
                                : 'hover:bg-slate-50 text-slate-600 border border-transparent hover:text-indigo-600'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {opt.value === 'Bookmarks' && (
                                <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white fill-white' : 'text-amber-500 fill-amber-400'}`} />
                              )}
                              <span>{lang === 'en' ? opt.en : opt.bn}</span>
                            </span>
                            <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {isClassCategory ? (isExpanded ? '▼' : '▶') : '➔'}
                            </span>
                          </button>

                          {/* Render dynamic SubMenu list if expanded and matches parent category */}
                          {isClassCategory && isExpanded && (
                            <div className="pl-4.5 pr-1 py-1 flex flex-col gap-1 border-l border-indigo-100/50 ml-3.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              {subMenus
                                .filter(sm => sm.parentClass === opt.value)
                                .map(sm => {
                                  const isSubActive = selectedSubMenuId === sm.id;
                                  return (
                                    <button
                                      key={sm.id}
                                      onClick={() => {
                                        setSelectedSubject(sm.parentClass);
                                        setSelectedSubMenuId(sm.id);
                                      }}
                                      className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${
                                        isSubActive
                                          ? 'bg-indigo-50 text-indigo-700 font-extrabold shadow-sm border border-indigo-150/40'
                                          : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600 border border-transparent'
                                      }`}
                                    >
                                      <span>{lang === 'en' ? sm.en : sm.bn}</span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-60" />
                                    </button>
                                  );
                                })
                              }
                              {subMenus.filter(sm => sm.parentClass === opt.value).length === 0 && (
                                <span className="text-[10px] text-slate-400 font-semibold italic py-1 pl-1">
                                  {lang === 'en' ? 'No sub-menus' : 'কোনো উপ-মেনু নেই'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-3 shadow-lg shadow-slate-900/10">
                  <Trophy className="w-8 h-8 text-amber-400 fill-amber-400/20" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {lang === 'en' ? 'Interactive Grading' : 'স্বয়ংক্রিয় মূল্যায়ন'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      {lang === 'en' 
                        ? 'Every single quiz has an instant Result Sheet listing class rankings and total scorecards for total transparency.' 
                        : 'প্রত্যেক পরীক্ষার জন্য রয়েছে স্বয়ংক্রিয় মেরিট এবং ফলাফল বিবরণী শিট যাতে শিক্ষার্থীদের সঠিক মূল্যায়ন প্রকাশ পায়।'}
                    </p>
                  </div>
                </div>
              </div>

               {/* Right Column: Search + Quizzes Grid */}
              <div className="lg:col-span-3 space-y-6 animate-in fade-in duration-300">
                
                {/* Offline banner alert check */}
                {!isOnline && (
                  <div className="bg-amber-50/75 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-xs font-semibold animate-in fade-in duration-300">
                    <div className="p-1.5 bg-amber-100 rounded-xl">
                      <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
                    </div>
                    <div>
                      <p className="font-black text-amber-900">{t.noInternetConnection}</p>
                      <p className="text-[10px] text-amber-700 font-bold mt-0.5">{t.showingLocalCache}</p>
                    </div>
                  </div>
                )}
                
                {/* Search Input bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-100 focus:border-indigo-500 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition shadow-sm"
                    />
                  </div>

                  {selectedSubMenuId && (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: t.confirmClearFiltersTitle,
                          description: t.confirmClearFiltersDesc,
                          confirmText: lang === 'en' ? "Yes, Clear Filters" : "হ্যাঁ, ফিল্টার মুছুন",
                          cancelText: lang === 'en' ? "Keep Filters" : "বাতিল করুন",
                          type: "warning",
                          onConfirm: () => {
                            setSelectedSubMenuId('');
                            setConfirmModal(null);
                          }
                        });
                      }}
                      className="px-4 py-3 bg-indigo-50 hover:bg-rose-50 border border-indigo-100 hover:border-rose-250 text-indigo-700 hover:text-rose-700 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer whitespace-nowrap active:scale-95 group"
                    >
                      <X className="w-4 h-4 text-indigo-500 group-hover:text-rose-500" />
                      <span>
                        {t.clearFilterBtn} {(() => {
                          const activeSubMenu = subMenus.find(sm => sm.id === selectedSubMenuId);
                          return activeSubMenu ? `(${lang === 'en' ? activeSubMenu.en : activeSubMenu.bn})` : '';
                        })()}
                      </span>
                    </button>
                  )}
                </div>

                {/* Quizzes Grid Cards */}
                {loadingQuizzes ? (
                  <div className="flex flex-col items-center justify-center p-16 text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2 text-indigo-600" />
                    <span className="text-sm font-semibold">Updating assessments matrix...</span>
                  </div>
                ) : quizzesError ? (
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-rose-800 text-xs leading-relaxed font-bold">
                    {quizzesError}
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="text-slate-400 text-sm text-center py-16 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 max-w-sm mx-auto">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span className="font-bold block text-slate-600">No Assessments Available</span>
                    <span className="text-xs text-slate-400 block mt-1.5">
                      {lang === 'en' 
                        ? `No exam entries found matching "${selectedSubject}". Change filters or build quizzes inside the Admin workspace.`
                        : `"${selectedSubject}" ফিল্টারের অধীনে কোনো পরীক্ষা পাওয়া যায়নি। অ্যাডমিন প্যানেল থেকে কুইজ তৈরি বা ইম্পোর্ট করুন।`}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quizzes.map((quiz) => {
                      const quizAttempts = userHistory.filter(h => h.quizId === quiz.id);
                      const lastAttempt = quizAttempts.length > 0 
                        ? [...quizAttempts].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                        : null;
                      
                      // Check for 12-hour lockout
                      const lockoutTimeMs = 12 * 60 * 60 * 1000;
                      const timeDiff = lastAttempt ? Date.now() - new Date(lastAttempt.createdAt).getTime() : 0;
                      const isTimeLocked = lastAttempt && timeDiff < lockoutTimeMs && user?.role !== 'admin';
                      
                      // Fetch relevant re-participation approvals list for this quiz
                      const approvalsListForQuiz = userApprovals.filter(a => a.quizId === quiz.id);
                      const activeApproval = approvalsListForQuiz.length > 0
                        ? [...approvalsListForQuiz].sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0]
                        : null;
                      
                      const isApproved = activeApproval?.status === 'approved';
                      const isPending = activeApproval?.status === 'pending';
                      const isRejected = activeApproval?.status === 'rejected';

                      // We are fully unlocked if either:
                      // - Not timed locked, OR
                      // - Is approved by admin, OR
                      // - User is admin
                      const canTakeExam = !isTimeLocked || isApproved || user?.role === 'admin';

                      // Lockout Countdown info
                      const secsRemaining = Math.max(0, Math.floor((lockoutTimeMs - timeDiff) / 1000));
                      const hrsRemaining = Math.floor(secsRemaining / 3600);
                      const minsRemaining = Math.floor((secsRemaining % 3600) / 60);

                      return (
                        <div 
                          key={quiz.id} 
                          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-lg hover:border-slate-200/80 transition duration-300 relative group overflow-hidden"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-1.5 font-sans">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded font-mono">
                                  {quiz.subject}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isBookmarked = bookmarkedQuizIds.includes(quiz.id);
                                    if (isBookmarked) {
                                      setBookmarkedQuizIds(prev => prev.filter(id => id !== quiz.id));
                                    } else {
                                      setBookmarkedQuizIds(prev => [...prev, quiz.id]);
                                    }
                                  }}
                                  className={`p-1 rounded-lg border transition duration-150 cursor-pointer ${
                                    bookmarkedQuizIds.includes(quiz.id)
                                      ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100 hover:text-amber-600'
                                      : 'bg-white border-slate-150 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                  }`}
                                  title={bookmarkedQuizIds.includes(quiz.id) ? (lang === 'en' ? "Remove Bookmark" : "বুকমার্ক মুছুন") : (lang === 'en' ? "Bookmark Exam" : "বুকমার্ক করুন")}
                                >
                                  <Bookmark className={`w-3 h-3 ${bookmarkedQuizIds.includes(quiz.id) ? 'fill-amber-400 text-amber-500' : ''}`} />
                                </button>
                                
                                {/* Offline Download Indicator & Trigger */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadQuizOffline(quiz);
                                  }}
                                  className={`p-1.5 rounded-lg border transition duration-150 cursor-pointer ${
                                    offlineQuizIds.includes(quiz.id)
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-105'
                                      : 'bg-white border-slate-150 hover:border-slate-300 text-slate-400 hover:text-indigo-650'
                                  }`}
                                  title={offlineQuizIds.includes(quiz.id) ? t.cachedBadge : t.downloadForOffline}
                                >
                                  {offlineQuizIds.includes(quiz.id) ? (
                                    <CheckCircle className="w-3 h-3 text-emerald-600 fill-emerald-100" />
                                  ) : (
                                    <CloudOff className="w-3 h-3 text-slate-400" />
                                  )}
                                </button>
                              </div>
                              
                              {isTimeLocked && !isApproved ? (
                                <span className="text-[10px] inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1 rounded font-extrabold whitespace-nowrap">
                                  <Lock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                  <span>
                                    {lang === 'en' 
                                      ? `Locked (${hrsRemaining}h ${minsRemaining}m)` 
                                      : `লকড (${hrsRemaining}ঘ. ${minsRemaining}মি.)`}
                                  </span>
                                </span>
                              ) : isApproved ? (
                                <span className="text-[10px] inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded font-black whitespace-nowrap uppercase tracking-wider">
                                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{lang === 'en' ? 'Bypassed 🔓' : 'অনুমোদিত 🔓'}</span>
                                </span>
                              ) : lastAttempt ? (
                                <span className="text-[10px] inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded font-bold whitespace-nowrap">
                                  ✓ {lang === 'en' ? 'Completed' : 'সম্পন্ন'} ({lastAttempt.score}%)
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
                                  {lang === 'en' ? 'Unattempted' : 'অংশগ্রহণ বাকি'}
                                </span>
                              )}
                            </div>

                            <div>
                              <h3 className="font-black text-slate-900 text-base group-hover:text-indigo-600 transition min-h-[48px] line-clamp-2">
                                {quiz.title}
                              </h3>
                              <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed min-h-[32px]">
                                {quiz.description || 'Comprehensive evaluation sheet validating individual subject matrices.'}
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-slate-150/40 mt-5 pt-4 flex flex-col gap-3">
                            <div className="flex justify-between font-mono text-slate-500 font-bold text-xs items-center">
                              <div className="flex items-center gap-1.5">
                                <span>{quiz.questions.length}</span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">{t.questionsCount}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span>{quiz.duration}</span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">{lang === 'en' ? 'Minutes' : 'মিনিট'}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {/* View Result Sheet trigger */}
                              <button
                                onClick={() => handleOpenResultSheet(quiz)}
                                className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-2 rounded-xl transition cursor-pointer border border-slate-100"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                <span>{lang === 'en' ? 'Result Sheet' : 'ফলাফল বিবরণী'}</span>
                              </button>

                              {/* Take Exam or Approval control */}
                              {canTakeExam ? (
                                <button
                                  onClick={() => handleStartExam(quiz)}
                                  className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-2.5 px-2 rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer transition"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>{t.takeQuizBtn}</span>
                                </button>
                              ) : isPending ? (
                                <button
                                  disabled
                                  className="flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold py-2.5 px-1.5 rounded-xl opacity-85 cursor-not-allowed select-none transition leading-tight text-center"
                                  title={t.requestPending}
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                  <span className="font-semibold text-[10px] sm:text-xs">
                                    {lang === 'en' ? 'Pending Rev.' : 'অনুরোধ পেন্ডিং'}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRequestRetakeApproval(quiz)}
                                  disabled={requestingApprovalIds[quiz.id]}
                                  className="flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-black py-2.5 px-1.5 rounded-xl cursor-pointer transition text-center leading-tight hover:shadow-sm"
                                  title={t.requestRetakeBtn}
                                >
                                  {requestingApprovalIds[quiz.id] ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                  ) : (
                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                  )}
                                  <span className="text-[10px] sm:text-xs whitespace-nowrap">
                                    {isRejected 
                                      ? (lang === 'en' ? 'Retry Ask' : 'পুনরায় বলুন') 
                                      : (lang === 'en' ? 'Request Retake' : 'রিটেক অনুরোধ')}
                                  </span>
                                </button>
                              )}
                            </div>

                            {/* Direct Guest Invite Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyInviteLink(quiz.id)}
                              className={`w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer border ${
                                copiedQuizId === quiz.id
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-700 font-bold scale-[0.99]'
                                  : 'bg-indigo-50/40 hover:bg-indigo-50 border-indigo-100/40 text-indigo-650 hover:text-indigo-850 active:scale-95'
                              }`}
                            >
                              <Share2 className={`w-3.5 h-3.5 ${copiedQuizId === quiz.id ? 'text-emerald-600 animate-bounce' : 'text-indigo-500'}`} />
                              <span>
                                {copiedQuizId === quiz.id 
                                  ? t.inviteCopiedToast 
                                  : t.inviteLinkBtn}
                              </span>
                            </button>
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
      </main>

      {/* Styled Footer */}
      <footer className="bg-white border-t border-slate-200/15 py-6 mt-12 print:hidden">
        <div className="max-w-6xl mx-auto px-4 text-center md:flex md:justify-between md:items-center text-xs text-slate-400 font-medium space-y-4 md:space-y-0">
          <div>
            © {new Date().getFullYear()} EXAMHALL Quiz Platform. All rights reserved.
          </div>
          <div className="flex gap-4 justify-center items-center">
            <a 
              href="/" 
              className="text-indigo-600 hover:text-indigo-800 font-extrabold hover:underline transition"
            >
              examhall
            </a>
            <span className="text-slate-300">•</span>
            <span className="font-mono">Server Status: Online</span>
            <span className="text-slate-300">•</span>
            <span className="text-indigo-500">Built with Google AI Studio</span>
          </div>
        </div>
      </footer>

      {/* Result Sheet Modal Overlay */}
      {resultSheetQuiz && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:p-0 print:static print:bg-white print:backdrop-blur-none">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up print:shadow-none print:border-none print:max-h-none print:static print:w-full">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
                  <FileText className="w-6 h-6 text-indigo-650" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/50 px-2.5 py-0.5 rounded font-mono">
                      {resultSheetQuiz.subject}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                      ID: {resultSheetQuiz.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1 line-clamp-1">
                    {lang === 'en' ? 'Exam Result Sheet' : 'পরীক্ষার ফলাফল বিবরণী শিট'}
                  </h2>
                </div>
              </div>
              <button 
                onClick={() => setResultSheetQuiz(null)}
                className="p-1.5 hover:bg-slate-200/60 rounded-full transition text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Print View Header (only visible when printing) */}
            <div className="hidden print:block p-8 border-b border-slate-200 text-center space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">EXAMHALL ASSESSMENT PORTAL</h1>
              <p className="text-sm font-semibold tracking-wide text-indigo-700 uppercase">OFFICIAL GRADE SHEET & CANDIDATE STANDINGS</p>
              <div className="grid grid-cols-2 text-left text-xs bg-slate-50 p-4 rounded-2xl gap-2 mt-4 max-w-xl mx-auto border border-slate-100">
                <div><strong>Exam Name:</strong> {resultSheetQuiz.title}</div>
                <div><strong>Subject Category:</strong> {resultSheetQuiz.subject}</div>
                <div><strong>Total Questions:</strong> {resultSheetQuiz.questions.length}</div>
                <div><strong>Allotted Duration:</strong> {resultSheetQuiz.duration} Mins</div>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Exam Info Summary */}
              <div className="bg-slate-50/70 border border-slate-100 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'en' ? 'Active Exam' : 'পরীক্ষার নাম'}</label>
                  <span className="block text-sm font-black text-slate-800 mt-1">{resultSheetQuiz.title}</span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'en' ? 'Participation Pool' : 'মোট অংশগ্রহণকারী'}</label>
                  <span className="block text-sm font-black text-slate-800 mt-1">
                    {lang === 'en' ? `${resultSheetAttempts.length} Candidates` : `${resultSheetAttempts.length} জন পরীক্ষার্থী`}
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'en' ? 'Average Score' : 'গড় অর্জিত নম্বর'}</label>
                  <span className="block text-sm font-black text-indigo-600 mt-1 font-mono">
                    {resultSheetAttempts.length > 0 
                      ? `${Math.round(resultSheetAttempts.reduce((acc, cur) => acc + cur.score, 0) / resultSheetAttempts.length)}%` 
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* Filter / Search within Result Sheet */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 print:hidden">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchInResultSheet}
                    onChange={(e) => setSearchInResultSheet(e.target.value)}
                    placeholder={lang === 'en' ? 'Search students by name or email...' : 'নাম অথবা ইমেইল দিয়ে খুঁজুন...'}
                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-100 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-700 outline-none transition"
                  />
                </div>
                
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 text-white font-bold text-xs py-2 px-4 rounded-xl shadow hover:bg-slate-850 cursor-pointer transition flex items-center justify-center gap-1.5 self-start sm:self-auto"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'en' ? 'Print Result Sheet' : 'ফলাফল প্রিন্ট করুন'}</span>
                </button>
              </div>

              {/* Loader */}
              {loadingResultSheet ? (
                <div className="flex flex-col justify-center items-center p-12 text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin text-indigo-650 mb-1.5" />
                  <span className="text-xs font-bold">Fetching grade rolls from index server...</span>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-auto max-h-[450px] shadow-sm max-w-full">
                  <table className="w-full min-w-[700px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100 font-mono">
                        <th className="py-3 px-4 text-center w-16">{lang === 'en' ? 'Rank' : 'মেরিট'}</th>
                        <th className="py-3 px-4">{lang === 'en' ? 'Student & Email' : 'শিক্ষার্থী ও ইমেইল'}</th>
                        <th className="py-3 px-4 text-center">{lang === 'en' ? 'Duration Spent' : 'ব্যয়িত সময়'}</th>
                        <th className="py-3 px-4 text-center">{lang === 'en' ? 'Marks Ratio' : 'সঠিক উত্তর'}</th>
                        <th className="py-3 px-4 text-center">{lang === 'en' ? 'Percentage' : 'শতকরা'}</th>
                        <th className="py-3 px-4 text-center">{lang === 'en' ? 'Status' : 'ফলাফল'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {(() => {
                        const filtered = resultSheetAttempts.filter(att => 
                          (att.userName || '').toLowerCase().includes(searchInResultSheet.toLowerCase()) ||
                          (att.userEmail || '').toLowerCase().includes(searchInResultSheet.toLowerCase())
                        );

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-slate-400 font-medium font-mono">
                                {lang === 'en' ? 'No candidate entries mapped.' : 'কোনো রেজাল্ট রেকর্ড পাওয়া যায়নি।'}
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((entry, idx) => {
                          const isBest = idx === 0;
                          const minutes = Math.floor((entry.timeSpentSeconds || 0) / 60);
                          const seconds = (entry.timeSpentSeconds || 0) % 60;
                          const formattedTime = `${minutes}m ${seconds}s`;

                          return (
                            <tr 
                              key={entry.id} 
                              className={`hover:bg-slate-50/50 transition ${
                                user && entry.userId === user.id ? 'bg-indigo-50/20 text-slate-900 border-l-2 border-l-indigo-600 font-semibold' : 'text-slate-600'
                              }`}
                            >
                              {/* Merit Rank */}
                              <td className="py-3.5 px-4 text-center font-bold font-mono">
                                {isBest ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 rounded-full text-xs shadow-sm">
                                    ★ 1
                                  </span>
                                ) : (
                                  <span>#{idx + 1}</span>
                                )}
                              </td>

                              {/* Student Avatar, Name, Email */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center uppercase shadow-sm border border-slate-200/50 shrink-0">
                                    {(entry.userName || 'U')[0]}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                      <span>{entry.userName || 'Anonymous Student'}</span>
                                      {user && entry.userId === user.id && (
                                        <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase scale-[0.9]">
                                          {lang === 'en' ? 'You' : 'আপনি'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-semibold font-mono">{entry.userEmail}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Time spent */}
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500">
                                {formattedTime}
                              </td>

                              {/* Correct ratio */}
                              <td className="py-3.5 px-4 text-center font-bold">
                                <span className="text-emerald-600">{entry.correctCount}</span>
                                <span className="mx-1 text-slate-300">/</span>
                                <span className="text-slate-400">{entry.totalQuestions}</span>
                              </td>

                              {/* Percentage */}
                              <td className="py-3.5 px-4 text-center font-black font-mono text-slate-800">
                                {entry.score}%
                              </td>

                              {/* Pass-fail status Badge */}
                              <td className="py-3.5 px-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  entry.score >= 50 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-105/60'
                                }`}>
                                  {entry.score >= 50 
                                    ? (lang === 'en' ? 'Passed' : 'উত্তীর্ণ') 
                                    : (lang === 'en' ? 'Failed' : 'অনুত্তীর্ণ')}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center print:hidden">
              <span className="text-[11px] text-slate-400 font-semibold font-mono">
                {lang === 'en' 
                  ? 'Official verification seal enabled • EXAMHALL' 
                  : 'অফিসিয়াল মূল্যায়ন ডাটাবেজ সুরক্ষাধীন • এক্সামহল'}
              </span>
              <button
                onClick={() => setResultSheetQuiz(null)}
                className="bg-slate-200 hover:bg-slate-250 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer transition"
              >
                {lang === 'en' ? 'Close Sheet' : 'বন্ধ করুন'}
              </button>
            </div>

          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmationModal
          id="global-confirmation"
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          type={confirmModal.type}
        />
      )}
    </div>
  );
}
