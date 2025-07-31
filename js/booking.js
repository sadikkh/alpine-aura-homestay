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
            <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
            <h5>Searching Available Rooms...</h5>
            <p class="text-muted">Checking availability in AWS DynamoDB...</p>
            <div class="progress mt-3" style="height: 6px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%;"></div>
            </div>
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
    
    rooms.forEach((room, index) => {
        const isPopular = index === 0;
        const totalPrice = room.total_amount || (room.price * nights * 1.12);
        const imageUrl = room.images && room.images[0] ? 
            room.images[0] : 
            'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&h=300&fit=crop&q=80';
        
        html += `
            <div class="col-md-6 mb-4">
                <div class="room-preview" id="room-${room.room_id}">
                    ${isPopular ? '<div class="badge bg-warning position-absolute top-0 start-0 m-2 z-3">Most Popular</div>' : ''}
                    
                    <div class="row align-items-center">
                        <div class="col-5">
                            <div style="position: relative; border-radius: 10px; overflow: hidden;">
                                <img src="${imageUrl}" 
                                     alt="${room.name}" 
                                     class="img-fluid" 
                                     style="height: 140px; width: 100%; object-fit: cover;">
                                <div class="position-absolute top-0 end-0 m-2">
                                    <span class="badge bg-primary">₹${formatNumber(room.price)}/night</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-7">
                            <h5 class="mb-2">${room.name}</h5>
                            <p class="text-muted small mb-2">${truncateText(room.description, 80)}</p>
                            <div class="mb-2">
                                <small class="text-muted">
                                    <i class="fas fa-users me-1 text-primary"></i>Up to ${room.capacity} guests |
                                    <i class="fas fa-moon me-1 text-primary"></i>${nights} nights
                                </small>
                            </div>
                            <div class="mb-3">
                                ${room.amenities ? room.amenities.slice(0, 2).map(amenity => 
                                    `<span class="badge bg-light text-dark me-1" style="font-size: 10px;">${amenity}</span>`
                                ).join('') : ''}
                                ${room.amenities && room.amenities.length > 2 ? 
                                    `<span class="badge bg-light text-dark" style="font-size: 10px;">+${room.amenities.length - 2} more</span>` : ''}
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong class="text-primary h6">₹${formatNumber(Math.round(totalPrice))}</strong>
                                    <small class="text-muted d-block">Total (incl. taxes)</small>
                                </div>
                                <button class="btn btn-primary btn-sm" onclick="selectRoom('${room.room_id}')">
                                    <i class="fas fa-check me-1"></i>Select
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    html += `
        <div class="mt-4 p-3 bg-light rounded">
            <div class="row">
                <div class="col-md-8">
                    <h6><i class="fas fa-info-circle text-primary me-2"></i>Room Selection Tips</h6>
                    <ul class="small mb-0">
                        <li>Mountain View rooms offer sunrise views of Kanchenjunga</li>
                        <li>Garden rooms provide peaceful courtyard views</li>
                        <li>Family suites include separate living areas</li>
                        <li>All rooms include complimentary WiFi and breakfast</li>
                    </ul>
                </div>
                <div class="col-md-4 text-center">
                    <p class="small text-muted mb-2">Need help choosing?</p>
                    <a href="contact.html" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-phone me-1"></i>Call Us
                    </a>
                </div>
            </div>
        </div>
    `;
    
    roomsList.innerHTML = html;
}

function selectRoom(roomId) {
    selectedRoom = availableRooms.find(room => room.room_id === roomId);
    if (selectedRoom) {
        bookingData.room = selectedRoom;
        
        // Update room selection UI
        document.querySelectorAll('.room-preview').forEach(el => {
            el.classList.remove('selected');
            el.style.border = '2px solid #e5e7eb';
        });
        
        const selectedRoomElement = document.getElementById(`room-${roomId}`);
        selectedRoomElement.classList.add('selected');
        selectedRoomElement.style.border = '2px solid #2563eb';
        selectedRoomElement.style.background = 'linear-gradient(135deg, #eff6ff, #dbeafe)';
        
        updateBookingSummary();
        
        // Auto-advance to next step after 1 second
        setTimeout(() => {
            showStep(2);
            showNotification(`${selectedRoom.name} selected successfully!`, 'success');
        }, 800);
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
                <i class="fas fa-exclamation-triangle fa-2x mb-3 text-danger"></i>
                <h5>Search Failed</h5>
                <p>Unable to search for available rooms. This could be due to:</p>
                <ul class="text-start d-inline-block">
                    <li>Connection issues</li>
                    <li>Server temporarily unavailable</li>
                    <li>Invalid date selection</li>
                </ul>
                <div class="mt-3">
                    <button class="btn btn-primary me-2" onclick="searchAvailableRooms()">
                        <i class="fas fa-refresh me-1"></i>Try Again
                    </button>
                    <a href="contact.html" class="btn btn-outline-primary">
                        <i class="fas fa-phone me-1"></i>Call Us
                    </a>
                </div>
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
    // Clear previous validation states
    document.querySelectorAll('.form-control, .form-select').forEach(el => {
        el.classList.remove('is-invalid', 'is-valid');
    });
    
    let isValid = true;
    let firstErrorField = null;
    
    // Validate name
    if (!guestData.guestName || guestData.guestName.length < 2) {
        document.getElementById('guestName').classList.add('is-invalid');
        if (!firstErrorField) firstErrorField = document.getElementById('guestName');
        isValid = false;
    } else {
        document.getElementById('guestName').classList.add('is-valid');
    }
    
    // Validate email
    if (!guestData.guestEmail || !isValidEmail(guestData.guestEmail)) {
        document.getElementById('guestEmail').classList.add('is-invalid');
        if (!firstErrorField) firstErrorField = document.getElementById('guestEmail');
        isValid = false;
    } else {
        document.getElementById('guestEmail').classList.add('is-valid');
    }
    
    // Validate phone
    if (!guestData.guestPhone || guestData.guestPhone.length < 10) {
        document.getElementById('guestPhone').classList.add('is-invalid');
        if (!firstErrorField) firstErrorField = document.getElementById('guestPhone');
        isValid = false;
    } else {
        document.getElementById('guestPhone').classList.add('is-valid');
    }
    
    // Check terms agreement
    const agreeTerms = document.getElementById('agreeTerms');
    if (!agreeTerms.checked) {
        agreeTerms.classList.add('is-invalid');
        if (!firstErrorField) firstErrorField = agreeTerms;
        isValid = false;
    }
    
    if (!isValid) {
        if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        let errorMessage = 'Please correct the following:';
        if (!guestData.guestName) errorMessage = 'Please enter your full name';
        else if (!isValidEmail(guestData.guestEmail)) errorMessage = 'Please enter a valid email address';
        else if (!guestData.guestPhone) errorMessage = 'Please enter your phone number';
        else if (!agreeTerms.checked) errorMessage = 'Please agree to the terms and conditions';
        
        showNotification(errorMessage, 'error');
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
        id_proof_type: bookingData.idProofType,
        guest_address: bookingData.guestAddress,
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
        showBookingError(error.message);
    });
}

function showBookingProcessing() {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    confirmationDiv.innerHTML = `
        <div class="text-center py-5">
            <div class="mb-4">
                <div class="spinner-border text-primary mb-3" style="width: 4rem; height: 4rem;"></div>
            </div>
            <h3 class="mb-3">Processing Your Booking...</h3>
            <p class="text-muted mb-4">Please wait while we secure your reservation with AWS DynamoDB</p>
            
            <div class="progress mb-4" style="height: 8px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     style="width: 100%; background: linear-gradient(90deg, #2563eb, #1d4ed8);"></div>
            </div>
            
            <div class="processing-steps">
                <div class="step-item mb-2">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    <span>Validating booking details...</span>
                </div>
                <div class="step-item mb-2">
                    <i class="fas fa-spinner fa-spin text-primary me-2"></i>
                    <span>Checking room availability...</span>
                </div>
                <div class="step-item mb-2">
                    <i class="fas fa-clock text-muted me-2"></i>
                    <span>Creating reservation...</span>
                </div>
                <div class="step-item">
                    <i class="fas fa-clock text-muted me-2"></i>
                    <span>Sending confirmation...</span>
                </div>
            </div>
            
            <div class="mt-4 p-3 bg-light rounded">
                <small class="text-muted">
                    <i class="fas fa-shield-alt text-success me-1"></i>
                    Your booking is secured with 256-bit SSL encryption
                </small>
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
        <div class="text-center mb-5">
            <div class="success-animation mb-4">
                <i class="fas fa-check-circle fa-5x text-success"></i>
            </div>
            <h2 class="text-success mb-3">🎉 Booking Confirmed!</h2>
            <p class="lead">Your mountain retreat has been successfully reserved at Alpine Aura Homestay.</p>
        </div>
        
        <div class="booking-details-card bg-light rounded-3 p-4 mb-4">
            <div class="row align-items-center mb-4">
                <div class="col-md-8">
                    <h4 class="text-primary mb-0">
                        <i class="fas fa-file-invoice me-2"></i>
                        Booking Confirmation
                    </h4>
                </div>
                <div class="col-md-4 text-end">
                    <span class="badge bg-success fs-6 px-3 py-2">CONFIRMED</span>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="detail-group mb-3 p-3 bg-white rounded">
                        <strong class="text-primary">Booking ID:</strong><br>
                        <span class="fs-4 fw-bold text-dark">${bookingId}</span>
                        <small class="text-muted d-block">Keep this for your records</small>
                    </div>
                    <div class="detail-group mb-3">
                        <strong><i class="fas fa-user me-2 text-primary"></i>Guest Name:</strong><br>
                        ${bookingData.guestName}
                    </div>
                    <div class="detail-group mb-3">
                        <strong><i class="fas fa-envelope me-2 text-primary"></i>Email:</strong><br>
                        ${bookingData.guestEmail}
                    </div>
                    <div class="detail-group mb-3">
                        <strong><i class="fas fa-phone me-2 text-primary"></i>Phone:</strong><br>
                        ${bookingData.guestPhone}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="detail-group mb-3">
                        <strong><i class="fas fa-bed me-2 text-primary"></i>Room:</strong><br>
                        ${bookingData.room.name}
                        <small class="text-muted d-block">Up to ${bookingData.room.capacity} guests</small>
                    </div>
                    <div class="detail-group mb-3">
                        <strong><i class="fas fa-calendar me-2 text-primary"></i>Check-in:</strong><br>
                        ${formatDate(bookingData.checkin)} <span class="text-success fw-semibold">at 2:00 PM</span>
                    </div>
                    <div class="detail-group mb-3">
                        <strong><i class="fas fa-calendar me-2 text-primary"></i>Check-out:</strong><br>
                        ${formatDate(bookingData.checkout)} <span class="text-warning fw-semibold">by 11:00 AM</span>
                    </div>
                    <div class="detail-group mb-3 p-3 bg-primary text-white rounded">
                        <strong><i class="fas fa-rupee-sign me-2"></i>Total Amount:</strong><br>
                        <span class="fs-3 fw-bold">₹${formatNumber(totalAmount)}</span>
                        <small class="d-block opacity-75">${nights} nights (including all taxes)</small>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="alert alert-info border-0">
                    <h6><i class="fas fa-info-circle"></i> What's Next?</h6>
                    <ul class="mb-0 small">
                        <li>A confirmation email has been sent to <strong>${bookingData.guestEmail}</strong></li>
                        <li>Please arrive at check-in time: <strong>2:00 PM</strong></li>
                        <li>Bring a valid ${bookingData.idProofType} for verification</li>
                        <li>Payment can be made at the property</li>
                    </ul>
                </div>
            </div>
            <div class="col-md-6">
                <div class="alert alert-success border-0">
                    <h6><i class="fas fa-check-circle"></i> Booking Benefits</h6>
                    <ul class="mb-0 small">
                        <li><strong>Free cancellation</strong> up to 24 hours before check-in</li>
                        <li><strong>Complimentary breakfast</strong> for all guests</li>
                        <li><strong>Free WiFi</strong> throughout your stay</li>
                        <li><strong>24/7 support</strong> at +91-XXXXX-XXXXX</li>
                    </ul>
                </div>
            </div>
        </div>
        
        ${bookingData.specialRequests ? `
            <div class="alert alert-warning border-0">
                <h6><i class="fas fa-comment"></i> Special Requests Noted</h6>
                <p class="mb-0">"${bookingData.specialRequests}"</p>
                <small class="text-muted">We'll do our best to accommodate your requests.</small>
            </div>
        ` : ''}
        
        <div class="text-center mt-4">
            <button class="btn btn-outline-primary me-3" onclick="printBooking('${bookingId}')">
                <i class="fas fa-print me-2"></i>Print Confirmation
            </button>
            <button class="btn btn-success me-3" onclick="downloadBooking('${bookingId}')">
                <i class="fas fa-download me-2"></i>Download PDF
            </button>
            <a href="index.html" class="btn btn-primary">
                <i class="fas fa-home me-2"></i>Back to Home
            </a>
        </div>
        
        <div class="text-center mt-4 pt-4 border-top">
            <div class="row">
                <div class="col-md-4">
                    <i class="fas fa-award fa-2x text-warning mb-2"></i>
                    <h6>Best Rate Guaranteed</h6>
                    <small class="text-muted">We offer the best prices</small>
                </div>
                <div class="col-md-4">
                    <i class="fab fa-aws fa-2x text-warning mb-2"></i>
                    <h6>AWS Secured</h6>
                    <small class="text-muted">Your data is safe with us</small>
                </div>
                <div class="col-md-4">
                    <i class="fas fa-headset fa-2x text-warning mb-2"></i>
                    <h6>24/7 Support</h6>
                    <small class="text-muted">We're here to help anytime</small>
                </div>
            </div>
        </div>
    `;
    
    showNotification('🎉 Booking confirmed successfully! Check your email for details.', 'success', 10000);
    
    // Scroll to top of confirmation
    confirmationDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showBookingError(errorMessage = 'Unknown error occurred') {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    confirmationDiv.innerHTML = `
        <div class="text-center py-5">
            <div class="error-animation mb-4">
                <i class="fas fa-exclamation-triangle fa-5x text-danger"></i>
            </div>
            <h3 class="text-danger mb-3">Booking Failed</h3>
            <p class="lead mb-4">We're sorry, but there was an error processing your booking.</p>
            
            <div class="alert alert-danger">
                <h6>Error Details:</h6>
                <p class="mb-0">${errorMessage}</p>
            </div>
            
            <div class="alert alert-warning">
                <h6>What you can do:</h6>
                <ul class="mb-0 text-start">
                    <li>Check your internet connection and try again</li>
                    <li>Verify all your information is correct</li>
                    <li>Try selecting different dates</li>
                    <li>Contact our support team for assistance</li>
                    <li>Call us directly for immediate booking</li>
                </ul>
            </div>
            
            <div class="mt-4">
                <button class="btn btn-primary me-3" onclick="goToStep(2)">
                    <i class="fas fa-arrow-left me-2"></i>Try Again
                </button>
                <a href="contact.html" class="btn btn-outline-primary me-3">
                    <i class="fas fa-phone me-2"></i>Contact Support
                </a>
                <a href="tel:+91XXXXXXXXXX" class="btn btn-success">
                    <i class="fas fa-phone-alt me-2"></i>Call Now
                </a>
            </div>
            
            <div class="mt-4 p-3 bg-light rounded">
                <h6>Alternative Booking Methods:</h6>
                <div class="row">
                    <div class="col-md-4">
                        <i class="fas fa-phone fa-2x text-primary mb-2"></i>
                        <h6>Phone</h6>
                        <small>+91-XXXXX-XXXXX</small>
                    </div>
                    <div class="col-md-4">
                        <i class="fas fa-envelope fa-2x text-primary mb-2"></i>
                        <h6>Email</h6>
                        <small>info@alpineaura.com</small>
                    </div>
                    <div class="col-md-4">
                        <i class="fab fa-whatsapp fa-2x text-success mb-2"></i>
                        <h6>WhatsApp</h6>
                        <small>+91-XXXXX-XXXXX</small>
                    </div>
                </div>
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
                <h5>Select Your Dates</h5>
                <p>Choose your check-in and check-out dates to see pricing details</p>
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
            <div class="details-grid bg-white rounded p-3">
                <div class="detail-row d-flex justify-content-between py-2 border-bottom">
                    <span><i class="fas fa-calendar me-2 text-muted"></i>Check-in:</span>
                    <span class="fw-semibold">${formatDate(checkin)}</span>
                </div>
                <div class="detail-row d-flex justify-content-between py-2 border-bottom">
                    <span><i class="fas fa-calendar me-2 text-muted"></i>Check-out:</span>
                    <span class="fw-semibold">${formatDate(checkout)}</span>
                </div>
                <div class="detail-row d-flex justify-content-between py-2 border-bottom">
                    <span><i class="fas fa-moon me-2 text-muted"></i>Duration:</span>
                    <span class="fw-semibold">${nights} night${nights > 1 ? 's' : ''}</span>
                </div>
                <div class="detail-row d-flex justify-content-between py-2">
                    <span><i class="fas fa-users me-2 text-muted"></i>Guests:</span>
                    <span class="fw-semibold">${totalGuests} (${adults} adults${children > 0 ? `, ${children} children` : ''})</span>
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
                <div class="room-card bg-white rounded-3 p-3 border border-primary">
                    <div class="d-flex align-items-center mb-2">
                        <img src="${selectedRoom.images && selectedRoom.images[0] ? selectedRoom.images[0] : 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=100&h=80&fit=crop&q=80'}" 
                             alt="${selectedRoom.name}" 
                             class="rounded me-3" 
                             style="width: 60px; height: 50px; object-fit: cover;">
                        <div>
                            <h6 class="mb-1">${selectedRoom.name}</h6>
                            <small class="text-muted">Up to ${selectedRoom.capacity} guests</small>
                        </div>
                    </div>
                    <p class="text-muted small mb-2">${truncateText(selectedRoom.description, 80)}</p>
                    <div class="amenities">
                        ${selectedRoom.amenities ? selectedRoom.amenities.slice(0, 3).map(amenity => 
                            `<span class="badge bg-light text-dark me-1" style="font-size: 10px;">${amenity}</span>`
                        ).join('') : ''}
                        ${selectedRoom.amenities && selectedRoom.amenities.length > 3 ? 
                            `<span class="badge bg-light text-dark" style="font-size: 10px;">+${selectedRoom.amenities.length - 3} more</span>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="price-breakdown">
                <h5 class="mb-3">
                    <i class="fas fa-rupee-sign text-primary me-2"></i>
                    Price Breakdown
                </h5>
                <div class="pricing-details bg-white rounded-3 p-3 border">
                    <div class="price-row">
                        <span>₹${formatNumber(selectedRoom.price)} × ${nights} night${nights > 1 ? 's' : ''}</span>
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
                    
                    <div class="mt-3 pt-3 border-top">
                        <div class="d-flex justify-content-between text-success">
                            <small><i class="fas fa-tag me-1"></i>You Save:</small>
                            <small><strong>₹${formatNumber(Math.round(total * 0.1))}</strong></small>
                        </div>
                        <small class="text-muted">Compared to walk-in rates</small>
                    </div>
                </div>
                
                <div class="payment-note mt-3 p-3 bg-light rounded-3">
                    <h6 class="mb-2"><i class="fas fa-credit-card text-primary me-2"></i>Payment Options</h6>
                    <div class="row">
                        <div class="col-6">
                            <small class="text-muted">
                                <i class="fas fa-building me-1 text-success"></i>
                                Pay at Property
                            </small>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">
                                <i class="fas fa-credit-card me-1 text-primary"></i>
                                Online Payment
                            </small>
                        </div>
                    </div>
                    <div class="mt-2">
                        <small class="text-success">
                            <i class="fas fa-calendar-times me-1"></i>
                            Free cancellation up to 24 hours before check-in
                        </small>
                    </div>
                </div>
            </div>
        `;
    } else {
        summaryHTML += `
            <div class="text-center text-muted py-4">
                <i class="fas fa-bed fa-3x mb-3"></i>
                <h6>Select a Room</h6>
                <p>Choose your preferred room to see pricing breakdown</p>
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
    const prefix = 'AA';
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${date}${random}`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function printBooking(bookingId) {
    showNotification('Print functionality would open booking confirmation for printing', 'info');
    // In real implementation, this would generate a printable version
    console.log(`Print booking: ${bookingId}`);
}

function downloadBooking(bookingId) {
    showNotification('Download functionality would generate PDF confirmation', 'info');
    // In real implementation, this would generate and download PDF
    console.log(`Download booking: ${bookingId}`);
}

console.log('📜 Booking page JavaScript loaded successfully');
