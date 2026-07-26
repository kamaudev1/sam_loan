// Registration Form Handling
let currentStep = 1;
const totalSteps = 3;

// Initialize registration form
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Registration page loaded');
    console.log('🔑 Supabase status:', window.supabase ? '✅ Available' : '❌ Not available');
    
    // Check Supabase
    if (!window.supabase) {
        showNotification('Unable to connect to server. Please refresh.', 'error');
        return;
    }
    
    updateProgressBar(1);
    setupPasswordStrength();
    setupFormValidation();
    setupFileUploads();
});

// ============================================
// STEP NAVIGATION
// ============================================

function goToStep(step) {
    if (step > currentStep) {
        // Going forward - validate current step
        if (!validateStep(currentStep)) {
            return;
        }
    }
    
    currentStep = step;
    showStep(currentStep);
    updateProgressBar(currentStep);
    
    // Scroll to top of form
    const form = document.getElementById('registrationForm');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function showStep(step) {
    for (let i = 1; i <= totalSteps; i++) {
        const stepElement = document.getElementById(`step${i}`);
        if (stepElement) {
            stepElement.style.display = i === step ? 'block' : 'none';
        }
    }
}

function updateProgressBar(step) {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressLines = document.querySelectorAll('.progress-line');
    
    progressSteps.forEach((el, index) => {
        const stepNum = index + 1;
        el.classList.remove('active', 'completed');
        
        if (stepNum === step) {
            el.classList.add('active');
        } else if (stepNum < step) {
            el.classList.add('completed');
        }
    });
    
    progressLines.forEach((el, index) => {
        const lineNum = index + 1;
        el.classList.remove('completed');
        if (lineNum < step) {
            el.classList.add('completed');
        }
    });
}

// ============================================
// VALIDATION
// ============================================

function validateStep(step) {
    const stepElement = document.getElementById(`step${step}`);
    if (!stepElement) return false;
    
    const inputs = stepElement.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    // Clear all previous errors in this step
    stepElement.querySelectorAll('.field-error').forEach(el => el.remove());
    stepElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    
    inputs.forEach(input => {
        // Skip validation for hidden fields
        if (input.type === 'hidden') return;
        
        if (!input.value || !input.value.trim()) {
            input.classList.add('error');
            showFieldError(input, 'This field is required');
            isValid = false;
            return;
        }
        
        // Email validation
        if (input.type === 'email' && input.value) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(input.value)) {
                input.classList.add('error');
                showFieldError(input, 'Please enter a valid email address');
                isValid = false;
            }
        }
        
        // Phone validation
        if (input.type === 'tel' && input.value) {
            const phoneRegex = /^[0-9]{10,12}$/;
            if (!phoneRegex.test(input.value.replace(/\s/g, ''))) {
                input.classList.add('error');
                showFieldError(input, 'Please enter a valid phone number (10-12 digits)');
                isValid = false;
            }
        }
        
        // ID Number validation
        if (input.id === 'idNumber' && input.value) {
            const idRegex = /^[0-9]{5,8}$/;
            if (!idRegex.test(input.value)) {
                input.classList.add('error');
                showFieldError(input, 'Please enter a valid ID number (5-8 digits)');
                isValid = false;
            }
        }
        
        // Date of Birth validation
        if (input.type === 'date' && input.value) {
            const birthDate = new Date(input.value);
            const minDate = new Date('2006-01-01');
            if (birthDate > minDate) {
                input.classList.add('error');
                showFieldError(input, 'You must be at least 18 years old');
                isValid = false;
            }
        }
        
        // Monthly Income validation
        if (input.id === 'monthlyIncome' && input.value) {
            const income = parseFloat(input.value);
            if (isNaN(income) || income < 0) {
                input.classList.add('error');
                showFieldError(input, 'Please enter a valid income amount');
                isValid = false;
            }
        }
    });
    
    // Step 3 specific validations
    if (step === 3) {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        // Password validation
        if (password.value.length < 8) {
            password.classList.add('error');
            showFieldError(password, 'Password must be at least 8 characters');
            isValid = false;
        }
        
        // Password match validation
        if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
            confirmPassword.classList.add('error');
            showFieldError(confirmPassword, 'Passwords do not match');
            isValid = false;
        }
        
        // ID Document validation
        const idDocument = document.getElementById('idDocument');
        if (!idDocument.files || idDocument.files.length === 0) {
            const container = idDocument.closest('.form-group');
            idDocument.classList.add('error');
            const error = document.createElement('small');
            error.className = 'field-error';
            error.style.color = '#f44336';
            error.style.display = 'block';
            error.style.marginTop = '0.25rem';
            error.textContent = 'Please upload your ID document';
            container.appendChild(error);
            isValid = false;
        }
        
        // Terms validation
        const termsAccepted = document.getElementById('termsAccepted');
        if (!termsAccepted.checked) {
            termsAccepted.classList.add('error');
            const container = termsAccepted.closest('.form-group');
            const error = document.createElement('small');
            error.className = 'field-error';
            error.style.color = '#f44336';
            error.style.display = 'block';
            error.style.marginTop = '0.25rem';
            error.textContent = 'You must accept the terms and conditions';
            container.appendChild(error);
            isValid = false;
        }
    }
    
    if (!isValid) {
        showNotification('Please fix all errors before continuing', 'error');
    }
    
    return isValid;
}

function showFieldError(input, message) {
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) existingError.remove();
    
    const error = document.createElement('small');
    error.className = 'field-error';
    error.style.color = '#f44336';
    error.style.display = 'block';
    error.style.marginTop = '0.25rem';
    error.textContent = message;
    
    input.parentElement.appendChild(error);
}

// ============================================
// REAL-TIME VALIDATION
// ============================================

function setupFormValidation() {
    // Email validation on blur
    document.getElementById('email')?.addEventListener('blur', function() {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const existingError = this.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        if (this.value && !emailRegex.test(this.value)) {
            this.classList.add('error');
            showFieldError(this, 'Please enter a valid email address');
        } else {
            this.classList.remove('error');
        }
    });
    
    // Phone validation on blur
    document.getElementById('phone')?.addEventListener('blur', function() {
        const phoneRegex = /^[0-9]{10,12}$/;
        const existingError = this.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        if (this.value && !phoneRegex.test(this.value.replace(/\s/g, ''))) {
            this.classList.add('error');
            showFieldError(this, 'Please enter a valid phone number');
        } else {
            this.classList.remove('error');
        }
    });
    
    // ID Number validation on blur
    document.getElementById('idNumber')?.addEventListener('blur', function() {
        const idRegex = /^[0-9]{5,8}$/;
        const existingError = this.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        if (this.value && !idRegex.test(this.value)) {
            this.classList.add('error');
            showFieldError(this, 'Please enter a valid ID number (5-8 digits)');
        } else {
            this.classList.remove('error');
        }
    });
    
    // Password match validation on blur
    document.getElementById('confirmPassword')?.addEventListener('blur', function() {
        const password = document.getElementById('password');
        const existingError = this.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        if (this.value && password.value && this.value !== password.value) {
            this.classList.add('error');
            showFieldError(this, 'Passwords do not match');
        } else {
            this.classList.remove('error');
        }
    });
}

// ============================================
// PASSWORD STRENGTH
// ============================================

function setupPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    passwordInput.addEventListener('input', function() {
        const strength = checkPasswordStrength(this.value);
        const bar = document.querySelector('.strength-bar');
        const text = document.querySelector('.strength-text');
        
        if (bar) {
            bar.style.background = `linear-gradient(to right, ${strength.color} ${strength.score}%, #e0e0e0 ${strength.score}%)`;
        }
        
        if (text) {
            text.textContent = strength.message;
            text.style.color = strength.color;
        }
        
        // Check password match in real-time
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword.value) {
            const existingError = confirmPassword.parentElement.querySelector('.field-error');
            if (existingError) existingError.remove();
            
            if (this.value && confirmPassword.value && this.value !== confirmPassword.value) {
                confirmPassword.classList.add('error');
                showFieldError(confirmPassword, 'Passwords do not match');
            } else {
                confirmPassword.classList.remove('error');
            }
        }
    });
}

function checkPasswordStrength(password) {
    let score = 0;
    let message = 'Very Weak';
    let color = '#f44336';
    
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25;
    if (/\d/.test(password)) score += 12.5;
    if (/[^a-zA-Z0-9]/.test(password)) score += 12.5;
    
    if (score >= 80) {
        message = 'Strong 💪';
        color = '#4caf50';
    } else if (score >= 60) {
        message = 'Good 👍';
        color = '#ff9800';
    } else if (score >= 40) {
        message = 'Fair ⚠️';
        color = '#ffc107';
    }
    
    return { score, message, color };
}

// ============================================
// FILE UPLOAD HANDLING
// ============================================

function setupFileUploads() {
    // File upload visual feedback
    document.querySelectorAll('.file-upload input[type="file"]').forEach(input => {
        input.addEventListener('change', function() {
            const label = this.closest('.file-upload').querySelector('.file-upload-label span');
            if (this.files && this.files[0]) {
                label.textContent = this.files[0].name;
                label.style.color = '#4caf50';
            } else {
                label.textContent = 'Click to upload';
                label.style.color = '';
            }
        });
    });
}

function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            preview.style.maxWidth = '150px';
            preview.style.maxHeight = '150px';
            preview.style.marginTop = '1rem';
            preview.style.borderRadius = '8px';
            preview.style.objectFit = 'cover';
            
            // Remove error state
            input.classList.remove('error');
            const container = input.closest('.form-group');
            const existingError = container.querySelector('.field-error');
            if (existingError) existingError.remove();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewFile(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const fileSize = (file.size / 1024).toFixed(1);
        const icon = file.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-image';
        const color = file.type.includes('pdf') ? '#f44336' : '#4caf50';
        
        preview.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:#f5f5f5;border-radius:8px;margin-top:0.5rem;border:1px solid #e0e0e0;">
                <i class="fas ${icon}" style="color:${color};font-size:1.5rem;"></i>
                <div style="flex:1;">
                    <div style="font-weight:500;font-size:0.9rem;">${file.name}</div>
                    <div style="font-size:0.8rem;color:#666;">${fileSize} KB</div>
                </div>
                <i class="fas fa-check-circle" style="color:#4caf50;"></i>
            </div>
        `;
        preview.style.display = 'block';
        
        // Remove error state
        input.classList.remove('error');
        const container = input.closest('.form-group');
        const existingError = container.querySelector('.field-error');
        if (existingError) existingError.remove();
    }
}

// ============================================
// MAIN REGISTRATION HANDLER
// ============================================

async function handleRegistration(event) {
    event.preventDefault();
    console.log('📝 Registration form submitted');
    
    // Check if Supabase is available
    if (!window.supabase) {
        console.error('❌ Supabase not available');
        showNotification('System error. Please refresh the page.', 'error');
        return;
    }
    
    // Validate final step
    if (!validateStep(3)) {
        console.log('❌ Validation failed');
        return;
    }
    
    const submitBtn = document.getElementById('registerSubmitBtn');
    const btnText = document.getElementById('registerBtnText');
    const spinner = submitBtn.querySelector('.fa-spinner');
    
    // Disable button and show spinner
    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';
    btnText.textContent = 'Creating Account...';
    
    try {
        // Collect form data
        const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            idNumber: document.getElementById('idNumber').value.trim(),
            email: document.getElementById('email').value.trim().toLowerCase(),
            phone: document.getElementById('phone').value.trim(),
            dateOfBirth: document.getElementById('dateOfBirth').value,
            gender: document.getElementById('gender').value,
            employmentStatus: document.getElementById('employmentStatus').value,
            employer: document.getElementById('employer').value.trim(),
            monthlyIncome: parseFloat(document.getElementById('monthlyIncome').value) || 0,
            incomeSource: document.getElementById('incomeSource').value,
            address: document.getElementById('address').value.trim(),
            password: document.getElementById('password').value,
            marketingConsent: document.getElementById('marketingConsent').checked
        };
        
        console.log('📊 Form data:', {
            email: formData.email,
            fullName: formData.fullName,
            phone: formData.phone,
            monthlyIncome: formData.monthlyIncome
        });
        
        // === STEP 1: Create Auth User ===
        console.log('🔐 Creating user account...');
        const { data: authData, error: authError } = await window.supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                    phone: formData.phone
                }
            }
        });
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            
            let errorMessage = 'Registration failed. ';
            if (authError.message.includes('User already registered')) {
                errorMessage = 'This email is already registered. Please login instead.';
            } else if (authError.message.includes('Password')) {
                errorMessage = 'Password must be at least 6 characters.';
            } else if (authError.message) {
                errorMessage += authError.message;
            }
            
            showNotification(errorMessage, 'error');
            submitBtn.disabled = false;
            spinner.style.display = 'none';
            btnText.textContent = 'Create Account';
            return;
        }
        
        if (!authData.user) {
            throw new Error('No user data returned from signup');
        }
        
        console.log('✅ User created:', authData.user.id);
        
        // === STEP 2: Update Profile ===
        console.log('📝 Updating profile...');
        
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const profileData = {
            id_number: formData.idNumber,
            date_of_birth: formData.dateOfBirth,
            gender: formData.gender,
            employment_status: formData.employmentStatus,
            employer: formData.employer || null,
            monthly_income: formData.monthlyIncome,
            income_source: formData.incomeSource,
            address: formData.address,
            marketing_consent: formData.marketingConsent
        };
        
        console.log('📊 Profile data:', profileData);
        
        const { error: profileError } = await window.supabase
            .from('profiles')
            .update(profileData)
            .eq('id', authData.user.id);
        
        if (profileError) {
            console.error('❌ Profile update error:', profileError);
            // Continue anyway - profile might have been created
        } else {
            console.log('✅ Profile updated successfully');
        }
        
        // === STEP 3: Upload Documents ===
        console.log('📎 Uploading documents...');
        
        const documents = [
            { id: 'profilePicture', type: 'profile_picture' },
            { id: 'idDocument', type: 'id_document', required: true },
            { id: 'proofOfIncome', type: 'proof_of_income' }
        ];
        
        const uploadPromises = [];
        
        for (const doc of documents) {
            const input = document.getElementById(doc.id);
            if (input && input.files && input.files[0]) {
                console.log(`📤 Uploading ${doc.type}...`);
                uploadPromises.push(
                    uploadDocument(authData.user.id, doc.type, input.files[0])
                        .then(url => console.log(`✅ ${doc.type} uploaded`))
                        .catch(err => console.error(`❌ ${doc.type} upload failed:`, err))
                );
            }
        }
        
        if (uploadPromises.length > 0) {
            await Promise.allSettled(uploadPromises);
            console.log('📎 Document uploads completed');
        }
        
        // === SUCCESS ===
        console.log('🎉 Registration complete!');
        showNotification(
            '✅ Account created successfully! Please check your email for verification.',
            'success'
        );
        
        // Redirect to login
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        showNotification(
            error.message || 'Registration failed. Please try again.',
            'error'
        );
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Create Account';
    }
}

// ============================================
// DOCUMENT UPLOAD
// ============================================

async function uploadDocument(userId, documentType, file) {
    try {
        console.log(`📤 Uploading ${documentType}...`);
        
        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('File size exceeds 5MB limit');
        }
        
        // Create file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`;
        
        // Upload to storage
        const { data, error } = await window.supabase.storage
            .from('documents')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('❌ Storage upload error:', error);
            throw error;
        }
        
        console.log(`✅ ${documentType} uploaded to storage`);
        
        // Get public URL
        const { data: { publicUrl } } = window.supabase.storage
            .from('documents')
            .getPublicUrl(fileName);
        
        // Save document record
        const { error: docError } = await window.supabase
            .from('documents')
            .insert({
                user_id: userId,
                document_type: documentType,
                file_name: fileName,
                file_url: publicUrl
            });
        
        if (docError) {
            console.error('❌ Document record error:', docError);
            // Don't throw - the file is uploaded but we couldn't save the record
        }
        
        return publicUrl;
        
    } catch (error) {
        console.error(`❌ ${documentType} upload error:`, error);
        throw error;
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function showTerms() {
    const modal = document.getElementById('termsModal');
    if (modal) modal.classList.add('show');
}

function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) modal.classList.remove('show');
}

function showPrivacy() {
    const modal = document.getElementById('privacyModal');
    if (modal) modal.classList.add('show');
}

function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) modal.classList.remove('show');
}

// ============================================
// CLOSE MODALS
// ============================================

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }
});

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.goToStep = goToStep;
window.validateStep = validateStep;
window.previewImage = previewImage;
window.previewFile = previewFile;
window.handleRegistration = handleRegistration;
window.showTerms = showTerms;
window.closeTermsModal = closeTermsModal;
window.showPrivacy = showPrivacy;
window.closePrivacyModal = closePrivacyModal;

console.log('✅ registration.js loaded successfully');
