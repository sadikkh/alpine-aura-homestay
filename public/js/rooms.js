/**
 * Alpine Aura Homestay - Rooms Page JavaScript
 * Handles room listing, searching, and filtering with AWS integration
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
    
    // Check for URL parameters (from availability search)
    checkURLParameters();
});

// ===== INITIALIZATION =====
function initializeRoomsPage() {
    setMinimumDatesForSearch();
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
        
        // Set default values
        checkinInput.value = today.toISOString().split('T')[0];
        checkoutInput.value = tomorrow.toISOString().split('T')[0];
    }
}

// ===== URL PARAMETER HANDLING =====
function checkURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('checkin') && urlParams.has('checkout')) {
        const checkin = urlParams.get('checkin');
        const checkout = urlParams.get('checkout');
        const adults = urlParams.get('adults') || '2';
        const children = urlParams.get('children') || '0';
        
        document.getElementById('searchCheckin').value = checkin;
        document.getElementById('searchCheckout').value = checkout;
        document.getElementById('searchAdults').value = adults;
        document.getElementById('searchChildren').value = children;
        
        searchCriteria = { checkin, checkout, adults: parseInt(adults), children: parseInt(children) };
        
        setTimeout(() => {
            performRoomSearch(searchCriteria);
        }, 1000);
    }
}

// ===== ROOM SEARCH FORM =====
function setupRoomSearchForm() {
    const searchForm = document.getElementById('roomSearchForm');
    
    if (searchForm) {
        searchForm.addEventListener('submit', handleRoomSearch);
    }
    
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
    
    if (!formData.checkin || !formData.checkout) {
        showNotification('Please select check-in and check-out dates', 'error');
        return;
    }
    
    if (new Date(formData.checkin) >= new Date(formData.checkout)) {
        showNotification('Check-out date must be after check-in date', 'error');
        return;
    }
    
    searchCriteria = formData;
    performRoomSearch(formData);
}

// ===== ROOM LOADING AND SEARCHING =====
function loadAllRooms() {
    const roomsContainer = document.getElementById('roomsContainer');
    
    console.log('🔄 Loading all rooms...');
    
    fetch(`${API_BASE_URL}?action=get_rooms`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.rooms) {
                allRooms = data.rooms;
                filteredRooms = [...allRooms];
                displayRooms(filteredRooms);
                console.log(`✅ Loaded ${data.rooms.length} rooms from ${data.source}`);
            } else {
                throw new Error(data.error || 'Failed to load rooms');
            }
        })
        .catch(error => {
            console.error('❌ Error loading rooms:', error);
            roomsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h5>Unable to Load Rooms</h5>
                        <p>There was an error connecting to our booking system. Please try again later.</p>
                        <button class="btn btn-primary" onclick="loadAllRooms()">Try Again</button>
                    </div>
                </div>
            `;
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
    
    showLoadingState();
    
    console.log('🔍 Searching rooms for:', formData);
    
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
            showSearchError();
        });
}

// ===== ROOM DISPLAY =====
function displayRooms(rooms) {
    const roomsContainer = document.getElementById('roomsContainer');
    
    if (!rooms || rooms.length === 0) {
        roomsContainer.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning">
                    <i class="fas fa-search"></i>
                    <h5>No Rooms Available</h5>
                    <p>No rooms match your search criteria. Please try different dates or adjust your requirements.</p>
                    <button class="btn btn-primary" onclick="showAllRooms()">Show All Rooms</button>
                </div>
            </div>
        `;
        return;
    }
    
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
                <div class="room-card h-100" id="${roomId}">
                    <div class="room-image">
                        <img src="${imageUrl}" alt="${room.name}" class="img-fluid">
                        <div class="room-price">
                            ${priceInfo.display}
                        </div>
                        ${isPopular ? '<div class="room-badge">Most Popular</div>' : ''}
                    </div>
                    <div class="room-content">
                        <h4>${room.name}</h4>
                        <p class="text-muted">${truncateText(room.description, 120)}</p>
                        
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
                        
                        ${priceInfo.breakdown ? `
                            <div class="price-breakdown mb-3">
                                <small class="text-muted">
                                    <i class="fas fa-moon"></i> ${priceInfo.breakdown.nights} night${priceInfo.breakdown.nights > 1 ? 's' : ''} 
                                    = ₹${formatNumber(priceInfo.breakdown.total)}
                                </small>
                            </div>
                        ` : ''}
                        
                        <div class="room-footer">
                            <button class="btn btn-outline-primary btn-sm me-2" onclick="showRoomDetails('${roomId}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="bookRoom('${roomId}')">
                                <i class="fas fa-calendar-check"></i> Book Now
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
        const total = room.total_amount || (room.price * nights);
        
        return {
            display: `₹${formatNumber(room.price)}<span>/night</span>`,
            breakdown: {
                nights: nights,
                total: total
            }
        };
    }
    
    return {
        display: `₹${formatNumber(room.price)}<span>/night</span>`,
        breakdown: null
    };
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
            from ${formatDate(checkin)} to ${formatDate(checkout)} 
            (${nights || calculateNights(checkin, checkout)} night${(nights || calculateNights(checkin, checkout)) !== 1 ? 's' : ''})
        `;
        
        searchResultsInfo.classList.remove('d-none');
    }
}

function showLoadingState() {
    const roomsContainer = document.getElementById('roomsContainer');
    roomsContainer.innerHTML = `
        <div class="col-12 text-center">
            <div class="loading-rooms py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Searching...</span>
                </div>
                <p class="mt-3">Searching available rooms...</p>
                <small class="text-muted">Checking availability in AWS DynamoDB...</small>
            </div>
        </div>
    `;
}

function showSearchError() {
    const roomsContainer = document.getElementById('roomsContainer');
    roomsContainer.innerHTML = `
        <div class="col-12 text-center">
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Search Failed</h5>
                <p>Unable to search for available rooms. Please check your connection and try again.</p>
                <button class="btn btn-primary" onclick="loadAllRooms()">Show All Rooms</button>
            </div>
        </div>
    `;
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

function calculateNights(checkin, checkout) {
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    return Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
}

console.log('📜 Rooms page JavaScript loaded successfully');
