// Login Form Handling
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Initialize login page
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    checkAuth().then(user => {
        if (user) {
            window.location.href = 'dashboard.html';
        }
    });
    
    // Check for remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }
    
    // Add enter key support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const form = document.getElementById('loginForm');
            if (form && document.activeElement?.closest('form') === form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });
});

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    // Check if account is locked
    if (checkLockout()) {
        showNotification('Account temporarily locked. Please try again later.', 'error');
        return;
    }
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    const btnText = document.getElementById('loginBtnText');
    const spinner = submitBtn.querySelector('.fa-spinner');
    
    // Validate inputs
    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }
    
    // Disable button and show spinner
    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';
    btnText.textContent = 'Signing In...';
    
    try {
        // Attempt login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            loginAttempts++;
            if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                lockAccount();
            }
            throw error;
        }
        
        // Login successful
        loginAttempts = 0;
        
        // Remember email if checked
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
        
        // Update last login
        await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id);
        
        // Show success message
        showNotification('Login successful! Redirecting...', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Invalid email or password. Please try again.';
        
        if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please verify your email address before logging in.';
        } else if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
            const remaining = MAX_LOGIN_ATTEMPTS - loginAttempts;
            if (remaining > 0) {
                errorMessage += ` ${remaining} attempts remaining.`;
            }
        }
        
        showNotification(errorMessage, 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Sign In';
    }
}

// Handle Google login
async function handleGoogleLogin() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Google login error:', error);
        showNotification('Google login failed. Please try again.', 'error');
    }
}

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('loginPassword');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

// Forgot password
function showForgotPassword() {
    document.getElementById('forgotPasswordModal').classList.add('show');
}

function closeForgotPassword() {
    document.getElementById('forgotPasswordModal').classList.remove('show');
}

// Handle forgot password
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value.trim();
    const submitBtn = document.querySelector('#forgotPasswordForm button[type="submit"]');
    const btnText = submitBtn.querySelector('span');
    const spinner = submitBtn.querySelector('.fa-spinner');
    
    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }
    
    // Disable button and show spinner
    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';
    btnText.textContent = 'Sending...';
    
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        
        if (error) throw error;
        
        showNotification('Password reset link sent! Check your email.', 'success');
        closeForgotPassword();
        document.getElementById('forgotPasswordForm').reset();
        
    } catch (error) {
        console.error('Reset password error:', error);
        showNotification('Failed to send reset link. Please try again.', 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Send Reset Link';
    }
}

// Account lockout management
function lockAccount() {
    const lockoutTime = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem('loginLockout', lockoutTime);
    showNotification(`Too many failed attempts. Account locked for 15 minutes.`, 'error');
}

function checkLockout() {
    const lockoutTime = localStorage.getItem('loginLockout');
    if (!lockoutTime) return false;
    
    const timeLeft = parseInt(lockoutTime) - Date.now();
    if (timeLeft > 0) {
        const minutes = Math.ceil(timeLeft / (60 * 1000));
        showNotification(`Account locked. Try again in ${minutes} minutes.`, 'error');
        return true;
    } else {
        localStorage.removeItem('loginLockout');
        loginAttempts = 0;
        return false;
    }
}

// Session timeout management (30 minutes)
let sessionTimer;
const SESSION_TIMEOUT = 30 * 60 * 1000;

function resetSessionTimer() {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
        if (sessionTimer) {
            showNotification('Session expired. Please login again.', 'info');
            handleLogout();
        }
    }, SESSION_TIMEOUT);
}

// Monitor user activity
document.addEventListener('click', resetSessionTimer);
document.addEventListener('keydown', resetSessionTimer);
document.addEventListener('mousemove', resetSessionTimer);

// Modal functions for terms
function showTerms() {
    document.getElementById('termsModal').classList.add('show');
}

function closeTermsModal() {
    document.getElementById('termsModal').classList.remove('show');
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }
});
