# 🚀 Supabase Setup Guide for Flappy Lawrence

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login with GitHub or email
3. Click "New Project"
4. Fill in:
   - Organization: Create new or use existing
   - Project name: `flappy-lawrence`
   - Database password: Generate a strong password
   - Region: Choose closest to your users
5. Click "Create new project" (takes ~2 minutes)

## Step 2: Create Database Table

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New Query"**
3. Paste this SQL and click **"Run"**:

```sql
-- Create leaderboard table
CREATE TABLE leaderboard (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  dappies INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read the leaderboard
CREATE POLICY "Everyone can view leaderboard" ON leaderboard
  FOR SELECT USING (true);

-- Allow everyone to insert their scores
CREATE POLICY "Everyone can insert scores" ON leaderboard
  FOR INSERT WITH CHECK (true);
```

## Step 3: Get Your Credentials

1. In your Supabase dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL** (something like `https://abcdefgh.supabase.co`)
   - **Project API Key** (anon/public key - the long string)

## Step 4: Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Test Your Setup

1. Save the `.env` file
2. Restart your development server:
   ```bash
   npm start
   ```
3. Play the game and enter your name
4. Check your Supabase dashboard **Table Editor → leaderboard** to see if scores are saved

## 🎯 Features You'll Get

- ✅ **Global Leaderboard**: All players worldwide see the same scores
- ✅ **Real-time Updates**: Leaderboard updates instantly when someone gets a high score
- ✅ **Persistent Storage**: Scores saved forever in the cloud
- ✅ **No Duplicate Users**: Each player name appears only once with their best score
- ✅ **Smart Score Updates**: Only saves if the new score is better than previous
- ✅ **User Feedback**: Shows messages when scores are saved or updated
- ✅ **Free Tier**: 50,000 monthly active users for free
- ✅ **Automatic Scaling**: No server management needed

## 🔧 Troubleshooting

### "Missing Supabase environment variables" Error
- Make sure your `.env` file is in the project root
- Restart your development server after adding environment variables
- Check that variable names start with `REACT_APP_`

### Scores Not Saving
- Check browser console for error messages
- Verify your Supabase credentials in Settings → API
- Make sure you ran the SQL table creation script

### Real-time Updates Not Working
- Real-time updates work automatically once configured
- If issues persist, refresh the page to see latest scores

## 🚀 Deployment

When deploying to production (Vercel, Netlify, etc.):
1. Add the same environment variables to your hosting platform
2. The same `.env` values work for both development and production

## 🔐 Security

- The anon/public key is safe to use in client-side code
- Row Level Security policies protect your data
- Never commit your `.env` file to version control (it's already in .gitignore)

---

**Need help?** Check the [Supabase documentation](https://supabase.com/docs) or create an issue in this repository.