// API Configuration
// Use a relative same-origin path so the front-end and API share the exact origin
// This avoids CORS issues when the page is served from 127.0.0.1:3000 but the API
// was referenced using a different host (e.g. 'localhost').
const API_URL = '/api';

// Auth State
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let authToken = localStorage.getItem('token') || null;

// API Helper Functions
const api = {
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error: Please make sure the backend server is running');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // User APIs
  async register(userData) {
    const data = await this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return data;
  },

  async login(credentials) {
    const data = await this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (data.success) {
      authToken = data.data.token;
      currentUser = data.data;
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(data.data));
    }
    return data;
  },

  logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async getProfile() {
    return await this.request('/users/profile');
  },

  async updateProfile(userData) {
    return await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  // Admin User APIs
  async getAllUsers() {
    return await this.request('/users');
  },

  async updateUser(userId, userData) {
    return await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  async deleteUser(userId) {
    return await this.request(`/users/${userId}`, {
      method: 'DELETE'
    });
  },

  // Lender Verification APIs
  async submitLenderVerification(verificationData) {
    return await this.request('/users/verify-lender', {
      method: 'POST',
      body: JSON.stringify(verificationData)
    });
  },

  async getPendingVerifications() {
    return await this.request('/users/pending-verifications');
  },

  async verifyLender(userId, status) {
    return await this.request(`/users/verify/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // Item APIs
  async getItems(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return await this.request(`/items?${query}`);
  },

  async getItemById(id) {
    return await this.request(`/items/${id}`);
  },

  async createItem(itemData) {
    return await this.request('/items', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  },

  async updateItem(id, itemData) {
    return await this.request(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });
  },

  async deleteItem(id) {
    return await this.request(`/items/${id}`, {
      method: 'DELETE'
    });
  },

  async getMyItems() {
    return await this.request('/items/my/listings');
  },

  // Rental APIs
  async createRental(rentalData) {
    return await this.request('/rentals', {
      method: 'POST',
      body: JSON.stringify(rentalData)
    });
  },

  async getMyBorrowing() {
    return await this.request('/rentals/myborrowing');
  },

  async getMyLending() {
    return await this.request('/rentals/mylending');
  },

  async updateRentalStatus(rentalId, status) {
    return await this.request(`/rentals/${rentalId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async completeRental(rentalId) {
    return await this.request(`/rentals/${rentalId}/complete`, {
      method: 'PUT'
    });
  },

  async getAllRentals() {
    return await this.request('/rentals');
  },

  async getRentalProgress(rentalId) {
    return await this.request(`/rentals/progress/${rentalId}`);
  },

  async updateRefundInfo(rentalId, refundData) {
    return await this.request(`/rentals/${rentalId}/refund-info`, {
      method: 'POST',
      body: JSON.stringify(refundData)
    });
  },

  async confirmReturn(rentalId) {
    return await this.request('/rentals/confirm-return', {
      method: 'POST',
      body: JSON.stringify({ rental_id: rentalId })
    });
  },

  // Payment APIs
  async createPayment(paymentData) {
    return await this.request('/payments/create', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },

  async approvePayment(rentalId) {
    return await this.request('/payments/approve', {
      method: 'POST',
      body: JSON.stringify({ rental_id: rentalId })
    });
  },

  async transferToLender(rentalId) {
    return await this.request('/payments/transfer', {
      method: 'POST',
      body: JSON.stringify({ rental_id: rentalId })
    });
  },

  async refundDeposit(rentalId) {
    return await this.request('/payments/refund', {
      method: 'POST',
      body: JSON.stringify({ rental_id: rentalId })
    });
  },

  async getPaymentHistory() {
    return await this.request('/payments/history');
  },

  // Support APIs
  async createSupportTicket(ticketData) {
    return await this.request('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData)
    });
  },

  async getSupportTickets() {
    return await this.request('/support/tickets');
  },

  async getAllSupportTickets() {
    return await this.request('/support/tickets/admin');
  },

  async updateSupportTicketStatus(ticketId, payload) {
    return await this.request(`/support/tickets/${ticketId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getSupportTicketMessages(ticketId) {
    return await this.request(`/support/tickets/${ticketId}/messages`);
  },

  async replySupportTicket(ticketId, payload) {
    return await this.request(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Chat APIs
  async sendMessage(messageData) {
    return await this.request('/chat/send', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  },

  async getChatMessages(rentalId) {
    return await this.request(`/chat/${rentalId}`);
  },

  async getUnreadCount() {
    return await this.request('/chat/unread/count');
  },

  // Review APIs
  async createReview(reviewData) {
    return await this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  },

  async getItemReviews(itemId) {
    return await this.request(`/reviews/item/${itemId}`);
  },

  async getUserReviews(userId) {
    return await this.request(`/reviews/user/${userId}`);
  },

  // Banking APIs
  async getAllBanking() {
    return await this.request('/banking');
  },

  async getBankingById(id) {
    return await this.request(`/banking/${id}`);
  },

  async getActiveBanking() {
    return await this.request('/banking/active');
  },

  async createBanking(bankingData) {
    return await this.request('/banking', {
      method: 'POST',
      body: JSON.stringify(bankingData)
    });
  },

  async updateBanking(id, bankingData) {
    return await this.request(`/banking/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bankingData)
    });
  },

  async toggleBankingStatus(id, isActive) {
    return await this.request(`/banking/${id}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive })
    });
  },

  async deleteBanking(id) {
    return await this.request(`/banking/${id}`, {
      method: 'DELETE'
    });
  }
};

// UI Helper Functions
const ui = {
  showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
  },

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  },

  showNotification(message, type = 'success') {
    Swal.fire({
      icon: type === 'error' ? 'error' : 'success',
      title: type === 'error' ? 'Error!' : 'Success!',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  },

  updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    // Only update if elements exist (not on login/signup pages)
    if (!authButtons || !userMenu) return;

    if (currentUser) {
      authButtons.classList.add('hidden');
      userMenu.classList.remove('hidden');
      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.textContent = currentUser.name;
      
      // Show/hide admin menu
      if (currentUser.role === 'admin') {
        document.getElementById('adminMenuItem')?.classList.remove('hidden');
      }
    } else {
      authButtons.classList.remove('hidden');
      userMenu.classList.add('hidden');
    }
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  ui.updateAuthUI();
  
  // Only load items if we're on the index page
  if (typeof loadItems === 'function') {
    loadItems();
  }
});

// Auth Functions
async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  const userData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    location: formData.get('location'),
    phone: formData.get('phone'),
    passportNo: formData.get('passportNo')
  };

  try {
    const response = await api.register(userData);
    if (response.success) {
      ui.showNotification('Registration successful! Please login.');
      ui.hideModal('registerModal');
      form.reset();
      ui.showModal('loginModal');
    }
  } catch (error) {
    ui.showNotification(error.message, 'error');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  const credentials = {
    email: formData.get('email'),
    password: formData.get('password')
  };

  try {
    const response = await api.login(credentials);
    if (response.success) {
      ui.showNotification('Login successful!');
      ui.hideModal('loginModal');
      form.reset();
      ui.updateAuthUI();
      loadDashboard();
    }
  } catch (error) {
    ui.showNotification(error.message, 'error');
  }
}

function handleLogout() {
  api.logout();
  ui.updateAuthUI();
  ui.showNotification('Logged out successfully');
  window.location.href = '/index.html';
}

// Item Functions
async function loadItems(filters = {}) {
  try {
    const response = await api.getItems(filters);
    displayItems(response.data);
    
    // Store items globally for search suggestions (only on index page)
    if (typeof allItems !== 'undefined') {
      allItems = response.data || [];
    }
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

function displayItems(items) {
  const container = document.getElementById('itemsGrid');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="card hover:shadow-xl transition-shadow cursor-pointer" onclick="viewItemDetails('${item._id}')">
      <div class="h-48 bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg mb-4 flex items-center justify-center">
        <i data-lucide="package" class="w-16 h-16 text-white"></i>
      </div>
      <h3 class="text-lg font-bold text-gray-800 mb-2">${item.name}</h3>
      <p class="text-sm text-gray-600 mb-3 line-clamp-2">${item.description.substring(0, 100)}...</p>
      <div class="flex items-center justify-between mb-3">
        <div>
          <span class="text-xs text-gray-500">Price/day</span>
          <p class="text-xl font-bold text-primary">THB ${item.price}</p>
        </div>
        <div>
          <span class="text-xs text-gray-500">Deposit</span>
          <p class="text-lg font-semibold text-gray-700">$${item.deposit}</p>
        </div>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="flex items-center text-gray-600">
          <i data-lucide="map-pin" class="w-4 h-4 mr-1"></i>
          ${item.location}
        </span>
        <span class="flex items-center text-yellow-500">
          <i data-lucide="star" class="w-4 h-4 mr-1"></i>
          ${(parseFloat(item.rating) || 0).toFixed(1)}
        </span>
      </div>
      <div class="mt-3">
        <span class="inline-block px-3 py-1 text-xs rounded-full ${
          item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }">
          ${item.isAvailable ? 'Available' : 'Rented'}
        </span>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

async function viewItemDetails(itemId) {
  try {
    // Validate itemId
    if (!itemId || itemId === 'undefined') {
      console.error('Invalid itemId:', itemId);
      ui.showNotification('Cannot view item details - invalid item ID', 'error');
      return;
    }
    
    const response = await api.getItemById(itemId);
    const item = response.data;
    
    document.getElementById('itemDetailContent').innerHTML = `
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <div class="h-64 bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg flex items-center justify-center mb-4">
            <i data-lucide="package" class="w-32 h-32 text-white"></i>
          </div>
        </div>
        <div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">${item.name}</h2>
          <div class="flex items-center gap-4 mb-4">
            <span class="flex items-center text-yellow-500">
              <i data-lucide="star" class="w-5 h-5 mr-1"></i>
              ${(parseFloat(item.rating) || 0).toFixed(1)} (${item.totalReviews || 0} reviews)
            </span>
            <span class="inline-block px-3 py-1 text-sm rounded-full ${
              item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }">
              ${item.isAvailable ? 'Available' : 'Rented'}
            </span>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg mb-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-sm text-gray-500">Price per day</span>
                <p class="text-2xl font-bold text-primary">THB ${item.price}</p>
              </div>
              <div>
                <span class="text-sm text-gray-500">Deposit</span>
                <p class="text-2xl font-bold text-gray-700">$${item.deposit}</p>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <h3 class="font-semibold text-gray-800 mb-2">Description</h3>
            <div class="text-gray-600 whitespace-pre-line">${item.description}</div>
          </div>

          <div class="mb-4">
            <p class="text-sm text-gray-600">
              <i data-lucide="map-pin" class="w-4 h-4 inline mr-1"></i>
              ${item.location}
            </p>
            <p class="text-sm text-gray-600">
              <i data-lucide="user" class="w-4 h-4 inline mr-1"></i>
              Owner: ${item.owner?.name || 'N/A'} (Rating: ${(parseFloat(item.owner?.rating) || 0).toFixed(1)})
            </p>
          </div>

          ${currentUser && item.isAvailable && item.owner._id !== currentUser._id ? `
            <button onclick="showRentalForm('${item._id}')" class="btn-primary w-full">
              <i data-lucide="calendar" class="w-4 h-4 inline mr-2"></i>
              Request to Rent
            </button>
          ` : ''}
        </div>
      </div>
    `;

    lucide.createIcons();
    ui.showModal('itemDetailModal');
  } catch (error) {
    ui.showNotification(error.message, 'error');
  }
}

function showRentalForm(itemId) {
  ui.hideModal('itemDetailModal');
  document.getElementById('rentalItemId').value = itemId;
  ui.showModal('rentalModal');
}

async function handleCreateRental(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const rentalData = {
    itemId: formData.get('itemId'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate')
  };

  try {
    const response = await api.createRental(rentalData);
    if (response.success) {
      ui.showNotification('Rental request sent successfully!');
      ui.hideModal('rentalModal');
      form.reset();
      loadItems();
    }
  } catch (error) {
    ui.showNotification(error.message, 'error');
  }
}

// Search functionality
function handleSearch(event) {
  event.preventDefault();
  const searchTerm = document.getElementById('searchInput').value;
  loadItems({ search: searchTerm });
}
