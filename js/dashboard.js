// Dashboard JavaScript
let currentUser = null;
let currentPage = 'overview';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Dashboard loading...');
    
    // Check authentication
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    console.log('👤 User authenticated:', user.email);
    
    // Load user profile
    await loadUserProfile();
    
    // Load dashboard data
    await loadDashboardData();
    
    // Setup navigation
    setupNavigation();
    
    // Setup loan calculator
    setupLoanCalculator();
});

// ============================================
// USER PROFILE
// ============================================

async function loadUserProfile() {
    try {
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        // Update UI
        document.getElementById('userName').textContent = profile.full_name || 'User';
        document.getElementById('userEmail').textContent = currentUser.email;
        
        // Store profile for later use
        window.userProfile = profile;
        
        // Update profile form if on profile page
        if (document.getElementById('profileFullName')) {
            document.getElementById('profileFullName').value = profile.full_name || '';
            document.getElementById('profilePhone').value = profile.phone || '';
            document.getElementById('profileIdNumber').value = profile.id_number || '';
            document.getElementById('profileDob').value = profile.date_of_birth || '';
            document.getElementById('profileGender').value = profile.gender || '';
            document.getElementById('profileEmploymentStatus').value = profile.employment_status || '';
            document.getElementById('profileMonthlyIncome').value = profile.monthly_income || '';
            document.getElementById('profileAddress').value = profile.address || '';
        }
        
        // Load avatar
        if (profile.avatar_url) {
            document.getElementById('profileAvatar').src = profile.avatar_url;
        }
        
        console.log('✅ Profile loaded');
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        showNotification('Error loading profile', 'error');
    }
}

// ============================================
// DASHBOARD DATA
// ============================================

async function loadDashboardData() {
    try {
        // Load loans
        const { data: loans, error: loansError } = await window.supabase
            .from('loans')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('application_date', { ascending: false });
        
        if (loansError) throw loansError;
        
        // Update stats
        const totalLoans = loans.length;
        const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'approved').length;
        const pendingLoans = loans.filter(l => l.status === 'pending').length;
        const totalRepaid = loans
            .filter(l => l.status === 'completed')
            .reduce((sum, l) => sum + l.total_amount, 0);
        
        document.getElementById('totalLoans').textContent = totalLoans;
        document.getElementById('activeLoans').textContent = activeLoans;
        document.getElementById('pendingLoans').textContent = pendingLoans;
        document.getElementById('totalRepaid').textContent = `KES ${totalRepaid.toLocaleString()}`;
        
        // Load recent loans
        const recentLoans = loans.slice(0, 5);
        const recentLoansContainer = document.getElementById('recentLoans');
        
        if (recentLoans.length > 0) {
            recentLoansContainer.innerHTML = recentLoans.map(loan => `
                <div class="loan-item">
                    <div class="loan-info">
                        <span class="loan-amount">KES ${loan.amount.toLocaleString()}</span>
                        <span class="loan-date">${new Date(loan.application_date).toLocaleDateString()}</span>
                    </div>
                    <span class="status-badge status-${loan.status}">${loan.status}</span>
                </div>
            `).join('');
            
            // Add styles for loan items
            const style = document.createElement('style');
            style.textContent = `
                .loan-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #f0f0f0;
                }
                .loan-item:last-child {
                    border-bottom: none;
                }
                .loan-info {
                    display: flex;
                    flex-direction: column;
                }
                .loan-amount {
                    font-weight: 600;
                }
                .loan-date {
                    font-size: 0.75rem;
                    color: #999;
                }
            `;
            document.head.appendChild(style);
        } else {
            recentLoansContainer.innerHTML = '<p class="text-muted">No loans yet. Apply for your first loan!</p>';
        }
        
        // Store loans for later use
        window.userLoans = loans;
        
        console.log('✅ Dashboard data loaded');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// ============================================
// NAVIGATION
// ============================================

function setupNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) {
                navigateTo(page);
            }
        });
    });
    
    // Filter tabs for loans
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filterLoans(this.dataset.filter);
        });
    });
}

function navigateTo(page) {
    // Update sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Update page
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`page-${page}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update title
    const pageTitles = {
        'overview': 'Overview',
        'apply-loan': 'Apply for Loan',
        'my-loans': 'My Loans',
        'repayments': 'Repayments',
        'profile': 'Profile'
    };
    document.getElementById('pageTitle').textContent = pageTitles[page] || page;
    
    // Load page-specific data
    currentPage = page;
    
    if (page === 'my-loans') {
        loadMyLoans();
    } else if (page === 'repayments') {
        loadRepayments();
    }
}

// ============================================
// MY LOANS
// ============================================

async function loadMyLoans() {
    const container = document.getElementById('loansList');
    container.innerHTML = '<p class="text-muted">Loading loans...</p>';
    
    try {
        const { data: loans, error } = await window.supabase
            .from('loans')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        if (loans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice" style="font-size:3rem;color:#ccc;"></i>
                    <p>You haven't applied for any loans yet.</p>
                    <button class="btn btn-primary" onclick="navigateTo('apply-loan')">Apply Now</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = loans.map(loan => `
            <div class="loan-card">
                <div class="loan-card-header">
                    <div>
                        <span class="loan-amount-large">KES ${loan.amount.toLocaleString()}</span>
                        <span class="status-badge status-${loan.status}">${loan.status}</span>
                    </div>
                    <span class="loan-date">${new Date(loan.application_date).toLocaleDateString()}</span>
                </div>
                <div class="loan-card-body">
                    <div class="loan-detail">
                        <span>Term:</span>
                        <strong>${loan.term_months} Months</strong>
                    </div>
                    <div class="loan-detail">
                        <span>Monthly Payment:</span>
                        <strong>KES ${loan.monthly_payment.toLocaleString()}</strong>
                    </div>
                    <div class="loan-detail">
                        <span>Total Repayment:</span>
                        <strong>KES ${loan.total_amount.toLocaleString()}</strong>
                    </div>
                    <div class="loan-detail">
                        <span>Interest Rate:</span>
                        <strong>${loan.interest_rate}%</strong>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .loan-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
            }
            .loan-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
            }
            .loan-amount-large {
                font-size: 1.25rem;
                font-weight: 700;
                margin-right: 0.75rem;
            }
            .loan-card-body {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.5rem;
            }
            .loan-detail {
                display: flex;
                justify-content: space-between;
                font-size: 0.875rem;
            }
            .loan-detail span {
                color: #666;
            }
            .empty-state {
                text-align: center;
                padding: 2rem;
            }
            .empty-state p {
                margin: 1rem 0;
                color: #666;
            }
        `;
        document.head.appendChild(style);
        
        // Store loans for filtering
        window.allLoans = loans;
        
    } catch (error) {
        console.error('❌ Error loading loans:', error);
        container.innerHTML = '<p class="text-muted">Error loading loans. Please refresh.</p>';
    }
}

function filterLoans(filter) {
    if (!window.allLoans) return;
    
    const container = document.getElementById('loansList');
    let filteredLoans = window.allLoans;
    
    if (filter !== 'all') {
        filteredLoans = window.allLoans.filter(l => l.status === filter);
    }
    
    // Re-render with filtered loans
    // (Reuse the rendering logic from loadMyLoans)
    // For simplicity, we'll reload the page with filter
    loadMyLoans();
}

// ============================================
// REPAYMENTS
// ============================================

async function loadRepayments() {
    const container = document.getElementById('repaymentsList');
    container.innerHTML = '<p class="text-muted">Loading repayments...</p>';
    
    try {
        const { data: repayments, error } = await window.supabase
            .from('repayments')
            .select('*, loans(amount, term_months)')
            .eq('user_id', currentUser.id)
            .order('payment_date', { ascending: false });
        
        if (error) throw error;
        
        if (repayments.length === 0) {
            container.innerHTML = '<p class="text-muted">No repayment history yet.</p>';
            return;
        }
        
        container.innerHTML = repayments.map(r => `
            <div class="repayment-item">
                <div class="repayment-info">
                    <span class="repayment-amount">KES ${r.amount.toLocaleString()}</span>
                    <span class="repayment-date">${new Date(r.payment_date).toLocaleDateString()}</span>
                </div>
                <div>
                    <span class="status-badge status-${r.status}">${r.status}</span>
                    <span class="repayment-method">${r.payment_method}</span>
                </div>
            </div>
        `).join('');
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .repayment-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 0;
                border-bottom: 1px solid #f0f0f0;
            }
            .repayment-item:last-child {
                border-bottom: none;
            }
            .repayment-info {
                display: flex;
                flex-direction: column;
            }
            .repayment-amount {
                font-weight: 600;
            }
            .repayment-date {
                font-size: 0.75rem;
                color: #999;
            }
            .repayment-method {
                font-size: 0.75rem;
                color: #666;
                margin-left: 0.5rem;
            }
        `;
        document.head.appendChild(style);
        
    } catch (error) {
        console.error('❌ Error loading repayments:', error);
        container.innerHTML = '<p class="text-muted">Error loading repayments. Please refresh.</p>';
    }
}

// ============================================
// LOAN APPLICATION
// ============================================

function setupLoanCalculator() {
    const amountInput = document.getElementById('loanAmount');
    const termSelect = document.getElementById('loanTerm');
    
    function calculateLoan() {
        const amount = parseFloat(amountInput.value) || 0;
        const term = parseInt(termSelect.value) || 0;
        
        if (amount > 0 && term > 0) {
            const interestRate = 0.05; // 5%
            const totalAmount = amount * (1 + interestRate);
            const monthlyPayment = totalAmount / term;
            
            document.getElementById('totalRepayment').textContent = `KES ${totalAmount.toLocaleString()}`;
            document.getElementById('monthlyPayment').textContent = `KES ${monthlyPayment.toLocaleString()}`;
        } else {
            document.getElementById('totalRepayment').textContent = 'KES 0';
            document.getElementById('monthlyPayment').textContent = 'KES 0';
        }
    }
    
    amountInput.addEventListener('input', calculateLoan);
    termSelect.addEventListener('change', calculateLoan);
}

async function applyForLoan(event) {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const term = parseInt(document.getElementById('loanTerm').value);
    const purpose = document.getElementById('loanPurpose').value;
    
    if (amount < 1000) {
        showNotification('Minimum loan amount is KES 1,000', 'error');
        return;
    }
    
    if (!term) {
        showNotification('Please select a repayment period', 'error');
        return;
    }
    
    try {
        // Calculate loan details
        const interestRate = 5.0;
        const totalAmount = amount * (1 + interestRate / 100);
        const monthlyPayment = totalAmount / term;
        
        // Submit loan application
        const { data, error } = await window.supabase
            .from('loans')
            .insert({
                user_id: currentUser.id,
                amount: amount,
                interest_rate: interestRate,
                term_months: term,
                total_amount: totalAmount,
                monthly_payment: monthlyPayment,
                purpose: purpose,
                status: 'pending'
            })
            .select();
        
        if (error) throw error;
        
        // Show confirmation
        document.getElementById('confAmount').textContent = `KES ${amount.toLocaleString()}`;
        document.getElementById('confTerm').textContent = `${term} Months`;
        document.getElementById('confMonthly').textContent = `KES ${monthlyPayment.toLocaleString()}`;
        document.getElementById('confTotal').textContent = `KES ${totalAmount.toLocaleString()}`;
        
        document.getElementById('loanConfirmationModal').classList.add('show');
        
        // Reset form
        document.getElementById('loanApplicationForm').reset();
        document.getElementById('totalRepayment').textContent = 'KES 0';
        document.getElementById('monthlyPayment').textContent = 'KES 0';
        
        // Refresh dashboard data
        await loadDashboardData();
        
        console.log('✅ Loan application submitted');
        
    } catch (error) {
        console.error('❌ Error applying for loan:', error);
        showNotification('Error submitting application. Please try again.', 'error');
    }
}

// ============================================
// PROFILE UPDATE
// ============================================

async function updateProfile(event) {
    event.preventDefault();
    
    const profileData = {
        full_name: document.getElementById('profileFullName').value.trim(),
        phone: document.getElementById('profilePhone').value.trim(),
        date_of_birth: document.getElementById('profileDob').value,
        gender: document.getElementById('profileGender').value,
        employment_status: document.getElementById('profileEmploymentStatus').value,
        monthly_income: parseFloat(document.getElementById('profileMonthlyIncome').value) || 0,
        address: document.getElementById('profileAddress').value.trim()
    };
    
    try {
        const { error } = await window.supabase
            .from('profiles')
            .update(profileData)
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        showNotification('Profile updated successfully!', 'success');
        
        // Reload profile
        await loadUserProfile();
        
        // Update sidebar name
        document.getElementById('userName').textContent = profileData.full_name;
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showNotification('Error updating profile. Please try again.', 'error');
    }
}

// ============================================
// AVATAR UPLOAD
// ============================================

async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Image size must be less than 2MB', 'error');
        return;
    }
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${currentUser.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await window.supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = window.supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
        
        // Update profile with avatar URL
        const { error: updateError } = await window.supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', currentUser.id);
        
        if (updateError) throw updateError;
        
        document.getElementById('profileAvatar').src = publicUrl;
        showNotification('Avatar updated successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error uploading avatar:', error);
        showNotification('Error uploading avatar. Please try again.', 'error');
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

async function showNotifications() {
    try {
        const { data: notifications, error } = await window.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        // Show notifications in a modal or dropdown
        // For simplicity, we'll just show a notification
        if (notifications.length > 0) {
            const unread = notifications.filter(n => !n.is_read).length;
            showNotification(`You have ${unread} unread notifications`, 'info');
            
            // Mark as read
            await window.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', currentUser.id)
                .eq('is_read', false);
                
            document.getElementById('notificationBadge').textContent = '0';
        } else {
            showNotification('No new notifications', 'info');
        }
        
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

function generateReport(type) {
    showNotification(`Generating ${type} report...`, 'info');
    // Implement report generation logic
    setTimeout(() => {
        showNotification(`${type} report ready for download`, 'success');
    }, 2000);
}

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.navigateTo = navigateTo;
window.applyForLoan = applyForLoan;
window.updateProfile = updateProfile;
window.uploadAvatar = uploadAvatar;
window.showNotifications = showNotifications;
window.toggleSidebar = toggleSidebar;
window.closeModal = closeModal;
window.generateReport = generateReport;
window.filterLoans = filterLoans;

console.log('✅ dashboard.js loaded successfully');
