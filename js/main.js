

/**
 * Alpine Aura Homestay - Main JavaScript File
 * Modern frontend functionality with AWS integration
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
    
    // Initialize statistics animation
    initializeStatsAnimation();
    
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

// ===== STATISTICS ANIMATION =====
function initializeStatsAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number[data-count]');
    
    const animateStats = () => {
        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-count'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60 FPS
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                if (target === 4.9) {
                    stat.textContent = current.toFixed(1);
                } else {
                    stat.textContent = Math.floor(current);
                }
            }, 16);
        });
    };
    
    // Use Intersection Observer to trigger animation when visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                observer.disconnect(); // Run only once
            }
        });
    });
    
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observer.observe(statsSection);
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
            showNotification('API connection failed', 'error');
        });
}

function loadRoomsPreview() {
    const roomsContainer = document.getElementById('roomsPreview');
    if (!roomsContainer) return;
    
    console.log('🏠 Loading rooms preview...');
    
    fetch(`${API_BASE_URL}?action=get_rooms`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.rooms) {
                currentRooms = data.rooms;
                displayRoomsPreview(data.rooms.slice(0, 3)); // Show first 3 rooms
                console.log(`✅ Loaded ${data.rooms.length} rooms from ${data.source}`);
            } else {
                throw new Error(data.error || 'Failed to load rooms');
            }
        })
        .catch(error => {
            console.error('❌ Error loading rooms:', error);
            roomsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Unable to load rooms. Please try again later.
                    </div>
                </div>
            `;
        });
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
                    <div class="room-image">
                        <img src="${imageUrl}" alt="${room.name}" class="img-fluid">
                        <div class="room-price">
                            ₹${formatNumber(room.price)}
                            <span>/night</span>
                        </div>
                        ${isPopular ? '<div class="room-badge">Most Popular</div>' : ''}
                    </div>
                    <div class="room-content">
                        <h4>${room.name}</h4>
                        <p class="text-muted">${room.description.substring(0, 100)}${room.description.length > 100 ? '...' : ''}</p>
                        
                        <div class="room-details mb-3">
                            <div class="detail-item">
                                <i class="fas fa-users"></i>
                                <span>Up to ${room.capacity} guests</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-expand-arrows-alt"></i>
                                <span>${room.room_size || '25 sqm'}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-bed"></i>
                                <span>${room.bed_type || 'Comfortable bed'}</span>
                            </div>
                        </div>
                        
                        <div class="room-amenities mb-3">
                            ${room.amenities ? room.amenities.slice(0, 4).map(amenity => 
                                `<span class="amenity-tag">${amenity}</span>`
                            ).join('') : ''}
                            ${room.amenities && room.amenities.length > 4 ? 
                                `<span class="amenity-tag">+${room.amenities.length - 4} more</span>` : ''}
                        </div>
                        
                        <div class="room-footer">
                            <button class="btn btn-outline-primary btn-sm me-2" onclick="showRoomDetails('${room.room_id || room.id}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                            <a href="booking.html?room=${room.room_id || room.id}" class="btn btn-primary btn-sm">
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

// ===== BOOKING FUNCTIONALITY =====
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
    
    if (new Date(formData.checkin) < new Date()) {
        showNotification('Check-in date cannot be in the past', 'error');
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
    
    const totalGuests = formData.adults + formData.children;
    const params = new URLSearchParams({
        action: 'check_availability',
        checkin: formData.checkin,
        checkout: formData.checkout,
        adults: formData.adults,
        children: formData.children
    });
    
    console.log('🔍 Searching availability...', formData);
    
    fetch(`${API_BASE_URL}?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.rooms) {
                console.log(`✅ Found ${data.rooms.length} available rooms`);
                
                // Store search data for booking page
                localStorage.setItem('searchData', JSON.stringify({
                    ...formData,
                    nights: data.nights,
                    rooms: data.rooms
                }));
                
                // Redirect to booking page or show results
                if (data.rooms.length > 0) {
                    showNotification(`Found ${data.rooms.length} available room${data.rooms.length > 1 ? 's' : ''}!`, 'success');
                    setTimeout(() => {
                        window.location.href = `rooms.html?checkin=${formData.checkin}&checkout=${formData.checkout}&adults=${formData.adults}&children=${formData.children}`;
                    }, 1000);
                } else {
                    showNotification('No rooms available for selected dates. Please try different dates.', 'warning');
                }
            } else {
                throw new Error(data.error || 'Failed to check availability');
            }
        })
        .catch(error => {
            console.error('❌ Availability search failed:', error);
            showNotification('Search failed. Please try again.', 'error');
        })
        .finally(() => {
            // Hide loading state
            btnText.classList.remove('d-none');
            btnSpinner.classList.add('d-none');
            searchBtn.disabled = false;
        });
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
                                ${room.images && room.images.length > 1 ? `
                                    <div class="row">
                                        ${room.images.slice(1, 3).map(img => `
                                            <div class="col-6">
                                                <img src="${img}" alt="${room.name}" class="img-fluid rounded mb-2">
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="col-md-6">
                                <h4 class="text-primary mb-3">₹${formatNumber(room.price)} / night</h4>
                                <p class="mb-3">${room.description}</p>
                                
                                <h6>Room Details:</h6>
                                <ul class="list-unstyled mb-3">
                                    <li><i class="fas fa-users text-primary me-2"></i> Capacity: ${room.capacity} guests</li>
                                    <li><i class="fas fa-expand-arrows-alt text-primary me-2"></i> Size: ${room.room_size || '25 sqm'}</li>
                                    <li><i class="fas fa-bed text-primary me-2"></i> Bed: ${room.bed_type || 'Comfortable bed'}</li>
                                    ${room.floor ? `<li><i class="fas fa-building text-primary me-2"></i> Floor: ${room.floor}</li>` : ''}
                                    ${room.room_number ? `<li><i class="fas fa-door-closed text-primary me-2"></i> Room: ${room.room_number}</li>` : ''}
                                </ul>
                                
                                <h6>Amenities:</h6>
                                <div class="mb-3">
                                    ${room.amenities ? room.amenities.map(amenity => 
                                        `<span class="badge bg-primary me-1 mb-1">${amenity}</span>`
                                    ).join('') : 'Standard amenities included'}
                                </div>
                                
                                ${room.features ? `
                                    <h6>Special Features:</h6>
                                    <ul class="list-unstyled small">
                                        ${room.features.slice(0, 4).map(feature => 
                                            `<li><i class="fas fa-check text-success me-2"></i> ${feature}</li>`
                                        ).join('')}
                                    </ul>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss
