// js/dashboard.js
let dashboardUser = null;
let userData = null;
let allLoans = [];
let kycProfileFile = null;
let kycIdFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkUserAuth();
    await loadUserProfile();
    await loadDashboardStats();
    await loadLoanHistory();
    await checkKYCStatus();
    setupLoanCalculator();
});

async function checkUserAuth() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        dashboardUser = user;
        
        try {
            const { data: userData } = await supabaseClient
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();
                
            const adminLink = document.getElementById('adminLink');
            if (userData?.role === 'admin' && adminLink) {
                adminLink.style.display = 'inline';
            }
        } catch (e) {
            console.warn('Could not check admin status:', e);
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'index.html';
    }
}

async function loadUserProfile() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', dashboardUser.id)
            .single();
        
        if (error) throw error;
        
        userData = data;
        
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userPhone = document.getElementById('userPhone');
        const userIdNumber = document.getElementById('userIdNumber');
        const profileAvatar = document.getElementById('profileAvatar');
        
        if (userName) userName.textContent = `Welcome, ${data.full_name}!`;
        if (userEmail) userEmail.textContent = data.email;
        if (userPhone) userPhone.textContent = data.phone || 'Not provided';
        if (userIdNumber) userIdNumber.textContent = data.id_number || 'Not provided';
        
        if (profileAvatar) {
            if (data.profile_picture_url) {
                profileAvatar.src = data.profile_picture_url;
            } else {
                profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name)}&background=1a237e&color=fff&size=100`;
            }
        }
        
        await checkKYCStatus();
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Error loading profile', 'error');
    }
}

async function checkKYCStatus() {
    if (!userData) return;
    
    const kycStatusCard = document.getElementById('kycStatusCard');
    const kycStatusBadge = document.getElementById('kycStatusBadge');
    const kycStatusMessage = document.getElementById('kycStatusMessage');
    const kycActionButtons = document.getElementById('kycActionButtons');
    const kycSubmittedInfo = document.getElementById('kycSubmittedInfo');
    const kycSubmittedDate = document.getElementById('kycSubmittedDate');
    
    if (!kycStatusCard) return;
    
    if (userData.kyc_verified === true) {
        kycStatusCard.className = 'kyc-status-card verified';
        if (kycStatusBadge) {
            kycStatusBadge.className = 'status-badge status-approved';
            kycStatusBadge.textContent = 'VERIFIED';
        }
        if (kycStatusMessage) {
            kycStatusMessage.innerHTML = `
                <p><i class="fas fa-check-circle" style="color: var(--success);"></i> 
                Your KYC has been verified! You can now apply for loans.</p>
                ${userData.kyc_verified_at ? `<p><small>Verified on: ${new Date(userData.kyc_verified_at).toLocaleDateString()}</small></p>` : ''}
            `;
        }
        if (kycActionButtons) kycActionButtons.style.display = 'none';
        if (kycSubmittedInfo) kycSubmittedInfo.style.display = 'none';
        
    } else if (userData.id_picture_url && userData.profile_picture_url) {
        kycStatusCard.className = 'kyc-status-card';
        if (kycStatusBadge) {
            kycStatusBadge.className = 'status-badge status-pending';
            kycStatusBadge.textContent = 'PENDING';
        }
        if (kycStatusMessage) {
            kycStatusMessage.innerHTML = `
                <p><i class="fas fa-clock" style="color: var(--warning);"></i> 
                Your documents have been submitted and are pending verification.</p>
                <p><small>Please wait for admin approval. This usually takes 24-48 hours.</small></p>
            `;
        }
        if (kycActionButtons) {
            kycActionButtons.innerHTML = `
                <button class="btn btn-secondary" onclick="startKYC()">
                    <i class="fas fa-edit"></i> Update Documents
                </button>
            `;
        }
        if (kycSubmittedInfo) {
            kycSubmittedInfo.style.display = 'block';
            if (kycSubmittedDate) {
                kycSubmittedDate.textContent = userData.kyc_submitted_at ? 
                    new Date(userData.kyc_submitted_at).toLocaleDateString() : 
                    'Recent';
            }
        }
        
    } else if (userData.kyc_rejection_reason) {
        kycStatusCard.className = 'kyc-status-card rejected';
        if (kycStatusBadge) {
            kycStatusBadge.className = 'status-badge status-rejected';
            kycStatusBadge.textContent = 'REJECTED';
        }
        if (kycStatusMessage) {
            kycStatusMessage.innerHTML = `
                <p><i class="fas fa-exclamation-circle" style="color: var(--danger);"></i> 
                Your KYC verification was rejected.</p>
                <p><strong>Reason:</strong> ${userData.kyc_rejection_reason}</p>
                <p><small>Please upload new documents for verification.</small></p>
            `;
        }
        if (kycActionButtons) {
            kycActionButtons.innerHTML = `
                <button class="btn btn-primary" onclick="startKYC()">
                    <i class="fas fa-upload"></i> Resubmit Documents
                </button>
            `;
        }
        if (kycSubmittedInfo) kycSubmittedInfo.style.display = 'none';
        
    } else {
        kycStatusCard.className = 'kyc-status-card';
        if (kycStatusBadge) {
            kycStatusBadge.className = 'status-badge status-pending';
            kycStatusBadge.textContent = 'NOT SUBMITTED';
        }
        if (kycStatusMessage) {
            kycStatusMessage.innerHTML = `
                <p><i class="fas fa-info-circle"></i> 
                Please complete your KYC verification to access all features.</p>
                <p><small>You need to upload your profile picture and ID document.</small></p>
            `;
        }
        if (kycActionButtons) {
            kycActionButtons.innerHTML = `
                <button class="btn btn-primary" onclick="startKYC()">
                    <i class="fas fa-upload"></i> Start KYC Verification
                </button>
            `;
        }
        if (kycSubmittedInfo) kycSubmittedInfo.style.display = 'none';
    }
}

function startKYC() {
    let kycModal = document.getElementById('kycModal');
    
    if (!kycModal) {
        kycModal = document.createElement('div');
        kycModal.id = 'kycModal';
        kycModal.className = 'modal';
        kycModal.innerHTML = `
            <div class="modal-content kyc-modal-content">
                <span class="close" onclick="closeKYCModal()">&times;</span>
                <div class="auth-header">
                    <h2><i class="fas fa-id-card"></i> KYC Verification</h2>
                    <p>Please upload your documents for verification</p>
                </div>
                <form id="kycForm" onsubmit="submitKYC(event)" enctype="multipart/form-data">
                    <div class="kyc-document-upload">
                        <div class="kyc-document-box" id="profileBox">
                            <i class="fas fa-user-circle"></i>
                            <h4>Profile Picture</h4>
                            <p>Upload a clear photo of yourself</p>
                            <input type="file" id="kycProfilePicture" accept="image/*" onchange="previewKYCDocument(this, 'profile')" required>
                            <img id="kycProfilePreview" class="kyc-document-preview" style="display:none;" alt="Profile preview">
                            <div id="profileStatus" class="kyc-document-status"></div>
                        </div>
                        <div class="kyc-document-box" id="idBox">
                            <i class="fas fa-id-card"></i>
                            <h4>ID Document</h4>
                            <p>Upload your national ID or passport</p>
                            <input type="file" id="kycIdDocument" accept="image/*" onchange="previewKYCDocument(this, 'id')" required>
                            <img id="kycIdPreview" class="kyc-document-preview" style="display:none;" alt="ID preview">
                            <div id="idStatus" class="kyc-document-status"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-sticky-note"></i> Additional Notes (Optional)</label>
                        <textarea id="kycNotes" placeholder="Any additional information..." rows="2"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" id="kycSubmitBtn">
                        <i class="fas fa-paper-plane"></i> Submit for Verification
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(kycModal);
    }
    
    if (userData.profile_picture_url) {
        const preview = document.getElementById('kycProfilePreview');
        if (preview) {
            preview.src = userData.profile_picture_url;
            preview.style.display = 'block';
            document.getElementById('profileBox')?.classList.add('has-file');
            document.getElementById('profileStatus').innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i> Uploaded';
            document.getElementById('profileStatus').className = 'kyc-document-status uploaded';
        }
    }
    
    if (userData.id_picture_url) {
        const preview = document.getElementById('kycIdPreview');
        if (preview) {
            preview.src = userData.id_picture_url;
            preview.style.display = 'block';
            document.getElementById('idBox')?.classList.add('has-file');
            document.getElementById('idStatus').innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i> Uploaded';
            document.getElementById('idStatus').className = 'kyc-document-status uploaded';
        }
    }
    
    kycModal.style.display = 'flex';
}

function closeKYCModal() {
    const modal = document.getElementById('kycModal');
    if (modal) modal.style.display = 'none';
}

function previewKYCDocument(input, type) {
    const previewId = type === 'profile' ? 'kycProfilePreview' : 'kycIdPreview';
    const statusId = type === 'profile' ? 'profileStatus' : 'idStatus';
    const boxId = type === 'profile' ? 'profileBox' : 'idBox';
    
    const preview = document.getElementById(previewId);
    const status = document.getElementById(statusId);
    const box = document.getElementById(boxId);
    
    if (input.files && input.files[0] && preview) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            if (box) box.classList.add('has-file');
            if (status) {
                status.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i> Ready to upload';
                status.className = 'kyc-document-status uploaded';
            }
        };
        reader.readAsDataURL(input.files[0]);
        
        if (type === 'profile') {
            kycProfileFile = input.files[0];
        } else if (type === 'id') {
            kycIdFile = input.files[0];
        }
    }
}

async function submitKYC(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('kycSubmitBtn');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        let profileUrl = userData.profile_picture_url;
        let idUrl = userData.id_picture_url;
        
        // Upload profile picture if provided
        if (kycProfileFile) {
            try {
                const fileExt = kycProfileFile.name.split('.').pop();
                const fileName = `${dashboardUser.id}/profile_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabaseClient.storage
                    .from('profiles')
                    .upload(fileName, kycProfileFile);
                
                if (uploadError) {
                    console.error('Profile upload error:', uploadError);
                    throw new Error('Failed to upload profile picture: ' + uploadError.message);
                }
                
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('profiles')
                    .getPublicUrl(fileName);
                profileUrl = publicUrl;
            } catch (error) {
                console.error('Profile upload error:', error);
                throw new Error('Failed to upload profile picture. Please try again.');
            }
        }
        
        // Upload ID document if provided
        if (kycIdFile) {
            try {
                const fileExt = kycIdFile.name.split('.').pop();
                const fileName = `${dashboardUser.id}/id_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabaseClient.storage
                    .from('kyc')
                    .upload(fileName, kycIdFile);
                
                if (uploadError) {
                    console.error('ID upload error:', uploadError);
                    throw new Error('Failed to upload ID document: ' + uploadError.message);
                }
                
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('kyc')
                    .getPublicUrl(fileName);
                idUrl = publicUrl;
            } catch (error) {
                console.error('ID upload error:', error);
                throw new Error('Failed to upload ID document. Please try again.');
            }
        }
        
        // Check if we have both documents
        if (!profileUrl || !idUrl) {
            throw new Error('Please upload both profile picture and ID document');
        }
        
        // Update user record
        const notes = document.getElementById('kycNotes')?.value || '';
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({
                profile_picture_url: profileUrl,
                id_picture_url: idUrl,
                kyc_submitted_at: new Date().toISOString(),
                kyc_verified: false,
                kyc_rejection_reason: null,
                admin_notes: notes || null
            })
            .eq('id', dashboardUser.id);
        
        if (updateError) throw updateError;
        
        // Reload user data
        await loadUserProfile();
        await checkKYCStatus();
        
        showToast('KYC documents submitted successfully! Pending verification.', 'success');
        closeKYCModal();
        
        // Reset file variables
        kycProfileFile = null;
        kycIdFile = null;
        
    } catch (error) {
        console.error('KYC submission error:', error);
        showToast(error.message || 'Error submitting KYC documents', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function loadDashboardStats() {
    try {
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select('*')
            .eq('user_id', dashboardUser.id);
        
        if (error) throw error;
        
        allLoans = loans || [];
        
        const activeLoans = allLoans.filter(l => l.status === 'approved' || l.status === 'disbursed' || l.status === 'repaying');
        const pendingLoans = allLoans.filter(l => l.status === 'pending');
        const totalBorrowed = allLoans.filter(l => l.status === 'disbursed' || l.status === 'repaying').reduce((sum, l) => sum + l.amount, 0);
        const outstanding = allLoans.filter(l => l.status === 'disbursed' || l.status === 'repaying' || l.status === 'approved').reduce((sum, l) => sum + l.amount, 0);
        
        const totalBorrowedEl = document.getElementById('totalBorrowed');
        const activeLoansEl = document.getElementById('activeLoans');
        const pendingLoansEl = document.getElementById('pendingLoans');
        const outstandingEl = document.getElementById('outstandingBalance');
        
        if (totalBorrowedEl) totalBorrowedEl.textContent = `KES ${totalBorrowed.toLocaleString()}`;
        if (activeLoansEl) activeLoansEl.textContent = activeLoans.length;
        if (pendingLoansEl) pendingLoansEl.textContent = pendingLoans.length;
        if (outstandingEl) outstandingEl.textContent = `KES ${outstanding.toLocaleString()}`;
        
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Error loading dashboard stats', 'error');
    }
}

async function submitLoanApplication(event) {
    event.preventDefault();
    
    if (!userData.kyc_verified) {
        showToast('Please complete KYC verification before applying for a loan', 'warning');
        startKYC();
        return;
    }
    
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const tenure = parseInt(document.getElementById('loanTenure').value);
    const purpose = document.getElementById('loanPurpose').value;
    const description = document.getElementById('loanDescription').value;
    
    if (amount < 10000) {
        showToast('Minimum loan amount is KES 10,000', 'error');
        return;
    }
    
    if (amount > 5000000) {
        showToast('Maximum loan amount is KES 5,000,000', 'error');
        return;
    }
    
    if (!purpose) {
        showToast('Please select a loan purpose', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('.btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const { data, error } = await supabaseClient
            .from('loans')
            .insert([{
                user_id: dashboardUser.id,
                amount: amount,
                purpose: purpose,
                tenure: tenure,
                application_date: new Date().toISOString(),
                status: 'pending',
                interest_rate: 5.0,
                admin_notes: description || null
            }])
            .select();
        
        if (error) throw error;
        
        showToast('Loan application submitted successfully!', 'success');
        event.target.reset();
        const loanSummary = document.getElementById('loanSummary');
        if (loanSummary) loanSummary.style.display = 'none';
        
        await loadDashboardStats();
        await loadLoanHistory();
        
    } catch (error) {
        console.error('Error submitting loan:', error);
        showToast('Error submitting loan application. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function loadLoanHistory() {
    try {
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select('*')
            .eq('user_id', dashboardUser.id)
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('loanList');
        if (!container) return;
        
        if (!loans || loans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No loan applications yet</p>
                    <p class="subtext">Apply for your first loan today!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = loans.map(loan => `
            <div class="loan-item">
                <div class="loan-header">
                    <h3>KES ${loan.amount.toLocaleString()}</h3>
                    <span class="status-badge status-${loan.status}">${loan.status.toUpperCase()}</span>
                </div>
                <div class="loan-details">
                    <p><strong>Purpose</strong> ${loan.purpose}</p>
                    <p><strong>Tenure</strong> ${loan.tenure} months</p>
                    <p><strong>Applied</strong> ${new Date(loan.application_date).toLocaleDateString()}</p>
                    ${loan.interest_rate ? `<p><strong>Interest</strong> ${loan.interest_rate}%</p>` : ''}
                    ${loan.approval_date ? `<p><strong>Approved</strong> ${new Date(loan.approval_date).toLocaleDateString()}</p>` : ''}
                    ${loan.disbursement_date ? `<p><strong>Disbursed</strong> ${new Date(loan.disbursement_date).toLocaleDateString()}</p>` : ''}
                </div>
                ${loan.status === 'approved' ? `
                    <div class="loan-actions">
                        <button class="btn btn-success" onclick="acceptLoan('${loan.id}')">
                            <i class="fas fa-check"></i> Accept Offer
                        </button>
                    </div>
                ` : ''}
                ${loan.status === 'disbursed' || loan.status === 'repaying' ? `
                    <div class="loan-actions">
                        <button class="btn btn-secondary" onclick="makePayment('${loan.id}')">
                            <i class="fas fa-money-bill-wave"></i> Make Payment
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading loan history:', error);
        showToast('Error loading loan history', 'error');
    }
}

async function acceptLoan(loanId) {
    if (!confirm('Are you sure you want to accept this loan offer?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('loans')
            .update({ 
                status: 'disbursed',
                disbursement_date: new Date().toISOString()
            })
            .eq('id', loanId);
        
        if (error) throw error;
        
        showToast('Loan accepted! Funds will be disbursed shortly.', 'success');
        await loadDashboardStats();
        await loadLoanHistory();
        
    } catch (error) {
        console.error('Error accepting loan:', error);
        showToast('Error accepting loan', 'error');
    }
}

function makePayment(loanId) {
    showToast('Payment feature coming soon! You can make payments via M-Pesa.', 'info');
}

function setupLoanCalculator() {
    const amountInput = document.getElementById('loanAmount');
    const tenureSelect = document.getElementById('loanTenure');
    
    if (amountInput && tenureSelect) {
        [amountInput, tenureSelect].forEach(input => {
            input.addEventListener('change', calculateLoanSummary);
            input.addEventListener('input', calculateLoanSummary);
        });
    }
}

function calculateLoanSummary() {
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const tenure = parseInt(document.getElementById('loanTenure').value);
    const summaryDiv = document.getElementById('loanSummary');
    
    if (amount >= 10000 && tenure) {
        const interestRate = 0.05;
        const totalInterest = amount * interestRate * (tenure / 12);
        const totalRepayment = amount + totalInterest;
        const monthlyPayment = totalRepayment / tenure;
        
        const summaryPrincipal = document.getElementById('summaryPrincipal');
        const summaryInterest = document.getElementById('summaryInterest');
        const summaryTotal = document.getElementById('summaryTotal');
        const summaryMonthly = document.getElementById('summaryMonthly');
        
        if (summaryPrincipal) summaryPrincipal.textContent = `KES ${amount.toLocaleString()}`;
        if (summaryInterest) summaryInterest.textContent = `KES ${totalInterest.toFixed(2).toLocaleString()}`;
        if (summaryTotal) summaryTotal.textContent = `KES ${totalRepayment.toFixed(2).toLocaleString()}`;
        if (summaryMonthly) summaryMonthly.textContent = `KES ${monthlyPayment.toFixed(2).toLocaleString()}`;
        
        if (summaryDiv) summaryDiv.style.display = 'block';
    } else {
        if (summaryDiv) summaryDiv.style.display = 'none';
    }
}

function editProfile() {
    const modal = document.getElementById('editProfileModal');
    const editFullName = document.getElementById('editFullName');
    const editPhone = document.getElementById('editPhone');
    const editOccupation = document.getElementById('editOccupation');
    const editMonthlyIncome = document.getElementById('editMonthlyIncome');
    
    if (editFullName) editFullName.value = userData.full_name || '';
    if (editPhone) editPhone.value = userData.phone || '';
    if (editOccupation) editOccupation.value = userData.occupation || '';
    if (editMonthlyIncome) editMonthlyIncome.value = userData.monthly_income || '';
    
    if (modal) modal.style.display = 'flex';
}

function closeEditProfile() {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
}

async function updateProfile(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('editFullName')?.value?.trim();
    const phone = document.getElementById('editPhone')?.value?.trim();
    const occupation = document.getElementById('editOccupation')?.value?.trim();
    const monthlyIncome = document.getElementById('editMonthlyIncome')?.value;
    
    if (!fullName || !phone) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({
                full_name: fullName,
                phone: phone,
                occupation: occupation || null,
                monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null
            })
            .eq('id', dashboardUser.id);
        
        if (error) throw error;
        
        showToast('Profile updated successfully!', 'success');
        closeEditProfile();
        await loadUserProfile();
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'error');
    }
}

function refreshLoans() {
    loadLoanHistory();
    loadDashboardStats();
    showToast('Refreshed!', 'success');
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

window.onclick = function(event) {
    const modal = document.getElementById('editProfileModal');
    if (event.target === modal) {
        closeEditProfile();
    }
    const kycModal = document.getElementById('kycModal');
    if (event.target === kycModal) {
        closeKYCModal();
    }
};

// Make functions globally accessible
window.startKYC = startKYC;
window.closeKYCModal = closeKYCModal;
window.previewKYCDocument = previewKYCDocument;
window.submitKYC = submitKYC;
window.submitLoanApplication = submitLoanApplication;
window.acceptLoan = acceptLoan;
window.makePayment = makePayment;
window.editProfile = editProfile;
window.closeEditProfile = closeEditProfile;
window.updateProfile = updateProfile;
window.refreshLoans = refreshLoans;
window.showToast = showToast;
