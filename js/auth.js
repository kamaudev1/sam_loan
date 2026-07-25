// js/auth.js
let currentAuthMode = 'register';
let currentUser = null;
let profilePictureFile = null;
let idDocumentFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupNavbarScroll();
    setupPasswordValidation();
});

// Navbar scroll effect
function setupNavbarScroll() {
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('mainNav');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Password validation
function setupPasswordValidation() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (password && confirmPassword) {
        confirmPassword.addEventListener('input', () => {
            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }
}

async function checkAuthState() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const authBtn = document.getElementById('authBtn');
    const dashboardLink = document.getElementById('dashboardLink');
    const adminLink = document.getElementById('adminLink');
    
    if (user) {
        currentUser = user;
        authBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        authBtn.onclick = handleLogout;
        dashboardLink.style.display = 'inline';
        
        // Check if user is admin
        const { data: userData } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
            
        if (userData?.role === 'admin') {
            adminLink.style.display = 'inline';
        }
    } else {
        authBtn.innerHTML = '<i class="fas fa-user"></i> Get Started';
        authBtn.onclick = () => showAuthModal('register');
        dashboardLink.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

function showAuthModal(mode) {
    currentAuthMode = mode;
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const subtitle = document.getElementById('authModalSubtitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const btnText = document.getElementById('authBtnText');
    const registrationFields = document.getElementById('registrationFields');
    const loginFields = document.getElementById('loginFields');
    const switchText = document.getElementById('authSwitchText');
    
    if (mode === 'register') {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Start your journey to financial freedom';
        btnText.textContent = 'Create Account';
        registrationFields.style.display = 'block';
        loginFields.style.display = 'none';
        switchText.innerHTML = 'Already have an account? <a href="#" onclick="switchAuthMode(\'login\')">Sign In</a>';
        // Reset form
        document.getElementById('authForm').reset();
        document.getElementById('profilePreview').style.display = 'none';
        document.getElementById('idPreview').style.display = 'none';
    } else {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to access your account';
        btnText.textContent = 'Sign In';
        registrationFields.style.display = 'none';
        loginFields.style.display = 'block';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="switchAuthMode(\'register\')">Create Account</a>';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    }
    
    modal.style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function switchAuthMode(mode) {
    showAuthModal(mode);
}

// Image preview
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
        
        if (previewId === 'profilePreview') {
            profilePictureFile = input.files[0];
        } else if (previewId === 'idPreview') {
            idDocumentFile = input.files[0];
        }
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('authSubmitBtn');
    const btnText = document.getElementById('authBtnText');
    const spinner = submitBtn.querySelector('.fa-spinner');
    
    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';
    btnText.textContent = 'Processing...';
    
    try {
        if (currentAuthMode === 'register') {
            await handleRegistration();
        } else {
            await handleLogin();
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = currentAuthMode === 'register' ? 'Create Account' : 'Sign In';
    }
}

async function handleRegistration() {
    const fullName = document.getElementById('fullName').value.trim();
    const idNumber = document.getElementById('idNumber').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const gender = document.getElementById('gender').value;
    const occupation = document.getElementById('occupation').value.trim();
    const monthlyIncome = document.getElementById('monthlyIncome').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsAccepted = document.getElementById('termsAccepted').checked;
    
    // Validation
    if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
    }
    
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    
    if (!termsAccepted) {
        throw new Error('Please accept the terms and conditions');
    }
    
    if (!idNumber || idNumber.length < 5) {
        throw new Error('Please enter a valid ID number');
    }
    
    // Register user with Supabase Auth
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                id_number: idNumber,
                phone: phone,
                role: 'user'
            }
        }
    });
    
    if (error) throw error;
    
    if (data.user) {
        // Upload profile picture if provided
        let profileUrl = null;
        let idUrl = null;
        
        if (profilePictureFile) {
            const fileExt = profilePictureFile.name.split('.').pop();
            const fileName = `${data.user.id}/profile.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('profiles')
                .upload(fileName, profilePictureFile);
            
            if (!uploadError) {
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('profiles')
                    .getPublicUrl(fileName);
                profileUrl = publicUrl;
            }
        }
        
        if (idDocumentFile) {
            const fileExt = idDocumentFile.name.split('.').pop();
            const fileName = `${data.user.id}/id.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('kyc')
                .upload(fileName, idDocumentFile);
            
            if (!uploadError) {
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('kyc')
                    .getPublicUrl(fileName);
                idUrl = publicUrl;
            }
        }
        
        // Save user details to users table
        const { error: userError } = await supabaseClient
            .from('users')
            .insert([{
                id: data.user.id,
                email: email,
                full_name: fullName,
                id_number: idNumber,
                phone: phone,
                date_of_birth: dateOfBirth,
                gender: gender,
                occupation: occupation,
                monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null,
                profile_picture_url: profileUrl,
                id_picture_url: idUrl,
                terms_accepted: true,
                terms_accepted_date: new Date().toISOString(),
                role: 'user'
            }]);
        
        if (userError) {
            console.error('Error saving user:', userError);
            throw new Error('Error saving user data. Please try again.');
        }
        
        showToast('Registration successful! Please verify your email.', 'success');
        closeAuthModal();
        
        // Log activity
        await logActivity(data.user.id, 'registration', { email, fullName });
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        throw new Error('Please enter both email and password');
    }
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    
    if (data.user) {
        showToast('Login successful!', 'success');
        closeAuthModal();
        
        // Log activity
        await logActivity(data.user.id, 'login');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    }
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        showToast('Error logging out', 'error');
        return;
    }
    showToast('Logged out successfully', 'info');
    currentUser = null;
    checkAuthState();
    window.location.href = 'index.html';
}

// Activity logging
async function logActivity(userId, action, details = {}) {
    try {
        await supabaseClient
            .from('activity_logs')
            .insert([{
                user_id: userId,
                action: action,
                details: details,
                user_agent: navigator.userAgent
            }]);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Terms and Privacy modals
function showTerms() {
    document.getElementById('termsModal').style.display = 'flex';
}

function showPrivacy() {
    // Implement privacy modal
    showToast('Privacy policy coming soon!', 'info');
}

function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
}

// Mobile menu toggle
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const authModal = document.getElementById('authModal');
    const termsModal = document.getElementById('termsModal');
    if (event.target === authModal) {
        closeAuthModal();
    }
    if (event.target === termsModal) {
        closeTermsModal();
    }
};
