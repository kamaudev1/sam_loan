// Admin Dashboard JavaScript
let currentUser = null;
let currentPage = 'admin-overview';
let isAdmin = false;

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
        // Get total users
        const { count: totalUsers, error: usersError } = await window.supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        if (usersError) throw usersError;
        
        // Get total loans
        const { data: loans, error: loansError } = await window.supabase
            .from('loans')
            .select('*');
        
        if (loansError) throw loansError;
        
        const totalLoans = loans.length;
        const pendingLoans = loans.filter(l => l.status === 'pending').length;
        const totalDisbursed = loans
            .filter(l => l.status === 'approved' || l.status === 'active' || l.status === 'completed')
            .reduce((sum, l) => sum + l.amount, 0);
        
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
        
    } catch (error) {
        console.error('❌ Error loading admin data:', error);
        showNotification('Error loading admin data', 'error');
    }
}

// ============================================
// RECENT USERS (Fixed - without auth.users join)
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
        
        // Get user emails from auth.users using a different approach
        // Since we can't directly join, we'll use the user IDs to get emails
        const userIds = users.map(u => u.id);
        let emailMap = {};
        
        try {
            // Try to get emails from auth.users using the admin API
            // This requires admin privileges on the Supabase client
            const { data: authUsers, error: authError } = await window.supabase
                .from('auth.users')
                .select('id, email')
                .in('id', userIds);
            
            if (!authError && authUsers) {
                emailMap = authUsers.reduce((acc, u) => {
                    acc[u.id] = u.email;
                    return acc;
                }, {});
            }
        } catch (e) {
            // If we can't get emails, just use the user data we have
            console.log('ℹ️ Using profile data only (email not available)');
        }
        
        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-item-info">
                    <span class="user-name">${user.full_name || 'Unknown'}</span>
                    <span class="user-email">${emailMap[user.id] || 'Email unavailable'}</span>
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
                    <span class="application-amount">KES ${loan.amount.toLocaleString()}</span>
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
// ALL USERS (Fixed)
// ============================================

async function loadAllUsers() {
    const container = document.getElementById('usersTableBody');
    
    try {
        const { data: users, error } = await window.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!users || users.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }
        
        // Get user emails
        const userIds = users.map(u => u.id);
        let emailMap = {};
        
        try {
            const { data: authUsers, error: authError } = await window.supabase
                .from('auth.users')
                .select('id, email')
                .in('id', userIds);
            
            if (!authError && authUsers) {
                emailMap = authUsers.reduce((acc, u) => {
                    acc[u.id] = u.email;
                    return acc;
                }, {});
            }
        } catch (e) {
            console.log('ℹ️ Email data not available');
        }
        
        container.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-cell">
                        <span class="user-cell-name">${user.full_name || 'Unknown'}</span>
                    </div>
                </td>
                <td>${emailMap[user.id] || 'N/A'}</td>
                <td>${user.phone || '-'}</td>
                <td><span class="status-badge status-${user.status || 'pending'}">${user.status || 'pending'}</span></td>
                <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewUser('${user.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="suspendUser('${user.id}')">
                        <i class="fas fa-ban"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        container.innerHTML = '<tr><td colspan="6" class="text-center">Error loading users</td></tr>';
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
            .select('*, profiles(full_name)')
            .order('application_date', { ascending: false });
        
        if (error) throw error;
        
        if (!loans || loans.length === 0) {
            container.innerHTML = '<tr><td colspan="7" class="text-center">No loans found</td></tr>';
            return;
        }
        
        container.innerHTML = loans.map(loan => `
            <tr>
                <td>${loan.profiles?.full_name || 'Unknown'}</td>
                <td><strong>KES ${loan.amount.toLocaleString()}</strong></td>
                <td>${loan.term_months} months</td>
                <td>KES ${loan.monthly_payment ? loan.monthly_payment.toLocaleString() : '0'}</td>
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
        `).join('');
        
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
            .select('*, profiles(full_name, monthly_income)')
            .eq('status', 'pending')
            .order('application_date', { ascending: true });
        
        if (error) throw error;
        
        if (!loans || loans.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No pending applications</td></tr>';
            return;
        }
        
        container.innerHTML = loans.map(loan => `
            <tr>
                <td>${loan.profiles?.full_name || 'Unknown'}</td>
                <td><strong>KES ${loan.amount.toLocaleString()}</strong></td>
                <td>${loan.term_months} months</td>
                <td>KES ${(loan.profiles?.monthly_income || 0).toLocaleString()}</td>
                <td>${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="approveLoan('${loan.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rejectLoan('${loan.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Update pending count badge
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
        
        container.innerHTML = repayments.map(r => `
            <tr>
                <td>${r.profiles?.full_name || 'Unknown'}</td>
                <td>KES ${r.loans?.amount ? r.loans.amount.toLocaleString() : '0'}</td>
                <td><strong>KES ${r.amount.toLocaleString()}</strong></td>
                <td>${r.payment_method || 'N/A'}</td>
                <td>${r.payment_date ? new Date(r.payment_date).toLocaleDateString() : 'N/A'}</td>
                <td><span class="status-badge status-${r.status}">${r.status}</span></td>
            </tr>
        `).join('');
        
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
        
        const modal = document.getElementById('actionModal');
        document.getElementById('actionModalTitle').textContent = 'User Details';
        document.getElementById('actionModalBody').innerHTML = `
            <div class="user-details">
                <p><strong>Name:</strong> ${user.full_name || 'N/A'}</p>
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                <p><strong>ID Number:</strong> ${user.id_number || 'N/A'}</p>
                <p><strong>Status:</strong> ${user.status || 'N/A'}</p>
                <p><strong>Joined:</strong> ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
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
            .select('*, profiles(full_name, phone)')
            .eq('id', loanId)
            .single();
        
        if (error) throw error;
        
        const modal = document.getElementById('actionModal');
        document.getElementById('actionModalTitle').textContent = 'Loan Details';
        document.getElementById('actionModalBody').innerHTML = `
            <div class="loan-details">
                <p><strong>Borrower:</strong> ${loan.profiles?.full_name || 'N/A'}</p>
                <p><strong>Phone:</strong> ${loan.profiles?.phone || 'N/A'}</p>
                <p><strong>Amount:</strong> KES ${loan.amount ? loan.amount.toLocaleString() : '0'}</p>
                <p><strong>Term:</strong> ${loan.term_months || 0} months</p>
                <p><strong>Monthly Payment:</strong> KES ${loan.monthly_payment ? loan.monthly_payment.toLocaleString() : '0'}</p>
                <p><strong>Total Repayment:</strong> KES ${loan.total_amount ? loan.total_amount.toLocaleString() : '0'}</p>
                <p><strong>Status:</strong> ${loan.status || 'N/A'}</p>
                <p><strong>Applied:</strong> ${loan.application_date ? new Date(loan.application_date).toLocaleDateString() : 'N/A'}</p>
            </div>
        `;
        document.getElementById('actionModalButtons').innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('actionModal')">Close</button>
        `;
        modal.classList.add('show');
        
    } catch (error) {
        console.error('❌ Error viewing loan:', error);
        showNotification('Error loading loan details', 'error');
    }
}

async function suspendUser(userId) {
    if (!confirm('Suspend this user?')) return;
    
    try {
        const { error } = await window.supabase
            .from('profiles')
            .update({ status: 'suspended' })
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification('✅ User suspended', 'success');
        await loadAllUsers();
        await loadAdminData();
        
    } catch (error) {
        console.error('❌ Error suspending user:', error);
        showNotification('Error suspending user. Please try again.', 'error');
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
// SIDEBAR TOGGLE (FIXED)
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
    
    // Simulate report generation
    setTimeout(() => {
        const reportData = {
            users: 'User registration and activity report',
            loans: 'Loan applications and approvals report',
            repayments: 'Repayment tracking report',
            financial: 'Financial summary and performance report'
        };
        
        showNotification(`✅ ${type} report ready for download`, 'success');
        console.log(`📊 ${reportData[type] || 'Report'}`);
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

// Navigation
window.navigateToAdmin = navigateToAdmin;
window.toggleSidebar = toggleSidebar;

// Loan actions
window.approveLoan = approveLoan;
window.rejectLoan = rejectLoan;

// View actions
window.viewUser = viewUser;
window.viewLoan = viewLoan;

// User actions
window.suspendUser = suspendUser;

// Search and filter
window.searchUsers = searchUsers;
window.filterLoans = filterLoans;

// Modal and utility
window.closeModal = closeModal;
window.generateReport = generateReport;
window.handleLogout = handleLogout;

console.log('✅ admin.js loaded successfully');
