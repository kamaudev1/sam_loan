// Registration Form Handling
let currentStep = 1;
const totalSteps = 3;

// Initialize registration form
document.addEventListener('DOMContentLoaded', () => {
    updateProgressBar(1);
    setupPasswordStrength();
    setupFormValidation();
});

// Step navigation
function nextStep(step) {
    if (validateStep(currentStep)) {
        currentStep = step;
        showStep(currentStep);
        updateProgressBar(currentStep);
    }
}

function previousStep(step) {
    currentStep = step;
    showStep(currentStep);
    updateProgressBar(currentStep);
}

function showStep(step) {
    // Hide all steps
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

// Validate current step
function validateStep(step) {
    const stepElement = document.getElementById(`step${step}`);
    const inputs = stepElement.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
        
        // Additional validation
        if (input.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                input.classList.add('error');
                isValid = false;
                showFieldError(input, 'Please enter a valid email address');
            }
        }
        
        if (input.type === 'tel' && input.value) {
            const phoneRegex = /^[0-9]{10,12}$/;
            if (!phoneRegex.test(input.value.replace(/\s/g, ''))) {
                input.classList.add('error');
                isValid = false;
                showFieldError(input, 'Please enter a valid phone number');
            }
        }
        
        if (input.id === 'idNumber' && input.value) {
            const idRegex = /^[0-9]{5,8}$/;
            if (!idRegex.test(input.value)) {
                input.classList.add('error');
                isValid = false;
                showFieldError(input, 'Please enter a valid ID number (5-8 digits)');
            }
        }
        
        if (input.type === 'date' && input.value) {
            const birthDate = new Date(input.value);
            const minDate = new Date('2006-01-01');
            if (birthDate > minDate) {
                input.classList.add('error');
                isValid = false;
                showFieldError(input, 'You must be at least 18 years old');
            }
        }
    });
    
    // Special validation for step 3 (passwords and files)
    if (step === 3) {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (password.value && password.value.length < 8) {
            password.classList.add('error');
            showFieldError(password, 'Password must be at least 8 characters');
            isValid = false;
        }
        
        if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
            confirmPassword.classList.add('error');
            showFieldError(confirmPassword, 'Passwords do not match');
            isValid = false;
        }
        
        const idDocument = document.getElementById('idDocument');
        if (!idDocument.files || idDocument.files.length === 0) {
            idDocument.classList.add('error');
            showFieldError(idDocument, 'Please upload your ID document');
            isValid = false;
        }
        
        const termsAccepted = document.getElementById('termsAccepted');
        if (!termsAccepted.checked) {
            termsAccepted.classList.add('error');
            showFieldError(termsAccepted, 'You must accept the terms and conditions');
            isValid = false;
        }
    }
    
    if (!isValid) {
        showNotification('Please fill in all required fields correctly', 'error');
    }
    
    return isValid;
}

// Show field error
function showFieldError(input, message) {
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    const error = document.createElement('small');
    error.className = 'field-error';
    error.style.color = '#f44336';
    error.style.display = 'block';
    error.style.marginTop = '0.25rem';
    error.textContent = message;
    
    input.parentElement.appendChild(error);
}

// Setup form validation
function setupFormValidation() {
    // Real-time validation for email
    document.getElementById('email')?.addEventListener('blur', function() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.value && !emailRegex.test(this.value)) {
            this.classList.add('error');
            showFieldError(this, 'Please enter a valid email address');
        } else {
            this.classList.remove('error');
            const existingError = this.parentElement.querySelector('.field-error');
            if (existingError) existingError.remove();
        }
    });
    
    // Real-time validation for phone
    document.getElementById('phone')?.addEventListener('blur', function() {
        const phoneRegex = /^[0-9]{10,12}$/;
        if (this.value && !phoneRegex.test(this.value.replace(/\s/g, ''))) {
            this.classList.add('error');
            showFieldError(this, 'Please enter a valid phone number');
        } else {
            this.classList.remove('error');
            const existingError = this.parentElement.querySelector('.field-error');
            if (existingError) existingError.remove();
        }
    });
}

// Password strength indicator
function setupPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    passwordInput.addEventListener('input', function() {
        const strength = checkPasswordStrength(this.value);
        const bar = document.querySelector('.strength-bar');
        const text = document.querySelector('.strength-text');
        
        if (bar) {
            bar.style.setProperty('--strength-width', `${strength.score}%`);
            bar.style.setProperty('background', `linear-gradient(to right, ${strength.color} ${strength.score}%, #e0e0e0 ${strength.score}%)`);
        }
        
        if (text) {
            text.textContent = strength.message;
            text.style.color = strength.color;
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
        message = 'Strong';
        color = '#4caf50';
    } else if (score >= 60) {
        message = 'Good';
        color = '#ff9800';
    } else if (score >= 40) {
        message = 'Fair';
        color = '#ffc107';
    }
    
    return { score, message, color };
}

// File preview
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            // Remove error state if it exists
            input.classList.remove('error');
            const existingError = input.parentElement.parentElement.querySelector('.field-error');
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
        preview.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:#e8f5e9;border-radius:8px;margin-top:0.5rem;">
                <i class="fas fa-file-pdf" style="color:#f44336;"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <i class="fas fa-check-circle" style="color:#4caf50;margin-left:auto;"></i>
            </div>
        `;
        preview.style.display = 'block';
        
        // Remove error state if it exists
        input.classList.remove('error');
        const existingError = input.parentElement.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();
    }
}

// Handle form submission
async function handleRegistration(event) {
    event.preventDefault();
    
    // Validate final step
    if (!validateStep(3)) {
        return;
    }
    
    const submitBtn = document.querySelector('#registrationForm button[type="submit"]');
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
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            dateOfBirth: document.getElementById('dateOfBirth').value,
            gender: document.getElementById('gender').value,
            employmentStatus: document.getElementById('employmentStatus').value,
            employer: document.getElementById('employer').value.trim(),
            monthlyIncome: parseFloat(document.getElementById('monthlyIncome').value),
            incomeSource: document.getElementById('incomeSource').value,
            address: document.getElementById('address').value.trim(),
            password: document.getElementById('password').value,
            marketingConsent: document.getElementById('marketingConsent').checked
        };
        
        // Register user with Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                    phone: formData.phone
                }
            }
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
            // Create user profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        full_name: formData.fullName,
                        id_number: formData.idNumber,
                        phone: formData.phone,
                        date_of_birth: formData.dateOfBirth,
                        gender: formData.gender,
                        employment_status: formData.employmentStatus,
                        employer: formData.employer,
                        monthly_income: formData.monthlyIncome,
                        income_source: formData.incomeSource,
                        address: formData.address,
                        marketing_consent: formData.marketingConsent,
                        status: 'pending_verification'
                    }
                ]);
            
            if (profileError) throw profileError;
            
            // Upload documents if provided
            const profilePicture = document.getElementById('profilePicture');
            const idDocument = document.getElementById('idDocument');
            const proofOfIncome = document.getElementById('proofOfIncome');
            
            if (profilePicture.files && profilePicture.files[0]) {
                await uploadDocument(authData.user.id, 'profile_picture', profilePicture.files[0]);
            }
            
            if (idDocument.files && idDocument.files[0]) {
                await uploadDocument(authData.user.id, 'id_document', idDocument.files[0]);
            }
            
            if (proofOfIncome.files && proofOfIncome.files[0]) {
                await uploadDocument(authData.user.id, 'proof_of_income', proofOfIncome.files[0]);
            }
            
            // Show success message
            showNotification('Account created successfully! Please check your email for verification.', 'success');
            
            // Redirect to login after delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message || 'Registration failed. Please try again.', 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Create Account';
    }
}

// Upload document to Supabase Storage
async function uploadDocument(userId, documentType, file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(fileName, file);
            
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);
            
        // Save document reference in database
        await supabase
            .from('documents')
            .insert([
                {
                    user_id: userId,
                    document_type: documentType,
                    file_name: fileName,
                    file_url: publicUrl,
                    uploaded_at: new Date().toISOString()
                }
            ]);
            
        return publicUrl;
    } catch (error) {
        console.error('Document upload error:', error);
        throw error;
    }
}

// Modal functions
function showTerms() {
    document.getElementById('termsModal').classList.add('show');
}

function closeTermsModal() {
    document.getElementById('termsModal').classList.remove('show');
}

function showPrivacy() {
    document.getElementById('privacyModal').classList.add('show');
}

function closePrivacyModal() {
    document.getElementById('privacyModal').classList.remove('show');
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
