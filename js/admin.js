// ============================================
// ALL USERS - FIXED with proper admin access
// ============================================

async function loadAllUsers() {
    const container = document.getElementById('usersTableBody');
    
    if (!container) {
        console.error('❌ usersTableBody element not found');
        return;
    }
    
    // Show loading state
    container.innerHTML = '<tr><td colspan="6" class="text-center">Loading users...</td></tr>';
    
    try {
        console.log('📊 Fetching all users...');
        
        // Fetch ALL users without limit
        const { data: users, error, count } = await window.supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }
        
        console.log(`📊 Found ${users ? users.length : 0} users total`);
        console.log('👥 Users data:', users);
        
        // Store users for search/filter
        allUsers = users || [];
        
        if (!users || users.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }
        
        // Build the table rows
        let html = '';
        users.forEach(user => {
            // Determine status color
            const statusClass = user.status || 'pending';
            const statusDisplay = user.status || 'pending';
            
            // Check if this is the current user
            const isCurrentUser = user.id === currentUser?.id;
            
            html += `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-small">
                                ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.full_name || 'User'}">` : 
                                `<i class="fas fa-user"></i>`}
                            </div>
                            <div>
                                <span class="user-cell-name">${user.full_name || 'Unknown'}</span>
                                ${isCurrentUser ? '<span class="user-badge current-user">You</span>' : ''}
                                ${user.role === 'admin' ? '<span class="user-badge admin-badge">Admin</span>' : ''}
                            </div>
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
                            <button class="btn btn-sm btn-warning" onclick="makeAdmin('${user.id}')" title="Make Admin">
                                <i class="fas fa-user-shield"></i>
                            </button>
                        ` : ''}
                        ${isCurrentUser ? '<span class="text-muted" style="font-size:0.75rem;">(You)</span>' : ''}
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
        // Update the count display
        const countElement = document.getElementById('usersCount');
        if (countElement) {
            countElement.textContent = `(${users.length} users)`;
        }
        
        console.log('✅ All users loaded successfully');
        console.log(`👥 Displaying ${users.length} users`);
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        
        // Show more detailed error
        let errorMessage = 'Error loading users. Please refresh.';
        if (error.message) {
            errorMessage += ` (${error.message})`;
        }
        
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: #f44336;">
                    <i class="fas fa-exclamation-circle"></i> 
                    ${errorMessage}
                    <br>
                    <small>Make sure you have admin privileges and RLS policies are set correctly.</small>
                </td>
            </tr>
        `;
    }
}

// ============================================
// DEBUG FUNCTION - Check current user's role
// ============================================

async function checkCurrentUserRole() {
    try {
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        console.log('👤 Current User Profile:', profile);
        console.log('🔑 Role:', profile.role);
        console.log('✅ Is Admin:', profile.role === 'admin');
        
        return profile;
    } catch (error) {
        console.error('❌ Error checking current user:', error);
        return null;
    }
}

// ============================================
// TEST FUNCTION - Try to fetch all users
// ============================================

async function testFetchAllUsers() {
    console.log('🧪 Testing user fetch...');
    
    try {
        // First, check if we have admin privileges
        const profile = await checkCurrentUserRole();
        
        if (!profile || profile.role !== 'admin') {
            console.error('❌ Current user is not an admin!');
            showNotification('You need admin privileges to view all users.', 'error');
            return;
        }
        
        // Try to fetch users
        const { data: users, error } = await window.supabase
            .from('profiles')
            .select('*')
            .limit(10);
        
        if (error) {
            console.error('❌ Error fetching users:', error);
            showNotification('Error fetching users. Check RLS policies.', 'error');
            return;
        }
        
        console.log(`✅ Successfully fetched ${users ? users.length : 0} users`);
        console.log('📊 Users sample:', users);
        
        if (users && users.length > 0) {
            showNotification(`✅ Found ${users.length} users in the system`, 'success');
        } else {
            showNotification('ℹ️ No users found in the system', 'info');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        showNotification('Test failed. Check console for details.', 'error');
    }
}

// Call this in the console to test:
// testFetchAllUsers()
