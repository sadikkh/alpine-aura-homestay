/**
 * Alpine Aura Homestay - Booking Page JavaScript
 * Handles multi-step booking form with AWS integration
 */

// ===== GLOBAL VARIABLES =====
let currentStep = 1;
let bookingData = {};
let availableRooms = [];
let selectedRoom = null;

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Booking page initializing...');
    
    initializeBookingPage();
    setupEventListeners();
    
    // Check for URL parameters
    checkBookingParameters();
});

// ===== INITIALIZATION =====
function initializeBookingPage() {
    setMinimumBookingDates();
    showStep(1);
}

function setMinimumBookingDates() {
    const checkinInput = document.getElementById('bookingCheckin');
    const checkoutInput = document.getElementById('bookingCheckout');
    
    if (checkinInput && checkoutInput) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        checkinInput.min = today.toISOString().split('T')[0];
        checkoutInput.min = tomorrow.toISOString().split('T')[0];
        
        // Set default dates
        checkinInput.value = today.toISOString().split('T')[0];
        checkoutInput.value = tomorrow.toISOString().split('T')[0];
        
        updateBookingSummary();
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Date selection form
    const dateForm = document.getElementById('dateSelectionForm');
    if (dateForm) {
        dateForm.addEventListener('submit', handleDateSelection);
    }
    
    // Guest details form
    const guestForm = document.getElementById('guestDetailsForm');
    if (guestForm) {
        guestForm.addEventListener('submit', handleGuestDetails);
    }
    
    // Date change listeners
    const checkinInput = document.getElementById('bookingCheckin');
    const checkoutInput = document.getElementById('bookingCheckout');
    
    if (checkinInput && checkoutInput) {
        checkinInput.addEventListener('change', () => {
            const checkinDate = new Date(checkinInput.value);
            const nextDay = new Date(checkinDate);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutInput.min = nextDay.toISOString().split('T')[0];
            
            if (new Date(checkoutInput.value) <= checkinDate) {
                checkoutInput.value = nextDay.toISOString().split('T')[0];
            }
            
            updateBookingSummary();
        });
        
        checkoutInput.addEventListener('change', updateBookingSummary);
    }
    
    // Guest count listeners
    const adultsSelect = document.getElementById('bookingAdults');
    const childrenSelect = document.getElementById('bookingChildren');
    
    if (adultsSelect) adultsSelect.addEventListener('change', updateBookingSummary);
    if (childrenSelect) childrenSelect.addEventListener('change', updateBookingSummary);
}

// ===== URL PARAMETER HANDLING =====
function checkBookingParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Pre-fill form if parameters exist
    if (urlParams.has('checkin')) {
        document.getElementById('bookingCheckin').value = urlParams.get('checkin');
    }
    if (urlParams.has('checkout')) {
        document.getElementById('bookingCheckout').value = urlParams.get('checkout');
    }
    if (urlParams.has('adults')) {
        document.getElementById('bookingAdults').value = urlParams.get('adults');
    }
    if (urlParams.has('children')) {
        document.getElementById('bookingChildren').value = urlParams.get('children');
    }
    
    // Auto-search if dates are provided
    if (urlParams.has('checkin') && urlParams.has('checkout')) {
        setTimeout(() => {
            searchAvailableRooms();
        }, 1000);
    }
    
    // Pre-select room if specified
    if (urlParams.has('room')) {
        const roomId = urlParams.get('room');
        setTimeout(() => {
            selectRoomById(roomId);
        }, 2000);
    }
    
    updateBookingSummary();
}

// ===== STEP MANAGEMENT =====
function showStep(stepNumber) {
    currentStep = stepNumber;
    
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`bookingStep${i}`);
        const stepIndicator = document.getElementById(`step${i}`);
        
        if (step) {
            step.style.display = i === stepNumber ? 'block' : 'none';
        }
        
        if (stepIndicator) {
            stepIndicator.classList.remove('active', 'completed');
            if (i < stepNumber) {
                stepIndicator.classList.add('completed');
            } else if (i === stepNumber) {
                stepIndicator.classList.add('active');
            }
        }
    }
}

function goToStep(stepNumber) {
    showStep(stepNumber);
}

// ===== DATE & ROOM SELECTION =====
function handleDateSelection(event) {
    event.preventDefault();
    
    const formData = {
        checkin: document.getElementById('bookingCheckin').value,
        checkout: document.getElementById('bookingCheckout').value,
        adults: parseInt(document.getElementById('bookingAdults').value),
        children: parseInt(document.getElementById('bookingChildren').value)
    };
    
    if (!validateDates(formData)) {
        return;
    }
    
    bookingData = { ...formData };
    searchAvailableRooms();
}

function validateDates(formData) {
    if (!formData.checkin || !formData.checkout) {
        showNotification('Please select both check-in and check-out dates', 'error');
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

function searchAvailableRooms() {
    const availableRoomsDiv = document.getElementById('availableRooms');
    const roomsList = document.getElementById('roomsList');
    
    if (!availableRoomsDiv || !roomsList) return;
    
    // Show loading
    roomsList.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary mb-3"></div>
            <h5>Searching Available Rooms...</h5>
            <p class="text-muted">Checking availability in AWS DynamoDB...</p>
        </div>
    `;
    
    availableRoomsDiv.style.display = 'block';
    
    const params = new URLSearchParams({
        action: 'check_availability',
        checkin: bookingData.checkin,
        checkout: bookingData.checkout,
        adults: bookingData.adults,
        children: bookingData.children
    });
    
    fetch(`${API_BASE_URL}?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.rooms) {
                availableRooms = data.rooms;
                displayAvailableRooms(data.rooms);
                console.log(`✅ Found ${data.rooms.length} available rooms`);
            } else {
                throw new Error(data.error || 'No rooms available');
            }
        })
        .catch(error => {
            console.error('❌ Room search failed:', error);
            showRoomSearchError();
        });
}

function displayAvailableRooms(rooms) {
    const roomsList = document.getElementById('roomsList');
    if (!roomsList) return;
    
    if (!rooms || rooms.length === 0) {
        roomsList.innerHTML = `
            <div class="alert alert-warning text-center">
                <h5><i class="fas fa-exclamation-triangle"></i> No Rooms Available</h5>
                <p>No rooms can accommodate your requirements for the selected dates. Please try different dates or adjust guest count.</p>
                <button class="btn btn-primary" onclick="goToStep(1)">
                    <i class="fas fa-arrow-left me-2"></i>Change Dates
                </button>
            </div>
        `;
        return;
    }
    
    const nights = calculateNights(bookingData.checkin, bookingData.checkout);
    let html = '<div class="row">';
    
    rooms.forEach(room => {
        const totalPrice = room.total_amount || (room.price * nights * 1.12);
        
        html += `
            <div class="col-md-6 mb-4">
                <div class="room-preview" id="room-${room.room_id}">
                    <div class="row align-items-center">
                        <div class="col-4">
                            <img src="${room.images && room.images[0] ? room.images[0] : 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=300&h=200&fit=crop&q=80'}" 
                                 alt="${room.name}" class="img-fluid rounded">
                        </div>
                        <div class="col-8">
                            <h5 class="mb-2">${room.name}</h5>
                            <p class="text-muted small mb-2">${room.description.substring(0, 80)}...</p>
                            <div class="mb-2">
                                <small class="text-muted">
                                    <i class="fas fa-users me-1"></i>Up to ${room.capacity} guests |
                                    <i class="fas fa-moon me-1"></i>${nights} nights
                                </small>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong class="text-primary">₹${formatNumber(Math.round(totalPrice))}</strong>
                                    <small class="text-muted d-block">Total (incl. taxes)</small>
                                </div>
                                <button class="btn btn-primary btn-sm" onclick="selectRoom('${room.room_id}')">
                                    Select Room
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    roomsList.innerHTML = html;
}

function selectRoom(roomId) {
    selectedRoom = availableRooms.find(room => room.room_id === roomId);
    if (selectedRoom) {
        bookingData.room = selectedRoom;
        
        // Update room selection UI
        document.querySelectorAll('.room-preview').forEach(el => {
            el.classList.remove('selected');
        });
        document.getElementById(`room-${roomId}`).classList.add('selected');
        
        updateBookingSummary();
        showStep(2);
        showNotification(`${selectedRoom.name} selected successfully!`, 'success');
    }
}

function selectRoomById(roomId) {
    // This function is called when room is pre-selected from URL
    if (availableRooms.length === 0) {
        // Rooms not loaded yet, try again later
        setTimeout(() => selectRoomById(roomId), 1000);
        return;
    }
    
    const room = availableRooms.find(r => r.room_id === roomId);
    if (room) {
        selectRoom(roomId);
    }
}

function showRoomSearchError() {
    const roomsList = document.getElementById('roomsList');
    if (roomsList) {
        roomsList.innerHTML = `
            <div class="alert alert-danger text-center">
                <h5><i class="fas fa-exclamation-triangle"></i> Search Failed</h5>
                <p>Unable to search for available rooms. Please check your connection and try again.</p>
                <button class="btn btn-primary" onclick="searchAvailableRooms()">
                    <i class="fas fa-refresh me-2"></i>Try Again
                </button>
            </div>
        `;
    }
}

// ===== GUEST DETAILS =====
function handleGuestDetails(event) {
    event.preventDefault();
    
    const guestData = {
        guestName: document.getElementById('guestName').value.trim(),
        guestEmail: document.getElementById('guestEmail').value.trim(),
        guestPhone: document.getElementById('guestPhone').value.trim(),
        idProofType: document.getElementById('idProofType').value,
        guestAddress: document.getElementById('guestAddress').value.trim(),
        specialRequests: document.getElementById('specialRequests').value.trim()
    };
    
    if (!validateGuestDetails(guestData)) {
        return;
    }
    
    bookingData = { ...bookingData, ...guestData };
    processBooking();
}

function validateGuestDetails(guestData) {
    if (!guestData.guestName) {
        showNotification('Please enter your full name', 'error');
        document.getElementById('guestName').focus();
        return false;
    }
    
    if (!guestData.guestEmail || !isValidEmail(guestData.guestEmail)) {
        showNotification('Please enter a valid email address', 'error');
        document.getElementById('guestEmail').focus();
        return false;
    }
    
    if (!guestData.guestPhone) {
        showNotification('Please enter your phone number', 'error');
        document.getElementById('guestPhone').focus();
        return false;
    }
    
    // Check terms agreement
    const agreeTerms = document.getElementById('agreeTerms');
    if (!agreeTerms.checked) {
        showNotification('Please agree to the terms and conditions', 'error');
        agreeTerms.focus();
        return false;
    }
    
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===== BOOKING PROCESSING =====
function processBooking() {
    showStep(3);
    showBookingProcessing();
    
    // Prepare booking data for submission
    const bookingPayload = {
        room_id: bookingData.room.room_id,
        checkin_date: bookingData.checkin,
        checkout_date: bookingData.checkout,
        adults: bookingData.adults,
        children: bookingData.children,
        guest_name: bookingData.guestName,
        guest_email: bookingData.guestEmail,
        guest_phone: bookingData.guestPhone,
        special_requests: bookingData.specialRequests
    };
    
    console.log('📤 Submitting booking:', bookingPayload);
    
    fetch(`${API_BASE_URL}?action=create_booking`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showBookingSuccess(data);
        } else {
            throw new Error(data.error || 'Booking failed');
        }
    })
    .catch(error => {
        console.error('❌ Booking failed:', error);
        showBookingError();
    });
}

function showBookingProcessing() {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    confirmationDiv.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-4" style="width: 3rem; height: 3rem;"></div>
            <h3>Processing Your Booking...</h3>
            <p class="text-muted">Please wait while we secure your reservation</p>
            <div class="progress mt-4" style="height: 8px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     style="width: 100%; background: linear-gradient(90deg, #2563eb, #1d4ed8);"></div>
            </div>
        </div>
    `;
}

function showBookingSuccess(data) {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    const bookingId = data.booking_id || generateMockBookingId();
    const totalAmount = data.total_amount || calculateTotalAmount();
    const nights = calculateNights(bookingData.checkin, bookingData.checkout);
    
    confirmationDiv.innerHTML = `
        <div class="text-center mb-4">
            <div class="success-animation mb-4">
                <i class="fas fa-check-circle fa-5x text-success"></i>
            </div>
            <h2 class="text-success mb-3">Booking Confirmed!</h2>
            <p class="lead">Your mountain retreat has been successfully reserved.</p>
        </div>
        
        <div class="booking-details-card bg-light rounded-3 p-4 mb-4">
            <h4 class="text-center mb-4">Booking Details</h4>
            <div class="row">
                <div class="col-md-6">
                    <div class="detail-group mb-3">
                        <strong>Booking ID:</strong><br>
                        <span class="text-primary fs-5">${bookingId}</span>
                    </div>
                    <div class="detail-group mb-3">
                        <strong>Guest Name:</strong><br>
                        ${bookingData.guestName}
                    </div>
                    <div class="detail-group mb-3">
                        <strong>Email:</strong><br>
                        ${bookingData.guestEmail}
                    </div>
                    <div class="detail-group mb-3">
                        <strong>Phone:</strong><br>
                        ${bookingData.guestPhone}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="detail-group mb-3">
                        <strong>Room:</strong><br>
                        ${bookingData.room.name}
                    </div>
                    <div class="detail-group mb-3">
                        <strong>Check-in:</strong><br>
                        ${formatDate(bookingData.checkin)} at 2:00 PM
                    </div>
                    <div class="detail-group mb-3">
                        <strong>Check-out:</strong><br>
                        ${formatDate(bookingData.checkout)} at 11:00 AM
                    </div>
                    <div class="detail-group mb-3">
                        <strong>Total Amount:</strong><br>
                        <span class="text-primary fs-4 fw-bold">₹${formatNumber(totalAmount)}</span>
                        <small class="text-muted d-block">${nights} nights (including taxes)</small>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="alert alert-info border-0">
            <h6><i class="fas fa-info-circle"></i> What's Next?</h6>
            <ul class="mb-0">
                <li>A confirmation email has been sent to <strong>${bookingData.guestEmail}</strong></li>
                <li>Please arrive at check-in time: <strong>2:00 PM</strong></li>
                <li>Bring a valid ID proof for verification</li>
                <li>Payment can be made at the property</li>
                <li>For any queries, contact us: <strong>+91-XXXXX-XXXXX</strong></li>
            </ul>
        </div>
        
        <div class="text-center mt-4">
            <button class="btn btn-outline-primary me-3" onclick="printBooking('${bookingId}')">
                <i class="fas fa-print me-2"></i>Print Confirmation
            </button>
            <a href="index.html" class="btn btn-primary">
                <i class="fas fa-home me-2"></i>Back to Home
            </a>
        </div>
    `;
    
    showNotification('Booking confirmed successfully!', 'success', 8000);
}

function showBookingError() {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    confirmationDiv.innerHTML = `
        <div class="text-center py-5">
            <div class="error-animation mb-4">
                <i class="fas fa-exclamation-triangle fa-5x text-danger"></i>
            </div>
            <h3 class="text-danger mb-3">Booking Failed</h3>
            <p class="lead mb-4">We're sorry, but there was an error processing your booking.</p>
            
            <div class="alert alert-warning">
                <h6>What you can do:</h6>
                <ul class="mb-0 text-start">
                    <li>Check your internet connection</li>
                    <li>Try booking again with different dates</li>
                    <li>Contact our support team for assistance</li>
                    <li>Call us directly for immediate booking</li>
                </ul>
            </div>
            
            <div class="mt-4">
                <button class="btn btn-primary me-3" onclick="goToStep(2)">
                    <i class="fas fa-arrow-left me-2"></i>Try Again
                </button>
                <a href="contact.html" class="btn btn-outline-primary">
                    <i class="fas fa-phone me-2"></i>Contact Support
                </a>
            </div>
        </div>
    `;
    
    showNotification('Booking failed. Please try again or contact support.', 'error', 8000);
}

// ===== BOOKING SUMMARY =====
function updateBookingSummary() {
    const summaryContent = document.getElementById('summaryContent');
    if (!summaryContent) return;
    
    const checkin = document.getElementById('bookingCheckin')?.value;
    const checkout = document.getElementById('bookingCheckout')?.value;
    const adults = parseInt(document.getElementById('bookingAdults')?.value) || 2;
    const children = parseInt(document.getElementById('bookingChildren')?.value) || 0;
    
    if (!checkin || !checkout) {
        summaryContent.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-calendar-plus fa-3x mb-3"></i>
                <p>Select your dates and room to see pricing details</p>
            </div>
        `;
        return;
    }
    
    const nights = calculateNights(checkin, checkout);
    const totalGuests = adults + children;
    
    let summaryHTML = `
        <div class="stay-details mb-4">
            <h5 class="mb-3">
                <i class="fas fa-calendar-alt text-primary me-2"></i>
                Stay Details
            </h5>
            <div class="details-grid">
                <div class="detail-row d-flex justify-content-between py-2 border-bottom">
                    <span><i class="fas fa-calendar me-2 text-muted"></i>Check-in:</span>
                    <span class="fw-semibold">${formatDate(checkin)}</span>
                </div>
                <div class="detail-row d-flex justify-content-between py-2 border-bottom">
                    <span><i class="fas fa-calendar me-2 text-muted"></i>Check-out:</span>
                    <span class="fw-semibold">${formatDate(checkout)}</span>
                </div>
                <div class="detail-row d-flex justify-content-between py-2 border-bottom">
                    <span><i class="fas fa-moon me-2 text-muted"></i>Nights:</span>
                    <span class="fw-semibold">${nights}</span>
                </div>
                <div class="detail-row d-flex justify-content-between py-2">
                    <span><i class="fas fa-users me-2 text-muted"></i>Guests:</span>
                    <span class="fw-semibold">${totalGuests} (${adults} adults, ${children} children)</span>
                </div>
            </div>
        </div>
    `;
    
    if (selectedRoom) {
        const subtotal = selectedRoom.price * nights;
        const tax = Math.round(subtotal * 0.12);
        const total = subtotal + tax;
        
        summaryHTML += `
            <div class="room-details mb-4">
                <h5 class="mb-3">
                    <i class="fas fa-bed text-primary me-2"></i>
                    Selected Room
                </h5>
                <div class="room-card bg-white rounded-3 p-3 border">
                    <h6 class="mb-2">${selectedRoom.name}</h6>
                    <p class="text-muted small mb-2">${selectedRoom.description.substring(0, 100)}...</p>
                    <div class="amenities">
                        ${selectedRoom.amenities ? selectedRoom.amenities.slice(0, 3).map(amenity => 
                            `<span class="badge bg-light text-dark me-1">${amenity}</span>`
                        ).join('') : ''}
                    </div>
                </div>
            </div>
            
            <div class="price-breakdown">
                <h5 class="mb-3">
                    <i class="fas fa-rupee-sign text-primary me-2"></i>
                    Price Breakdown
                </h5>
                <div class="pricing-details bg-white rounded-3 p-3">
                    <div class="price-row">
                        <span>₹${formatNumber(selectedRoom.price)} × ${nights} nights</span>
                        <span>₹${formatNumber(subtotal)}</span>
                    </div>
                    <div class="price-row">
                        <span>Taxes & Fees (12% GST)</span>
                        <span>₹${formatNumber(tax)}</span>
                    </div>
                    <div class="price-row total">
                        <span><strong>Total Amount</strong></span>
                        <span class="text-primary"><strong>₹${formatNumber(total)}</strong></span>
                    </div>
                </div>
                
                <div class="payment-note mt-3 p-3 bg-light rounded-3">
                    <small class="text-muted">
                        <i class="fas fa-info-circle me-1"></i>
                        Payment can be made at the property. Free cancellation up to 24 hours before check-in.
                    </small>
                </div>
            </div>
        `;
    }
    
    summaryContent.innerHTML = summaryHTML;
}

// ===== UTILITY FUNCTIONS =====
function calculateNights(checkin, checkout) {
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    return Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
}

function calculateTotalAmount() {
    if (!selectedRoom || !bookingData.checkin || !bookingData.checkout) return 0;
    
    const nights = calculateNights(bookingData.checkin, bookingData.checkout);
    const subtotal = selectedRoom.price * nights;
    const tax = Math.round(subtotal * 0.12);
    return subtotal + tax;
}

function generateMockBookingId() {
    return 'AA' + Date.now().toString().slice(-8);
}

function printBooking(bookingId) {
    showNotification('Print functionality would open here in production', 'info');
    // In real implementation, this would open a print dialog
}

console.log('📜 Booking page JavaScript loaded successfully');
