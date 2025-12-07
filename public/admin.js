// Admin Panel JavaScript

// Check if user is admin
if (!currentUser || currentUser.role !== 'admin') {
    ui.showNotification('Access denied. Admin only.', 'error');
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 2000);
}

// Section navigation
function showAdminSection(sectionName) {
    // Update tabs - remove active class from all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to selected tab
    const activeTab = document.getElementById(`${sectionName}Tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Update sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(`${sectionName}Section`).classList.remove('hidden');

    // Load section data
    switch(sectionName) {
        case 'users':
            loadUsers();
            break;
        case 'items':
            loadAllItems();
            break;
        case 'rentals':
            loadAllRentals();
            break;
        case 'verifications':
            loadPendingVerifications();
            break;
        case 'stats':
            loadStatistics();
            break;
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navLinks = document.querySelector('.top-nav-links');
    if (navLinks) {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.right = '0';
        navLinks.style.backgroundColor = 'white';
        navLinks.style.padding = '1rem';
        navLinks.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        navLinks.style.borderRadius = '0.5rem';
        navLinks.style.marginTop = '0.5rem';
    }
}

// Load all users
async function loadUsers() {
    try {
        const response = await api.getAllUsers();
        displayUsers(response.data);
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    tbody.innerHTML = users.map(user => {
        // Format date safely
        let joinedDate = 'N/A';
        try {
            const dateField = user.dateJoined || user.created_at || user.createdAt;
            if (dateField) {
                const date = new Date(dateField);
                if (!isNaN(date.getTime())) {
                    joinedDate = date.toLocaleDateString();
                }
            }
        } catch (e) {
            joinedDate = 'N/A';
        }
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${user.name || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${user.email || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${user.location || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${user.phone || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${user.passportNo || user.passport_no || user.passport || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                }">
                    ${user.role || 'user'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center text-sm text-gray-600">
                    <i data-lucide="star" class="w-4 h-4 text-yellow-500 mr-1"></i>
                    ${Number(user.rating || 0).toFixed(1)}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${user.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${joinedDate}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="editUser('${user.id || user._id}')" class="text-blue-600 hover:text-blue-800 mr-3">
                    Edit
                </button>
                ${user.role !== 'admin' ? `
                    <button onclick="deleteUserAdmin('${user.id || user._id}')" class="text-red-600 hover:text-red-800">
                        Delete
                    </button>
                ` : ''}
            </td>
        </tr>
    `;
    }).join('');

    lucide.createIcons();
}

// Edit user
async function editUser(userId) {
    try {
        const response = await api.request(`/users/${userId}`);
        const user = response.data;
        
        console.log('Edit User Data:', user); // Debug log
        
        document.getElementById('editUserId').value = user.id || user._id;
        document.getElementById('editUserName').value = user.name || '';
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUserRole').value = user.role || 'user';
        document.getElementById('editUserStatus').value = (user.isActive !== undefined ? user.isActive : true).toString();
        
        ui.showModal('editUserModal');
    } catch (error) {
        console.error('Edit User Error:', error);
        ui.showNotification(error.message || 'Failed to load user data', 'error');
    }
}

async function handleUpdateUser(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const userId = document.getElementById('editUserId').value;
    
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        role: formData.get('role'),
        isActive: formData.get('isActive') === 'true'
    };

    try {
        await api.updateUser(userId, userData);
        ui.showNotification('User updated successfully');
        ui.hideModal('editUserModal');
        loadUsers();
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

async function deleteUserAdmin(userId) {
    const result = await Swal.fire({
        title: 'Delete User?',
        text: "This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete user!',
        cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        await api.deleteUser(userId);
        Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'User has been deleted successfully.',
            confirmButtonColor: '#0d9488'
        });
        loadUsers();
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

// Load all items
async function loadAllItems() {
    try {
        const response = await api.getItems();
        displayAllItems(response.data);
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

function displayAllItems(items) {
    const tbody = document.getElementById('itemsTableBody');
    
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-8 text-center text-gray-500">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-gray-400"></i>
                    <p>No items found</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }
    
    tbody.innerHTML = items.map(item => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${item.id || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${item.name || 'Unnamed'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${item.owner_name || item.owner?.name || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${item.category || 'Uncategorized'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">THB ${item.price || 0}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">$${item.deposit || 0}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${
                    item.status === 'available' || item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${item.status === 'available' || item.isAvailable ? 'Available' : 'Rented'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center text-sm text-gray-600">
                    <i data-lucide="star" class="w-4 h-4 text-yellow-500 mr-1"></i>
                    ${Number(item.rating || 0).toFixed(1)}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="viewItemDetails('${item.id || item._id}')" class="text-blue-600 hover:text-blue-800 mr-3">
                    View
                </button>
                <button onclick="deleteItemAdmin('${item.id || item._id}')" class="text-red-600 hover:text-red-800">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

async function deleteItemAdmin(itemId) {
    const result = await Swal.fire({
        title: 'Delete Item?',
        text: "This will permanently remove this item!",
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
        loadAllItems();
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

// Load all rentals
async function loadAllRentals() {
    try {
        const response = await api.getAllRentals();
        displayAllRentals(response.data);
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

function displayAllRentals(rentals) {
    const tbody = document.getElementById('rentalsTableBody');
    
    tbody.innerHTML = rentals.map(rental => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${rental.rentalId}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${rental.item.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${rental.borrower.name}</div>
                <div class="text-xs text-gray-500">${rental.borrower.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${rental.lender.name}</div>
                <div class="text-xs text-gray-500">${rental.lender.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${new Date(rental.startDate).toLocaleDateString()}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${new Date(rental.endDate).toLocaleDateString()}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">THB ${rental.totalPrice}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${getStatusColor(rental.status)}">
                    ${rental.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="viewRentalDetails('${rental._id}')" class="text-blue-600 hover:text-blue-800">
                    View
                </button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function viewRentalDetails(rentalId) {
    ui.showNotification('Rental details view coming soon');
}

// Load statistics
async function loadStatistics() {
    try {
        const [usersRes, itemsRes, rentalsRes] = await Promise.all([
            api.getAllUsers(),
            api.getItems(),
            api.getAllRentals()
        ]);

        document.getElementById('totalUsers').textContent = usersRes.count;
        document.getElementById('totalItems').textContent = itemsRes.count;
        document.getElementById('totalRentals').textContent = rentalsRes.count;
        
        const activeRentals = rentalsRes.data.filter(r => r.status === 'active' || r.status === 'approved');
        document.getElementById('activeRentals').textContent = activeRentals.length;

        lucide.createIcons();
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

// Helper function
function getStatusColor(status) {
    const colors = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-blue-100 text-blue-800',
        active: 'bg-green-100 text-green-800',
        completed: 'bg-gray-100 text-gray-800',
        cancelled: 'bg-red-100 text-red-800',
        rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// Load pending verifications
let currentVerifications = []; // Store verifications globally

async function loadPendingVerifications() {
    try {
        const response = await api.getPendingVerifications();
        currentVerifications = response.data; // Store the data
        displayVerifications(currentVerifications);
    } catch (error) {
        ui.showNotification(error.message, 'error');
    }
}

function displayVerifications(verifications) {
    const tbody = document.getElementById('verificationsTableBody');
    
    if (verifications.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-gray-400"></i>
                    <p>No pending verifications</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = verifications.map((user, index) => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-800">${user.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-600">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-600">${user.phone}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-mono bg-gray-100 px-2 py-1 rounded">${user.passport_no || 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${user.passport_image ? `
                    <button data-passport-index="${index}" class="view-passport-btn text-primary hover:underline">
                        <i data-lucide="eye" class="w-4 h-4 inline mr-1"></i>
                        View Document
                    </button>
                ` : '<span class="text-gray-400">No document</span>'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${new Date(user.created_at).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex space-x-2">
                    <button onclick="handleVerification(${user.id}, 'verified')" 
                            class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors">
                        <i data-lucide="check" class="w-4 h-4 inline mr-1"></i>
                        Approve
                    </button>
                    <button onclick="handleVerification(${user.id}, 'rejected')" 
                            class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors">
                        <i data-lucide="x" class="w-4 h-4 inline mr-1"></i>
                        Reject
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
    
    // Add event listeners for passport view buttons
    document.querySelectorAll('.view-passport-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-passport-index'));
            const user = currentVerifications[index];
            if (user && user.passport_image) {
                viewPassportImage(user.passport_image);
            }
        });
    });
}

function viewPassportImage(imageData) {
    Swal.fire({
        title: 'Passport/ID Document',
        imageUrl: imageData,
        imageAlt: 'Passport/ID Image',
        imageWidth: 600,
        imageHeight: 'auto',
        showCloseButton: true,
        showConfirmButton: false,
        width: 'auto'
    });
}

async function handleVerification(userId, status) {
    const action = status === 'verified' ? 'approve' : 'reject';
    
    const result = await Swal.fire({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Verification?`,
        text: `Are you sure you want to ${action} this lender verification request?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: status === 'verified' ? '#10b981' : '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Yes, ${action}!`,
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            const response = await api.verifyLender(userId, status);
            
            if (response.success) {
                ui.showNotification(
                    `User ${status === 'verified' ? 'verified' : 'rejected'} successfully!`,
                    'success'
                );
                loadPendingVerifications(); // Reload the list
            }
        } catch (error) {
            ui.showNotification(error.message, 'error');
        }
    }
}

// Initialize
loadUsers();
