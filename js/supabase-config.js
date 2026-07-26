// Supabase Configuration
const SUPABASE_URL = 'https://dytbmobtxflxnfqkddrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dGJtb2J0eGZseG5mcWtkZHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MzI4MjEsImV4cCI6MjEwMDUwODgyMX0.iFwsE4a8pM_xHP37eDogTjVWkzi7NwIkzG1m8UkpCfQ';

// Initialize Supabase client
let supabaseClient;

try {
    // Check if supabase is available from CDN
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized successfully');
        console.log('📡 Connected to:', SUPABASE_URL);
    } else {
        console.error('❌ Supabase library not loaded. Check CDN link.');
    }
} catch (error) {
    console.error('❌ Error initializing Supabase:', error);
}

// Make supabase available globally
window.supabase = supabaseClient;

// Show notification function
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    notification.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.info}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#999;font-size:1.2rem;padding:0 0 0 1rem;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Check auth status
async function checkAuth() {
    if (!window.supabase) {
        console.error('❌ Supabase not initialized');
        return null;
    }
    
    try {
        const { data: { user }, error } = await window.supabase.auth.getUser();
        if (error) throw error;
        console.log('✅ User authenticated:', user ? user.email : 'No user');
        return user;
    } catch (error) {
        console.error('❌ Auth check error:', error);
        return null;
    }
}

// Test Supabase connection
async function testSupabaseConnection() {
    if (!window.supabase) {
        console.error('❌ Cannot test: Supabase not initialized');
        return;
    }
    
    try {
        console.log('🔍 Testing Supabase connection...');
        const { data, error } = await window.supabase.from('profiles').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Supabase connection successful!');
        console.log('📊 Data:', data);
    } catch (error) {
        console.error('❌ Supabase connection test failed:', error);
    }
}

// Make functions globally available
window.showNotification = showNotification;
window.checkAuth = checkAuth;
window.testSupabaseConnection = testSupabaseConnection;

console.log('📦 supabase-config.js loaded');
console.log('🔑 Supabase status:', window.supabase ? '✅ Available' : '❌ Not available');

// Auto-test connection after 1 second
setTimeout(() => {
    testSupabaseConnection();
}, 1000);
