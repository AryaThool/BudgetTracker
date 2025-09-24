import React, { useState, useEffect } from 'react';
import { Plus, Users, UserPlus, DollarSign, Calculator } from 'lucide-react';
import { supabase, Group, GroupMember, Transaction, Settlement } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groupName, setGroupName] = useState('');

  const [expenseData, setExpenseData] = useState({
    amount: '',
    category: 'Food & Dining',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    try {
      // Get groups where user is a member or creator
      const { data: memberGroups } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user!.id);

      const { data: createdGroups } = await supabase
        .from('groups')
        .select('*')
        .eq('created_by', user!.id);

      const allGroups = new Map<string, Group>();

      // Add member groups
      memberGroups?.forEach(mg => {
        if (mg.groups) {
          allGroups.set(mg.groups.id, mg.groups as Group);
        }
      });

      // Add created groups
      createdGroups?.forEach(g => {
        allGroups.set(g.id, g);
      });

      setGroups(Array.from(allGroups.values()));
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert([{
          name: groupName,
          created_by: user!.id
        }])
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as a member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{
          group_id: newGroup.id,
          user_id: user!.id,
          role: 'admin'
        }]);

      if (memberError) throw memberError;

      await loadGroups();
      setGroupName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const addGroupExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !expenseData.amount) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user!.id,
          group_id: selectedGroup,
          amount: parseFloat(expenseData.amount),
          type: 'expense',
          category: expenseData.category,
          date: expenseData.date,
          notes: expenseData.notes || null
        }]);

      if (error) throw error;

      setExpenseData({
        amount: '',
        category: 'Food & Dining',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowExpenseModal(false);
    } catch (error) {
      console.error('Error adding group expense:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Add Expense
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} currentUserId={user!.id} />
        ))}

        {groups.length === 0 && !loading && (
          <div className="col-span-full text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No groups yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Create your first group
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h3>
            
            <form onSubmit={createGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter group name"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Group Expense</h3>
            
            <form onSubmit={addGroupExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group
                </label>
                <select
                  required
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a group</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Travel">Travel</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={expenseData.date}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={expenseData.notes}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add notes about this expense..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupCard({ group, currentUserId }: { group: Group; currentUserId: string }) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    loadGroupData();
  }, [group.id]);

  const loadGroupData = async () => {
    try {
      const [membersResponse, transactionsResponse] = await Promise.all([
        supabase
          .from('group_members')
          .select('*')
          .eq('group_id', group.id),
        supabase
          .from('transactions')
          .select('*')
          .eq('group_id', group.id)
          .order('date', { ascending: false })
      ]);

      setMembers(membersResponse.data || []);
      setTransactions(transactionsResponse.data || []);
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    try {
      // Find user by email
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', memberEmail)
        .single();

      if (!userData) {
        alert('User not found with this email');
        return;
      }

      // Add as group member
      const { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: group.id,
          user_id: userData.id,
          role: 'member'
        }]);

      if (error) {
        if (error.code === '23505') {
          alert('User is already a member of this group');
        } else {
          throw error;
        }
      } else {
        await loadGroupData();
        setMemberEmail('');
        setShowAddMember(false);
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const totalExpenses = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const perPersonShare = members.length > 0 ? totalExpenses / members.length : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
        {group.created_by === currentUserId && (
          <button
            onClick={() => setShowAddMember(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Expenses</span>
          <span className="font-medium">₹{totalExpenses.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Per Person</span>
          <span className="font-medium">₹{perPersonShare.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Members</span>
          <span className="font-medium">{members.length}</span>
        </div>

        {transactions.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Expenses</h4>
            <div className="space-y-2">
              {transactions.slice(0, 3).map(transaction => (
                <div key={transaction.id} className="flex justify-between text-xs">
                  <span className="text-gray-600">{transaction.category}</span>
                  <span className="font-medium">₹{Number(transaction.amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Member</h3>
            
            <form onSubmit={addMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="member@example.com"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}