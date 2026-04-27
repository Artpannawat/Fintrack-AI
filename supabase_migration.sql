-- ============================================================
-- FinTrack-AI: Database Migration Script
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Step 1: Add user_id column if it doesn't exist
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add verdict and reason columns if missing
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS verdict TEXT DEFAULT 'yellow';

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop old policies if any
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Step 5: Create RLS Policies (Only see/edit your own data)
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
ON transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
ON transactions FOR DELETE
USING (auth.uid() = user_id);

-- Done! Your transactions table is now secure.
