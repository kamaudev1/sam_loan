// js/dashboard.js
let dashboardUser = null;
let userData = null;
let allLoans = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkUserAuth();
    await loadUserProfile();
    await loadDashboardStats();
    await loadLoanHistory();
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
        
        // Check if admin
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
        
        // Update profile UI
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userPhone = document.getElementById('userPhone');
        const userIdNumber = document.getElementById('userIdNumber');
        const profileAvatar = document.getElementById('profileAvatar');
        const kycStatus = document.getElementById('kycStatus');
        
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
        
        if (kycStatus) {
            if (data.kyc_verified) {
                kycStatus.className = 'profile-status verified';
                kycStatus.innerHTML = '<i class="fas fa-check-circle"></i> KYC Verified';
            } else {
                kycStatus.className = 'profile-status';
                kycStatus.innerHTML = '<i class="fas fa-clock"></i> KYC Pending';
            }
        }
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Error loading profile', 'error');
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
    
    if (!userData.kyc_verified) {
        showToast('Please complete KYC verification before applying', 'warning');
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

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('editProfileModal');
    if (event.target === modal) {
        closeEditProfile();
    }
};

// Make functions globally accessible
window.submitLoanApplication = submitLoanApplication;
window.acceptLoan = acceptLoan;
window.makePayment = makePayment;
window.editProfile = editProfile;
window.closeEditProfile = closeEditProfile;
window.updateProfile = updateProfile;
window.refreshLoans = refreshLoans;
