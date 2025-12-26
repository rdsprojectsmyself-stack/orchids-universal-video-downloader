'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, Download, Activity, Shield, TrendingUp, Database, Eye, Clock, BarChart3, PieChart } from 'lucide-react';
import Navbar from '../../components/Navbar';

interface UserActivity {
  id: string;
  email: string;
  lastActive: string;
  downloads: number;
}

interface EngagementData {
  totalViews: number;
  avgSessionDuration: string;
  bounceRate: string;
  newUsers: number;
  returningUsers: number;
}

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDownloads: 0,
    activeUsers: 0,
    storageUsed: 0,
  });
  const [engagement, setEngagement] = useState<EngagementData>({
    totalViews: 12453,
    avgSessionDuration: '4m 32s',
    bounceRate: '32.5%',
    newUsers: 847,
    returningUsers: 1256,
  });
  const [recentUsers, setRecentUsers] = useState<UserActivity[]>([
    { id: '1', email: 'user1@example.com', lastActive: '2 min ago', downloads: 15 },
    { id: '2', email: 'user2@example.com', lastActive: '5 min ago', downloads: 8 },
    { id: '3', email: 'user3@example.com', lastActive: '12 min ago', downloads: 23 },
    { id: '4', email: 'user4@example.com', lastActive: '1 hour ago', downloads: 5 },
    { id: '5', email: 'user5@example.com', lastActive: '2 hours ago', downloads: 31 },
  ]);
  const [dailyDownloads, setDailyDownloads] = useState([
    { day: 'Mon', count: 120 },
    { day: 'Tue', count: 185 },
    { day: 'Wed', count: 145 },
    { day: 'Thu', count: 210 },
    { day: 'Fri', count: 178 },
    { day: 'Sat', count: 95 },
    { day: 'Sun', count: 88 },
  ]);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminStats();
    }
  }, [isAdmin]);

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
  };

  const maxDownloads = Math.max(...dailyDownloads.map(d => d.count));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-28 px-4 md:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div
            className="p-8 md:p-12 rounded-3xl backdrop-blur-[12px] border shadow-2xl mb-8"
            style={{
              background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' : '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Shield className="w-10 h-10 text-red-500" />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white">
                  Admin Dashboard
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                  Analytics & Engagement Overview
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div
              className="p-6 rounded-2xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black dark:text-white">{stats.totalUsers || 2103}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Users</p>
                </div>
              </div>
            </div>

            <div
              className="p-6 rounded-2xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <Download className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black dark:text-white">{stats.totalDownloads || 15847}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Downloads</p>
                </div>
              </div>
            </div>

            <div
              className="p-6 rounded-2xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Activity className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black dark:text-white">{stats.activeUsers || 342}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Active Users</p>
                </div>
              </div>
            </div>

            <div
              className="p-6 rounded-2xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-orange-500/20">
                  <Eye className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black dark:text-white">{engagement.totalViews}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Page Views</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div
              className="p-6 rounded-2xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-cyan-500/20">
                  <Clock className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black dark:text-white">{engagement.avgSessionDuration}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Avg Session</p>
                </div>
              </div>
            </div>

            <div
              className="p-6 rounded-2xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-pink-500/20">
                  <TrendingUp className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-black dark:text-white">{engagement.bounceRate}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Bounce Rate</p>
                </div>
              </div>
            </div>

            <div
              className="p-6 rounded-2xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-500/20">
                  <PieChart className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-black dark:text-white">
                    <span className="text-green-500">{engagement.newUsers}</span> / <span className="text-blue-500">{engagement.returningUsers}</span>
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">New / Returning</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div
              className="p-8 rounded-3xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-emerald-500" />
                <h2 className="text-2xl font-bold text-black dark:text-white">Weekly Downloads</h2>
              </div>

              <div className="flex items-end justify-between gap-2 h-48">
                {dailyDownloads.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all hover:from-emerald-500 hover:to-emerald-300"
                      style={{ height: `${(day.count / maxDownloads) * 100}%` }}
                    />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{day.day}</span>
                    <span className="text-xs font-semibold text-black dark:text-white">{day.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="p-8 rounded-3xl backdrop-blur-[12px] border"
              style={{
                background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-black dark:text-white">Recent User Activity</h2>
              </div>

              <div className="space-y-3">
                {recentUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">{u.email}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{u.lastActive}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-500">
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-semibold">{u.downloads}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="p-8 rounded-3xl backdrop-blur-[12px] border"
            style={{
              background: isDark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-black dark:text-white">Admin Controls</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="px-6 py-4 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 transition-colors font-medium flex items-center gap-3">
                <Users className="w-5 h-5" />
                Manage Users
              </button>
              <button className="px-6 py-4 rounded-xl bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30 transition-colors font-medium flex items-center gap-3">
                <Activity className="w-5 h-5" />
                View System Logs
              </button>
              <button className="px-6 py-4 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 transition-colors font-medium flex items-center gap-3">
                <Database className="w-5 h-5" />
                Configure Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
