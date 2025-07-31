/**
 * Alpine Aura Homestay - Rooms Page JavaScript
 * Handles room listing, searching, and filtering
 */

// ===== GLOBAL VARIABLES =====
let allRooms = [];
let filteredRooms = [];
let searchCriteria = {};

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Rooms page initializing...');
    
    initializeRoomsPage();
    setupRoomSearchForm();
    loadAllRooms();
    
    // Check for URL parameters
    checkURLParameters();
});

// ===== INITIALIZATION =====
function initializeRoomsPage() {
    setMinimumDatesForSearch();
    updateSearchDatesFromURL();
}

function setMinimumDatesForSearch() {
    const checkinInput = document.getElementById('searchCheckin');
    const checkoutInput = document.getElementById('searchCheckout');
    
    if (checkinInput && checkoutInput) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        checkinInput.min = today.toISOString().split('T')[0];
        checkoutInput.min = tomorrow.toISOString().split('T')[0];
        
        // Set default dates if not provided
        if (!checkinInput.value) {
            checkinInput.value = today.toISOString().split('T')[0];
        }
        if (!checkoutInput.value) {
            checkoutInput.value = tomorrow.toISOString().split('T')[0];
        }
    }
}

// ===== URL PARAMETER HANDLING =====
function checkURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('checkin') && urlParams.has('checkout')) {
        // Pre-fill search form with URL parameters
        const checkin = urlParams.get('checkin');
        const checkout = urlParams.get('checkout');
        const adults = urlParams.get('adults') || '2';
        const children = urlParams.get('children') || '0';
        
        document.getElementById('searchCheckin').value = checkin;
        document.getElementById('searchCheckout').value = checkout;
        document.getElementById('searchAdults').value = adults;
        document.getElementById('searchChildren').value = children;
        
        searchCriteria = { 
            checkin, 
            checkout, 
            adults: parseInt(adults), 
            children: parseInt(children) 
        };
        
        // Perform automatic search after rooms load
        setTimeout(() => {
            if (allRooms.length > 0) {
                performRoomSearch(searchCriteria);
            }
        }, 1000);
    }
}

function updateSearchDatesFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    ['checkin', 'checkout', 'adults', 'children'].forEach(param => {
        const element = document.getElementById('search' + param.charAt(0).toUpperCase() + param.slice(1));
        if (element && urlParams.has(param)) {
            element.value = urlParams.get(param);
        }
    });
}

// ===== ROOM SEARCH FORM =====
function setupRoomSearchForm() {
    const searchForm = document.getElementById('roomSearchForm');
    
    if (searchForm) {
        searchForm.addEventListener('submit', handleRoomSearch);
    }
    
    // Date change listeners
    const checkinInput = document.getElementById('searchCheckin');
    const checkoutInput = document.getElementById('searchCheckout');
    
    if (checkinInput && checkoutInput) {
        checkinInput.addEventListener('change', () => {
            const checkinDate = new Date(checkinInput.value);
            const nextDay = new Date(checkinDate);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutInput.min = nextDay.toISOString().split('T')[0];
            
            if (new Date(checkoutInput.value) <= checkinDate) {
                checkoutInput.value = nextDay.toISOString().split('T')[0];
            }
        });
    }
}

function handleRoomSearch(event) {
    event.preventDefault();
    
    const formData = {
        checkin: document.getElementById('searchCheckin').value,
        checkout: document.getElementById('searchCheckout').value,
        adults: parseInt(document.getElementById('searchAdults').value),
        children: parseInt(document.getElementById('searchChildren').value)
    };
    
    // Validate form data
    if (!validateSearchForm(formData)) {
        return;
    }
    
    searchCriteria = formData;
    performRoomSearch(formData);
}

function validateSearchForm(formData) {
    if (!formData.checkin || !formData.checkout) {
        showNotification('Please select check-in and check-out dates', 'error');
        return false;
    }
    
    if (new Date(formData.checkin) >= new Date(formData.checkout)) {
        showNotification('Check-out date must be after check-in date', 'error');
        return false;
    }
    
    if (new Date(formData.checkin) < new Date()) {
        showNotification('Check-in date cannot be in the past', 'error');
        return false;
    }
    
    return true;
}

// ===== ROOM LOADING AND SEARCHING =====
function loadAllRooms() {
    console.log('🔄 Loading all rooms...');
    
    showElement('roomsLoading');
    hideElement('roomsContainer');
    hideElement('noRoomsFound');
    
    fetch(`${API_BASE_URL}?action=get_rooms`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.rooms) {
                allRooms = data.rooms;
                filteredRooms = [...allRooms];
                displayRooms(filteredRooms);
                console.log(`✅ Loaded ${data.rooms.length} rooms from ${data.source}`);
                
                // If URL parameters exist, perform search
                if (Object.keys(searchCriteria).length > 0) {
                    performRoomSearch(searchCriteria);
                }
            } else {
                throw new Error(data.error || 'Failed to load rooms');
            }
        })
        .catch(error => {
            console.error('❌ Error loading rooms:', error);
            showError('Unable to load rooms. Please try again later.');
        });
}

function performRoomSearch(formData) {
    const params = new URLSearchParams({
        action: 'check_availability',
        checkin: formData.checkin,
        checkout: formData.checkout,
        adults: formData.adults,
        children: formData.children
    });
    
    console.log('🔍 Searching rooms for:', formData);
    
    showElement('roomsLoading');
    hideElement('roomsContainer');
    hideElement('noRoomsFound');
    
    fetch(`${API_BASE_URL}?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.rooms) {
                filteredRooms = data.rooms;
                displayRooms(filteredRooms);
                showSearchResults(data);
                console.log(`✅ Found ${data.rooms.length} available rooms`);
            } else {
                throw new Error(data.error || 'Search failed');
            }
        })
        .catch(error => {
            console.error('❌ Room search failed:', error);
            showError('Room search failed. Please try again.');
        });
}

// ===== ROOM DISPLAY =====
function displayRooms(rooms) {
    hideElement('roomsLoading');
    
    if (!rooms || rooms.length === 0) {
        showElement('noRoomsFound');
        hideElement('roomsContainer');
        return;
    }
    
    showElement('roomsContainer');
    hideElement('noRoomsFound');
    
    const roomsContainer = document.getElementById('roomsContainer');
    let html = '';
    
    rooms.forEach((room, index) => {
        const roomId = room.room_id || room.id;
        const isPopular = index === 0 && rooms.length > 1;
        const imageUrl = room.images && room.images.length > 0 
            ? room.images[0] 
            : 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&h=400&fit=crop&q=80';
        
        const priceInfo = calculatePriceDisplay(room);
        
        html += `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="room-card">
                    <div class="room-image">
                        <img src="${imageUrl}" alt="${room.name}">
                        <div class="room-price">
                            ${priceInfo.display}
                        </div>
                        ${isPopular ? '<div class="room-badge">Most Popular</div>' : ''}
                        ${room.status === 'maintenance' ? '<div class="room-badge" style="background: #dc2626;">Maintenance</div>' : ''}
                    </div>
                    <div class="card-body p-4">
                        <h4 class="card-title mb-3">${room.name}</h4>
                        <p class="text-muted mb-3">${truncateText(room.description, 120)}</p>
                        
                        <div class="room-details mb-3">
                            <div class="row g-2 text-sm">
                                <div class="col-6">
                                    <i class="fas fa-users text-primary me-1"></i>
                                    <span>Up to ${room.capacity} guests</span>
                                </div>
                                <div class="col-6">
                                    <i class="fas fa-expand-arrows-alt text-primary me-1"></i>
                                    <span>${room.room_size || '30 sqm'}</span>
                                </div>
                                <div class="col-6">
                                    <i class="fas fa-bed text-primary me-1"></i>
                                    <span>${room.bed_type || 'Comfortable bed'}</span>
                                </div>
                                <div class="col-6">
                                    <i class="fas fa-building text-primary me-1"></i>
                                    <span>${room.floor || '1st'} Floor</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="amenities mb-4">
                            ${room.amenities ? room.amenities.slice(0, 5).map(amenity => 
                                `<span class="amenity-tag">${amenity}</span>`
                            ).join('') : ''}
                            ${room.amenities && room.amenities.length > 5 ? 
                                `<span class="amenity-tag">+${room.amenities.length - 5} more</span>` : ''}
                        </div>
                        
                        ${priceInfo.breakdown ? `
                            <div class="price-breakdown mb-3 p-3 bg-light rounded">
                                <div class="d-flex justify-content-between">
                                    <span><i class="fas fa-moon me-1"></i>${priceInfo.breakdown.nights} night${priceInfo.breakdown.nights > 1 ? 's' : ''}</span>
                                    <span class="fw-semibold">₹${formatNumber(priceInfo.breakdown.total)}</span>
                                </div>
                                <small class="text-muted">Including taxes</small>
                            </div>
                        ` : ''}
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary flex-fill" onclick="showRoomDetails('${roomId}')">
                                <i class="fas fa-eye me-1"></i>Details
                            </button>
                            <button class="btn btn-primary flex-fill" onclick="bookRoom('${roomId}')">
                                <i class="fas fa-calendar-check me-1"></i>Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    roomsContainer.innerHTML = html;
}

function calculatePriceDisplay(room) {
    if (searchCriteria.checkin && searchCriteria.checkout) {
        const checkinDate = new Date(searchCriteria.checkin);
        const checkoutDate = new Date(searchCriteria.checkout);
        const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
        const total = room.total_amount || (room.price * nights * 1.12); // Including tax
        
        return {
            display: `₹${formatNumber(room.price)}<small class="text-muted">/night</small>`,
            breakdown: {
                nights: nights,
                total: Math.round(total)
            }
        };
    }
    
    return {
        display: `₹${formatNumber(room.price)}<small class="text-muted">/night</small>`,
        breakdown: null
    };
}

// ===== SEARCH RESULTS DISPLAY =====
function showSearchResults(data) {
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    const searchInfoText = document.getElementById('searchInfoText');
    
    if (searchResultsInfo && searchInfoText) {
        const { checkin, checkout, adults, children, nights } = data.search_criteria || searchCriteria;
        const totalGuests = adults + children;
        
        searchInfoText.innerHTML = `
            <strong>Search Results:</strong> 
            ${data.rooms.length} room${data.rooms.length !== 1 ? 's' : ''} available 
            for ${totalGuests} guest${totalGuests !== 1 ? 's' : ''} 
            from <strong>${formatDate(checkin)}</strong> to <strong>${formatDate(checkout)}</strong>
            (${nights || calculateNights(checkin, checkout)} night${(nights || calculateNights(checkin, checkout)) !== 1 ? 's' : ''})
        `;
        
        searchResultsInfo.classList.remove('d-none');
    }
}

function showAllRooms() {
    searchCriteria = {};
    
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    if (searchResultsInfo) {
        searchResultsInfo.classList.add('d-none');
    }
    
    filteredRooms = [...allRooms];
    displayRooms(filteredRooms);
    
    showNotification('Showing all available rooms', 'info');
}

// ===== ROOM INTERACTIONS =====
function bookRoom(roomId) {
    if (searchCriteria.checkin && searchCriteria.checkout) {
        const params = new URLSearchParams({
            room: roomId,
            checkin: searchCriteria.checkin,
            checkout: searchCriteria.checkout,
            adults: searchCriteria.adults,
            children: searchCriteria.children
        });
        
        window.location.href = `booking.html?${params}`;
    } else {
        window.location.href = `booking.html?room=${roomId}`;
    }
}

function showRoomDetails(roomId) {
    const room = [...allRooms, ...filteredRooms].find(r => (r.room_id || r.id) === roomId);
    if (!room) {
        showNotification('Room details not found', 'error');
        return;
    }
    
    // Enhanced modal for rooms page
    const modalHTML = `
        <div class="modal fade" id="roomDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header border-0">
                        <h5 class="modal-title fw-bold">${room.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="row g-0">
                            <div class="col-md-8">
                                <div class="room-gallery">
                                    <img src="${room.images && room.images[0] ? room.images[0] : 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&h=600&fit=crop&q=80'}" 
                                         alt="${room.name}" class="w-100" style="height: 400px; object-fit: cover;">
                                    ${room.images && room.images.length > 1 ? `
                                        <div class="row g-2 mt-2 px-3">
                                            ${room.images.slice(1, 4).map(img => `
                                                <div class="col-4">
                                                    <img src="${img}" alt="${room.name}" class="w-100 rounded" style="height: 120px; object-fit: cover;">
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="p-4">
                                    <div class="price-section mb-4">
                                        <h3 class="text-primary mb-2">₹${formatNumber(room.price)}</h3>
                                        <small class="text-muted">per night</small>
                                    </div>
                                    
                                    <div class="description mb-4">
                                        <p class="text-muted">${room.description}</p>
                                    </div>
                                    
                                    <div class="room-specs mb-4">
                                        <h6 class="fw-semibold mb-3">Room Details</h6>
                                        <div class="specs-grid">
                                            <div class="spec-item d-flex align-items-center mb-2">
                                                <i class="fas fa-users text-primary me-3"></i>
                                                <span>Up to ${room.capacity} guests</span>
                                            </div>
                                            <div class="spec-item d-flex align-items-center mb-2">
                                                <i class="fas fa-expand-arrows-alt text-primary me-3"></i>
                                                <span>${room.room_size || '30 sqm'}</span>
                                            </div>
                                            <div class="spec-item d-flex align-items-center mb-2">
                                                <i class="fas fa-bed text-primary me-3"></i>
                                                <span>${room.bed_type || 'Comfortable bed'}</span>
                                            </div>
                                            <div class="spec-item d-flex align-items-center mb-2">
                                                <i class="fas fa-building text-primary me-3"></i>
                                                <span>${room.floor || '1st'} Floor</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="amenities-section">
                                        <h6 class="fw-semibold mb-3">Amenities</h6>
                                        <div class="amenities-grid">
                                            ${room.amenities ? room.amenities.map(amenity => 
                                                `<span class="badge bg-light text-dark me-1 mb-2">${amenity}</span>`
                                            ).join('') : 'Standard amenities included'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="bookRoom('${room.room_id || room.id}'); $('#roomDetailsModal').modal('hide');">
                            <i class="fas fa-calendar-check me-2"></i>Book This Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal and add new one
    const existingModal = document.getElementById('roomDetailsModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('roomDetailsModal'));
    modal.show();
    
    // Clean up when hidden
    document.getElementById('roomDetailsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// ===== UTILITY FUNCTIONS =====
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function calculateNights(checkin, checkout) {
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    return Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
}

function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

function showError(message) {
    hideElement('roomsLoading');
    hideElement('roomsContainer');
    showElement('noRoomsFound');
    
    const noRoomsElement = document.getElementById('noRoomsFound');
    if (noRoomsElement) {
        noRoomsElement.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-4x text-warning mb-3"></i>
                <h3>Oops! Something went wrong</h3>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="loadAllRooms()">
                    <i class="fas fa-refresh me-2"></i>Try Again
                </button>
            </div>
        `;
    }
}

console.log('📜 Rooms page JavaScript loaded successfully');
