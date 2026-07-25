// js/dashboard.js - Alternative with Base64 Storage
let dashboardUser = null;
let userData = null;
let allLoans = [];
let kycProfileFile = null;
let kycIdFile = null;

// ... (keep all the existing functions until submitKYC)

async function submitKYC(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('kycSubmitBtn');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        let profileUrl = userData.profile_picture_url;
        let idUrl = userData.id_picture_url;
        
        // Convert profile picture to base64
        if (kycProfileFile) {
            try {
                const base64 = await convertToBase64(kycProfileFile);
                // Store base64 directly in the database (or upload to storage)
                // For now, we'll try storage upload with simpler approach
                const filePath = `${dashboardUser.id}/profile_${Date.now()}.${kycProfileFile.name.split('.').pop()}`;
                
                const { error: uploadError } = await supabaseClient.storage
                    .from('profiles')
                    .upload(filePath, kycProfileFile, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    // If upload fails, store as base64 in the database
                    profileUrl = base64;
                } else {
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('profiles')
                        .getPublicUrl(filePath);
                    profileUrl = publicUrl;
                }
            } catch (error) {
                console.error('Profile conversion error:', error);
                throw new Error('Failed to process profile picture');
            }
        }
        
        // Convert ID document to base64
        if (kycIdFile) {
            try {
                const base64 = await convertToBase64(kycIdFile);
                const filePath = `${dashboardUser.id}/id_${Date.now()}.${kycIdFile.name.split('.').pop()}`;
                
                const { error: uploadError } = await supabaseClient.storage
                    .from('kyc')
                    .upload(filePath, kycIdFile, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    idUrl = base64;
                } else {
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('kyc')
                        .getPublicUrl(filePath);
                    idUrl = publicUrl;
                }
            } catch (error) {
                console.error('ID conversion error:', error);
                throw new Error('Failed to process ID document');
            }
        }
        
        // Check if we have both documents
        if (!profileUrl || !idUrl) {
            throw new Error('Please upload both profile picture and ID document');
        }
        
        // Update user record
        const notes = document.getElementById('kycNotes')?.value || '';
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({
                profile_picture_url: profileUrl,
                id_picture_url: idUrl,
                kyc_submitted_at: new Date().toISOString(),
                kyc_verified: false,
                kyc_rejection_reason: null,
                admin_notes: notes || null
            })
            .eq('id', dashboardUser.id);
        
        if (updateError) throw updateError;
        
        // Reload user data
        await loadUserProfile();
        await checkKYCStatus();
        
        showToast('KYC documents submitted successfully! Pending verification.', 'success');
        closeKYCModal();
        
        // Reset file variables
        kycProfileFile = null;
        kycIdFile = null;
        
    } catch (error) {
        console.error('KYC submission error:', error);
        showToast(error.message || 'Error submitting KYC documents', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Helper function to convert file to base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ... (rest of the functions remain the same)
