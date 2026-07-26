// Handle form submission
async function handleRegistration(event) {
    event.preventDefault();
    
    // Validate final step
    if (!validateStep(3)) {
        return;
    }
    
    const submitBtn = document.querySelector('#registrationForm button[type="submit"]');
    const btnText = document.getElementById('registerBtnText');
    const spinner = submitBtn.querySelector('.fa-spinner');
    
    // Disable button and show spinner
    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';
    btnText.textContent = 'Creating Account...';
    
    try {
        // Collect form data
        const fullName = document.getElementById('fullName').value.trim();
        const idNumber = document.getElementById('idNumber').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const dateOfBirth = document.getElementById('dateOfBirth').value;
        const gender = document.getElementById('gender').value;
        const employmentStatus = document.getElementById('employmentStatus').value;
        const employer = document.getElementById('employer').value.trim();
        const monthlyIncome = parseFloat(document.getElementById('monthlyIncome').value);
        const incomeSource = document.getElementById('incomeSource').value;
        const address = document.getElementById('address').value.trim();
        const password = document.getElementById('password').value;
        const marketingConsent = document.getElementById('marketingConsent').checked;
        
        // Register user with Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone
                }
            }
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
            // Profile will be created automatically by trigger
            // But we need to update it with additional fields
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    id_number: idNumber,
                    date_of_birth: dateOfBirth,
                    gender: gender,
                    employment_status: employmentStatus,
                    employer: employer,
                    monthly_income: monthlyIncome,
                    income_source: incomeSource,
                    address: address,
                    marketing_consent: marketingConsent
                })
                .eq('id', authData.user.id);
            
            if (profileError) throw profileError;
            
            // Upload documents if provided
            const profilePicture = document.getElementById('profilePicture');
            const idDocument = document.getElementById('idDocument');
            const proofOfIncome = document.getElementById('proofOfIncome');
            
            // Upload documents
            const uploadPromises = [];
            
            if (profilePicture.files && profilePicture.files[0]) {
                uploadPromises.push(uploadDocument(authData.user.id, 'profile_picture', profilePicture.files[0]));
            }
            
            if (idDocument.files && idDocument.files[0]) {
                uploadPromises.push(uploadDocument(authData.user.id, 'id_document', idDocument.files[0]));
            }
            
            if (proofOfIncome.files && proofOfIncome.files[0]) {
                uploadPromises.push(uploadDocument(authData.user.id, 'proof_of_income', proofOfIncome.files[0]));
            }
            
            await Promise.all(uploadPromises);
            
            // Show success message
            showNotification('Account created successfully! Please check your email for verification.', 'success');
            
            // Redirect to login after delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        if (error.message.includes('User already registered')) {
            errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.message.includes('Password should be at least')) {
            errorMessage = 'Password must be at least 6 characters long.';
        }
        
        showNotification(errorMessage, 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Create Account';
    }
}

// Upload document to Supabase Storage
async function uploadDocument(userId, documentType, file) {
    try {
        // Create folder structure
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`;
        
        // Upload file
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
            
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);
            
        // Save document reference in database
        const { error: docError } = await supabase
            .from('documents')
            .insert([
                {
                    user_id: userId,
                    document_type: documentType,
                    file_name: fileName,
                    file_url: publicUrl
                }
            ]);
            
        if (docError) throw docError;
            
        return publicUrl;
    } catch (error) {
        console.error('Document upload error:', error);
        throw error;
    }
}
