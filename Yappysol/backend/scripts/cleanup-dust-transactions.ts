/**
 * Cleanup script to remove dust transactions from the database
 * Dust transactions are those with amounts < 0.00001 SOL or < 1e-8 for SPL tokens
 */

import { supabase } from '../src/lib/supabase';

const MIN_SIGNIFICANT_SOL = 0.00001;
const MIN_SIGNIFICANT_SPL = 1e-8;

async function cleanupDustTransactions() {
  try {
    console.log('[CLEANUP] Starting dust transaction cleanup...');

    // Get all transactions
    const { data: transactions, error: fetchError } = await supabase
      .from('external_transactions')
      .select('*');

    if (fetchError) {
      console.error('[CLEANUP] Error fetching transactions:', fetchError);
      return;
    }

    if (!transactions) {
      console.log('[CLEANUP] No transactions found');
      return;
    }

    console.log(`[CLEANUP] Found ${transactions.length} total transactions`);

    // Identify dust transactions
    const dustTransactions = transactions.filter(tx => {
      const amount = parseFloat(tx.amount);
      
      if (tx.type === 'SOL') {
        return amount < MIN_SIGNIFICANT_SOL;
      } else if (tx.type === 'SPL') {
        return amount < MIN_SIGNIFICANT_SPL;
      }
      return false;
    });

    console.log(`[CLEANUP] Found ${dustTransactions.length} dust transactions to delete`);
    
    if (dustTransactions.length === 0) {
      console.log('[CLEANUP] No dust transactions to clean up');
      return;
    }

    // Delete dust transactions
    const signaturesToDelete = dustTransactions.map(tx => tx.signature);
    
    const { error: deleteError } = await supabase
      .from('external_transactions')
      .delete()
      .in('signature', signaturesToDelete);

    if (deleteError) {
      console.error('[CLEANUP] Error deleting dust transactions:', deleteError);
      return;
    }

    console.log(`[CLEANUP] Successfully deleted ${dustTransactions.length} dust transactions`);
    console.log(`[CLEANUP] Remaining transactions: ${transactions.length - dustTransactions.length}`);

  } catch (error) {
    console.error('[CLEANUP] Unexpected error:', error);
  }
}

// Run the cleanup
cleanupDustTransactions()
  .then(() => {
    console.log('[CLEANUP] Cleanup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('[CLEANUP] Fatal error:', error);
    process.exit(1);
  });

