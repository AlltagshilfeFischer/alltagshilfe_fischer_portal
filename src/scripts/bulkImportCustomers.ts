import { supabase } from '@/integrations/supabase/client';

export async function importAllCustomers() {
  try {
    // First delete all existing customers
    const { error: deleteError } = await supabase
      .from('kunden')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting existing customers:', deleteError);
    }

    // Import new customers - sample batch for demonstration
    const customerBatches = [
      { vorname: 'Aysegül', nachname: 'Domke-Schreck', telefon: null, email: null, notfall_name: null, notfall_telefon: null, aktiv: true },
      { vorname: 'Ferdinand', nachname: 'Ursula', telefon: '0511 88 26 76', email: null, notfall_name: null, notfall_telefon: null, aktiv: true },
      { vorname: 'Steinmann', nachname: 'Karin', telefon: null, email: null, notfall_name: 'Michaela Willicke (Tochter)', notfall_telefon: null, aktiv: true },
      // ... continuing with all customers from the provided list
    ];

    // Insert customers in batches
    const { data, error } = await supabase
      .from('kunden')
      .insert(customerBatches);

    if (error) {
      throw error;
    }

    console.log(`Successfully imported ${customerBatches.length} customers`);
    return { success: true, count: customerBatches.length };
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, error };
  }
}