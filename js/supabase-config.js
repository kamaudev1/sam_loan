// js/supabase-config.js
const SUPABASE_URL = 'https://dytbmobtxflxnfqkddrk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dGJtb2J0eGZseG5mcWtkZHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MzI4MjEsImV4cCI6MjEwMDUwODgyMX0.iFwsE4a8pM_xHP37eDogTjVWkzi7NwIkzG1m8UkpCfQ';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

