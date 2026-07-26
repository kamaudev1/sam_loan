

// Supabase Configuration
const SUPABASE_URL = 'https://dytbmobtxflxnfqkddrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dGJtb2J0eGZseG5mcWtkZHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MzI4MjEsImV4cCI6MjEwMDUwODgyMX0.iFwsE4a8pM_xHP37eDogTjVWkzi7NwIkzG1m8UkpCfQ';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabase = supabase;

// Check if user is logged in
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (user) {
        // User is logged in
        const dashboardLink = document.getElementById('dashboardLink');
        const adminLink = document.getElementById('adminLink');
        const authBtn = document.getElementById('authBtn');
        
        if (dashboardLink) dashboardLink.style.display = 'inline';
        
        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
        if (profile && profile.role === 'admin') {
            if (adminLink) adminLink.style.display = 'inline';
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
}

// Handle logout
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showNotification('Error logging out', 'error');
    } else {
        showNotification('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', checkAuth);
