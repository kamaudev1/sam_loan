// js/admin.js
let currentTab = 'pending';

document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    await loadAdminStats();
    await loadPendingLoans();
});

async function checkAdminAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    const { data: userData, error } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (error || userData?.role !== 'admin') {
        showToast('Access denied. Admin only.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }
}

async function loadAdminStats() {
    try {
        const [{ count: pendingCount }, { count: userCount }, { count: kycCount }] = await Promise.all([
            supabaseClient.from('loans').select('*', { count: 'exact' }).eq('status', 'pending'),
            supabaseClient.from('users').select('*', { count: 'exact' }),
            supabaseClient.from('users').select('*', { count: 'exact' }).eq('kyc_verified', true)
        ]);
        
        const { data: disbursedLoans } = await supabaseClient
            .from('loans')
            .select('amount')
            .in('status', ['disbursed', 'repaying', 'completed']);
        
        const totalDisbursed = disbursedLoans?.reduce((sum, loan) => sum + loan.amount, 0) || 0;
        
        document.getElementById('pendingCount').textContent = pendingCount || 0;
        document.getElementById('totalUsers').textContent = userCount || 0;
        document.getElementById('totalDisbursed').textContent = `KES ${totalDisbursed.toLocaleString()}`;
        document.getElementById('kycVerified').textContent = kycCount || 0;
        
    } catch (error) {
        console.error('Error loading admin stats:', error);
        showToast('Error loading stats', 'error');
    }
}

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

async function loadPendingLoans() {
    try {
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select(`
                *,
                users (
                    full_name,
                    email,
                    phone,
                    id_number,
                    profile_picture_url
                )
            `)
            .eq('status', 'pending')
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('pendingLoansList');
        document.getElementById('pendingCountDisplay').textContent = `${loans?.length || 0} applications`;
        
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
        
        container.innerHTML = loans.map(loan => `
            <div class="loan-card">
                <div class="loan-card-header">
                    <div>
                        <h3>${loan.users?.full_name || 'Unknown User'}</h3>
                        <div class="user-info">
                            <span>${loan.users?.email || 'No email'}</span>
                            <span>•</span>
                            <span>ID: ${loan.users?.id_number || 'N/A'}</span>
                        </div>
                    </div>
                    <span class="status-badge status-pending">PENDING</span>
                </div>
                <div class="loan-card-details">
                    <p><strong>Amount</strong> KES ${loan.amount.toLocaleString()}</p>
                    <p><strong>Purpose</strong> ${loan.purpose}</p>
                    <p><strong>Tenure</strong> ${loan.tenure} months</p>
                    <p><strong>Applied</strong> ${new Date(loan.application_date).toLocaleDateString()}</p>
                    <p><strong>Phone</strong> ${loan.users?.phone || 'N/A'}</p>
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
        `).join('');
        
    } catch (error) {
        console.error('Error loading pending loans:', error);
        showToast('Error loading pending loans', 'error');
    }
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

async function loadLoansByStatus(status, containerId, countId) {
    try {
        const { data: loans, error } = await supabaseClient
            .from('loans')
            .select(`
                *,
                users (
                    full_name,
                    email,
                    phone,
                    id_number,
                    profile_picture_url
                )
            `)
            .eq('status', status)
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById(containerId);
        if (countId) {
            document.getElementById(countId).textContent = `${loans?.length || 0} applications`;
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
        
        container.innerHTML = loans.map(loan => `
            <div class="loan-card">
                <div class="loan-card-header">
                    <div>
                        <h3>${loan.users?.full_name || 'Unknown User'}</h3>
                        <div class="user-info">
                            <span>${loan.users?.email || 'No email'}</span>
                            <span>•</span>
                            <span>ID: ${loan.users?.id_number || 'N/A'}</span>
                        </div>
                    </div>
                    <span class="status-badge status-${status}">${status.toUpperCase()}</span>
                </div>
                <div class="loan-card-details">
                    <p><strong>Amount</strong> KES ${loan.amount.toLocaleString()}</p>
                    <p><strong>Purpose</strong> ${loan.purpose}</p>
                    <p><strong>Tenure</strong> ${loan.tenure} months</p>
                    <p><strong>Applied</strong> ${new Date(loan.application_date).toLocaleDateString()}</p>
                    ${loan.approval_date ? `<p><strong>Approved</strong> ${new Date(loan.approval_date).toLocaleDateString()}</p>` : ''}
                    ${loan.disbursement_date ? `<p><strong>Disbursed</strong> ${new Date(loan.disbursement_date).toLocaleDateString()}</p>` : ''}
                </div>
                <div class="loan-card-actions">
                    ${status === 'approved' ? `
                        <button class="btn-disburse" onclick="openActionModal('${loan.id}', 'disburse')">
                            <i class="fas fa-hand-holding-usd"></i> Disburse
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error(`Error loading ${status} loans:`, error);
        showToast(`Error loading ${status} loans`, 'error');
    }
}

async function loadUsers() {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('usersList');
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No users found</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <img src="${user.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=1a237e&color=fff&size=50`}" 
                         alt="${user.full_name}" 
                         class="user-avatar">
                    <div class="user-details">
                        <strong>${user.full_name}</strong>
                        <span>${user.email}</span>
                        <span>•</span>
                        <span>ID: ${user.id_number || 'N/A'}</span>
                    </div>
                </div>
                <div class="user-meta">
                    <span class="role-badge role-${user.role || 'user'}">${(user.role || 'user').toUpperCase()}</span>
                    ${user.kyc_verified ? 
                        '<span class="status-badge status-approved"><i class="fas fa-check"></i> KYC Verified</span>' :
                        '<span class="status-badge status-pending"><i class="fas fa-clock"></i> KYC Pending</span>'
                    }
                    <small>Joined: ${new Date(user.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
    }
}

async function loadKYCVerifications() {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('kyc_verified', false)
            .not('id_picture_url', 'is', null)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('kycList');
        document.getElementById('kycCountDisplay').textContent = `${users?.length || 0} pending`;
        
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
        
        container.innerHTML = users.map(user => `
            <div class="kyc-item">
                <div class="kyc-header">
                    <div>
                        <h3>${user.full_name}</h3>
                        <p>${user.email} • ${user.phone || 'No phone'}</p>
                        <p>ID Number: ${user.id_number || 'N/A'}</p>
                    </div>
                    <span class="status-badge status-pending">PENDING</span>
                </div>
                <div class="kyc-documents">
                    ${user.profile_picture_url ? `
                        <div>
                            <p><strong>Profile Picture</strong></p>
                            <img src="${user.profile_picture_url}" alt="Profile" onclick="window.open('${user.profile_picture_url}', '_blank')">
                        </div>
                    ` : ''}
                    ${user.id_picture_url ? `
                        <div>
                            <p><strong>ID Document</strong></p>
                            <img src="${user.id_picture_url}" alt="ID" onclick="window.open('${user.id_picture_url}', '_blank')">
                        </div>
                    ` : ''}
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
        `).join('');
        
    } catch (error) {
        console.error('Error loading KYC verifications:', error);
        showToast('Error loading KYC verifications', 'error');
    }
}

async function verifyKYC(userId) {
    if (!confirm('Are you sure you want to verify this user\'s KYC?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ kyc_verified: true })
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('KYC verified successfully!', 'success');
        await loadKYCVerifications();
        await loadAdminStats();
        
    } catch (error) {
        console.error('Error verifying KYC:', error);
        showToast('Error verifying KYC', 'error');
    }
}

async function rejectKYC(userId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ 
                id_picture_url: null,
                admin_notes: reason
            })
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('KYC rejected', 'info');
        await loadKYCVerifications();
        
    } catch (error) {
        console.error('Error rejecting KYC:', error);
        showToast('Error rejecting KYC', 'error');
    }
}

function openActionModal(loanId, action) {
    const modal = document.getElementById('actionModal');
    const title = document.getElementById('actionModalTitle');
    const fields = document.getElementById('actionFields');
    
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
            document.getElementById('actionSubmitBtn').textContent = 'Approve Loan';
            break;
        case 'reject':
            title.textContent = 'Reject Loan Application';
            fields.innerHTML = `
                <div class="form-group">
                    <label><i class="fas fa-exclamation-circle"></i> Reason for Rejection</label>
                    <textarea id="rejectionReason" placeholder="Provide reason for rejection..." required rows="3"></textarea>
                </div>
            `;
            document.getElementById('actionSubmitBtn').textContent = 'Reject Loan';
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
            document.getElementById('actionSubmitBtn').textContent = 'Disburse Loan';
            break;
    }
    
    modal.style.display = 'flex';
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = 'none';
}

async function handleLoanAction(event) {
    event.preventDefault();
    
    const loanId = document.getElementById('actionLoanId').value;
    const action = document.getElementById('actionType').value;
    const submitBtn = document.getElementById('actionSubmitBtn');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        let updateData = {};
        
        switch(action) {
            case 'approve':
                const interestRate = document.getElementById('interestRate').value;
                const notes = document.getElementById('adminNotes').value;
                updateData = {
                    status: 'approved',
                    approval_date: new Date().toISOString(),
                    interest_rate: parseFloat(interestRate),
                    admin_notes: notes || null
                };
                break;
            case 'reject':
                const reason = document.getElementById('rejectionReason').value;
                updateData = {
                    status: 'rejected',
                    admin_notes: reason
                };
                break;
            case 'disburse':
                const disbursementDate = document.getElementById('disbursementDate').value;
                const repaymentDate = document.getElementById('repaymentDate').value;
                const disburseNotes = document.getElementById('adminNotes').value;
                updateData = {
                    status: 'disbursed',
                    disbursement_date: new Date(disbursementDate).toISOString(),
                    repayment_date: new Date(repaymentDate).toISOString(),
                    admin_notes: disburseNotes || null
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
        showToast(`Error ${action}ing loan`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('actionModal');
    if (event.target === modal) {
        closeActionModal();
    }
};

// Make functions globally accessible
window.switchTab = switchTab;
window.openActionModal = openActionModal;
window.closeActionModal = closeActionModal;
window.handleLoanAction = handleLoanAction;
window.verifyKYC = verifyKYC;
window.rejectKYC = rejectKYC;

// Add to admin.js - KYC Verification Functions

async function verifyKYC(userId) {
    if (!confirm('Are you sure you want to verify this user\'s KYC?')) return;
    
    try {
        // Get the admin user
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
        
        // Log the verification
        await supabaseClient
            .from('kyc_logs')
            .insert([{
                user_id: userId,
                action: 'verified',
                details: { verified_by: user.email },
                performed_by: user.id
            }]);
        
        showToast('KYC verified successfully!', 'success');
        await loadKYCVerifications();
        await loadAdminStats();
        
    } catch (error) {
        console.error('Error verifying KYC:', error);
        showToast('Error verifying KYC', 'error');
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
        // Get the admin user
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
        
        // Log the rejection
        await supabaseClient
            .from('kyc_logs')
            .insert([{
                user_id: userId,
                action: 'rejected',
                details: { reason: reason, rejected_by: user.email },
                performed_by: user.id
            }]);
        
        showToast('KYC rejected', 'info');
        await loadKYCVerifications();
        await loadAdminStats();
        
    } catch (error) {
        console.error('Error rejecting KYC:', error);
        showToast('Error rejecting KYC', 'error');
    }
}
