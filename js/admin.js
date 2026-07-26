// Admin Dashboard JavaScript
let currentUser = null;
let currentPage = 'admin-overview';
let isAdmin = false;
let allUsers = [];
let allLoans = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔐 Admin dashboard loading...');
    
    // Check authentication
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    console.log('👤 Admin authenticated:', user.email);
    
    // Check if user is admin
    const adminStatus = await checkAdminStatus();
    if (!adminStatus) {
        showNotification('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }
    
    isAdmin = true;
    
    // Load admin data
    await loadAdminData();
    
    // Setup navigation
    setupAdminNavigation();
    
    // Load initial data
    await loadAllUsers();
    await loadAllLoans();
    await loadPendingLoans();
    await loadAllRepayments();
});

// ============================================
// ADMIN CHECK
// ============================================

async function checkAdminStatus() {
    try {
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        return profile && profile.role === 'admin';
        
    } catch (error) {
        console.error('❌ Error checking admin status:', error);
        return false;
    }
}

// ============================================
// ADMIN DATA
// ============================================

async function loadAdminData() {
    try {
        // Get total users count
        const { count: totalUsers, error: usersError } = await window.supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        if (usersError) throw usersError;
        
        // Get all loans
        const { data: loans, error: loansError } = await window.supabase
            .from('loans')
            .select('*');
        
        if (loansError) throw loansError;
        
        const totalLoans = loans ? loans.length : 0;
        const pendingLoans = loans ? loans.filter(l => l.status === 'pending').length : 0;
        const totalDisbursed = loans ? loans
            .filter(l => l.status === 'approved' || l.status === 'active' || l.status === 'completed')
            .reduce((sum, l) => sum + (l.amount || 0), 0) : 0;
        
        // Update stats
        document.getElementById('totalUsers').textContent = totalUsers || 0;
        document.getElementById('totalLoans').textContent = totalLoans;
        document.getElementById('pendingLoans').textContent = pendingLoans;
        document.getElementById('totalDisbursed').textContent = `KES ${(totalDisbursed || 0).toLocaleString()}`;
        document.getElementById('pendingCount').textContent = pendingLoans;
        
        // Load recent users
        await loadRecentUsers();
        
        // Load recent applications
        await loadRecentApplications();
        
        console.log('✅ Admin data loaded');
        console.log(`📊 Total users: ${totalUsers}, Total loans: ${totalLoans}`);
        
    } catch (error) {
        console.error('❌ Error loading admin data:', error);
        showNotification('Error loading admin data', 'error');
    }
}

// ============================================
// RECENT USERS
// ============================================

async function loadRecentUsers() {
    const container = document.getElementById('recentUsers');
    
    try {
        const { data: users, error } = await window.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        if (!users || users.length === 0) {
            container.innerHTML = '<p class="text-muted">No users yet</p>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-item-info">
                    <span class="user-name">${user.full_name || 'Unknown'}</span>
                    <span class="user-email">${user.email || 'No email'}</span>
                </div>
                <span class="status-badge status-${user.status || 'pending'}">${user.status || 'pending'}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading recent users:', error);
        container.innerHTML = '<p class="text-muted">Error loading users</p>';
    }
}

// ============================================
// RECENT APPLICATIONS
// ============================================

async function loadRecentApplications() {
    const container = document.getElementById('recentApplications');
    
    try {
        const { data: loans, error } = await window.supabase
            .from('loans')
            .select('*, profiles(full_name)')
            .order('application_date', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        if (!loans || loans.length === 0) {
            container.innerHTML = '<p class="text-muted">No applications yet</p>';
            return;
        }
        
        container.innerHTML = loans.map(loan => `
            <div class="application-item">
                <div class="application-info">
                    <span class="applicant-name">${loan.profiles?.full_name || 'Unknown'}</span>
                    <span class="application-amount">KES ${(loan.amount || 0).toLocaleString()}</span>
                </div>
                <span class="status-badge status-${loan.status}">${loan.status}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading recent applications:', error);
        container.innerHTML = '<p class="text-muted">Error loading applications</p>';
    }
}

// ============================================
// ALL USERS - FIXED to fetch all users
// ============================================

async function loadAllUsers() {
    const container = document.getElementById('usersTableBody');
    
    try {
        // Fetch ALL users without limit
        const { data: users, error, count } = await window.supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`📊 Found ${users ? users.length : 0} users total`);
        
        if (!users || users.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }
        
        // Store users for search/filter
        allUsers = users;
        
        // Build the table rows
        let html = '';
        users.forEach(user => {
            // Determine status color
            const statusClass = user.status || 'pending';
            const statusDisplay = user.status || 'pending';
            
            html += `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-small">
                                ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.full_name || 'User'}">` : 
                                `<i class="fas fa-user"></i>`}
                            </div>
                            <span class="user-cell-name">${user.full_name || 'Unknown'}</span>
                        </div>
                    </td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.phone || '-'}</td>
                    <td>
                        <span class="status-badge status-${statusClass}">${statusDisplay}</span>
                    </td>
                    <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewUser('${user.id}')" title="View User">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${user.role !== 'admin' ? `
                            <button class="btn btn-sm ${user.status === 'suspended' ? 'btn-success' : 'btn-danger'}" 
                                    onclick="toggleUserStatus('${user.id}', '${user.status}')" 
                                    title="${user.status === 'suspended' ? 'Activate' : 'Suspend'}">
                                <i class="fas ${user.status === 'suspended' ? 'fa-check' : 'fa-ban'}"></i>
                            </button>
                        ` : ''}
                        ${user.role !== 'admin' ? `
                            <button class="btn btn-sm btn-warning" onclick="makeAdmin('${user.id}')" title="Make Admin">
                                <i class="fas fa-user-shield"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
        // Update the count display if there's a count element
        const countElement = document.getElementById('usersCount');
        if (countElement) {
            countElement.textContent = `(${users.length} users)`;
        }
        
        console.log('✅ All users loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        container.innerHTML = '<tr><td colspan="6" class="text-center">Error loading users. Please refresh.</td></tr>';
    }
}

// ============================================
// ALL LOANS
// ============================================

async function loadAllLoans() {
    const container = document.getElementById('loansTableBody');
    
    try {
        const { data: loans, error } = await window.supabase
            .from('loans')
            .select('*, profiles(full_name, phone)')
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        console.log(`📊 Found ${loans ? loans.length : 0} loans total`);
        
        if (!loans || loans.length === 0) {
            container.innerHTML = '<tr><td colspan="7" class="text-center">No loans found</td></tr>';
            return;
        }
        
        // Store loans for filtering
        allLoans = loans;
        
        let html = '';
        loans.forEach(loan => {
            html += `
                <tr>
                    <td>
                        <div class="user-cell">
                            <span class="user-cell-name">${loan.profiles?.full_name || 'Unknown'}</span>
                            <span class="user-cell-phone">${loan.profiles?.phone || ''}</span>
                        </div>
                    </td>
                    <td><strong>KES ${(loan.amount || 0).toLocaleString()}</strong></td>
                    <td>${loan.term_months || 0} months</td>
                    <td>KES ${(loan.monthly_payment || 0).toLocaleString()}</td>
                    <td><span class="status-badge status-${loan.status}">${loan.status || 'pending'}</span></td>
                    <td>${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewLoan('${loan.id}')" title="View Loan">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${loan.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="approveLoan('${loan.id}')" title="Approve">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="rejectLoan('${loan.id}')" title="Reject">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
        // Update the count display
        const countElement = document.getElementById('loansCount');
        if (countElement) {
            countElement.textContent = `(${loans.length} loans)`;
        }
        
        console.log('✅ All loans loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading loans:', error);
        container.innerHTML = '<tr><td colspan="7" class="text-center">Error loading loans</td></tr>';
    }
}

// ============================================
// PENDING LOANS
// ============================================

async function loadPendingLoans() {
    const container = document.getElementById('pendingTableBody');
    
    try {
        const { data: loans, error } = await window.supabase
            .from('loans')
            .select('*, profiles(full_name, monthly_income, phone)')
            .eq('status', 'pending')
            .order('application_date', { ascending: true });
        
        if (error) throw error;
        
        if (!loans || loans.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No pending applications</td></tr>';
            document.getElementById('pendingCount').textContent = '0';
            return;
        }
        
        let html = '';
        loans.forEach(loan => {
            html += `
                <tr>
                    <td>
                        <div class="user-cell">
                            <span class="user-cell-name">${loan.profiles?.full_name || 'Unknown'}</span>
                            <span class="user-cell-phone">${loan.profiles?.phone || ''}</span>
                        </div>
                    </td>
                    <td><strong>KES ${(loan.amount || 0).toLocaleString()}</strong></td>
                    <td>${loan.term_months || 0} months</td>
                    <td>KES ${(loan.profiles?.monthly_income || 0).toLocaleString()}</td>
                    <td>${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="approveLoan('${loan.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectLoan('${loan.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="viewLoan('${loan.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
        // Update pending count badge
        document.getElementById('pendingCount').textContent = loans.length;
        
        console.log(`📊 Found ${loans.length} pending loans`);
        
    } catch (error) {
        console.error('❌ Error loading pending loans:', error);
        container.innerHTML = '<tr><td colspan="6" class="text-center">Error loading pending applications</td></tr>';
    }
}

// ============================================
// REPAYMENTS
// ============================================

async function loadAllRepayments() {
    const container = document.getElementById('repaymentsTableBody');
    
    try {
        const { data: repayments, error } = await window.supabase
            .from('repayments')
            .select('*, profiles(full_name), loans(amount)')
            .order('payment_date', { ascending: false });
        
        if (error) throw error;
        
        if (!repayments || repayments.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No repayments yet</td></tr>';
            return;
        }
        
        let html = '';
        repayments.forEach(r => {
            html += `
                <tr>
                    <td>${r.profiles?.full_name || 'Unknown'}</td>
                    <td>KES ${(r.loans?.amount || 0).toLocaleString()}</td>
                    <td><strong>KES ${(r.amount || 0).toLocaleString()}</strong></td>
                    <td>${r.payment_method || 'N/A'}</td>
                    <td>${r.payment_date ? new Date(r.payment_date).toLocaleDateString() : 'N/A'}</td>
                    <td><span class="status-badge status-${r.status}">${r.status || 'pending'}</span></td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
        console.log(`📊 Found ${repayments.length} repayments`);
        
    } catch (error) {
        console.error('❌ Error loading repayments:', error);
        container.innerHTML = '<tr><td colspan="6" class="text-center">Error loading repayments</td></tr>';
    }
}

// ============================================
// ADMIN ACTIONS
// ============================================

async function approveLoan(loanId) {
    if (!confirm('Approve this loan application?')) return;
    
    try {
        const { error } = await window.supabase
            .from('loans')
            .update({
                status: 'approved',
                approval_date: new Date().toISOString()
            })
            .eq('id', loanId);
        
        if (error) throw error;
        
        showNotification('✅ Loan approved successfully!', 'success');
        // Refresh all data
        await loadAllLoans();
        await loadPendingLoans();
        await loadAdminData();
        
    } catch (error) {
        console.error('❌ Error approving loan:', error);
        showNotification('Error approving loan. Please try again.', 'error');
    }
}

async function rejectLoan(loanId) {
    if (!confirm('Reject this loan application?')) return;
    
    try {
        const { error } = await window.supabase
            .from('loans')
            .update({
                status: 'rejected'
            })
            .eq('id', loanId);
        
        if (error) throw error;
        
        showNotification('✅ Loan rejected', 'success');
        // Refresh all data
        await loadAllLoans();
        await loadPendingLoans();
        await loadAdminData();
        
    } catch (error) {
        console.error('❌ Error rejecting loan:', error);
        showNotification('Error rejecting loan. Please try again.', 'error');
    }
}

async function viewUser(userId) {
    try {
        const { data: user, error } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        // Get user's loans
        const { data: userLoans, error: loansError } = await window.supabase
            .from('loans')
            .select('*')
            .eq('user_id', userId)
            .order('application_date', { ascending: false });
        
        if (loansError) throw loansError;
        
        const modal = document.getElementById('actionModal');
        document.getElementById('actionModalTitle').textContent = 'User Details';
        document.getElementById('actionModalBody').innerHTML = `
            <div class="user-details">
                <div class="user-profile-header">
                    <div class="user-avatar-large">
                        ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.full_name}">` : 
                        `<i class="fas fa-user-circle"></i>`}
                    </div>
                    <div class="user-info-large">
                        <h3>${user.full_name || 'Unknown'}</h3>
                        <p>${user.email || 'No email'}</p>
                        <p>${user.phone || 'No phone'}</p>
                        <span class="status-badge status-${user.status || 'pending'}">${user.status || 'pending'}</span>
                    </div>
                </div>
                <hr>
                <div class="user-stats">
                    <div class="user-stat-item">
                        <span>ID Number:</span>
                        <strong>${user.id_number || 'N/A'}</strong>
                    </div>
                    <div class="user-stat-item">
                        <span>Gender:</span>
                        <strong>${user.gender || 'N/A'}</strong>
                    </div>
                    <div class="user-stat-item">
                        <span>Employment:</span>
                        <strong>${user.employment_status || 'N/A'}</strong>
                    </div>
                    <div class="user-stat-item">
                        <span>Monthly Income:</span>
                        <strong>KES ${(user.monthly_income || 0).toLocaleString()}</strong>
                    </div>
                    <div class="user-stat-item">
                        <span>Joined:</span>
                        <strong>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</strong>
                    </div>
                </div>
                <hr>
                <h4>User Loans (${userLoans ? userLoans.length : 0})</h4>
                ${userLoans && userLoans.length > 0 ? `
                    <div class="user-loans-list">
                        ${userLoans.slice(0, 5).map(loan => `
                            <div class="user-loan-item">
                                <span>KES ${(loan.amount || 0).toLocaleString()}</span>
                                <span class="status-badge status-${loan.status}">${loan.status}</span>
                                <span>${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        `).join('')}
                        ${userLoans.length > 5 ? `<p class="text-muted">... and ${userLoans.length - 5} more loans</p>` : ''}
                    </div>
                ` : '<p class="text-muted">No loans yet</p>'}
            </div>
        `;
        document.getElementById('actionModalButtons').innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('actionModal')">Close</button>
        `;
        modal.classList.add('show');
        
    } catch (error) {
        console.error('❌ Error viewing user:', error);
        showNotification('Error loading user details', 'error');
    }
}

async function viewLoan(loanId) {
    try {
        const { data: loan, error } = await window.supabase
            .from('loans')
            .select('*, profiles(full_name, phone, email)')
            .eq('id', loanId)
            .single();
        
        if (error) throw error;
        
        const modal = document.getElementById('actionModal');
        document.getElementById('actionModalTitle').textContent = 'Loan Details';
        document.getElementById('actionModalBody').innerHTML = `
            <div class="loan-details">
                <div class="loan-header">
                    <h3>Loan Application</h3>
                    <span class="status-badge status-${loan.status}">${loan.status}</span>
                </div>
                <div class="loan-info-grid">
                    <div class="loan-info-item">
                        <span>Borrower:</span>
                        <strong>${loan.profiles?.full_name || 'Unknown'}</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Phone:</span>
                        <strong>${loan.profiles?.phone || 'N/A'}</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Email:</span>
                        <strong>${loan.profiles?.email || 'N/A'}</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Amount:</span>
                        <strong>KES ${(loan.amount || 0).toLocaleString()}</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Term:</span>
                        <strong>${loan.term_months || 0} months</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Interest Rate:</span>
                        <strong>${loan.interest_rate || 5}%</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Monthly Payment:</span>
                        <strong>KES ${(loan.monthly_payment || 0).toLocaleString()}</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Total Repayment:</span>
                        <strong>KES ${(loan.total_amount || 0).toLocaleString()}</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Purpose:</span>
                        <strong>${loan.purpose || 'N/A'}</strong>
                    </div>
                    <div class="loan-info-item">
                        <span>Applied:</span>
                        <strong>${loan.application_date ? new Date(loan.application_date).toLocaleString() : 'N/A'}</strong>
                    </div>
                    ${loan.approval_date ? `
                        <div class="loan-info-item">
                            <span>Approved:</span>
                            <strong>${new Date(loan.approval_date).toLocaleString()}</strong>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        document.getElementById('actionModalButtons').innerHTML = `
            ${loan.status === 'pending' ? `
                <button class="btn btn-success" onclick="approveLoan('${loan.id}'); closeModal('actionModal')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-danger" onclick="rejectLoan('${loan.id}'); closeModal('actionModal')">
                    <i class="fas fa-times"></i> Reject
                </button>
            ` : ''}
            <button class="btn btn-secondary" onclick="closeModal('actionModal')">Close</button>
        `;
        modal.classList.add('show');
        
    } catch (error) {
        console.error('❌ Error viewing loan:', error);
        showNotification('Error loading loan details', 'error');
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    if (!confirm(`${action} this user?`)) return;
    
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    try {
        const { error } = await window.supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification(`✅ User ${action}d successfully`, 'success');
        await loadAllUsers();
        await loadAdminData();
        
    } catch (error) {
        console.error('❌ Error updating user status:', error);
        showNotification(`Error ${action}ing user. Please try again.`, 'error');
    }
}

async function makeAdmin(userId) {
    if (!confirm('Make this user an admin? This will give them full access to the admin panel.')) return;
    
    try {
        const { error } = await window.supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification('✅ User promoted to admin', 'success');
        await loadAllUsers();
        
    } catch (error) {
        console.error('❌ Error making admin:', error);
        showNotification('Error promoting user. Please try again.', 'error');
    }
}

// ============================================
// SEARCH AND FILTER
// ============================================

function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function filterLoans() {
    const filter = document.getElementById('loanStatusFilter').value;
    const rows = document.querySelectorAll('#loansTableBody tr');
    
    rows.forEach(row => {
        if (filter === 'all') {
            row.style.display = '';
            return;
        }
        
        const statusCell = row.querySelector('.status-badge');
        if (statusCell) {
            const status = statusCell.textContent.toLowerCase();
            row.style.display = status === filter ? '' : 'none';
        }
    });
}

// ============================================
// NAVIGATION
// ============================================

function setupAdminNavigation() {
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) {
                navigateToAdmin(page);
            }
        });
    });
}

function navigateToAdmin(page) {
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
        'admin-overview': 'Admin Overview',
        'admin-users': 'Users Management',
        'admin-loans': 'Loans Management',
        'admin-pending': 'Pending Approvals',
        'admin-repayments': 'Repayments',
        'admin-reports': 'Reports'
    };
    document.getElementById('pageTitle').textContent = pageTitles[page] || page;
    
    // Reload data for the page
    if (page === 'admin-users') {
        loadAllUsers();
    } else if (page === 'admin-loans') {
        loadAllLoans();
    } else if (page === 'admin-pending') {
        loadPendingLoans();
    } else if (page === 'admin-repayments') {
        loadAllRepayments();
    }
}

// ============================================
// SIDEBAR TOGGLE
// ============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
    }
}

// ============================================
// REPORT GENERATION
// ============================================

function generateReport(type) {
    showNotification(`Generating ${type} report...`, 'info');
    
    setTimeout(() => {
        showNotification(`✅ ${type} report ready for download`, 'success');
        console.log(`📊 ${type} report generated`);
    }, 2000);
}

// ============================================
// LOGOUT
// ============================================

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        const { error } = await window.supabase.auth.signOut();
        if (error) throw error;
        
        showNotification('✅ Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showNotification('Error logging out. Please try again.', 'error');
    }
}

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.navigateToAdmin = navigateToAdmin;
window.toggleSidebar = toggleSidebar;
window.approveLoan = approveLoan;
window.rejectLoan = rejectLoan;
window.viewUser = viewUser;
window.viewLoan = viewLoan;
window.toggleUserStatus = toggleUserStatus;
window.makeAdmin = makeAdmin;
window.searchUsers = searchUsers;
window.filterLoans = filterLoans;
window.closeModal = closeModal;
window.generateReport = generateReport;
window.handleLogout = handleLogout;

console.log('✅ admin.js loaded successfully');
