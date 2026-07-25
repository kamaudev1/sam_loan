// js/admin.js - Complete Working Version
let currentTab = 'pending';
let adminUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAdminAuth();
        await loadAdminStats();
        await loadPendingLoans();
    } catch (error) {
        console.error('Admin initialization error:', error);
        showToast('Error loading admin panel', 'error');
    }
});

// ============ AUTHENTICATION ============
async function checkAdminAuth() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        adminUser = user;
        
        // Check if user is admin
        const { data: userData, error } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error('Error checking admin status:', error);
            showToast('Error verifying admin status', 'error');
            window.location.href = 'dashboard.html';
            return;
        }
        
        if (userData?.role !== 'admin') {
            showToast('Access denied. Admin only.', 'error');
            window.location.href = 'dashboard.html';
            return;
        }
    } catch (error) {
        console.error('Admin auth error:', error);
        window.location.href = 'index.html';
    }
}

// ============ ADMIN STATS ============
async function loadAdminStats() {
    try {
        // Get pending count
        const { count: pendingCount, error: pendingError } = await supabaseClient
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        if (pendingError) throw pendingError;
        
        // Get total users
        const { count: userCount, error: userError } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (userError) throw userError;
        
        // Get KYC verified users
        const { count: kycCount, error: kycError } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('kyc_verified', true);
        
        if (kycError) throw kycError;
        
        // Get total disbursed
        const { data: disbursedLoans, error: disbursedError } = await supabaseClient
            .from('loans')
            .select('amount')
            .in('status', ['disbursed', 'repaying', 'completed']);
        
        if (disbursedError) throw disbursedError;
        
        const totalDisbursed = disbursedLoans?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0;
        
        // Update UI
        const pendingCountEl = document.getElementById('pendingCount');
        const totalUsersEl = document.getElementById('totalUsers');
        const totalDisbursedEl = document.getElementById('totalDisbursed');
        const kycVerifiedEl = document.getElementById('kycVerified');
        
        if (pendingCountEl) pendingCountEl.textContent = pendingCount || 0;
        if (totalUsersEl) totalUsersEl.textContent = userCount || 0;
        if (totalDisbursedEl) totalDisbursedEl.textContent = `KES ${totalDisbursed.toLocaleString()}`;
        if (kycVerifiedEl) kycVerifiedEl.textContent = kycCount || 0;
        
    } catch (error) {
        console.error('Error loading admin stats:', error);
        showToast('Error loading stats', 'error');
    }
}

// ============ TAB SWITCHING ============
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    const targetContent = document.getElementById(tab);
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
    }
    
    // Load data based on tab
    switch(tab) {
        case 'pending':
            loadPendingLoans();
            break;
        case 'approved':
            loadApprovedLoans();
            break;
        case 'disbursed':
            loadDisbursedLoans();
            break;
        case 'rejected':
            loadRejectedLoans();
            break;
        case 'users':
            loadUsers();
            break;
        case 'kyc':
            loadKYCVerifications();
            break;
    }
}

// ============ PENDING LOANS ============
async function loadPendingLoans() {
    try {
        console.log('Loading pending loans...');
        
        // Get all pending loans with user data using a single query
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select(`
                *,
                users:user_id (
                    full_name,
                    email,
                    phone,
                    id_number,
                    profile_picture_url
                )
            `)
            .eq('status', 'pending')
            .order('application_date', { ascending: false });
        
        if (error) {
            console.error('Error fetching pending loans:', error);
            throw error;
        }
        
        console.log('Pending loans data:', loans);
        
        const container = document.getElementById('pendingLoansList');
        const countDisplay = document.getElementById('pendingCountDisplay');
        
        if (countDisplay) {
            countDisplay.textContent = `${loans?.length || 0} applications`;
        }
        
        if (!container) {
            console.error('Container pendingLoansList not found');
            return;
        }
        
        if (!loans || loans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>No pending applications</p>
                    <p class="subtext">All caught up!</p>
                </div>
            `;
            return;
        }
        
        // Generate HTML for each loan
        let html = '';
        loans.forEach(loan => {
            const user = loan.users || {};
            html += `
            <div class="loan-card">
                <div class="loan-card-header">
                    <div>
                        <h3>${user.full_name || 'Unknown User'}</h3>
                        <div class="user-info">
                            <span>${user.email || 'No email'}</span>
                            <span>•</span>
                            <span>ID: ${user.id_number || 'N/A'}</span>
                        </div>
                    </div>
                    <span class="status-badge status-pending">PENDING</span>
                </div>
                <div class="loan-card-details">
                    <p>
                        <strong>Amount</strong>
                        KES ${loan.amount ? loan.amount.toLocaleString() : '0'}
                    </p>
                    <p>
                        <strong>Purpose</strong>
                        ${loan.purpose || 'N/A'}
                    </p>
                    <p>
                        <strong>Tenure</strong>
                        ${loan.tenure || 0} months
                    </p>
                    <p>
                        <strong>Applied</strong>
                        ${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}
                    </p>
                    <p>
                        <strong>Phone</strong>
                        ${user.phone || 'N/A'}
                    </p>
                </div>
                <div class="loan-card-actions">
                    <button class="btn-approve" onclick="openActionModal('${loan.id}', 'approve')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="openActionModal('${loan.id}', 'reject')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
        });
        
        container.innerHTML = html;
        console.log('Pending loans rendered successfully');
        
    } catch (error) {
        console.error('Error loading pending loans:', error);
        const container = document.getElementById('pendingLoansList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                    <p>Error loading pending loans</p>
                    <p class="subtext">${error.message}</p>
                </div>
            `;
        }
        showToast('Error loading pending loans: ' + error.message, 'error');
    }
}

// ============ APPROVED LOANS ============
async function loadApprovedLoans() {
    await loadLoansByStatus('approved', 'approvedLoansList', 'approvedCountDisplay');
}

// ============ DISBURSED LOANS ============
async function loadDisbursedLoans() {
    await loadLoansByStatus('disbursed', 'disbursedLoansList', 'disbursedCountDisplay');
}

// ============ REJECTED LOANS ============
async function loadRejectedLoans() {
    await loadLoansByStatus('rejected', 'rejectedLoansList', 'rejectedCountDisplay');
}

// ============ LOANS BY STATUS ============
async function loadLoansByStatus(status, containerId, countId) {
    try {
        console.log(`Loading ${status} loans...`);
        
        // Get loans with user data using a single query
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select(`
                *,
                users:user_id (
                    full_name,
                    email,
                    phone,
                    id_number,
                    profile_picture_url
                )
            `)
            .eq('status', status)
            .order('application_date', { ascending: false });
        
        if (error) {
            console.error(`Error fetching ${status} loans:`, error);
            throw error;
        }
        
        console.log(`${status} loans data:`, loans);
        
        const container = document.getElementById(containerId);
        const countDisplay = document.getElementById(countId);
        
        if (countDisplay) {
            countDisplay.textContent = `${loans?.length || 0} applications`;
        }
        
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        if (!loans || loans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No ${status} loans</p>
                </div>
            `;
            return;
        }
        
        const statusClass = status === 'approved' ? 'approved' : 
                           status === 'disbursed' ? 'disbursed' : 
                           status === 'rejected' ? 'rejected' : 'pending';
        
        // Generate HTML for each loan
        let html = '';
        loans.forEach(loan => {
            const user = loan.users || {};
            html += `
            <div class="loan-card">
                <div class="loan-card-header">
                    <div>
                        <h3>${user.full_name || 'Unknown User'}</h3>
                        <div class="user-info">
                            <span>${user.email || 'No email'}</span>
                            <span>•</span>
                            <span>ID: ${user.id_number || 'N/A'}</span>
                        </div>
                    </div>
                    <span class="status-badge status-${statusClass}">${status.toUpperCase()}</span>
                </div>
                <div class="loan-card-details">
                    <p>
                        <strong>Amount</strong>
                        KES ${loan.amount ? loan.amount.toLocaleString() : '0'}
                    </p>
                    <p>
                        <strong>Purpose</strong>
                        ${loan.purpose || 'N/A'}
                    </p>
                    <p>
                        <strong>Tenure</strong>
                        ${loan.tenure || 0} months
                    </p>
                    <p>
                        <strong>Applied</strong>
                        ${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}
                    </p>
                    ${loan.approval_date ? `
                        <p>
                            <strong>Approved</strong>
                            ${new Date(loan.approval_date).toLocaleDateString()}
                        </p>
                    ` : ''}
                    ${loan.disbursement_date ? `
                        <p>
                            <strong>Disbursed</strong>
                            ${new Date(loan.disbursement_date).toLocaleDateString()}
                        </p>
                    ` : ''}
                </div>
                <div class="loan-card-actions">
                    ${status === 'pending' ? `
                        <button class="btn-approve" onclick="openActionModal('${loan.id}', 'approve')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn-reject" onclick="openActionModal('${loan.id}', 'reject')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ''}
                    ${status === 'approved' ? `
                        <button class="btn-disburse" onclick="openActionModal('${loan.id}', 'disburse')">
                            <i class="fas fa-hand-holding-usd"></i> Disburse
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        });
        
        container.innerHTML = html;
        console.log(`${status} loans rendered successfully`);
        
    } catch (error) {
        console.error(`Error loading ${status} loans:`, error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                    <p>Error loading ${status} loans</p>
                    <p class="subtext">${error.message}</p>
                </div>
            `;
        }
        showToast(`Error loading ${status} loans: ${error.message}`, 'error');
    }
}

// ============ USERS LIST ============
async function loadUsers() {
    try {
        console.log('Loading users...');
        
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
        
        console.log(`Found ${users?.length || 0} users`);
        
        const container = document.getElementById('usersList');
        if (!container) {
            console.error('Container usersList not found');
            return;
        }
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No users found</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        users.forEach(user => {
            const displayName = user.full_name || 'Unknown';
            html += `
            <div class="user-item">
                <div class="user-info">
                    <img src="${user.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a237e&color=fff&size=50`}" 
                         alt="${displayName}" 
                         class="user-avatar"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a237e&color=fff&size=50'">
                    <div class="user-details">
                        <strong>${displayName}</strong>
                        <span>${user.email || 'No email'}</span>
                        <span>•</span>
                        <span>ID: ${user.id_number || 'N/A'}</span>
                        ${user.phone ? `<span>•</span><span>${user.phone}</span>` : ''}
                    </div>
                </div>
                <div class="user-meta">
                    <span class="role-badge role-${user.role || 'user'}">${(user.role || 'user').toUpperCase()}</span>
                    ${user.kyc_verified ? 
                        '<span class="status-badge status-approved"><i class="fas fa-check"></i> KYC Verified</span>' :
                        '<span class="status-badge status-pending"><i class="fas fa-clock"></i> KYC Pending</span>'
                    }
                    <small>Joined: ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</small>
                </div>
            </div>
        `;
        });
        
        container.innerHTML = html;
        console.log('Users rendered successfully');
        
    } catch (error) {
        console.error('Error loading users:', error);
        const container = document.getElementById('usersList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                    <p>Error loading users</p>
                    <p class="subtext">${error.message}</p>
                </div>
            `;
        }
        showToast('Error loading users: ' + error.message, 'error');
    }
}

// ============ KYC VERIFICATIONS ============
async function loadKYCVerifications() {
    try {
        console.log('Loading KYC verifications...');
        
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('kyc_verified', false)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching KYC users:', error);
            throw error;
        }
        
        const pendingKYC = users?.filter(u => u.id_picture_url) || [];
        console.log(`Found ${pendingKYC.length} KYC pending users`);
        
        const container = document.getElementById('kycList');
        const countDisplay = document.getElementById('kycCountDisplay');
        
        if (countDisplay) {
            countDisplay.textContent = `${pendingKYC.length} pending`;
        }
        
        if (!container) {
            console.error('Container kycList not found');
            return;
        }
        
        if (pendingKYC.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>No pending KYC verifications</p>
                    <p class="subtext">All users are verified!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        pendingKYC.forEach(user => {
            html += `
            <div class="kyc-item">
                <div class="kyc-header">
                    <div>
                        <h3>${user.full_name || 'Unknown'}</h3>
                        <p>${user.email || 'No email'} • ${user.phone || 'No phone'}</p>
                        <p>ID Number: ${user.id_number || 'N/A'}</p>
                    </div>
                    <span class="status-badge status-pending">PENDING</span>
                </div>
                <div class="kyc-documents">
                    ${user.profile_picture_url ? `
                        <div>
                            <p><strong>Profile Picture</strong></p>
                            <img src="${user.profile_picture_url}" alt="Profile" 
                                 onclick="window.open('${user.profile_picture_url}', '_blank')"
                                 onerror="this.style.display='none'">
                        </div>
                    ` : '<div><p><strong>Profile Picture</strong></p><p class="text-muted">Not uploaded</p></div>'}
                    ${user.id_picture_url ? `
                        <div>
                            <p><strong>ID Document</strong></p>
                            <img src="${user.id_picture_url}" alt="ID" 
                                 onclick="window.open('${user.id_picture_url}', '_blank')"
                                 onerror="this.style.display='none'">
                        </div>
                    ` : '<div><p><strong>ID Document</strong></p><p class="text-muted">Not uploaded</p></div>'}
                </div>
                <div class="loan-card-actions">
                    <button class="btn-verify" onclick="verifyKYC('${user.id}')">
                        <i class="fas fa-check-circle"></i> Verify KYC
                    </button>
                    <button class="btn-reject" onclick="rejectKYC('${user.id}')">
                        <i class="fas fa-times-circle"></i> Reject
                    </button>
                </div>
            </div>
        `;
        });
        
        container.innerHTML = html;
        console.log('KYC verifications rendered successfully');
        
    } catch (error) {
        console.error('Error loading KYC verifications:', error);
        const container = document.getElementById('kycList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                    <p>Error loading KYC verifications</p>
                    <p class="subtext">${error.message}</p>
                </div>
            `;
        }
        showToast('Error loading KYC verifications: ' + error.message, 'error');
    }
}

// ============ KYC ACTIONS ============
async function verifyKYC(userId) {
    if (!confirm('Are you sure you want to verify this user\'s KYC?')) return;
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const { error } = await supabaseClient
            .from('users')
            .update({ 
                kyc_verified: true,
                kyc_verified_at: new Date().toISOString(),
                kyc_verified_by: user.id,
                kyc_rejection_reason: null
            })
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('KYC verified successfully!', 'success');
        await loadKYCVerifications();
        await loadAdminStats();
        
    } catch (error) {
        console.error('Error verifying KYC:', error);
        showToast('Error verifying KYC: ' + error.message, 'error');
    }
}

async function rejectKYC(userId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    
    if (!reason.trim()) {
        showToast('Please provide a reason for rejection', 'error');
        return;
    }
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const { error } = await supabaseClient
            .from('users')
            .update({ 
                kyc_rejection_reason: reason,
                kyc_verified_by: user.id,
                kyc_verified_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('KYC rejected', 'info');
        await loadKYCVerifications();
        await loadAdminStats();
        
    } catch (error) {
        console.error('Error rejecting KYC:', error);
        showToast('Error rejecting KYC: ' + error.message, 'error');
    }
}

// ============ ACTION MODAL ============
function openActionModal(loanId, action) {
    const modal = document.getElementById('actionModal');
    const title = document.getElementById('actionModalTitle');
    const fields = document.getElementById('actionFields');
    const submitBtn = document.getElementById('actionSubmitBtn');
    
    if (!modal || !title || !fields || !submitBtn) {
        console.error('Modal elements not found');
        return;
    }
    
    document.getElementById('actionLoanId').value = loanId;
    document.getElementById('actionType').value = action;
    
    switch(action) {
        case 'approve':
            title.textContent = 'Approve Loan Application';
            fields.innerHTML = `
                <div class="form-group">
                    <label><i class="fas fa-percent"></i> Interest Rate (%)</label>
                    <input type="number" id="interestRate" value="5.0" step="0.5" min="0" max="20">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-sticky-note"></i> Admin Notes</label>
                    <textarea id="adminNotes" placeholder="Add any notes about this approval..." rows="3"></textarea>
                </div>
            `;
            submitBtn.textContent = 'Approve Loan';
            break;
        case 'reject':
            title.textContent = 'Reject Loan Application';
            fields.innerHTML = `
                <div class="form-group">
                    <label><i class="fas fa-exclamation-circle"></i> Reason for Rejection</label>
                    <textarea id="rejectionReason" placeholder="Provide reason for rejection..." required rows="3"></textarea>
                </div>
            `;
            submitBtn.textContent = 'Reject Loan';
            break;
        case 'disburse':
            title.textContent = 'Disburse Loan';
            fields.innerHTML = `
                <div class="form-group">
                    <label><i class="fas fa-calendar-day"></i> Disbursement Date</label>
                    <input type="date" id="disbursementDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-calendar-check"></i> Expected Repayment Date</label>
                    <input type="date" id="repaymentDate" value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-sticky-note"></i> Admin Notes</label>
                    <textarea id="adminNotes" placeholder="Add any notes about this disbursement..." rows="3"></textarea>
                </div>
            `;
            submitBtn.textContent = 'Disburse Loan';
            break;
    }
    
    modal.style.display = 'flex';
}

function closeActionModal() {
    const modal = document.getElementById('actionModal');
    if (modal) modal.style.display = 'none';
}

async function handleLoanAction(event) {
    event.preventDefault();
    
    const loanId = document.getElementById('actionLoanId').value;
    const action = document.getElementById('actionType').value;
    const submitBtn = document.getElementById('actionSubmitBtn');
    const originalText = submitBtn.textContent;
    
    if (!loanId || !action) {
        showToast('Missing loan information', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        let updateData = {};
        
        switch(action) {
            case 'approve':
                const interestRate = document.getElementById('interestRate')?.value || 5.0;
                const notes = document.getElementById('adminNotes')?.value || '';
                updateData = {
                    status: 'approved',
                    approval_date: new Date().toISOString(),
                    interest_rate: parseFloat(interestRate),
                    admin_notes: notes || null
                };
                break;
            case 'reject':
                const reason = document.getElementById('rejectionReason')?.value;
                if (!reason || !reason.trim()) {
                    throw new Error('Please provide a reason for rejection');
                }
                updateData = {
                    status: 'rejected',
                    admin_notes: reason
                };
                break;
            case 'disburse':
                const disbursementDate = document.getElementById('disbursementDate')?.value;
                const repaymentDate = document.getElementById('repaymentDate')?.value;
                const disburseNotes = document.getElementById('adminNotes')?.value || '';
                updateData = {
                    status: 'disbursed',
                    disbursement_date: disbursementDate ? new Date(disbursementDate).toISOString() : new Date().toISOString(),
                    repayment_date: repaymentDate ? new Date(repaymentDate).toISOString() : null,
                    admin_notes: disburseNotes || null
                };
                break;
            default:
                throw new Error('Unknown action: ' + action);
        }
        
        const { error } = await supabaseClient
            .from('loans')
            .update(updateData)
            .eq('id', loanId);
        
        if (error) throw error;
        
        showToast(`Loan ${action}ed successfully!`, 'success');
        closeActionModal();
        
        // Refresh current tab
        switchTab(currentTab);
        await loadAdminStats();
        
    } catch (error) {
        console.error('Error performing action:', error);
        showToast(error.message || `Error ${action}ing loan`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// ============ TOAST NOTIFICATION ============
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

// ============ CLOSE MODAL ON OUTSIDE CLICK ============
window.onclick = function(event) {
    const actionModal = document.getElementById('actionModal');
    if (event.target === actionModal) {
        closeActionModal();
    }
};

// ============ EXPOSE FUNCTIONS GLOBALLY ============
window.switchTab = switchTab;
window.openActionModal = openActionModal;
window.closeActionModal = closeActionModal;
window.handleLoanAction = handleLoanAction;
window.verifyKYC = verifyKYC;
window.rejectKYC = rejectKYC;
window.showToast = showToast;
