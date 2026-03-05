import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface Stats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalVouchers: number;
}

interface Voucher {
  id: string;
  voucher_number: string;
  date: string;
  type: string;
  narration: string;
  entries: {
    ledger_name: string;
    amount: number;
    type: 'Dr' | 'Cr';
  }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentVouchers, setRecentVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(res => res.json()),
      fetch('/api/vouchers').then(res => res.json())
    ]).then(([statsData, vouchersData]) => {
      setStats(statsData);
      setRecentVouchers(vouchersData.slice(0, 5));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Failed to load stats</div>;

  const chartData = [
    { name: 'Income', value: stats.totalIncome, color: '#10B981' },
    { name: 'Expenses', value: stats.totalExpenses, color: '#EF4444' },
    { name: 'Net Profit', value: stats.netProfit, color: '#6366F1' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                ${stats.totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                ${stats.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${stats.netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                ${stats.netProfit.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Vouchers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalVouchers}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: 'transparent' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Vouchers</h2>
          </div>
          <div className="overflow-y-auto max-h-[240px]">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-gray-100">
                {recentVouchers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500">
                      No vouchers found
                    </td>
                  </tr>
                ) : (
                  recentVouchers.map((v) => {
                    // Improved Particulars Logic for Dashboard
                    let primaryEntry;
                    if (v.type === 'Receipt' || v.type === 'Contra' || v.type === 'Purchase') {
                      primaryEntry = v.entries.find(e => e.type === 'Cr');
                    } else {
                      primaryEntry = v.entries.find(e => e.type === 'Dr');
                    }
                    if (!primaryEntry) primaryEntry = v.entries[0];

                    const amount = v.entries.reduce((sum, e) => e.type === 'Dr' ? sum + e.amount : sum, 0);
                    return (
                      <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="font-medium text-gray-900">{v.type}</div>
                          <div className="text-xs text-gray-500">{format(new Date(v.date), 'MMM d')}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-gray-900 font-medium truncate max-w-[120px]">{primaryEntry?.ledger_name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[120px]">{v.narration || '-'}</div>
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-gray-900">
                          ${amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
