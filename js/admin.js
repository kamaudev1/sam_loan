// js/admin.js - FIXED VERSION (No Nested Joins)
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
        const [{ count: pendingCount }, { count: userCount }, { count: kycCount }] = await Promise.all([
            supabaseClient.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabaseClient.from('users').select('*', { count: 'exact', head: true }),
            supabaseClient.from('users').select('*', { count: 'exact', head: true }).eq('kyc_verified', true)
        ]);
        
        const { data: disbursedLoans } = await supabaseClient
            .from('loans')
            .select('amount')
            .in('status', ['disbursed', 'repaying', 'completed']);
        
        const totalDisbursed = disbursedLoans?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0;
        
        document.getElementById('pendingCount').textContent = pendingCount || 0;
        document.getElementById('totalUsers').textContent = userCount || 0;
        document.getElementById('totalDisbursed').textContent = `KES ${totalDisbursed.toLocaleString()}`;
        document.getElementById('kycVerified').textContent = kycCount || 0;
        
        console.log('Stats loaded:', { pendingCount, userCount, kycCount });
        
    } catch (error) {
        console.error('Error loading admin stats:', error);
        showToast('Error loading stats', 'error');
    }
}

// ============ TAB SWITCHING ============
function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    const targetContent = document.getElementById(tab);
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
    }
    
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

// ============ LOAN FUNCTIONS ============
async function loadPendingLoans() {
    await loadLoansByStatus('pending', 'pendingLoansList', 'pendingCountDisplay');
}

async function loadApprovedLoans() {
    await loadLoansByStatus('approved', 'approvedLoansList', 'approvedCountDisplay');
}

async function loadDisbursedLoans() {
    await loadLoansByStatus('disbursed', 'disbursedLoansList', 'disbursedCountDisplay');
}

async function loadRejectedLoans() {
    await loadLoansByStatus('rejected', 'rejectedLoansList', 'rejectedCountDisplay');
}

// ============ LOANS BY STATUS - FIXED ============
async function loadLoansByStatus(status, containerId, countId) {
    try {
        console.log(`Loading ${status} loans...`);
        
        // Step 1: Get loans only (no join)
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select('*')
            .eq('status', status)
            .order('application_date', { ascending: false });
        
        if (error) {
            console.error(`Error fetching ${status} loans:`, error);
            throw error;
        }
        
        console.log(`Found ${loans?.length || 0} ${status} loans`);
        
        // Step 2: Get user data for each loan separately
        const loansWithUsers = [];
        if (loans && loans.length > 0) {
            for (const loan of loans) {
                let userData = null;
                if (loan.user_id) {
                    try {
                        const { data: user, error: userError } = await supabaseClient
                            .from('users')
                            .select('full_name, email, phone, id_number')
                            .eq('id', loan.user_id)
                            .single();
                        
                        if (userError) {
                            console.warn(`User not found for loan ${loan.id}:`, userError.message);
                        } else {
                            userData = user;
                        }
                    } catch (e) {
                        console.warn(`Error fetching user for loan ${loan.id}:`, e);
                    }
                }
                loansWithUsers.push({
                    ...loan,
                    user: userData
                });
            }
        }
        
        const container = document.getElementById(containerId);
        const countDisplay = document.getElementById(countId);
        
        if (countDisplay) {
            countDisplay.textContent = `${loansWithUsers.length} applications`;
        }
        
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        if (loansWithUsers.length === 0) {
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
        
        let html = '';
        loansWithUsers.forEach(loan => {
            const user = loan.user || {};
            html += `
            <div class="loan-card">
                <div class="loan-card-header">
                    <div>
                        <h3>${user.full_name || 'Unknown User'}</h3>
                        <div class="user-info">
                            <span>${user.email || 'No email'}</span>
                            <span>•</span>
                            <span>ID: ${user.id_number || 'N/A'}</span>
                            ${user.phone ? `<span>•</span><span>${user.phone}</span>` : ''}
                        </div>
                    </div>
                    <span class="status-badge status-${statusClass}">${status.toUpperCase()}</span>
                </div>
                <div class="loan-card-details">
                    <p><strong>Amount</strong> KES ${(loan.amount || 0).toLocaleString()}</p>
                    <p><strong>Purpose</strong> ${loan.purpose || 'N/A'}</p>
                    <p><strong>Tenure</strong> ${loan.tenure || 0} months</p>
                    <p><strong>Applied</strong> ${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</p>
                    ${loan.approval_date ? `<p><strong>Approved</strong> ${new Date(loan.approval_date).toLocaleDateString()}</p>` : ''}
                    ${loan.disbursement_date ? `<p><strong>Disbursed</strong> ${new Date(loan.disbursement_date).toLocaleDateString()}</p>` : ''}
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
        console.log('===== LOADING USERS =====');
        
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
        
        console.log(`✅ Found ${users?.length || 0} users in database`);
        
        if (users) {
            users.forEach((user, index) => {
                console.log(`User ${index + 1}:`, {
                    name: user.full_name,
                    email: user.email,
                    role: user.role,
                    kyc: user.kyc_verified
                });
            });
        }
        
        const container = document.getElementById('usersList');
        if (!container) {
            console.error('❌ Container usersList not found');
            return;
        }
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No users found</p>
                    <p class="subtext">Register a user to get started</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        users.forEach(user => {
            const displayName = user.full_name || 'Unknown';
            const avatarUrl = user.profile_picture_url || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a237e&color=fff&size=50`;
            
            html += `
            <div class="user-item" style="border-left: 4px solid ${user.role === 'admin' ? '#ffd54f' : '#1a237e'};">
                <div class="user-info">
                    <img src="${avatarUrl}" 
                         alt="${displayName}" 
                         class="user-avatar"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a237e&color=fff&size=50'">
                    <div class="user-details">
                        <strong>${displayName}</strong>
                        <span>${user.email || 'No email'}</span>
                        <span>•</span>
                        <span>ID: ${user.id_number || 'N/A'}</span>
                        ${user.phone ? `<span>•</span><span>${user.phone}</span>` : ''}
                        ${user.occupation ? `<span>•</span><span>${user.occupation}</span>` : ''}
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
        console.log(`✅ ${users.length} users displayed successfully`);
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
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
            .not('id_picture_url', 'is', null)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching KYC users:', error);
            throw error;
        }
        
        console.log(`Found ${users?.length || 0} KYC pending users`);
        
        const container = document.getElementById('kycList');
        const countDisplay = document.getElementById('kycCountDisplay');
        
        if (countDisplay) {
            countDisplay.textContent = `${users?.length || 0} pending`;
        }
        
        if (!container) return;
        
        if (!users || users.length === 0) {
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
        users.forEach(user => {
            html += `
            <div class="kyc-item">
                <div class="kyc-header">
                    <div>
                        <h3>${user.full_name || 'Unknown'}</h3>
                        <p>${user.email || 'No email'} • ${user.phone || 'No phone'}</p>
                        <p>ID Number: ${user.id_number || 'N/A'}</p>
                        ${user.kyc_submitted_at ? `<p><small>Submitted: ${new Date(user.kyc_submitted_at).toLocaleDateString()}</small></p>` : ''}
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
                ${user.kyc_rejection_reason ? `
                    <div class="rejection-reason">
                        <p><strong>Previous Rejection Reason:</strong> ${user.kyc_rejection_reason}</p>
                    </div>
                ` : ''}
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
                kyc_verified: false,
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
                    <textarea id="adminNotes" placeholder="Add any notes..." rows="3"></textarea>
                </div>
            `;
            submitBtn.textContent = 'Approve Loan';
            break;
        case 'reject':
            title.textContent = 'Reject Loan Application';
            fields.innerHTML = `
                <div class="form-group">
                    <label><i class="fas fa-exclamation-circle"></i> Reason for Rejection</label>
                    <textarea id="rejectionReason" placeholder="Provide reason..." required rows="3"></textarea>
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
                    <textarea id="adminNotes" placeholder="Add any notes..." rows="3"></textarea>
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
                updateData = {
                    status: 'approved',
                    approval_date: new Date().toISOString(),
                    interest_rate: parseFloat(document.getElementById('interestRate')?.value || 5.0),
                    admin_notes: document.getElementById('adminNotes')?.value || null
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
                updateData = {
                    status: 'disbursed',
                    disbursement_date: document.getElementById('disbursementDate')?.value ? new Date(document.getElementById('disbursementDate').value).toISOString() : new Date().toISOString(),
                    repayment_date: document.getElementById('repaymentDate')?.value ? new Date(document.getElementById('repaymentDate').value).toISOString() : null,
                    admin_notes: document.getElementById('adminNotes')?.value || null
                };
                break;
        }
        
        const { error } = await supabaseClient
            .from('loans')
            .update(updateData)
            .eq('id', loanId);
        
        if (error) throw error;
        
        showToast(`Loan ${action}ed successfully!`, 'success');
        closeActionModal();
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

console.log('✅ Admin.js loaded successfully!');
