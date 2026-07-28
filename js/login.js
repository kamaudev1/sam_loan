// ============================================
// LOGIN CONTROLLER - Modern
// ============================================

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    checkAuthStatus();
    
    // Add enter key support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const active = document.activeElement;
            if (active.id === 'loginEmail' || active.id === 'loginPassword') {
                document.getElementById('loginForm').dispatchEvent(new Event('submit'));
            }
        }
    });
});

// ============================================
// CHECK AUTH STATUS
// ============================================
async function checkAuthStatus() {
    try {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
            // User is logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.log('Not logged in');
    }
}

// ============================================
// HANDLE LOGIN
// ============================================
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoading = loginBtn.querySelector('.btn-loading');
    const btnContent = loginBtn.querySelector('.btn-content');

    // Validate
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Show loading state
    loginBtn.disabled = true;
    btnContent.style.display = 'none';
    btnLoading.style.display = 'flex';

    try {
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                showToast('Invalid email or password. Please try again.', 'error');
            } else {
                showToast(error.message, 'error');
            }
            return;
        }

        if (data.user) {
            showToast('Login successful! Redirecting...', 'success');
            
            // Store remember me preference
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }

            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }

    } catch (error) {
        console.error('Login error:', error);
        showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
        // Reset button state
        loginBtn.disabled = false;
        btnContent.style.display = 'flex';
        btnLoading.style.display = 'none';
    }
}

// ============================================
// GOOGLE LOGIN
// ============================================
async function handleGoogleLogin() {
    try {
        showToast('Redirecting to Google...', 'info');
        
        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });

        if (error) throw error;
        
        // The redirect will happen automatically

    } catch (error) {
        console.error('Google login error:', error);
        showToast('Failed to login with Google. Please try again.', 'error');
    }
}

// ============================================
// FORGOT PASSWORD
// ============================================
function showForgotPassword() {
    document.getElementById('forgotPasswordModal').style.display = 'flex';
    document.getElementById('forgotPasswordModal').classList.add('show');
}

function closeForgotPassword() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
    document.getElementById('forgotPasswordModal').classList.remove('show');
}

async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('.btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });

        if (error) throw error;

        showToast('Password reset link sent to your email!', 'success');
        closeForgotPassword();
        document.getElementById('resetEmail').value = '';

    } catch (error) {
        console.error('Reset password error:', error);
        showToast('Failed to send reset link. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================
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

// ============================================
// MODALS
// ============================================
function showTerms() {
    document.getElementById('termsModal').style.display = 'flex';
    document.getElementById('termsModal').classList.add('show');
}

function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
    document.getElementById('termsModal').classList.remove('show');
}

function showPrivacy() {
    document.getElementById('privacyModal').style.display = 'flex';
    document.getElementById('privacyModal').classList.add('show');
}

function closePrivacyModal() {
    document.getElementById('privacyModal').style.display = 'none';
    document.getElementById('privacyModal').classList.remove('show');
}

// Close modals on outside click
document.addEventListener('click', function(e) {
    const modals = ['forgotPasswordModal', 'termsModal', 'privacyModal'];
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    });
});

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    toast.className = `toast show ${type}`;
    
    // Auto hide after 4 seconds
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
