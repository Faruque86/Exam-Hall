import { useState, useEffect } from 'react';
import { Trophy, Search, Medal, Award, Flame, RefreshCw, Star } from 'lucide-react';
import { AnalyticsAPI } from '../api';
import { LeaderboardEntry, Language } from '../types';
import { translations } from '../localization';

interface LeaderboardProps {
  lang: Language;
}

export default function Leaderboard({ lang }: LeaderboardProps) {
  const t = translations[lang];
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await AnalyticsAPI.getLeaderboard();
      setEntries(data);
    } catch (err: any) {
      setError("Failed to fetch platform leaderboard standings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filtered = entries.filter(e => 
    e.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3">
            <Trophy className="w-7 h-7 text-amber-500 fill-amber-100" />
            {t.leaderboardTitle}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {lang === 'en' ? 'Showcase of top student performers and overall accuracy leaders' : 'সেরা ফলাফল অর্জনকারী ও কুইজে সর্বোচ্চ নম্বরপ্রাপ্ত শিক্ষার্থীদের তালিকা'}
          </p>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-2 px-3 rounded-lg border border-indigo-100 cursor-pointer disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {lang === 'en' ? 'Refresh Standings' : 'তালিক আপডেট করুন'}
        </button>
      </div>

      {/* Top 3 Podium Highlights */}
      {filtered.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
          {/* 2nd Place */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 text-center relative order-2 md:order-1 pt-8 self-center">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-slate-300 text-slate-800 p-2.5 rounded-full border-4 border-white shadow-md">
              <Medal className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 block mb-1">2ND PLACE</span>
            <h3 className="font-extrabold text-slate-900 truncate">{filtered[1].userName}</h3>
            <p className="text-xs text-slate-400 truncate">{filtered[1].userEmail}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 py-1.5 px-3.5 rounded-full text-sm font-black">
              {filtered[1].averageScore}% Accuracy
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">{filtered[1].quizzesTaken} assessments taken</p>
          </div>

          {/* 1st Place */}
          <div className="bg-gradient-to-b from-amber-50 to-amber-100/30 rounded-3xl p-6 border border-amber-200 text-center relative order-1 md:order-2 pt-10 ring-4 ring-amber-400/20 shadow-lg">
            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-amber-400 text-white p-3.5 rounded-full border-4 border-white shadow-xl animate-pulse">
              <Trophy className="w-8 h-8 fill-amber-200" />
            </div>
            <span className="text-xs font-bold text-amber-500 block mb-1 tracking-widest flex items-center justify-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> CHAMPION
            </span>
            <h3 className="font-black text-lg text-slate-950 truncate">{filtered[0].userName}</h3>
            <p className="text-xs text-amber-800/80 truncate">{filtered[0].userEmail}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-amber-400 text-amber-950 py-2 px-5 rounded-full text-sm font-black shadow-md shadow-amber-400/10">
              <Flame className="w-4 h-4 fill-amber-950 text-amber-950" />
              {filtered[0].averageScore}% Accuracy
            </div>
            <p className="text-[11px] text-amber-900/60 mt-2.5 font-bold">{filtered[0].quizzesTaken} assessments taken</p>
          </div>

          {/* 3rd Place */}
          <div className="bg-amber-50/10 rounded-2xl p-5 border border-amber-900/10 text-center relative order-3 pt-8 self-center">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-amber-700 text-amber-100 p-2.5 rounded-full border-4 border-white shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-700/60 block mb-1">3RD PLACE</span>
            <h3 className="font-extrabold text-slate-900 truncate">{filtered[2].userName}</h3>
            <p className="text-xs text-slate-400 truncate">{filtered[2].userEmail}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 py-1.5 px-3.5 rounded-full text-sm font-black border border-amber-200/50">
              {filtered[2].averageScore}% Accuracy
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">{filtered[2].quizzesTaken} assessments taken</p>
          </div>
        </div>
      )}

      {/* Search Input bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'en' ? 'Filter leaderboard by name...' : 'নাম দিয়ে তালিকা ফিল্টার করুন...'}
          className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition"
        />
      </div>

      {/* Loader feedback */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
          <span className="text-sm font-medium">Updating elite student board...</span>
        </div>
      ) : error ? (
        <div className="text-rose-600 text-sm p-4 bg-rose-50 text-center rounded-xl font-medium">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-400 text-sm text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          {lang === 'en' ? 'No achievements matching search query.' : 'অনুসন্ধানের সাথে কোনো শিক্ষার্থীর অমিল রয়েছে।'}
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase border-b border-slate-100">
                <th className="py-4 px-5">{t.rank}</th>
                <th className="py-4 px-5">{t.fullName}</th>
                <th className="py-4 px-5 text-center">{t.quizzesCompleted}</th>
                <th className="py-4 px-5 text-right">{t.averageAccuracy}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((entry, index) => {
                const globalRank = entries.findIndex(e => e.userId === entry.userId) + 1;
                return (
                  <tr key={entry.userId} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-5 font-bold">
                      {globalRank === 1 ? (
                        <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                          🥇 #1
                        </span>
                      ) : globalRank === 2 ? (
                        <span className="inline-flex items-center justify-center bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full border border-slate-200">
                          🥈 #2
                        </span>
                      ) : globalRank === 3 ? (
                        <span className="inline-flex items-center justify-center bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full border border-amber-200/50">
                          🥉 #3
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono pl-2">#{globalRank}</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 text-sm">{entry.userName}</div>
                      <div className="text-xs text-slate-400 font-mono">{entry.userEmail}</div>
                    </td>
                    <td className="py-4 px-5 text-center font-bold text-slate-800 font-mono">
                      {entry.quizzesTaken}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-black text-slate-950 font-mono text-sm">{entry.averageScore}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${
                              entry.averageScore >= 80 ? 'bg-emerald-500' : entry.averageScore >= 60 ? 'bg-indigo-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${entry.averageScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
