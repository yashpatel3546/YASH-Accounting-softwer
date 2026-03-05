import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Trash2, X, FolderOpen, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface Group {
  id: string;
  name: string;
  nature: string;
}

interface Ledger {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  opening_balance: number;
}

export default function Masters() {
  const [activeTab, setActiveTab] = useState<'ledgers' | 'groups'>('ledgers');
  const [groups, setGroups] = useState<Group[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Ledger>();

  useEffect(() => {
    fetchGroups();
    fetchLedgers();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data);
    } catch (error) {
      console.error('Failed to fetch groups', error);
    }
  };

  const fetchLedgers = async () => {
    try {
      const res = await fetch('/api/ledgers');
      const data = await res.json();
      setLedgers(data);
    } catch (error) {
      console.error('Failed to fetch ledgers', error);
    }
  };

  const handleEdit = (ledger: Ledger) => {
    setEditId(ledger.id);
    setValue('name', ledger.name);
    setValue('group_id', ledger.group_id);
    setValue('opening_balance', ledger.opening_balance);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      const url = editId ? `/api/ledgers/${editId}` : '/api/ledgers';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setIsModalOpen(false);
        reset();
        setEditId(null);
        fetchLedgers();
        toast.success(editId ? 'Ledger updated successfully' : 'Ledger created successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save ledger');
      }
    } catch (error) {
      toast.error('Failed to save ledger');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/ledgers/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLedgers();
        toast.success('Ledger deleted');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete ledger');
      }
    } catch (error) {
      toast.error('Failed to delete ledger');
    }
    setDeleteId(null);
  };

  const filteredLedgers = ledgers.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Masters</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('ledgers')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'ledgers' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Ledgers
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'groups' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Groups
          </button>
        </div>
      </div>

      {activeTab === 'ledgers' && (
        <>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search ledgers..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 shadow-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setEditId(null);
                reset({ name: '', group_id: '', opening_balance: 0 });
                setIsModalOpen(true);
              }}
              className="flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Ledger
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-600">Group</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Opening Balance</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLedgers.map((ledger) => (
                  <tr key={ledger.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{ledger.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {ledger.group_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 text-right font-mono">
                      {ledger.opening_balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(ledger)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteId(ledger.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'groups' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Nature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                    <FolderOpen className="w-4 h-4 text-yellow-500 mr-3" />
                    {group.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{group.nature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Ledger"
        message="Are you sure you want to delete this ledger? This action cannot be undone."
      />

      {/* Create/Edit Ledger Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Edit Ledger' : 'Create Ledger'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  {...register('name', { required: true })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  placeholder="e.g. HDFC Bank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Under Group</label>
                <select 
                  {...register('group_id', { required: true })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                >
                  <option value="">Select Group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                <input 
                  type="number" 
                  step="0.01"
                  {...register('opening_balance', { valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  placeholder="0.00"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors shadow-md font-medium"
                >
                  {editId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
