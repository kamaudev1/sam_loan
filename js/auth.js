// js/auth.js - Clean Version (Add to existing)

// Override the handleRegistration function with better error handling
async function handleRegistration() {
    const fullName = document.getElementById('fullName')?.value?.trim();
    const idNumber = document.getElementById('idNumber')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const phone = document.getElementById('phone')?.value?.trim();
    const dateOfBirth = document.getElementById('dateOfBirth')?.value;
    const gender = document.getElementById('gender')?.value;
    const occupation = document.getElementById('occupation')?.value?.trim();
    const monthlyIncome = document.getElementById('monthlyIncome')?.value;
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const termsAccepted = document.getElementById('termsAccepted')?.checked;
    const idDocument = document.getElementById('idDocument');
    
    // Validation
    if (!fullName || !idNumber || !email || !phone || !dateOfBirth || !gender || !password || !confirmPassword) {
        throw new Error('Please fill in all required fields');
    }
    
    if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
    }
    
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    
    if (!termsAccepted) {
        throw new Error('Please accept the terms and conditions');
    }
    
    if (!idNumber || idNumber.length < 5) {
        throw new Error('Please enter a valid ID number');
    }
    
    if (!idDocument || !idDocument.files || !idDocument.files[0]) {
        throw new Error('Please upload your ID document');
    }
    
    // Register with Supabase Auth
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                id_number: idNumber,
                phone: phone,
                role: 'user'
            }
        }
    });
    
    if (error) throw error;
    
    if (data.user) {
        // Upload documents (simplified)
        let profileUrl = null;
        let idUrl = null;
        
        if (profilePictureFile) {
            try {
                const fileExt = profilePictureFile.name.split('.').pop();
                const fileName = `${data.user.id}/profile.${fileExt}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from('profiles')
                    .upload(fileName, profilePictureFile);
                
                if (!uploadError) {
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('profiles')
                        .getPublicUrl(fileName);
                    profileUrl = publicUrl;
                }
            } catch (e) {
                console.warn('Profile upload error:', e);
            }
        }
        
        if (idDocument && idDocument.files && idDocument.files[0]) {
            try {
                const fileExt = idDocument.files[0].name.split('.').pop();
                const fileName = `${data.user.id}/id.${fileExt}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from('kyc')
                    .upload(fileName, idDocument.files[0]);
                
                if (!uploadError) {
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('kyc')
                        .getPublicUrl(fileName);
                    idUrl = publicUrl;
                }
            } catch (e) {
                console.warn('ID upload error:', e);
            }
        }
        
        // Save to users table
        const userData = {
            id: data.user.id,
            email: email,
            full_name: fullName,
            id_number: idNumber,
            phone: phone,
            gender: gender,
            occupation: occupation || null,
            monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null,
            profile_picture_url: profileUrl,
            id_picture_url: idUrl,
            terms_accepted: true,
            terms_accepted_date: new Date().toISOString(),
            role: 'user',
            kyc_verified: false,
            created_at: new Date().toISOString()
        };
        
        if (dateOfBirth && dateOfBirth.trim() !== '') {
            userData.date_of_birth = dateOfBirth;
        }
        
        console.log('Saving user:', userData);
        
        const { error: userError } = await supabaseClient
            .from('users')
            .insert([userData]);
        
        if (userError) {
            console.error('Error saving user:', userError);
            throw new Error('Error saving user data. Please try again.');
        }
        
        showToast('Registration successful! Please verify your email.', 'success');
        closeAuthModal();
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }
}
