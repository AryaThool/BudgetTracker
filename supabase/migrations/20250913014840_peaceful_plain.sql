/*
  # Budget Tracker Database Schema

  1. New Tables
    - `users` - User profiles with authentication
    - `transactions` - Financial transactions (income/expense)
    - `budgets` - Monthly category budgets
    - `groups` - Expense sharing groups
    - `group_members` - Group membership tracking
    - `settlements` - Group expense settlements

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for group data access based on membership

  3. Features
    - Complete transaction management
    - Category-based budgeting
    - Group expense tracking
    - Settlement management
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  type text CHECK (type IN ('income','expense')) NOT NULL,
  category text NOT NULL,
  date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric(12,2) NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category, month, year)
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  payer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  payee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Transactions policies
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view group transactions" ON transactions
  FOR SELECT TO authenticated USING (
    group_id IS NULL OR 
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Budgets policies
CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Groups policies
CREATE POLICY "Users can view groups they belong to" ON groups
  FOR SELECT TO authenticated USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    created_by = auth.uid()
  );

CREATE POLICY "Users can create groups" ON groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" ON groups
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Users can view group memberships" ON group_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Group creators can manage memberships" ON group_members
  FOR ALL TO authenticated USING (
    group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
  );

-- Settlements policies
CREATE POLICY "Users can view relevant settlements" ON settlements
  FOR SELECT TO authenticated USING (
    payer_id = auth.uid() OR payee_id = auth.uid() OR
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Group members can create settlements" ON settlements
  FOR INSERT TO authenticated WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );