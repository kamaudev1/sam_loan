// Add this to your admin.js for KYC verification
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
        
        // Log the verification
        try {
            await supabaseClient
                .from('kyc_logs')
                .insert([{
                    user_id: userId,
                    action: 'verified',
                    details: { verified_by: user.email },
                    performed_by: user.id
                }]);
        } catch (e) {
            console.warn('Could not log KYC action:', e);
        }
        
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
        
        // Log the rejection
        try {
            await supabaseClient
                .from('kyc_logs')
                .insert([{
                    user_id: userId,
                    action: 'rejected',
                    details: { reason: reason, rejected_by: user.email },
                    performed_by: user.id
                }]);
        } catch (e) {
            console.warn('Could not log KYC action:', e);
        }
        
        showToast('KYC rejected', 'info');
        await loadKYCVerifications();
        await loadAdminStats();
        
    } catch (error) {
        console.error('Error rejecting KYC:', error);
        showToast('Error rejecting KYC: ' + error.message, 'error');
    }
}
