import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our database
export interface LeaderboardEntry {
  id?: number;
  name: string;
  score: number;
  dappies: number;
  created_at?: string;
}

// API functions
export const leaderboardAPI = {
  // Get top 10 scores
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
    
    console.log('🗃️ Fresh leaderboard query result:', data);
    return data || [];
  },

  // Save a new score (update if user exists and score is better)
  async saveScore(name: string, score: number, dappies: number): Promise<boolean> {
    try {
      const trimmedName = name.trim();
      
      // Validate inputs to prevent exploitation
      if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 20) {
        console.error('Invalid name provided');
        return false;
      }
      
      // Validate score - should be reasonable for a Flappy Bird game
      // Max reasonable time: 10 minutes (600,000 ms), min: 100ms
      if (score < 100 || score > 600000) {
        console.error('Invalid score provided:', score);
        return false;
      }
      
      // Validate dappies count - should be reasonable
      // Max dappies in 10 minutes: roughly 200 (one every 3 seconds)
      if (dappies < 0 || dappies > 200) {
        console.error('Invalid dappies count provided:', dappies);
        return false;
      }
      
      // Validate score vs dappies ratio (sanity check)
      // If someone has 100 dappies, they should have played for at least 5 minutes
      const minScoreForDappies = dappies * 3000; // 3 seconds per dappy minimum
      if (dappies > 10 && score < minScoreForDappies) {
        console.error('Score/dappies ratio seems invalid. Score:', score, 'Min required:', minScoreForDappies, 'Dappies:', dappies);
        return false;
      }
      
      console.log('✅ All validations passed. Proceeding with save...');
      
      // First, check if user already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('name', trimmedName)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors

      if (fetchError) {
        // If there's an error fetching, treat as new user
        console.warn('⚠️ Error checking existing user, treating as new user:', fetchError);
      }

      if (existingUser) {
        console.log('👤 User exists:', existingUser);
        console.log('⚖️ Comparing scores - New:', score, 'vs Existing:', existingUser.score);
        // User exists - only update if new score is better (higher)
        if (score > existingUser.score) {
          console.log('🎯 New score is better! Updating...');
          
          // Try delete + insert approach due to potential RLS issues
          console.log('🗑️ Deleting old record...');
          const { error: deleteError } = await supabase
            .from('leaderboard')
            .delete()
            .eq('id', existingUser.id);
          
          if (deleteError) {
            console.error('❌ Error deleting old record:', deleteError);
            // If delete fails, try regular update
            console.log('� Falling back to update...');
            const updateData = {
              score: score,
              dappies: dappies,
              created_at: new Date().toISOString()
            };
            const { data: updateResult, error: updateError } = await supabase
              .from('leaderboard')
              .update(updateData)
              .eq('id', existingUser.id)
              .select();
            
            if (updateError) {
              console.error('❌ Error updating score:', updateError);
              return false;
            }
            console.log('📊 Update result data:', updateResult);
            return updateResult && updateResult.length > 0;
          } else {
            console.log('✅ Old record deleted successfully!');
            // Insert new record
            console.log('➕ Inserting new record...');
            const { data: insertResult, error: insertError } = await supabase
              .from('leaderboard')
              .insert([{
                name: trimmedName,
                score: score,
                dappies: dappies
              }])
              .select();
            
            if (insertError) {
              console.error('❌ Error inserting new record:', insertError);
              return false;
            }
            console.log('✅ New record inserted successfully!');
            console.log('📊 Insert result data:', insertResult);
            
            // Clean up any remaining duplicates for this user
            console.log('🧹 Cleaning up any duplicate records...');
            const { error: cleanupError } = await supabase
              .from('leaderboard')
              .delete()
              .eq('name', trimmedName)
              .neq('id', insertResult[0].id);
            
            if (cleanupError) {
              console.warn('⚠️ Could not clean up duplicates:', cleanupError);
            } else {
              console.log('✅ Duplicate cleanup completed');
            }
            
            return true;
          }
        } else {
          // Score is not better, don't save
          console.log(`⏸️ Score ${score} is not better than existing score ${existingUser.score} for ${trimmedName}`);
          return true; // Return true since this is not an error condition
        }
      } else {
        console.log('🆕 User does not exist, creating new record...');
        // User doesn't exist - insert new record
        const { error: insertError } = await supabase
          .from('leaderboard')
          .insert([
            {
              name: trimmedName,
              score: score,
              dappies: dappies
            }
          ]);

        if (insertError) {
          console.error('Error inserting new score:', insertError);
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error('Unexpected error in saveScore:', error);
      return false;
    }
  },

  // Clean up duplicate entries for a user, keeping only the highest score
  async cleanupDuplicates(name: string): Promise<void> {
    try {
      console.log('🧹 Cleaning up duplicates for user:', name);
      
      // Get all entries for this user, ordered by score (highest first)
      const { data: userEntries, error: fetchError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('name', name.trim())
        .order('score', { ascending: false });
      
      if (fetchError || !userEntries || userEntries.length <= 1) {
        console.log('✅ No duplicates to clean up');
        return;
      }
      
      // Keep the first (highest score) entry, delete the rest
      const entriesToDelete = userEntries.slice(1);
      const idsToDelete = entriesToDelete.map(entry => entry.id);
      
      console.log('🗑️ Deleting duplicate entries with IDs:', idsToDelete);
      
      const { error: deleteError } = await supabase
        .from('leaderboard')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.warn('⚠️ Could not delete some duplicates:', deleteError);
      } else {
        console.log('✅ Successfully deleted', idsToDelete.length, 'duplicate entries');
      }
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error);
    }
  },

  // Get a specific user's best score
  async getUserBestScore(name: string): Promise<LeaderboardEntry | null> {
    try {
      console.log('🔍 Looking up user best score for:', name.trim());
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('name', name.trim())
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid errors when no records exist
      
      if (error) {
        console.error('❌ Error fetching user best score:', error);
        return null;
      }
      
      console.log('📊 User lookup result:', data);
      return data || null;
    } catch (error) {
      console.error('❌ Exception in getUserBestScore:', error);
      return null;
    }
  },

  // Subscribe to real-time leaderboard updates
  subscribeToUpdates(callback: (leaderboard: LeaderboardEntry[]) => void) {
    const subscription = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'leaderboard'
        },
        () => {
          // Fetch updated leaderboard when changes occur
          this.getLeaderboard().then(callback);
        }
      )
      .subscribe();

    return subscription;
  }
};