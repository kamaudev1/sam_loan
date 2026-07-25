// js/auth.js
let authCurrentUser = null;
let profilePictureFile = null;
let idDocumentFile = null;
let currentAuthMode = 'register';

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
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
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
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const authBtn = document.getElementById('authBtn');
        const dashboardLink = document.getElementById('dashboardLink');
        const adminLink = document.getElementById('adminLink');
        
        if (user) {
            authCurrentUser = user;
            if (authBtn) {
                authBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                authBtn.onclick = handleLogout;
            }
            if (dashboardLink) {
                dashboardLink.style.display = 'inline';
            }
            
            // Check if user is admin
            try {
                const { data: userData } = await supabaseClient
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                    
                if (userData?.role === 'admin' && adminLink) {
                    adminLink.style.display = 'inline';
                }
            } catch (e) {
                console.warn('Could not check admin status:', e);
            }
        } else {
            if (authBtn) {
                authBtn.innerHTML = '<i class="fas fa-user"></i> Get Started';
                authBtn.onclick = () => showAuthModal('register');
            }
            if (dashboardLink) {
                dashboardLink.style.display = 'none';
            }
            if (adminLink) {
                adminLink.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> Get Started';
            authBtn.onclick = () => showAuthModal('register');
        }
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
    
    if (!modal) return;
    
    if (mode === 'register') {
        if (title) title.textContent = 'Create Account';
        if (subtitle) subtitle.textContent = 'Start your journey to financial freedom';
        if (btnText) btnText.textContent = 'Create Account';
        if (registrationFields) registrationFields.style.display = 'block';
        if (loginFields) loginFields.style.display = 'none';
        if (switchText) {
            switchText.innerHTML = 'Already have an account? <a href="#" onclick="switchAuthMode(\'login\'); return false;">Sign In</a>';
        }
        const form = document.getElementById('authForm');
        if (form) form.reset();
        const profilePreview = document.getElementById('profilePreview');
        const idPreview = document.getElementById('idPreview');
        if (profilePreview) profilePreview.style.display = 'none';
        if (idPreview) idPreview.style.display = 'none';
    } else {
        if (title) title.textContent = 'Welcome Back';
        if (subtitle) subtitle.textContent = 'Sign in to access your account';
        if (btnText) btnText.textContent = 'Sign In';
        if (registrationFields) registrationFields.style.display = 'none';
        if (loginFields) loginFields.style.display = 'block';
        if (switchText) {
            switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="switchAuthMode(\'register\'); return false;">Create Account</a>';
        }
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
    }
    
    modal.style.display = 'flex';
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function switchAuthMode(mode) {
    showAuthModal(mode);
}

function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0] && preview) {
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
    const spinner = submitBtn?.querySelector('.fa-spinner');
    
    if (!submitBtn) return;
    
    submitBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'Processing...';
    
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
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.textContent = currentAuthMode === 'register' ? 'Create Account' : 'Sign In';
    }
}

async function handleRegistration() {
    const fullName = document.getElementById('fullName')?.value?.trim();
    const idNumber = document.getElementById('idNumber')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const phone = document.getElementById('phone')?.value?.trim();
    const dateOfBirth = document.getElementById('dateOfBirth')?.value;
    const gender = document.getElementById('gender')?.value;
    const occupation = document.getElementById('occupation')?.value?.trim();
    const monthlyIncome = document.getElementById('monthlyIncome')?.value;
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const termsAccepted = document.getElementById('termsAccepted')?.checked;
    const idDocument = document.getElementById('idDocument');
    
    // Validation
    if (!fullName || !idNumber || !email || !phone || !dateOfBirth || !gender || !password || !confirmPassword) {
        throw new Error('Please fill in all required fields');
    }
    
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
    
    if (!idDocument || !idDocument.files || !idDocument.files[0]) {
        throw new Error('Please upload your ID document');
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
            try {
                const fileExt = profilePictureFile.name.split('.').pop();
                const fileName = `${data.user.id}/profile.${fileExt}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from('profiles')
                    .upload(fileName, profilePictureFile);
                
                if (!uploadError) {
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('profiles')
                        .getPublicUrl(fileName);
                    profileUrl = publicUrl;
                } else {
                    console.warn('Profile upload failed:', uploadError);
                }
            } catch (e) {
                console.warn('Profile upload error:', e);
            }
        }
        
        if (idDocument && idDocument.files && idDocument.files[0]) {
            try {
                const fileExt = idDocument.files[0].name.split('.').pop();
                const fileName = `${data.user.id}/id.${fileExt}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from('kyc')
                    .upload(fileName, idDocument.files[0]);
                
                if (!uploadError) {
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('kyc')
                        .getPublicUrl(fileName);
                    idUrl = publicUrl;
                } else {
                    console.warn('ID upload failed:', uploadError);
                }
            } catch (e) {
                console.warn('ID upload error:', e);
            }
        }
        
        // Prepare user data
        const userData = {
            id: data.user.id,
            email: email,
            full_name: fullName,
            id_number: idNumber,
            phone: phone,
            gender: gender,
            occupation: occupation || null,
            monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null,
            profile_picture_url: profileUrl,
            id_picture_url: idUrl,
            terms_accepted: true,
            terms_accepted_date: new Date().toISOString(),
            role: 'user'
        };
        
        // Only add date_of_birth if it has a value
        if (dateOfBirth && dateOfBirth.trim() !== '') {
            userData.date_of_birth = dateOfBirth;
        }
        
        // Save user details to users table
        const { error: userError } = await supabaseClient
            .from('users')
            .insert([userData]);
        
        if (userError) {
            console.error('Error saving user:', userError);
            
            // If it's a date error, try without date_of_birth
            if (userError.message && userError.message.includes('date')) {
                delete userData.date_of_birth;
                const { error: retryError } = await supabaseClient
                    .from('users')
                    .insert([userData]);
                
                if (retryError) {
                    console.error('Retry error:', retryError);
                    throw new Error('Error saving user data. Please try again.');
                }
            } else {
                throw new Error('Error saving user data. Please try again.');
            }
        }
        
        showToast('Registration successful! Please verify your email.', 'success');
        closeAuthModal();
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    
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
    authCurrentUser = null;
    window.location.href = 'index.html';
}

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

function showTerms() {
    const modal = document.getElementById('termsModal');
    if (modal) modal.style.display = 'flex';
}

function showPrivacy() {
    showToast('Privacy policy coming soon!', 'info');
}

function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) modal.style.display = 'none';
}

function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) navLinks.classList.toggle('active');
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

// Make functions globally accessible
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthMode = switchAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.handleAuth = () => showAuthModal('register');
window.handleLogout = handleLogout;
window.previewImage = previewImage;
window.showTerms = showTerms;
window.showPrivacy = showPrivacy;
window.closeTermsModal = closeTermsModal;
window.toggleMobileMenu = toggleMobileMenu;
