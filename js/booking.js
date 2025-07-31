/**
 * Alpine Aura Homestay - Booking Page JavaScript
 * Handles multi-step booking form, validation, and AWS integration
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
    loadRoomsForSelection();
    
    // Check for URL parameters
    checkBookingParameters();
});

// ===== INITIALIZATION =====
function initializeBookingPage() {
    // Set minimum dates
    setMinimumBookingDates();
    
    // Initialize form validation
    setupFormValidation();
    
    // Show initial step
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
            step.classList.add('d-none');
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
    
    // Show current step
    const currentStepElement = document.getElementById(`bookingStep${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.classList.remove('d-none');
    }
}

function goToStep(stepNumber) {
    showStep(stepNumber);
}

// ===== ROOM LOADING =====
function loadRoomsForSelection() {
    console.log('🏠 Loading rooms for selection...');
    
    fetch(`${API_BASE_URL}?action=get_rooms`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.rooms) {
                availableRooms = data.rooms;
                console.log(`✅ Loaded ${data.rooms.length} rooms for booking`);
            } else {
                console.log('ℹ️ Using mock rooms data');
                availableRooms = getMockRoomsData();
            }
        })
        .catch(error => {
            console.error('❌ Error loading rooms:', error);
            availableRooms = getMockRoomsData();
        });
}

function getMockRoomsData() {
    return [
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
            description: 'Peaceful garden views with modern amenities.',
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
    
    // Validate dates
    if (!validateDates(formData)) {
        return;
    }
    
    // Store booking data
    bookingData = { ...formData };
    
    // Search for available rooms
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
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Searching...</span>
            </div>
            <p class="mt-2">Searching available rooms...</p>
        </div>
    `;
    
    availableRoomsDiv.classList.remove('d-none');
    
    // Simulate API call or use real one
    setTimeout(() => {
        displayAvailableRooms();
    }, 1500);
}

function displayAvailableRooms() {
    const roomsList = document.getElementById('roomsList');
    if (!roomsList) return;
    
    const totalGuests = bookingData.adults + bookingData.children;
    const availableForGuests = availableRooms.filter(room => room.capacity >= totalGuests);
    
    if (availableForGuests.length === 0) {
        roomsList.innerHTML = `
            <div class="alert alert-warning">
                <h5><i class="fas fa-exclamation-triangle"></i> No Rooms Available</h5>
                <p>No rooms can accommodate ${totalGuests} guests for the selected dates. Please adjust your requirements.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="row">';
    
    availableForGuests.forEach(room => {
        const nights = calculateNights(bookingData.checkin, bookingData.checkout);
        const totalPrice = room.price * nights;
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="card room-option">
                    <img src="${room.images[0]}" class="card-img-top" alt="${room.name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h5 class="card-title">${room.name}</h5>
                        <p class="card-text">${room.description}</p>
                        <div class="room-details mb-3">
                            <small class="text-muted">
                                <i class="fas fa-users"></i> Up to ${room.capacity} guests |
                                <i class="fas fa-moon"></i> ${nights} nights |
                                <i class="fas fa-rupee-sign"></i> ${formatNumber(room.price)}/night
                            </small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong class="text-primary">₹${formatNumber(totalPrice)}</strong>
                                <small class="text-muted d-block">Total for ${nights} nights</small>
                            </div>
                            <button class="btn btn-primary" onclick="selectRoom('${room.room_id}')">
                                Select Room
                            </button>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                ${room.amenities.slice(0, 3).join(' • ')}
                                ${room.amenities.length > 3 ? ` • +${room.amenities.length - 3} more` : ''}
                            </small>
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
        updateBookingSummary();
        showStep(2);
        showNotification(`${selectedRoom.name} selected successfully!`, 'success');
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
    
    // Validate guest details
    if (!validateGuestDetails(guestData)) {
        return;
    }
    
    // Store guest data
    bookingData = { ...bookingData, ...guestData };
    
    // Process booking
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
    
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===== BOOKING PROCESSING =====
function processBooking() {
    showStep(3);
    showBookingConfirmation();
    
    // Simulate booking submission
    setTimeout(() => {
        submitBookingToServer();
    }, 2000);
}

function showBookingConfirmation() {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    confirmationDiv.innerHTML = `
        <div class="text-center mb-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Processing...</span>
            </div>
            <p class="mt-2">Processing your booking...</p>
        </div>
    `;
}

function submitBookingToServer() {
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

function showBookingSuccess(data) {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    const bookingId = data.booking_id || generateMockBookingId();
    const totalAmount = data.total_amount || calculateTotalAmount();
    
    confirmationDiv.innerHTML = `
        <div class="alert alert-success">
            <div class="text-center">
                <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                <h3>Booking Confirmed!</h3>
                <p class="lead">Your reservation has been successfully created.</p>
            </div>
        </div>
        
        <div class="booking-details">
            <h4>Booking Details</h4>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Booking ID:</strong> ${bookingId}</p>
                    <p><strong>Guest Name:</strong> ${bookingData.guestName}</p>
                    <p><strong>Email:</strong> ${bookingData.guestEmail}</p>
                    <p><strong>Phone:</strong> ${bookingData.guestPhone}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Room:</strong> ${bookingData.room.name}</p>
                    <p><strong>Check-in:</strong> ${formatDate(bookingData.checkin)}</p>
                    <p><strong>Check-out:</strong> ${formatDate(bookingData.checkout)}</p>
                    <p><strong>Total Amount:</strong> <span class="text-primary">₹${formatNumber(totalAmount)}</span></p>
                </div>
            </div>
        </div>
        
        <div class="alert alert-info">
            <h6><i class="fas fa-info-circle"></i> What's Next?</h6>
            <ul class="mb-0">
                <li>A confirmation email has been sent to ${bookingData.guestEmail}</li>
                <li>Please arrive at the check-in time: 2:00 PM</li>
                <li>Payment can be made at the property</li>
                <li>For any queries, call us at +91-XXXXX-XXXXX</li>
            </ul>
        </div>
        
        <div class="text-center mt-4">
            <button class="btn btn-primary me-2" onclick="printBooking('${bookingId}')">
                <i class="fas fa-print"></i> Print Confirmation
            </button>
            <a href="index.html" class="btn btn-outline-primary">
                <i class="fas fa-home"></i> Back to Home
            </a>
        </div>
    `;
    
    showNotification('Booking confirmed successfully!', 'success', 8000);
}

function showBookingError() {
    const confirmationDiv = document.getElementById('bookingConfirmation');
    if (!confirmationDiv) return;
    
    confirmationDiv.innerHTML = `
        <div class="alert alert-danger">
            <div class="text-center">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h3>Booking Failed</h3>
                <p>We're sorry, but there was an error processing your booking. Please try again or contact us directly.</p>
            </div>
        </div>
        
        <div class="text-center mt-4">
            <button class="btn btn-primary me-2" onclick="goToStep(2)">
                <i class="fas fa-arrow-left"></i> Try Again
            </button>
            <a href="contact.html" class="btn btn-outline-primary">
                <i class="fas fa-phone"></i> Contact Support
            </a>
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
            <div class="text-center text-muted py-4">
                <i class="fas fa-calendar-plus fa-3x mb-3"></i>
                <p>Select your dates and room to see pricing details</p>
            </div>
        `;
        return;
    }
    
    const nights = calculateNights(checkin, checkout);
    const totalGuests = adults + children;
    
    let summaryHTML = `
        <div class="booking-info">
            <h5><i class="fas fa-calendar-alt"></i> Stay Details</h5>
            <div class="info-row">
                <span><i class="fas fa-calendar"></i> Check-in:</span>
                <span>${formatDate(checkin)}</span>
            </div>
            <div class="info-row">
                <span><i class="fas fa-calendar"></i> Check-out:</span>
                <span>${formatDate(checkout)}</span>
            </div>
            <div class="info-row">
                <span><i class="fas fa-moon"></i> Nights:</span>
                <span>${nights}</span>
            </div>
            <div class="info-row">
                <span><i class="fas fa-users"></i> Guests:</span>
                <span>${totalGuests} (${adults} adults, ${children} children)</span>
            </div>
        </div>
    `;
    
    if (selectedRoom) {
        const subtotal = selectedRoom.price * nights;
        const tax = Math.round(subtotal * 0.12);
        const total = subtotal + tax;
        summaryHTML += `
            <hr class="my-3">
            <div class="room-info">
                <h5><i class="fas fa-bed"></i> Selected Room</h5>
                <div class="room-summary">
                    <h6>${selectedRoom.name}</h6>
                    <p class="text-muted small">${selectedRoom.description}</p>
                </div>
            </div>
            
            <hr class="my-3">
            <div class="pricing-info">
                <h5><i class="fas fa-rupee-sign"></i> Price Breakdown</h5>
                <div class="price-row">
                    <span>₹${formatNumber(selectedRoom.price)} × ${nights} nights</span>
                    <span>₹${formatNumber(subtotal)}</span>
                </div>
                <div class="price-row">
                    <span>Taxes (12% GST)</span>
                    <span>₹${formatNumber(tax)}</span>
                </div>
                <div class="price-row total-row">
                    <span><strong>Total Amount</strong></span>
                    <span><strong>₹${formatNumber(total)}</strong></span>
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

function setupFormValidation() {
    // Add real-time validation for form fields
    const emailInput = document.getElementById('guestEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            if (this.value && !isValidEmail(this.value)) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
    
    const phoneInput = document.getElementById('guestPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            // Remove non-numeric characters except + and -
            this.value = this.value.replace(/[^\d+\-\s()]/g, '');
        });
    }
}

console.log('📜 Booking page JavaScript loaded successfully');
