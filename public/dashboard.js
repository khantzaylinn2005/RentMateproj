// Dashboard specific functions

// Check authentication
if (!currentUser) {
    window.location.href = '/index.html';
}

// Show/hide "Verify Account" button and lock/unlock lender features
function updateSwitchToLenderButton() {
    const switchSection = document.getElementById('switchToLenderSection');
    const isVerifiedLender = currentUser && (currentUser.is_verified === 1 || currentUser.verification_status === 'verified');
    
    // Show/hide switch button (only if element exists)
    if (switchSection) {
        if (currentUser && !isVerifiedLender) {
            switchSection.classList.remove('hidden');
        } else {
            switchSection.classList.add('hidden');
        }
    }
    
    // Lock/unlock lender features
    updateLenderFeatures(isVerifiedLender);
    
    lucide.createIcons();
}

// Lock or unlock lender features based on verification
function updateLenderFeatures(isVerified) {
    const lenderFeatures = document.querySelectorAll('.lender-feature');
    
    lenderFeatures.forEach(link => {
        if (isVerified) {
            // Unlock features
            link.setAttribute('data-locked', 'false');
            link.style.opacity = '1';
            link.style.cursor = 'pointer';
            
            // Restore original hrefs
            if (link.id === 'nav-additem') {
                link.href = '/list_new_item.html';
            } else if (link.id === 'nav-myitems') {
                link.href = '/my_items.html';
            } else if (link.id === 'nav-lending') {
                link.href = '/lending.html';
            }
            
            // Remove click handler
            link.onclick = null;
        } else {
            // Lock features
            link.setAttribute('data-locked', 'true');
            link.href = '#';
            
            // Add click handler to show message
            link.onclick = (e) => {
                e.preventDefault();
                ui.showNotification('Please verify as a lender to access this feature. Click "Verify Account" to get verified.', 'info');
            };
        }
    });
    
    lucide.createIcons();
}

// Call on page load (only if switchToLenderSection exists on this page)
if (document.getElementById('switchToLenderSection')) {
    updateSwitchToLenderButton();
}

// Section navigation
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(`${sectionName}Section`).classList.remove('hidden');
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-${sectionName}`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'myitems':
            loadMyItems();
            break;
        case 'borrowing':
            loadMyBorrowing();
            break;
        case 'lending':
            loadMyLending();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'additem':
            // Reinitialize icons for photo upload section
            setTimeout(() => lucide.createIcons(), 100);
            break;
    }
}

// Refresh user data from server to get latest verification status
async function refreshUserData() {
    try {
        const response = await api.getProfile();
        if (response && response.success && response.data) {
            currentUser = response.data;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Update UI based on new verification status
            updateSwitchToLenderButton();
            
            console.log('User data refreshed:', currentUser);
        }
    } catch (error) {
        console.error('Error refreshing user data:', error);
        // Silently fail - use cached user data from localStorage
    }
}

// Load dashboard
async function loadDashboard() {
    try {
        // Refresh user data first to get latest verification status
        await refreshUserData();
        
        // Update sidebar user info
        if (currentUser) {
            const sidebarUserName = document.getElementById('sidebarUserName');
            const userAvatar = document.getElementById('userAvatar');
            const userRole = document.getElementById('userRole');
            
            if (sidebarUserName) sidebarUserName.textContent = currentUser.name;
            if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
            if (userRole) {
                // Show role with verification badge if verified
                if (currentUser.is_verified === 1 || currentUser.verification_status === 'verified') {
                    userRole.innerHTML = `Member <i data-lucide="badge-check" class="w-3 h-3 inline text-blue-400"></i>`;
                    lucide.createIcons();
                } else {
                    userRole.textContent = currentUser.role === 'admin' ? 'Admin' : 'Member';
                }
            }
        }
        
        // Load stats
        const [itemsRes, borrowingRes, lendingRes] = await Promise.all([
            api.getMyItems(),
            api.getMyBorrowing(),
            api.getMyLending()
        ]);

        // Update stats only if elements exist (dashboard page)
        const statMyItems = document.getElementById('statMyItems');
        const statBorrowing = document.getElementById('statBorrowing');
        const statLending = document.getElementById('statLending');
        const statRating = document.getElementById('statRating');
        
        if (statMyItems) statMyItems.textContent = itemsRes.count || itemsRes.data?.length || 0;
        if (statBorrowing) statBorrowing.textContent = borrowingRes.data?.filter(r => r.status === 'active' || r.status === 'approved').length || 0;
        if (statLending) statLending.textContent = lendingRes.data?.filter(r => r.status === 'active' || r.status === 'approved').length || 0;
        if (statRating) statRating.textContent = currentUser.rating ? Number(currentUser.rating).toFixed(1) : '0.0';

        // Show recent activity only if container exists
        const recentActivityContainer = document.getElementById('recentActivity');
        if (recentActivityContainer) {
            const allActivity = [
                ...(borrowingRes.data || []).slice(0, 3).map(r => ({
                    ...r,
                    type: 'borrowing'
                })),
                ...(lendingRes.data || []).slice(0, 3).map(r => ({
                    ...r,
                    type: 'lending'
                }))
            ].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)).slice(0, 5);

            displayRecentActivity(allActivity);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function displayRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No recent activity</p>';
        return;
    }

    container.innerHTML = activities.map(activity => {
        // Use the flat property names from backend
        const itemName = activity.itemName || activity.item_name || activity.item?.name || 'Unknown Item';
        const lenderName = activity.lenderName || activity.lender_name || activity.lender?.name || 'Unknown Lender';
        const borrowerName = activity.borrowerName || activity.borrower_name || activity.borrower?.name || 'Unknown Borrower';
        
        return `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <i data-lucide="${activity.type === 'borrowing' ? 'shopping-bag' : 'truck'}" class="w-5 h-5 text-primary"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${itemName}</p>
                        <p class="text-sm text-gray-500">
                            ${activity.type === 'borrowing' ? 'Borrowing from' : 'Lending to'} 
                            ${activity.type === 'borrowing' ? lenderName : borrowerName}
                        </p>
                    </div>
                </div>
                <span class="px-3 py-1 text-xs rounded-full ${getStatusColor(activity.status)}">
                    ${activity.status}
                </span>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Load my items
async function loadMyItems() {
    try {
        console.log('Fetching my items from API...');
        const response = await api.getMyItems();
        console.log('API response:', response);
        console.log('Items data:', response.data);
        displayMyItems(response.data);
    } catch (error) {
        console.error('Error loading items:', error);
        const container = document.getElementById('myItemsGrid');
        if (container) {
            container.innerHTML = '<p class="text-red-500 col-span-4">Error loading items. Please refresh the page.</p>';
        }
    }
}

function displayMyItems(items) {
    const container = document.getElementById('myItemsGrid');
    
    console.log('Displaying items:', items);
    console.log('Container found:', !!container);
    
    // Log each item's is_active status
    items.forEach(item => {
        console.log(`Item ${item.id} (${item.name}): is_active = ${item.is_active} (type: ${typeof item.is_active})`);
    });
    
    if (!container) {
        console.error('myItemsGrid container not found!');
        return;
    }
    
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-3">No items listed yet. Click "List New Item" to add your first item!</p>';
        return;
    }

    container.innerHTML = items.map(item => {
        // Check if is_active is 1 (active) or 0 (inactive)
        const isActive = item.is_active === 1 || item.is_active === true;
        const hasActiveRental = item.has_active_rental === 1 || item.has_active_rental === true || item.has_active_rental === '1';
        console.log(`Rendering item ${item.id}: isActive = ${isActive}, hasActiveRental = ${hasActiveRental}`);

        const hideButton = `
            <button type="button" onclick="toggleItemStatus(${item.id}, ${isActive})" 
                class="px-2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white transition-all duration-200 flex items-center justify-center gap-1 font-semibold text-xs uppercase tracking-wide"
                title="Disable item">
                <i data-lucide="eye-off" class="w-3.5 h-3.5"></i>
                Hide
            </button>
        `;

        const editButton = hasActiveRental
            ? `
                <button type="button" disabled aria-disabled="true"
                    class="px-2 py-2.5 bg-gray-400 text-white cursor-not-allowed opacity-60 transition-all duration-200 flex items-center justify-center gap-1 font-semibold text-xs uppercase tracking-wide"
                    title="This item currently has an active rental. Editing will be available once the rental is completed.">
                    <i data-lucide="lock" class="w-3.5 h-3.5"></i>
                    Locked
                </button>
            `
            : `
                <button type="button" onclick="editItem(${item.id})"
                    class="px-2 py-2.5 bg-black text-white hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-1 font-semibold text-xs uppercase tracking-wide">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    Edit
                </button>
            `;

        const deleteButton = `
            <button type="button" onclick="deleteItem(${item.id})" 
                class="px-2 py-2.5 bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-all duration-200 flex items-center justify-center gap-1 font-semibold text-xs uppercase tracking-wide">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                Delete
            </button>
        `;

        const actionSection = !isActive
            ? `
                <div class="flex justify-center">
                    <button type="button" onclick="toggleItemStatus(${item.id}, ${isActive})" 
                        class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wide shadow-md hover:shadow-lg">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                        Unhide Item
                    </button>
                </div>
            `
            : `
                <div class="grid grid-cols-3 gap-2">
                    ${hideButton}
                    ${editButton}
                    ${deleteButton}
                </div>
                ${hasActiveRental ? '<p class="text-[11px] text-red-600 mt-2 text-center font-semibold uppercase tracking-wide">Lending in progress - editing locked</p>' : ''}
            `;

        return `
        <div class="bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100">
            <!-- Image Container - Smaller 1:1 Square -->
            <div class="relative w-full pb-[100%] overflow-hidden bg-gray-100 ${!isActive ? 'opacity-50' : ''}">
                <div class="absolute inset-0">
                    ${item.images && JSON.parse(item.images).length > 0 
                        ? `<img src="${JSON.parse(item.images)[0]}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" alt="${item.name}">`
                        : `<div class="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center">
                            <i data-lucide="package" class="w-16 h-16 text-white/20"></i>
                           </div>`
                    }
                </div>
                <!-- Status Badges - Top Right -->
                <div class="absolute top-3 right-3 flex flex-col gap-2">
                    ${hasActiveRental ? `
                        <div class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-sm">
                            Lending
                        </div>
                    ` : ''}
                    ${!isActive ? `
                        <div class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-red-600 text-white">
                            Disabled
                        </div>
                    ` : ''}
                    <div class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                        item.available 
                            ? 'bg-black text-white' 
                            : 'bg-white text-black'
                    }">
                        ${item.available ? 'Available' : 'Rented'}
                    </div>
                </div>
            </div>
            
            <!-- Content Section - Compact Modern Layout -->
            <div class="p-5">
                <!-- Title -->
                <h3 class="text-base font-bold text-gray-900 mb-2 uppercase tracking-wide line-clamp-1">${item.name}</h3>
                
                <!-- Description - Exactly 2 lines with proper truncation -->
                <p class="text-xs text-gray-500 mb-4 line-clamp-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; height: calc(1.4em * 2);">${item.description || 'No description available'}</p>
                
                <!-- Price Section - Compact Grid -->
                <div class="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-200">
                    <div>
                        <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Price</div>
                        <div class="text-xl font-bold text-gray-900">THB ${item.price}</div>
                        <div class="text-xs text-gray-400">per day</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Category</div>
                        <div class="text-xs font-bold text-gray-700 uppercase">${item.category || 'General'}</div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                ${actionSection}
            </div>
        </div>
    `;
    }).join('');

    lucide.createIcons();
}

// Load borrowing
async function loadMyBorrowing() {
    try {
        const response = await api.getMyBorrowing();
        displayRentals(response.data, 'borrowingList', 'borrower');
    } catch (error) {
        console.error('Error loading borrowing:', error);
    }
}

// Load lending
async function loadMyLending() {
    try {
        const response = await api.getMyLending();
        displayRentals(response.data, 'lendingList', 'lender');
    } catch (error) {
        console.error('Error loading lending:', error);
    }
}

function displayRentals(rentals, containerId, userType) {
    const container = document.getElementById(containerId);
    
    if (rentals.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No rentals found</p>';
        return;
    }

    container.innerHTML = rentals.map(rental => {
        const otherUser = userType === 'borrower' ? rental.lender : rental.borrower;
        return `
            <div class="bg-white p-6 rounded-lg shadow">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-start space-x-4">
                        <div class="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg flex items-center justify-center">
                            <i data-lucide="package" class="w-8 h-8 text-white"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-800">${rental.item.name}</h3>
                            <p class="text-sm text-gray-600">
                                ${userType === 'borrower' ? 'Lender' : 'Borrower'}: ${otherUser.name}
                            </p>
                            <p class="text-sm text-gray-600">
                                Phone: ${otherUser.phone}
                            </p>
                            <p class="text-sm text-gray-600">
                                Rental ID: ${rental.rentalId}
                            </p>
                        </div>
                    </div>
                    <span class="px-3 py-1 text-sm rounded-full ${getStatusColor(rental.status)}">
                        ${rental.status}
                    </span>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                        <span class="text-xs text-gray-500">Start Date</span>
                        <p class="font-medium">${new Date(rental.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <span class="text-xs text-gray-500">End Date</span>
                        <p class="font-medium">${new Date(rental.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <span class="text-xs text-gray-500">Total Price</span>
                        <p class="font-medium text-primary">THB ${rental.totalPrice}</p>
                    </div>
                    <div>
                        <span class="text-xs text-gray-500">Deposit</span>
                        <p class="font-medium">${rental.depositReturned ? '✓ Returned' : `$${rental.deposit}`}</p>
                    </div>
                </div>

                <div class="flex gap-2">
                    ${userType === 'lender' && rental.status === 'pending' ? `
                        <button onclick="updateRentalStatus('${rental._id}', 'approved')" class="btn-primary text-sm">
                            Approve
                        </button>
                        <button onclick="updateRentalStatus('${rental._id}', 'rejected')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                            Reject
                        </button>
                    ` : ''}
                    ${userType === 'lender' && rental.status === 'active' ? `
                        <button onclick="completeRental('${rental._id}')" class="btn-primary text-sm">
                            Mark as Completed
                        </button>
                    ` : ''}
                    ${userType === 'borrower' && rental.status === 'pending' ? `
                        <button onclick="updateRentalStatus('${rental._id}', 'cancelled')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                            Cancel Request
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

async function updateRentalStatus(rentalId, status) {
    try {
        await api.updateRentalStatus(rentalId, status);
        ui.showNotification(`Rental ${status} successfully`);
        loadDashboard();
        showSection('lending');
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

async function completeRental(rentalId) {
    try {
        await api.completeRental(rentalId);
        ui.showNotification('Rental completed and deposit returned');
        loadDashboard();
        showSection('lending');
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

// Load profile
async function loadProfile() {
    try {
        const response = await api.getProfile();
        const user = response.data;
        
        document.getElementById('profileName').value = user.name;
        document.getElementById('profileEmail').value = user.email;
        document.getElementById('profileLocation').value = user.location;
        document.getElementById('profilePhone').value = user.phone;
        document.getElementById('profilePassport').value = user.passportNo;
        document.getElementById('profileRating').textContent = Number(user.rating || 0).toFixed(1);
        
        lucide.createIcons();
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function handleUpdateProfile(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        location: formData.get('location'),
        phone: formData.get('phone')
    };

    try {
        const response = await api.updateProfile(userData);
        if (response.success) {
            currentUser = response.data;
            localStorage.setItem('user', JSON.stringify(currentUser));
            ui.showNotification('Profile updated successfully');
            loadProfile();
        }
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

// Item functions
async function handleAddItem(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // Collect photo files
    const photos = [];
    for (let i = 1; i <= 4; i++) {
        const photoInput = document.getElementById(`photo${i}`);
        if (photoInput && photoInput.files[0]) {
            // Convert to base64 for storage (in production, upload to cloud storage)
            const reader = new FileReader();
            await new Promise((resolve) => {
                reader.onload = (e) => {
                    photos.push(e.target.result);
                    resolve();
                };
                reader.readAsDataURL(photoInput.files[0]);
            });
        }
    }

    const itemData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        deposit: parseFloat(formData.get('deposit')),
        category: formData.get('category'),
        condition: formData.get('condition'),
        location: formData.get('location'),
        images: photos // Array of base64 images
    };

    try {
        const response = await api.createItem(itemData);
        if (response.success) {
            ui.showNotification('Item listed successfully! Your item is pending admin approval.');
            form.reset();
            // Clear photo previews
            for (let i = 1; i <= 4; i++) {
                removePhoto(i);
            }
            // Go back to dashboard or redirect if on standalone page
            if (window.location.pathname.includes('list_new_item.html')) {
                // On standalone list_new_item page - redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1500);
            } else {
                // On dashboard page - use section navigation
                showSection('dashboard');
            }
        }
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

async function deleteItem(itemId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        await api.deleteItem(itemId);
        Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Item has been deleted successfully.',
            confirmButtonColor: '#0d9488'
        });
        loadMyItems();
        // Only reload dashboard if we're on the dashboard page
        if (document.getElementById('statMyItems')) {
            loadDashboard();
        }
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

function editItem(itemId) {
    window.location.href = `/edit_item.html?id=${itemId}`;
}

async function toggleItemStatus(itemId, currentStatus) {
    const action = currentStatus ? 'disable' : 'enable';
    const result = await Swal.fire({
        title: `${action === 'disable' ? 'Disable' : 'Enable'} Item?`,
        html: `
            <p class="text-gray-700 mb-3">
                ${action === 'disable' 
                    ? 'This item will be hidden from browse and users cannot rent it.' 
                    : 'This item will be visible in browse and available for rent.'}
            </p>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: action === 'disable' ? '#ef4444' : '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Yes, ${action} it`,
        cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const response = await api.request(`/items/${itemId}/toggle-status`, {
            method: 'PUT'
        });
        
        // Reload items first to update UI
        await loadMyItems();
        
        // Reload dashboard stats if we're on dashboard
        if (document.getElementById('statMyItems')) {
            await loadDashboard();
        }
        
        // Then show success message
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: response.message,
            confirmButtonColor: '#0d9488',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to toggle item status',
            confirmButtonColor: '#ef4444'
        });
    }
}

// Helper functions
function getStatusColor(status) {
    const colors = {
        pending: 'bg-yellow-100 text-yellow-700',
        approved: 'bg-blue-100 text-blue-700',
        active: 'bg-green-100 text-green-700',
        completed: 'bg-gray-100 text-gray-700',
        cancelled: 'bg-red-100 text-red-700',
        rejected: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
}

// Initialize on load
lucide.createIcons();

// Only load dashboard if we're on the dashboard page
if (window.location.pathname === '/dashboard.html' || window.location.pathname.endsWith('/dashboard.html')) {
    loadDashboard();
}
