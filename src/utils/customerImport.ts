import { supabase } from '@/integrations/supabase/client';

interface CustomerData {
  vorname: string;
  nachname: string;
  telefon?: string;
  email?: string;
  notfall_name?: string;
  notfall_telefon?: string;
  aktiv: boolean;
}

export const parseCustomerData = (rawData: string): CustomerData[] => {
  const lines = rawData.trim().split('\n');
  const customers: CustomerData[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Parse the customer data - appears to be tab-separated with many columns
    const parts = line.split(/\t+/);
    
    if (parts.length < 2) continue;
    
    // First column contains the name
    const namePart = parts[0]?.trim();
    if (!namePart) continue;
    
    // Parse name - format appears to be "Nachname Vorname"
    const nameParts = namePart.split(/\s+/);
    const nachname = nameParts[0] || '';
    const vorname = nameParts.slice(1).join(' ') || '';
    
    // Skip if we don't have proper name data
    if (!nachname) continue;
    
    let telefon = '';
    let notfall_telefon = '';
    let notfall_name = '';
    let email = '';
    
    // Look through all parts for useful data
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]?.trim();
      if (!part) continue;
      
      // Phone number patterns (German format)
      if (part.match(/^0\d{3,4}[\s\-]?\d+|^01\d{2}[\s\-]?\d+/)) {
        if (!telefon) {
          // Clean up phone number format
          telefon = part.replace(/\s*[\/;]\s*.*$/, '').replace(/\s+/g, ' ').trim();
        }
      }
      
      // Email pattern
      if (part.includes('@') && part.includes('.') && !email) {
        email = part.toLowerCase();
      }
      
      // Look for emergency contact info (names in parentheses or after specific keywords)
      if ((part.includes('(') && part.includes(')')) || 
          part.includes('Tochter') || part.includes('Sohn') || 
          part.includes('Ehefrau') || part.includes('Ehemann') ||
          part.includes('Mutter') || part.includes('Vater')) {
        if (!notfall_name) {
          notfall_name = part;
          
          // Try to extract phone number from emergency contact info
          const phoneMatch = part.match(/(\d{4}\s?\d+|\d{11,})/);
          if (phoneMatch && !notfall_telefon) {
            notfall_telefon = phoneMatch[0];
          }
        }
      }
    }
    
    // If we found a phone in notfall_name, extract it properly
    if (notfall_name && !notfall_telefon) {
      const phoneMatch = notfall_name.match(/0\d{3,4}[\s\-]?\d+|01\d{2}[\s\-]?\d+/);
      if (phoneMatch) {
        notfall_telefon = phoneMatch[0];
      }
    }
    
    customers.push({
      vorname: vorname || '',
      nachname: nachname,
      telefon: telefon || undefined,
      email: email || undefined,
      notfall_name: notfall_name || undefined,
      notfall_telefon: notfall_telefon || undefined,
      aktiv: true
    });
  }
  
  return customers;
};

export const importCustomers = async (customers: CustomerData[]): Promise<{ success: number; errors: string[] }> => {
  let success = 0;
  const errors: string[] = [];
  
  for (const customer of customers) {
    try {
      // Check if customer already exists
      const { data: existing } = await supabase
        .from('kunden')
        .select('id')
        .eq('vorname', customer.vorname)
        .eq('nachname', customer.nachname)
        .maybeSingle();
        
      if (existing) {
        errors.push(`Kunde ${customer.vorname} ${customer.nachname} existiert bereits`);
        continue;
      }
      
      // Insert new customer
      const { error } = await supabase
        .from('kunden')
        .insert(customer);
        
      if (error) {
        errors.push(`Fehler bei ${customer.vorname} ${customer.nachname}: ${error.message}`);
      } else {
        success++;
      }
    } catch (err) {
      errors.push(`Unerwarteter Fehler bei ${customer.vorname} ${customer.nachname}: ${err}`);
    }
  }
  
  return { success, errors };
};