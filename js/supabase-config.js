

// Supabase Configuration
const SUPABASE_URL = 'https://dytbmobtxflxnfqkddrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dGJtb2J0eGZseG5mcWtkZHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MzI4MjEsImV4cCI6MjEwMDUwODgyMX0.iFwsE4a8pM_xHP37eDogTjVWkzi7NwIkzG1m8UkpCfQ';


// Initialize Supabase client - check if already exists
if (typeof window.supabase === 'undefined') {
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Use the existing instance
const supabaseClient = window.supabase;

// Check if user is logged in
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
            // User is logged in
            const dashboardLink = document.getElementById('dashboardLink');
            const adminLink = document.getElementById('adminLink');
            const authBtn = document.getElementById('authBtn');
            
            if (dashboardLink) dashboardLink.style.display = 'inline';
            
            // Check if user is admin
            try {
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                    
                if (profile && profile.role === 'admin') {
                    if (adminLink) adminLink.style.display = 'inline';
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
            
            if (authBtn) {
                authBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                authBtn.onclick = handleLogout;
            }
            
            return user;
        } else {
            // User is not logged in
            const dashboardLink = document.getElementById('dashboardLink');
            const adminLink = document.getElementById('adminLink');
            const authBtn = document.getElementById('authBtn');
            
            if (dashboardLink) dashboardLink.style.display = 'none';
            if (adminLink) adminLink.style.display = 'none';
            
            return null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

// Handle logout
async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        showNotification('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Show notification
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

// Initialize auth check on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}

// Make functions globally available
window.supabase = supabaseClient;
window.checkAuth = checkAuth;
window.handleLogout = handleLogout;
window.showNotification = showNotification;
