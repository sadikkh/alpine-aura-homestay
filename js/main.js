/**
 * Alpine Aura Homestay - Main JavaScript File
 * Core functionality with AWS integration
 */

// ===== GLOBAL VARIABLES =====
const API_BASE_URL = window.location.origin + '/php/booking.php';
let currentRooms = [];
let selectedDates = {
    checkin: '',
    checkout: '',
    nights: 0
};

// ===== DOM CONTENT LOADED =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏔️ Alpine Aura Homestay - Initializing...');
    
    // Initialize all components
    initializeApp();
    setupEventListeners();
    loadRoomsPreview();
    
    // Hide loading screen
    setTimeout(() => {
        hideLoadingScreen();
    }, 1500);
    
    console.log('✅ Alpine Aura initialized successfully!');
});

// ===== APP INITIALIZATION =====
function initializeApp() {
    // Set minimum dates for date inputs
    setMinimumDates();
    
    // Initialize navbar scroll effect
    initializeNavbar();
    
    // Initialize back to top button
    initializeBackToTop();
    
    // Initialize date change listeners
    initializeDateListeners();
    
    // Test API connection
    testAPIConnection();
}

// ===== LOADING SCREEN =====
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// ===== NAVBAR FUNCTIONALITY =====
function initializeNavbar() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ===== BACK TO TOP BUTTON =====
function initializeBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// ===== DATE FUNCTIONALITY =====
function setMinimumDates() {
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    
    if (checkinInput && checkoutInput) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        checkinInput.min = todayStr;
        checkoutInput.min = tomorrowStr;
        
        // Set default dates
        checkinInput.value = todayStr;
        checkoutInput.value = tomorrowStr;
        
        updateNightsDisplay();
    }
}

function initializeDateListeners() {
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    
    if (checkinInput && checkoutInput) {
        checkinInput.addEventListener('change', () => {
            const checkinDate = new Date(checkinInput.value);
            const checkoutDate = new Date(checkoutInput.value);
            
            // Update minimum checkout date
            const nextDay = new Date(checkinDate);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutInput.min = nextDay.toISOString().split('T')[0];
            
            // If checkout is before or same as checkin, update it
            if (checkoutDate <= checkinDate) {
                checkoutInput.value = nextDay.toISOString().split('T')[0];
            }
            
            updateNightsDisplay();
        });
        
        checkoutInput.addEventListener('change', updateNightsDisplay);
    }
}

function updateNightsDisplay() {
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    const nightsText = document.getElementById('nightsText');
    
    if (checkinInput && checkoutInput && nightsText) {
        const checkin = checkinInput.value;
        const checkout = checkoutInput.value;
        
        if (checkin && checkout) {
            const checkinDate = new Date(checkin);
            const checkoutDate = new Date(checkout);
            const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
            const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            if (nights > 0) {
                selectedDates = { checkin, checkout, nights };
                nightsText.textContent = `${nights} night${nights > 1 ? 's' : ''} stay`;
            } else {
                nightsText.textContent = 'Select valid dates';
            }
        } else {
            nightsText.textContent = 'Select dates to see duration';
        }
    }
}

// ===== API FUNCTIONS =====
function testAPIConnection() {
    fetch(`${API_BASE_URL}?action=test_connection`)
        .then(response => response.json())
        .then(data => {
            console.log('🔗 API Connection Test:', data);
            
            if (data.success) {
                console.log('✅ Connected to AWS DynamoDB successfully!');
                showNotification('Connected to AWS DynamoDB', 'success');
            } else {
                console.log('ℹ️ Running in demo mode with mock data');
                showNotification('Running in demo mode', 'info');
            }
        })
        .catch(error => {
            console.error('❌ API connection failed:', error);
            loadMockData();
        });
}

function loadRoomsPreview() {
    const roomsContainer = document.getElementById('roomsPreview');
    if (!roomsContainer) return;
    
    console.log('🏠 Loading rooms preview...');
    
    // Try API first, fallback to mock data
    fetch(`${API_BASE_URL}?action=get_rooms`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.rooms) {
                currentRooms = data.rooms;
                displayRoomsPreview(data.rooms.slice(0, 3));
                console.log(`✅ Loaded ${data.rooms.length} rooms from ${data.source}`);
            } else {
                throw new Error('API returned no data');
            }
        })
        .catch(error => {
            console.log('ℹ️ Loading mock room data');
            loadMockData();
        });
}

function loadMockData() {
    const mockRooms = [
        {
            room_id: 'room-001',
            name: 'Mountain View Deluxe',
            description: 'Wake up to breathtaking Himalayan views from your private balcony.',
            price: 2500,
            capacity: 3,
            amenities: ['Mountain View', 'AC', 'WiFi', 'Private Bathroom', 'Balcony'],
            images: ['https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&h=400&fit=crop&q=80']
        },
        {
            room_id: 'room-002',
            name: 'Cozy Garden Room',
            description: 'Peaceful garden views with modern amenities and comfortable furnishing.',
            price: 2000,
            capacity: 2,
            amenities: ['Garden View', 'WiFi', 'Private Bathroom', 'Work Desk'],
            images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&q=80']
        },
        {
            room_id: 'room-003',
            name: 'Family Suite',
            description: 'Spacious suite perfect for families with separate living area.',
            price: 3500,
            capacity: 6,
            amenities: ['Mountain View', 'Living Area', 'Kitchenette', 'WiFi', '2 Bathrooms'],
            images: ['https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop&q=80']
        }
    ];
    
    currentRooms = mockRooms;
    displayRoomsPreview(mockRooms);
}

function displayRoomsPreview(rooms) {
    const roomsContainer = document.getElementById('roomsPreview');
    if (!roomsContainer || !rooms.length) return;
    
    let html = '';
    
    rooms.forEach((room, index) => {
        const isPopular = index === 0;
        const imageUrl = room.images && room.images.length > 0 
            ? room.images[0] 
            : 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&h=400&fit=crop&q=80';
        
        html += `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="room-card h-100">
                    <div class="room-image" style="position: relative; overflow: hidden; height: 250px;">
                        <img src="${imageUrl}" alt="${room.name}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
                        <div style="position: absolute; top: 15px; right: 15px; background: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; color: #2563eb; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            ₹${formatNumber(room.price)}
                            <span style="font-size: 12px; font-weight: normal; color: #666;">/night</span>
                        </div>
                        ${isPopular ? '<div style="position: absolute; top: 15px; left: 15px; background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Most Popular</div>' : ''}
                    </div>
                    <div style="padding: 24px;">
                        <h4 style="margin-bottom: 12px;">${room.name}</h4>
                        <p style="color: #666; margin-bottom: 16px;">${room.description.substring(0, 100)}${room.description.length > 100 ? '...' : ''}</p>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; font-size: 14px; color: #666;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-users" style="color: #2563eb;"></i>
                                <span>Up to ${room.capacity} guests</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-wifi" style="color: #2563eb;"></i>
                                <span>Free WiFi</span>
                            </div>
                        </div>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 20px;">
                            ${room.amenities ? room.amenities.slice(0, 3).map(amenity => 
                                `<span style="background: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${amenity}</span>`
                            ).join('') : ''}
                            ${room.amenities && room.amenities.length > 3 ? 
                                `<span style="background: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">+${room.amenities.length - 3} more</span>` : ''}
                        </div>
                        
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-outline-primary btn-sm" onclick="showRoomDetails('${room.room_id || room.id}')" style="flex: 1;">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                            <a href="booking.html?room=${room.room_id || room.id}" class="btn btn-primary btn-sm" style="flex: 1; text-decoration: none;">
                                <i class="fas fa-calendar-check"></i> Book Now
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    roomsContainer.innerHTML = html;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Availability form submission
    const availabilityForm = document.getElementById('availabilityForm');
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', handleAvailabilitySearch);
    }
}

function handleAvailabilitySearch(event) {
    event.preventDefault();
    
    const formData = {
        checkin: document.getElementById('checkin').value,
        checkout: document.getElementById('checkout').value,
        adults: parseInt(document.getElementById('adults').value),
        children: parseInt(document.getElementById('children').value)
    };
    
    // Validate form data
    if (!formData.checkin || !formData.checkout) {
        showNotification('Please select check-in and check-out dates', 'error');
        return;
    }
    
    if (new Date(formData.checkin) >= new Date(formData.checkout)) {
        showNotification('Check-out date must be after check-in date', 'error');
        return;
    }
    
    searchAvailability(formData);
}

function searchAvailability(formData) {
    const searchBtn = document.querySelector('.search-btn');
    const btnText = searchBtn.querySelector('span');
    const btnSpinner = searchBtn.querySelector('.btn-spinner');
    
    // Show loading state
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');
    searchBtn.disabled = true;
    
    console.log('🔍 Searching availability...', formData);
    
    // Simulate search or make real API call
    setTimeout(() => {
        // Hide loading state
        btnText.classList.remove('d-none');
        btnSpinner.classList.add('d-none');
        searchBtn.disabled = false;
        
        // Show success and redirect
        showNotification('Found available rooms!', 'success');
        
        setTimeout(() => {
            const params = new URLSearchParams(formData);
            window.location.href = `rooms.html?${params}`;
        }, 1000);
    }, 2000);
}

// ===== ROOM DETAILS MODAL =====
function showRoomDetails(roomId) {
    const room = currentRooms.find(r => (r.room_id || r.id) === roomId);
    if (!room) {
        showNotification('Room details not found', 'error');
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="roomDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${room.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <img src="${room.images && room.images[0] ? room.images[0] : 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&h=400&fit=crop&q=80'}" 
                                     alt="${room.name}" class="img-fluid rounded mb-3">
                            </div>
                            <div class="col-md-6">
                                <h4 class="text-primary mb-3">₹${formatNumber(room.price)} / night</h4>
                                <p class="mb-3">${room.description}</p>
                                
                                <h6>Room Details:</h6>
                                <ul class="list-unstyled mb-3">
                                    <li><i class="fas fa-users text-primary me-2"></i> Capacity: ${room.capacity} guests</li>
                                    <li><i class="fas fa-bed text-primary me-2"></i> Comfortable bedding</li>
                                    <li><i class="fas fa-wifi text-primary me-2"></i> Free WiFi</li>
                                </ul>
                                
                                <h6>Amenities:</h6>
                                <div class="mb-3">
                                    ${room.amenities ? room.amenities.map(amenity => 
                                        `<span class="badge bg-primary me-1 mb-1">${amenity}</span>`
                                    ).join('') : 'Standard amenities included'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <a href="booking.html?room=${room.room_id || room.id}" class="btn btn-primary">
                            <i class="fas fa-calendar-check"></i> Book This Room
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('roomDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('roomDetailsModal'));
    modal.show();
    
    // Clean up when modal is hidden
    document.getElementById('roomDetailsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 100px;
        right: 20px;
        z-index: 1060;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${icons[type] || icons.info} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
    
    console.log(`📢 Notification (${type}): ${message}`);
}

// ===== UTILITY FUNCTIONS =====
function formatNumber(number) {
    return new Intl.NumberFormat('en-IN').format(number);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

console.log('📜 Alpine Aura main.js loaded successfully');
