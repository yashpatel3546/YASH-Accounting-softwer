import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { Search } from 'lucide-react';

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

interface TrialBalanceItem {
  id: string;
  name: string;
  group_name: string;
  group_nature: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'daybook' | 'trialbalance'>('daybook');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'daybook') {
      fetch('/api/vouchers')
        .then(res => res.json())
        .then(data => {
          setVouchers(data);
          setLoading(false);
        });
    } else {
      fetch('/api/reports/trial-balance')
        .then(res => res.json())
        .then(data => {
          setTrialBalance(data);
          setLoading(false);
        });
    }
  }, [activeTab]);

  const calculateClosingBalance = (item: TrialBalanceItem) => {
    const isDrNature = ['Assets', 'Expenses'].includes(item.group_nature);
    const openingDr = isDrNature ? item.opening_balance : 0;
    const openingCr = !isDrNature ? item.opening_balance : 0;

    const netDr = openingDr + item.total_debit;
    const netCr = openingCr + item.total_credit;

    if (netDr > netCr) return { amount: netDr - netCr, type: 'Dr' };
    if (netCr > netDr) return { amount: netCr - netDr, type: 'Cr' };
    return { amount: 0, type: '' };
  };

  const filteredTrialBalance = trialBalance.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('daybook')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'daybook' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Day Book
          </button>
          <button 
            onClick={() => setActiveTab('trialbalance')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'trialbalance' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Trial Balance
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading reports...</div>
      ) : activeTab === 'daybook' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600 w-32">Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 w-48">Particulars</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 w-32">Vch Type</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 w-32">Vch No</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right w-32">Debit Amount</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right w-32">Credit Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vouchers.map((v) => {
                  // Improved Particulars Logic
                  let primaryEntry;
                  if (v.type === 'Receipt' || v.type === 'Contra' || v.type === 'Purchase') {
                    primaryEntry = v.entries.find(e => e.type === 'Cr');
                  } else {
                    primaryEntry = v.entries.find(e => e.type === 'Dr');
                  }
                  // Fallback
                  if (!primaryEntry) primaryEntry = v.entries[0];

                  const amount = v.entries.reduce((sum, e) => e.type === 'Dr' ? sum + e.amount : sum, 0);

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap font-mono text-xs">
                        {format(new Date(v.date), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {primaryEntry?.ledger_name}
                        <div className="text-xs text-gray-400 font-normal mt-0.5 group-hover:text-gray-500 transition-colors">
                          {v.narration}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{v.type}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{v.voucher_number}</td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                        {amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                        {/* Credit amount logic if needed */}
                      </td>
                    </tr>
                  );
                })}
                {vouchers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No transactions recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search ledgers..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600">Ledger Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Group</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Opening</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Debit</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Credit</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTrialBalance.map((item) => {
                  const closing = calculateClosingBalance(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.group_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-500">
                        {item.opening_balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-600">
                        {item.total_debit > 0 ? item.total_debit.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-600">
                        {item.total_credit > 0 ? item.total_credit.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                        {closing.amount !== 0 ? (
                          <span>
                            {closing.amount.toFixed(2)} <span className="text-xs text-gray-400 ml-1">{closing.type}</span>
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
