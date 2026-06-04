import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, BookOpen, KeyRound, Check, HelpCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { AuthAPI } from '../api';
import { Language, User as UserType } from '../types';
import { translations } from '../localization';

interface AuthScreenProps {
  lang: Language;
  onAuthSuccess: (user: UserType) => void;
}

export default function AuthScreen({ lang, onAuthSuccess }: AuthScreenProps) {
  const t = translations[lang];
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<'admin' | 'user'>('user');
  const [devPermitKey, setDevPermitKey] = useState('');
  
  // OTP States
  const [otpStep, setOtpStep] = useState<'idle' | 'login-verify' | 'register-verify'>('idle');
  const [otpValue, setOtpValue] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [smtpWarning, setSmtpWarning] = useState('');

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setNewPassword('');
    setDevPermitKey('');
    setOtpValue('');
    setOtpStep('idle');
    setDevOtp('');
    setSmtpWarning('');
    setError('');
    setMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await AuthAPI.loginRequest({ email, password });
      if (response.otpRequired) {
        setOtpStep('login-verify');
        setEmailSent(response.emailSent);
        setDevOtp(response.devOtp || '');
        setSmtpWarning(response.error || '');
        setMessage(response.emailSent 
          ? (lang === 'en' ? "A secure OTP has been dispatched to your email address." : "একটি ওটিপি কোড আপনার ইমেলে পাঠানো হয়েছে।")
          : (lang === 'en' ? "Credentials verified successfully." : "শংসাপত্র সফলভাবে যাচাই করা হয়েছে।")
        );
      } else {
        onAuthSuccess(response.user);
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue) return setError("Please enter the 6-digit OTP code.");

    setLoading(true);
    setError('');
    try {
      const response = await AuthAPI.loginVerify({ email, otp: otpValue });
      onAuthSuccess(response.user);
    } catch (err: any) {
      setError(err.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return setError("Please enter your name, email, and password.");
    if (requestedRole === 'admin' && !devPermitKey) {
      return setError(t.devPermitRequiredError);
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await AuthAPI.registerRequest({
        name,
        email,
        password,
        role: requestedRole,
        devPermitKey: requestedRole === 'admin' ? devPermitKey : undefined
      });
      
      if (response.otpRequired) {
        setOtpStep('register-verify');
        setEmailSent(response.emailSent);
        setDevOtp(response.devOtp || '');
        setSmtpWarning(response.error || '');
        setMessage(response.emailSent 
          ? (lang === 'en' ? "A secure OTP has been dispatched to your email address." : "একটি ওটিপি কোড আপনার ইমেলে পাঠানো হয়েছে।")
          : (lang === 'en' ? "Registration details verified." : "রেজিস্ট্রেশনের বিবরণ যাচাই করা হয়েছে।")
        );
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue) return setError("Please enter the 6-digit OTP code.");

    setLoading(true);
    setError('');
    try {
      const response = await AuthAPI.registerVerify({ email, otp: otpValue });
      onAuthSuccess(response.user);
    } catch (err: any) {
      setError(err.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email.");
    
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await AuthAPI.forgotPassword({ email, newPassword: newPassword || undefined });
      if (newPassword) {
        setMessage(t.forgotPassLink + " success. Passwords updated. Log in now!");
        setTimeout(() => {
          setIsForgot(false);
          setIsLogin(true);
          setPassword('');
          setError('');
          setMessage('');
        }, 1500);
      } else {
        setMessage(t.emailSuccess + " (Simulated: Please enter a new password below to reset)");
      }
    } catch (err: any) {
      setError(err.message || "Failed to locate email record.");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (role: 'admin' | 'user') => {
    setEmail(role === 'admin' ? 'admin@quiz.com' : 'student@quiz.com');
    setPassword(role === 'admin' ? 'admin123' : 'student123');
    setIsLogin(true);
    setIsForgot(false);
    setOtpStep('idle');
    setOtpValue('');
    setError('');
    setMessage('');
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 lg:p-10 shadow-xl border border-slate-150 relative">
        {/* Simple Centered Logo / Branding Header */}
        <div className="flex flex-col items-center justify-center gap-3 mb-8 text-center">
          <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-md shadow-indigo-600/20">
            <BookOpen className="w-7 h-7" />
          </div>
          <span className="text-xl font-extrabold tracking-wider text-slate-900 font-sans tracking-tight">
            EXAMHALL
          </span>
          <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider font-mono">
            {t.title}
          </p>
        </div>

        <div className="w-full">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {otpStep !== 'idle' 
                ? (lang === 'en' ? 'Verify Account Access' : 'অ্যাকাউন্ট অ্যাক্সেস যাচাই করুন')
                : isForgot 
                  ? t.resetPassTitle 
                  : isLogin 
                    ? t.login 
                    : t.signup
              }
            </h2>
            <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
              {otpStep !== 'idle'
                ? (lang === 'en' ? 'Two-step security checkpoint to protect account integrity.' : 'অ্যাকাউন্ট সুরক্ষার জন্য দ্বিমুখী নিরাপত্তা চেকপয়েন্ট।')
                : isForgot 
                  ? 'Check and change your access credentials securely' 
                  : isLogin 
                    ? 'Access your educational portal to start your next assessment.' 
                    : 'Register a new account to keep progress history and view rankings.'}
            </p>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="p-3.5 bg-rose-50 border-l-4 border-rose-500 text-rose-700 rounded-lg text-xs leading-relaxed mb-6 font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-lg text-xs leading-relaxed mb-6 font-medium">
              {message}
            </div>
          )}

          {/* Core Auth Forms */}
          {otpStep !== 'idle' ? (
            <form onSubmit={otpStep === 'login-verify' ? handleLoginVerify : handleRegisterVerify} className="space-y-5">
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 uppercase">
                    {lang === 'en' ? 'Two-Factor SMTP Verification' : 'দ্বিমুখী ইমেল যাচাইকরণ'}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    {lang === 'en' 
                      ? `Enter the 6-digit OTP code dispatched to standard system mailbox for address: ${email}` 
                      : `আপনার ইমেল যাচাই করতে এই ঠিকানায় পাঠানো ৬-ডিজিটের ওটিপি কোডটি প্রবেশ করান: ${email}`}
                  </p>
                </div>
              </div>

              {!emailSent && devOtp && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 animate-in fade-in slide-in-from-top-2 duration-250">
                  <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-xs">
                    <span>⚠️ {lang === 'en' ? 'SMTP NOT CONFIGURED' : 'এসএমটিপি কনফিগার করা নেই'}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-normal mt-1.5">
                    {lang === 'en' 
                      ? 'Email dispatch is bypassed because Gmail credentials are unconfigured in secrets. For preview testing, use this system-provided OTP:' 
                      : 'সিক্রেটসে জিমেইল কোড কনফিগার করা নেই। তাই বাস্তব ইমেল পাঠানো বাদ দেওয়া হয়েছে। নিচে প্রদত্ত ওটিপি দিয়ে পরীক্ষা করুন:'}
                  </p>
                  <div className="mt-2.5 py-2 px-4 bg-white/95 border border-amber-200 rounded-xl font-mono text-center text-lg font-black tracking-[0.4em] text-slate-900 shadow-sm">
                    {devOtp}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 font-medium leading-relaxed">
                    {lang === 'en' 
                      ? 'Note: Add SMTP_USER and SMTP_PASS to Secrets panel for live SMTP delivery.' 
                      : 'তথ্য: লাইভ ইমেলের জন্য Secrets প্যানেলে SMTP_USER এবং SMTP_PASS যুক্ত করুন।'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">
                  {lang === 'en' ? 'Enter 6-Digit Verification Code' : '৬-ডিজিটের ভেরিফিকেশন কোড'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-900 font-mono text-lg font-bold tracking-widest outline-none transition placeholder:text-slate-300"
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3.5 px-4 text-sm transition hover:shadow-lg hover:shadow-indigo-600/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Verifying...' : (lang === 'en' ? 'Confirm OTP & Proceed' : 'ওটিপি যাচাই করুন')}</span>
                </button>

                <button
                  type="button"
                  onClick={clearForm}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold rounded-xl py-2.5 px-4 text-xs transition cursor-pointer"
                >
                  {lang === 'en' ? 'Go Back' : 'পিছনে যান'}
                </button>
              </div>
            </form>
          ) : isForgot ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.email}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm outline-none transition"
                    placeholder="you@school.com"
                  />
                </div>
              </div>

              {message && (
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.resetPassLabel}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm outline-none transition"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3.5 px-4 text-sm transition hover:shadow-lg hover:shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Processing...' : message ? t.sendReset : 'Verify Account / Check Recovery'}
              </button>

              <button
                type="button"
                onClick={() => { setIsForgot(false); setIsLogin(true); clearForm(); }}
                className="w-full text-indigo-600 hover:text-indigo-800 text-xs font-bold text-center mt-3 focus:outline-none block cursor-pointer"
              >
                {t.backToLogin}
              </button>
            </form>
          ) : isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.email}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm outline-none transition"
                    placeholder="you@school.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-slate-700 text-xs font-bold uppercase">{t.password}</label>
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); clearForm(); }}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    {t.forgotPassLink}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm outline-none transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3.5 px-4 text-sm transition hover:shadow-lg hover:shadow-indigo-600/10 cursor-pointer disabled:opacity-50 mt-6"
              >
                {loading ? 'Logging in...' : t.login}
              </button>

              <p className="text-slate-500 text-xs text-center mt-6">
                {t.dontHaveAccount}{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); clearForm(); }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold focus:outline-none cursor-pointer"
                >
                  {t.signup}
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.fullName}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm outline-none transition"
                    placeholder="Sarah Conner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.email}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm outline-none transition"
                    placeholder="you@school.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.password}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm outline-none transition"
                    placeholder="Choose a strong password"
                  />
                </div>
              </div>

              {/* requested role selector */}
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-2">{t.roleSelection}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRequestedRole('user')}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                      requestedRole === 'user' 
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-xs">{t.studentRole}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestedRole('admin')}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                      requestedRole === 'admin' 
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-xs">{t.adminRole}</span>
                  </button>
                </div>
              </div>

              {requestedRole === 'admin' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-4">
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1.5">{t.devPermitLabel}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                    </div>
                    <input
                      type="password"
                      required
                      value={devPermitKey}
                      onChange={(e) => setDevPermitKey(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm outline-none transition"
                      placeholder={t.devPermitPlaceholder}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3.5 px-4 text-sm transition hover:shadow-lg hover:shadow-indigo-600/10 cursor-pointer disabled:opacity-50 mt-6"
              >
                {loading ? 'Creating account...' : t.signup}
              </button>

              <p className="text-slate-500 text-xs text-center mt-6">
                {t.alreadyHaveAccount}{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); clearForm(); }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold focus:outline-none cursor-pointer"
                >
                  {t.login}
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Quick Testing Badges at the bottom */}
        {otpStep === 'idle' && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Quick Access Sandbox' : 'দ্রুত অ্যাক্সেস স্যান্ডবক্স'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <button
                type="button"
                onClick={() => quickFill('user')}
                className="py-2.5 px-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-semibold text-slate-600 border border-slate-200 hover:border-indigo-200 rounded-xl transition cursor-pointer"
              >
                {lang === 'en' ? 'Fill Student Account' : 'শিক্ষার্থী অ্যাকাউন্ট লিখুন'}
              </button>
              <button
                type="button"
                onClick={() => quickFill('admin')}
                className="py-2.5 px-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-semibold text-slate-600 border border-slate-200 hover:border-indigo-200 rounded-xl transition cursor-pointer"
              >
                {lang === 'en' ? 'Fill Admin Account' : 'অ্যাডমিন অ্যাকাউন্ট লিখুন'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
