import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Save, FileText, X, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import ConfirmDialog from '../components/ConfirmDialog';

interface Ledger {
  id: string;
  name: string;
}

interface VoucherEntry {
  ledger_id: string;
  amount: number;
  type: 'Dr' | 'Cr';
}

interface Voucher {
  id: string;
  voucher_number: string;
  date: string;
  type: string;
  narration: string;
  entries: VoucherEntry[];
}

export default function Vouchers() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isEntryMode, setIsEntryMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const { register, control, handleSubmit, watch, reset, setValue } = useForm<{
    date: string;
    type: string;
    narration: string;
    entries: VoucherEntry[];
    voucher_number: string;
  }>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'Payment',
      voucher_number: '',
      entries: [
        { type: 'Dr', amount: 0, ledger_id: '' },
        { type: 'Cr', amount: 0, ledger_id: '' }
      ]
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "entries"
  });

  const watchEntries = watch("entries");
  const totalDr = watchEntries?.reduce((sum, e) => e.type === 'Dr' ? sum + (Number(e.amount) || 0) : sum, 0);
  const totalCr = watchEntries?.reduce((sum, e) => e.type === 'Cr' ? sum + (Number(e.amount) || 0) : sum, 0);
  const isBalanced = Math.abs(totalDr - totalCr) < 0.01;

  useEffect(() => {
    fetchLedgers();
    fetchVouchers();
  }, []);

  const fetchLedgers = async () => {
    const res = await fetch('/api/ledgers');
    const data = await res.json();
    setLedgers(data);
  };

  const fetchVouchers = async () => {
    const res = await fetch('/api/vouchers');
    const data = await res.json();
    setVouchers(data);
    setLoading(false);
  };

  const handleEdit = (voucher: Voucher) => {
    setEditId(voucher.id);
    setValue('date', voucher.date);
    setValue('type', voucher.type);
    setValue('voucher_number', voucher.voucher_number);
    setValue('narration', voucher.narration);
    replace(voucher.entries); // Populate entries
    setIsEntryMode(true);
  };

  const onSubmit = async (data: any) => {
    if (!isBalanced) {
      toast.error('Debit and Credit totals must match');
      return;
    }

    try {
      const url = editId ? `/api/vouchers/${editId}` : '/api/vouchers';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(editId ? 'Voucher updated successfully' : 'Voucher created successfully');
        setIsEntryMode(false);
        setEditId(null);
        reset({
          date: new Date().toISOString().split('T')[0],
          type: 'Payment',
          voucher_number: '',
          entries: [
            { type: 'Dr', amount: 0, ledger_id: '' },
            { type: 'Cr', amount: 0, ledger_id: '' }
          ]
        });
        fetchVouchers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save voucher');
      }
    } catch (error) {
      toast.error('Failed to save voucher');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/vouchers/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVouchers();
        toast.success('Voucher deleted');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete voucher');
      }
    } catch (error) {
      toast.error('Failed to delete voucher');
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vouchers</h1>
        {!isEntryMode && (
          <button 
            onClick={() => {
              setEditId(null);
              reset({
                date: new Date().toISOString().split('T')[0],
                type: 'Payment',
                voucher_number: '',
                entries: [
                  { type: 'Dr', amount: 0, ledger_id: '' },
                  { type: 'Cr', amount: 0, ledger_id: '' }
                ]
              });
              setIsEntryMode(true);
            }}
            className="flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Voucher
          </button>
        )}
      </div>

      {isEntryMode ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Edit Voucher' : 'Voucher Entry'}</h2>
            <button onClick={() => { setIsEntryMode(false); setEditId(null); }} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Voucher Type</label>
                <select 
                  {...register('type')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                >
                  <option value="Payment">Payment</option>
                  <option value="Receipt">Receipt</option>
                  <option value="Contra">Contra</option>
                  <option value="Journal">Journal</option>
                  <option value="Sales">Sales</option>
                  <option value="Purchase">Purchase</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Voucher No</label>
                <input 
                  type="text" 
                  {...register('voucher_number')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  placeholder="Auto if empty"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                <input 
                  type="date" 
                  {...register('date')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
                <div className="w-20">Type</div>
                <div className="flex-1">Particulars</div>
                <div className="w-40 text-right">Amount</div>
                <div className="w-10"></div>
              </div>
              
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-center p-2 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="w-20">
                    <select 
                      {...register(`entries.${index}.type` as const)}
                      className="w-full bg-transparent font-medium text-gray-700 focus:outline-none"
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <select 
                      {...register(`entries.${index}.ledger_id` as const, { required: true })}
                      className="w-full bg-transparent focus:outline-none"
                    >
                      <option value="">Select Ledger</option>
                      {ledgers.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-40">
                    <input 
                      type="number"
                      step="0.01"
                      {...register(`entries.${index}.amount` as const, { valueAsNumber: true, required: true })}
                      className="w-full text-right bg-transparent focus:outline-none font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => remove(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <button 
                type="button"
                onClick={() => append({ type: 'Dr', amount: 0, ledger_id: '' })}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Line
              </button>
              
              <div className="flex gap-8 text-sm font-medium">
                <div className="text-gray-500">Total Dr: <span className="text-gray-900 font-mono ml-2">{totalDr.toFixed(2)}</span></div>
                <div className="text-gray-500">Total Cr: <span className="text-gray-900 font-mono ml-2">{totalCr.toFixed(2)}</span></div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Narration</label>
              <textarea 
                {...register('narration')}
                rows={2}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none"
                placeholder="Enter narration..."
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button 
                type="submit"
                disabled={!isBalanced}
                className={clsx(
                  "flex items-center px-6 py-2 rounded-xl text-white font-medium shadow-md transition-all",
                  isBalanced ? "bg-black hover:bg-gray-800 active:scale-95" : "bg-gray-300 cursor-not-allowed"
                )}
              >
                <Save className="w-4 h-4 mr-2" />
                {editId ? 'Update Voucher' : 'Save Voucher'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Voucher No</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Type</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Particulars</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vouchers.map((v) => {
                // Find the primary amount (usually the first entry amount)
                const amount = v.entries?.[0]?.amount || 0;
                return (
                  <tr key={v.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleEdit(v)}>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{format(new Date(v.date), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{v.voucher_number}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        v.type === 'Receipt' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        v.type === 'Payment' ? "bg-red-50 text-red-700 border-red-100" :
                        v.type === 'Sales' ? "bg-blue-50 text-blue-700 border-blue-100" :
                        "bg-gray-50 text-gray-700 border-gray-100"
                      )}>
                        {v.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{v.narration || '-'}</td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">{amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(v);
                          }}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(v.id);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No vouchers found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Voucher"
        message="Are you sure you want to delete this voucher? This action cannot be undone."
      />
    </div>
  );
}
