// js/supabase-config.js
const SUPABASE_URL = 'https://dytbmobtxflxnfqkddrk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dGJtb2J0eGZseG5mcWtkZHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MzI4MjEsImV4cCI6MjEwMDUwODgyMX0.iFwsE4a8pM_xHP37eDogTjVWkzi7NwIkzG1m8UkpCfQ';

// Initialize Supabase client with proper settings for storage
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: {
            getItem: (key) => {
                try {
                    return localStorage.getItem(key);
                } catch (e) {
                    return null;
                }
            },
            setItem: (key, value) => {
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    console.warn('Storage access blocked:', e);
                }
            },
            removeItem: (key) => {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    console.warn('Storage access blocked:', e);
                }
            }
        }
    }
});
