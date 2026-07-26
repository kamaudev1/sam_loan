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
    console.log('👤 User:', user.email);
    
    // Check if user is admin
    await checkAdminStatus();
    
    if (!isAdmin) {
        showNotification('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }
    
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
// ADMIN CHECK - Simplified
// ============================================

async function checkAdminStatus() {
    try {
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        isAdmin = profile && profile.role === 'admin';
        console.log(`🔐 Admin status: ${isAdmin ? '✅ Yes' : '❌ No'}`);
        
        return isAdmin;
        
    } catch (error) {
        console.error('❌ Error checking admin status:', error);
        isAdmin = false;
        return false;
    }
}

// ============================================
// ADMIN DATA
// ============================================

async function loadAdminData() {
    try {
        // Get total users
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
        
        await loadRecentUsers();
        await loadRecentApplications();
        
        console.log('✅ Admin data loaded');
        
    } catch (error) {
        console.error('❌ Error loading admin data:', error);
    }
}

// ============================================
// RECENT USERS
// ============================================

async function loadRecentUsers() {
    const container = document.getElementById('recentUsers');
    if (!container) return;
    
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
    if (!container) return;
    
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
// ALL USERS - Fixed
// ============================================

async function loadAllUsers() {
    const container = document.getElementById('usersTableBody');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="6" class="text-center">Loading users...</td></tr>';
    
    try {
        console.log('📊 Fetching all users...');
        
        const { data: users, error } = await window.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error:', error);
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center" style="color: #f44336;">
                        <i class="fas fa-exclamation-circle"></i> 
                        Error: ${error.message || 'Unknown error'}
                    </td>
                </tr>
            `;
            return;
        }
        
        console.log(`📊 Found ${users ? users.length : 0} users`);
        
        if (!users || users.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }
        
        allUsers = users;
        
        let html = '';
        users.forEach(user => {
            const isCurrentUser = user.id === currentUser?.id;
            const statusClass = user.status || 'pending';
            
            html += `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-small">
                                ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.full_name}">` : 
                                `<i class="fas fa-user"></i>`}
                            </div>
                            <div>
                                <span class="user-cell-name">${user.full_name || 'Unknown'}</span>
                                ${isCurrentUser ? '<span class="badge badge-current">You</span>' : ''}
                                ${user.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.phone || '-'}</td>
                    <td><span class="status-badge status-${statusClass}">${statusClass}</span></td>
                    <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewUser('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${user.role !== 'admin' ? `
                            <button class="btn btn-sm ${user.status === 'suspended' ? 'btn-success' : 'btn-danger'}" 
                                    onclick="toggleUserStatus('${user.id}')">
                                <i class="fas ${user.status === 'suspended' ? 'fa-check' : 'fa-ban'}"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="makeAdmin('${user.id}')">
                                <i class="fas fa-user-shield"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        console.log('✅ Users loaded successfully');
        
    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: #f44336;">
                    <i class="fas fa-exclamation-circle"></i> 
                    Error loading users
                </td>
            </tr>
        `;
    }
}

// ============================================
// ALL LOANS
// ============================================

async function loadAllLoans() {
    const container = document.getElementById('loansTableBody');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="7" class="text-center">Loading loans...</td></tr>';
    
    try {
        const { data: loans, error } = await window.supabase
            .from('loans')
            .select('*, profiles(full_name)')
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        if (!loans || loans.length === 0) {
            container.innerHTML = '<tr><td colspan="7" class="text-center">No loans found</td></tr>';
            return;
        }
        
        allLoans = loans;
        
        let html = '';
        loans.forEach(loan => {
            html += `
                <tr>
                    <td>${loan.profiles?.full_name || 'Unknown'}</td>
                    <td><strong>KES ${(loan.amount || 0).toLocaleString()}</strong></td>
                    <td>${loan.term_months || 0} months</td>
                    <td>KES ${(loan.monthly_payment || 0).toLocaleString()}</td>
                    <td><span class="status-badge status-${loan.status}">${loan.status}</span></td>
                    <td>${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewLoan('${loan.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${loan.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="approveLoan('${loan.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="rejectLoan('${loan.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        console.log('✅ Loans loaded successfully');
        
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
    if (!container) return;
    
    try {
        const { data: loans, error } = await window.supabase
            .from('loans')
            .select('*, profiles(full_name, monthly_income)')
            .eq('status', 'pending')
            .order('application_date', { ascending: true });
        
        if (error) throw error;
        
        if (!loans || loans.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No pending applications</td></tr>';
            return;
        }
        
        let html = '';
        loans.forEach(loan => {
            html += `
                <tr>
                    <td>${loan.profiles?.full_name || 'Unknown'}</td>
                    <td><strong>KES ${(loan.amount || 0).toLocaleString()}</strong></td>
                    <td>${loan.term_months || 0} months</td>
                    <td>KES ${(loan.profiles?.monthly_income || 0).toLocaleString()}</td>
                    <td>${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="approveLoan('${loan.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectLoan('${loan.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="viewLoan('${loan.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        document.getElementById('pendingCount').textContent = loans.length;
        
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
    if (!container) return;
    
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
                    <td><span class="status-badge status-${r.status}">${r.status}</span></td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error loading repayments:', error);
        container.innerHTML = '<tr><td colspan="6" class="text-center">Error loading repayments</td></tr>';
    }
}

// ============================================
// ADMIN ACTIONS
// ============================================

async function approveLoan(loanId) {
    if (!confirm('Approve this loan?')) return;
    
    try {
        const { error } = await window.supabase
            .from('loans')
            .update({ status: 'approved', approval_date: new Date().toISOString() })
            .eq('id', loanId);
        
        if (error) throw error;
        
        showNotification('✅ Loan approved!', 'success');
        await loadAllLoans();
        await loadPendingLoans();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Error approving loan', 'error');
    }
}

async function rejectLoan(loanId) {
    if (!confirm('Reject this loan?')) return;
    
    try {
        const { error } = await window.supabase
            .from('loans')
            .update({ status: 'rejected' })
            .eq('id', loanId);
        
        if (error) throw error;
        
        showNotification('✅ Loan rejected', 'success');
        await loadAllLoans();
        await loadPendingLoans();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Error rejecting loan', 'error');
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
        
        const modal = document.getElementById('actionModal');
        document.getElementById('actionModalTitle').textContent = 'User Details';
        document.getElementById('actionModalBody').innerHTML = `
            <div style="padding:1rem 0;">
                <p><strong>Name:</strong> ${user.full_name || 'N/A'}</p>
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                <p><strong>ID Number:</strong> ${user.id_number || 'N/A'}</p>
                <p><strong>Role:</strong> ${user.role || 'user'}</p>
                <p><strong>Status:</strong> ${user.status || 'pending'}</p>
                <p><strong>Joined:</strong> ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
        `;
        document.getElementById('actionModalButtons').innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('actionModal')">Close</button>
        `;
        modal.classList.add('show');
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Error loading user', 'error');
    }
}

async function viewLoan(loanId) {
    try {
        const { data: loan, error } = await window.supabase
            .from('loans')
            .select('*, profiles(full_name, phone)')
            .eq('id', loanId)
            .single();
        
        if (error) throw error;
        
        const modal = document.getElementById('actionModal');
        document.getElementById('actionModalTitle').textContent = 'Loan Details';
        document.getElementById('actionModalBody').innerHTML = `
            <div style="padding:1rem 0;">
                <p><strong>Borrower:</strong> ${loan.profiles?.full_name || 'N/A'}</p>
                <p><strong>Amount:</strong> KES ${(loan.amount || 0).toLocaleString()}</p>
                <p><strong>Term:</strong> ${loan.term_months || 0} months</p>
                <p><strong>Monthly:</strong> KES ${(loan.monthly_payment || 0).toLocaleString()}</p>
                <p><strong>Total:</strong> KES ${(loan.total_amount || 0).toLocaleString()}</p>
                <p><strong>Status:</strong> ${loan.status}</p>
                <p><strong>Applied:</strong> ${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</p>
            </div>
        `;
        document.getElementById('actionModalButtons').innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('actionModal')">Close</button>
        `;
        modal.classList.add('show');
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Error loading loan', 'error');
    }
}

async function toggleUserStatus(userId) {
    // Get current status
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    if (!confirm(`${newStatus === 'active' ? 'Activate' : 'Suspend'} this user?`)) return;
    
    try {
        const { error } = await window.supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification(`✅ User ${newStatus}`, 'success');
        await loadAllUsers();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Error updating user', 'error');
    }
}

async function makeAdmin(userId) {
    if (!confirm('Make this user an admin?')) return;
    
    try {
        const { error } = await window.supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification('✅ User is now an admin', 'success');
        await loadAllUsers();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Error making admin', 'error');
    }
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
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`page-${page}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const pageTitles = {
        'admin-overview': 'Admin Overview',
        'admin-users': 'Users Management',
        'admin-loans': 'Loans Management',
        'admin-pending': 'Pending Approvals',
        'admin-repayments': 'Repayments',
        'admin-reports': 'Reports'
    };
    document.getElementById('pageTitle').textContent = pageTitles[page] || page;
    
    // Reload data
    if (page === 'admin-users') loadAllUsers();
    else if (page === 'admin-loans') loadAllLoans();
    else if (page === 'admin-pending') loadPendingLoans();
    else if (page === 'admin-repayments') loadAllRepayments();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('active');
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('show');
}

function searchUsers() {
    const term = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#usersTableBody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
}

function filterLoans() {
    const filter = document.getElementById('loanStatusFilter')?.value || 'all';
    const rows = document.querySelectorAll('#loansTableBody tr');
    rows.forEach(row => {
        if (filter === 'all') {
            row.style.display = '';
            return;
        }
        const status = row.querySelector('.status-badge')?.textContent?.toLowerCase() || '';
        row.style.display = status === filter ? '' : 'none';
    });
}

function generateReport(type) {
    showNotification(`Generating ${type} report...`, 'info');
    setTimeout(() => {
        showNotification(`✅ ${type} report ready`, 'success');
    }, 2000);
}

async function handleLogout() {
    if (!confirm('Logout?')) return;
    try {
        await window.supabase.auth.signOut();
        showNotification('✅ Logged out', 'success');
        setTimeout(() => window.location.href = 'login.html', 1000);
    } catch (error) {
        console.error('❌ Logout error:', error);
        showNotification('Error logging out', 'error');
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

console.log('✅ admin.js loaded');
