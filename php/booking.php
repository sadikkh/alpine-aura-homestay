<?php
/**
 * Alpine Aura Homestay - Main Booking API with AWS DynamoDB
 * Handles all booking operations including room management and reservations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include AWS configuration
$configFile = __DIR__ . '/aws-config.php';
if (file_exists($configFile)) {
    require_once $configFile;
    $useAWS = isAWSConfigured();
} else {
    // Use mock data for demonstration when AWS is not configured
    $useMockData = true;
}

// Get request parameters
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// API Router
try {
    switch($action) {
        case 'get_rooms':
            handleGetRooms();
            break;
        case 'check_availability':
            handleCheckAvailability();
            break;
        case 'create_booking':
            handleCreateBooking();
            break;
        case 'get_bookings':
            handleGetBookings();
            break;
        case 'get_booking':
            handleGetBooking();
            break;
        case 'update_booking':
            handleUpdateBooking();
            break;
        case 'delete_booking':
            handleDeleteBooking();
            break;
        case 'test_connection':
            handleTestConnection();
            break;
        case 'docs':
            showApiDocumentation();
            break;
        default:
            sendResponse([
                'error' => 'Invalid action specified',
                'available_actions' => [
                    'get_rooms', 'check_availability', 'create_booking',
                    'get_bookings', 'get_booking', 'update_booking', 'delete_booking',
                    'test_connection', 'docs'
                ]
            ], 400);
    }
} catch (Exception $e) {
    error_log('Booking API Error: ' . $e->getMessage());
    sendResponse([
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'timestamp' => date('c')
    ], 500);
}

/**
 * Test AWS DynamoDB connection
 */
function handleTestConnection() {
    global $useAWS, $awsConfig, $useMockData;
    
    if (isset($useMockData)) {
        sendResponse([
            'success' => false,
            'message' => 'AWS not configured. Using mock data for demonstration.',
            'mode' => 'mock_data',
            'database' => 'Mock Data (Demo Mode)',
            'instructions' => [
                '1. Copy aws-config.example.php to aws-config.php',
                '2. Update with your AWS credentials (Access Key ID and Secret)',
                '3. Run: php setup/create-tables.php to create DynamoDB tables',
                '4. Test again: ?action=test_connection'
            ],
            'aws_setup_guide' => 'See aws-config.example.php for detailed setup instructions',
            'timestamp' => date('c')
        ]);
        return;
    }
    
    if ($useAWS && $awsConfig) {
        $result = $awsConfig->testConnection();
        $result['mode'] = 'aws_dynamodb';
        $result['database'] = 'AWS DynamoDB';
        sendResponse($result);
    } else {
        sendResponse([
            'success' => false,
            'message' => 'AWS configuration error - check your credentials',
            'mode' => 'error',
            'database' => 'Configuration Error'
        ], 500);
    }
}

/**
 * Get all available rooms
 */
function handleGetRooms() {
    global $useAWS, $useMockData;
    
    if (isset($useMockData)) {
        // Mock data for demonstration
        $rooms = getMockRooms();
        sendResponse([
            'success' => true,
            'rooms' => $rooms,
            'source' => 'mock_data',
            'count' => count($rooms),
            'message' => 'Demo data - Configure AWS for live data'
        ]);
        return;
    }
    
    // Real AWS DynamoDB implementation
    try {
        $rooms = getRoomsFromDynamoDB();
        sendResponse([
            'success' => true,
            'rooms' => $rooms,
            'source' => 'aws_dynamodb',
            'count' => count($rooms),
            'message' => 'Data loaded from AWS DynamoDB'
        ]);
    } catch (Exception $e) {
        sendResponse([
            'error' => 'Failed to fetch rooms from DynamoDB',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Check room availability for given dates
 */
function handleCheckAvailability() {
    $checkin = $_GET['checkin'] ?? '';
    $checkout = $_GET['checkout'] ?? '';
    $adults = intval($_GET['adults'] ?? 1);
    $children = intval($_GET['children'] ?? 0);
    $totalGuests = $adults + $children;
    
    // Validate input
    $validation = validateBookingInput($checkin, $checkout, $totalGuests);
    if (!$validation['valid']) {
        sendResponse(['error' => $validation['message']], 400);
        return;
    }
    
    global $useAWS, $useMockData;
    
    if (isset($useMockData)) {
        // Mock availability check
        $rooms = getMockRooms();
        $availableRooms = array_filter($rooms, function($room) use ($totalGuests) {
            return $room['capacity'] >= $totalGuests;
        });
        
        $nights = calculateNights($checkin, $checkout);
        foreach ($availableRooms as &$room) {
            $room['nights'] = $nights;
            $room['total_amount'] = $room['price'] * $nights;
            $room['price_breakdown'] = calculatePricing($room['price'], $nights);
        }
        
        sendResponse([
            'success' => true,
            'rooms' => array_values($availableRooms),
            'search_criteria' => [
                'checkin' => $checkin,
                'checkout' => $checkout,
                'adults' => $adults,
                'children' => $children,
                'nights' => $nights
            ],
            'source' => 'mock_data'
        ]);
        return;
    }
    
    // Real AWS implementation
    try {
        $availableRooms = checkRoomAvailabilityAWS($checkin, $checkout, $totalGuests);
        $nights = calculateNights($checkin, $checkout);
        
        foreach ($availableRooms as &$room) {
            $room['nights'] = $nights;
            $room['total_amount'] = $room['price'] * $nights;
            $room['price_breakdown'] = calculatePricing($room['price'], $nights);
        }
        
        sendResponse([
            'success' => true,
            'rooms' => $availableRooms,
            'search_criteria' => [
                'checkin' => $checkin,
                'checkout' => $checkout,
                'adults' => $adults,
                'children' => $children,
                'nights' => $nights
            ],
            'source' => 'aws_dynamodb'
        ]);
    } catch (Exception $e) {
        sendResponse([
            'error' => 'Failed to check availability',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Create a new booking
 */
function handleCreateBooking() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['error' => 'POST method required'], 405);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate booking data
    $validation = validateBookingData($input);
    if (!$validation['valid']) {
        sendResponse(['error' => $validation['message']], 400);
        return;
    }
    
    global $useAWS, $useMockData;
    
    if (isset($useMockData)) {
        // Mock booking creation
        $bookingId = generateBookingId();
        $nights = calculateNights($input['checkin_date'], $input['checkout_date']);
        $totalAmount = 2500 * $nights; // Mock price calculation
        
        sendResponse([
            'success' => true,
            'booking_id' => $bookingId,
            'total_amount' => $totalAmount,
            'nights' => $nights,
            'status' => 'confirmed',
            'message' => 'Booking created successfully (Demo Mode)',
            'source' => 'mock_data',
            'booking_details' => [
                'guest_name' => $input['guest_name'],
                'guest_email' => $input['guest_email'],
                'room_id' => $input['room_id'],
                'checkin_date' => $input['checkin_date'],
                'checkout_date' => $input['checkout_date']
            ]
        ]);
        return;
    }
    
    // Real AWS implementation
    try {
        $booking = createBookingInDynamoDB($input);
        sendResponse([
            'success' => true,
            'booking_id' => $booking['booking_id'],
            'total_amount' => $booking['total_amount'],
            'nights' => $booking['nights'],
            'status' => $booking['status'],
            'message' => 'Booking created successfully',
            'source' => 'aws_dynamodb'
        ]);
    } catch (Exception $e) {
        sendResponse([
            'error' => 'Failed to create booking',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get specific booking details
 */
function handleGetBooking() {
    $bookingId = $_GET['booking_id'] ?? '';
    
    if (empty($bookingId)) {
        sendResponse(['error' => 'Booking ID is required'], 400);
        return;
    }
    
    global $useAWS, $useMockData;
    
    if (isset($useMockData)) {
        // Mock booking data
        $booking = [
            'booking_id' => $bookingId,
            'room_id' => 'room-001',
            'room_name' => 'Mountain View Deluxe',
            'guest_name' => 'Demo Guest',
            'guest_email' => 'demo@alpineaura.com',
            'guest_phone' => '+91-9999999999',
            'checkin_date' => '2024-02-15',
            'checkout_date' => '2024-02-18',
            'adults' => 2,
            'children' => 0,
            'nights' => 3,
            'total_amount' => 7500,
            'booking_status' => 'confirmed',
            'payment_status' => 'paid',
            'special_requests' => 'Mountain view room preferred',
            'created_at' => date('c'),
            'source' => 'mock_data'
        ];
        
        sendResponse(['success' => true, 'booking' => $booking]);
        return;
    }
    
    // Real AWS implementation
    try {
        $booking = getBookingFromDynamoDB($bookingId);
        if ($booking) {
            sendResponse(['success' => true, 'booking' => $booking, 'source' => 'aws_dynamodb']);
        } else {
            sendResponse(['error' => 'Booking not found', 'booking_id' => $bookingId], 404);
        }
    } catch (Exception $e) {
        sendResponse([
            'error' => 'Failed to fetch booking',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get all bookings (admin function)
 */
function handleGetBookings() {
    $limit = intval($_GET['limit'] ?? 50);
    $status = $_GET['status'] ?? '';
    $startDate = $_GET['start_date'] ?? '';
    $endDate = $_GET['end_date'] ?? '';
    
    global $useAWS, $useMockData;
    
    if (isset($useMockData)) {
        // Mock bookings data
        $bookings = getMockBookings();
        
        // Apply filters
        if (!empty($status)) {
            $bookings = array_filter($bookings, function($booking) use ($status) {
                return $booking['booking_status'] === $status;
            });
        }
        
        // Apply limit
        $bookings = array_slice($bookings, 0, $limit);
        
        sendResponse([
            'success' => true,
            'bookings' => array_values($bookings),
            'total_count' => count($bookings),
            'filters_applied' => [
                'status' => $status,
                'limit' => $limit
            ],
            'source' => 'mock_data'
        ]);
        return;
    }
    
    // Real AWS implementation
    try {
        $bookings = getBookingsFromDynamoDB($limit, $status, $startDate, $endDate);
        sendResponse([
            'success' => true,
            'bookings' => $bookings,
            'total_count' => count($bookings),
            'source' => 'aws_dynamodb'
        ]);
    } catch (Exception $e) {
        sendResponse([
            'error' => 'Failed to fetch bookings',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Update booking status
 */
function handleUpdateBooking() {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        sendResponse(['error' => 'PUT method required'], 405);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $bookingId = $input['booking_id'] ?? '';
    $status = $input['booking_status'] ?? '';
    
    if (empty($bookingId) || empty($status)) {
        sendResponse(['error' => 'Booking ID and status are required'], 400);
        return;
    }
    
    $validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!in_array($status, $validStatuses)) {
        sendResponse([
            'error' => 'Invalid booking status',
            'valid_statuses' => $validStatuses
        ], 400);
        return;
    }
    
    global $useAWS, $useMockData;
    
    if (isset($useMockData)) {
        sendResponse([
            'success' => true,
            'message' => 'Booking status updated successfully (Demo Mode)',
            'booking_id' => $bookingId,
            'old_status' => 'confirmed',
            'new_status' => $status,
            'source' => 'mock_data'
        ]);
        return;
    }
    
    // Real AWS implementation
    try {
        $result = updateBookingInDynamoDB($bookingId, $status, $input);
        sendResponse([
            'success' => true,
            'message' => 'Booking updated successfully',
            'booking_id' => $bookingId,
            'new_status' => $status,
            'source' => 'aws_dynamodb'
        ]);
    } catch (Exception $e) {
        sendResponse([
            'error' => 'Failed to update booking',
            'message' => $e->getMessage()
        ], 500);
    }
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

function getMockRooms() {
    return [
        [
            'room_id' => 'room-001',
            'name' => 'Mountain View Deluxe',
            'description' => 'Wake up to breathtaking Himalayan views from your private balcony with panoramic mountain vistas.',
            'price' => 2500,
            'capacity' => 3,
            'amenities' => ['Mountain View', 'AC', 'WiFi', 'Private Bathroom', 'Balcony', 'Room Service'],
            'images' => [
                'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&q=80'
            ],
            'status' => 'active',
            'room_size' => '25 sqm',
            'bed_type' => 'King Bed',
            'floor' => 2,
            'room_number' => '201'
        ],
        [
            'room_id' => 'room-002',
            'name' => 'Cozy Garden Room',
            'description' => 'Peaceful garden views with modern amenities, perfect for couples seeking tranquility.',
            'price' => 2000,
            'capacity' => 2,
            'amenities' => ['Garden View', 'WiFi', 'Private Bathroom', 'Work Desk', 'Mini Fridge'],
            'images' => [
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop&q=80'
            ],
            'status' => 'active',
            'room_size' => '20 sqm',
            'bed_type' => 'Queen Bed',
            'floor' => 1,
            'room_number' => '101'
        ],
        [
            'room_id' => 'room-003',
            'name' => 'Family Suite',
            'description' => 'Spacious suite perfect for families with separate living area and stunning mountain views.',
            'price' => 3500,
            'capacity' => 6,
            'amenities' => ['Mountain View', 'Living Area', 'Kitchenette', 'WiFi', '2 Bathrooms', 'Dining Area'],
            'images' => [
                'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&h=400&fit=crop&q=80'
            ],
            'status' => 'active',
            'room_size' => '45 sqm',
            'bed_type' => '2 Bedrooms',
            'floor' => 2,
            'room_number' => '202-203'
        ]
    ];
}

function getMockBookings() {
    return [
        [
            'booking_id' => 'AA20240115001',
            'room_id' => 'room-001',
            'room_name' => 'Mountain View Deluxe',
            'guest_name' => 'Rajesh Kumar',
            'guest_email' => 'rajesh.kumar@example.com',
            'guest_phone' => '+91-9876543210',
            'checkin_date' => '2024-02-15',
            'checkout_date' => '2024-02-18',
            'adults' => 2,
            'children' => 1,
            'nights' => 3,
            'total_amount' => 7500,
            'booking_status' => 'confirmed',
            'payment_status' => 'paid',
            'special_requests' => 'Late checkout if possible',
            'created_at' => '2024-01-15T10:30:00+05:30'
        ],
        [
            'booking_id' => 'AA20240115002',
            'room_id' => 'room-003',
            'room_name' => 'Family Suite',
            'guest_name' => 'Priya Sharma',
            'guest_email' => 'priya.sharma@example.com',
            'guest_phone' => '+91-9876543211',
            'checkin_date' => '2024-02-20',
            'checkout_date' => '2024-02-23',
            'adults' => 4,
            'children' => 2,
            'nights' => 3,
            'total_amount' => 10500,
            'booking_status' => 'pending',
            'payment_status' => 'pending',
            'special_requests' => 'Ground floor room preferred',
            'created_at' => '2024-01-15T14:45:00+05:30'
        ]
    ];
}

function validateBookingInput($checkin, $checkout, $guests) {
    if (empty($checkin) || empty($checkout)) {
        return ['valid' => false, 'message' => 'Check-in and check-out dates are required'];
    }
    
    if (!validateDateFormat($checkin) || !validateDateFormat($checkout)) {
        return ['valid' => false, 'message' => 'Invalid date format. Use YYYY-MM-DD'];
    }
    
    if (strtotime($checkin) >= strtotime($checkout)) {
        return ['valid' => false, 'message' => 'Check-out date must be after check-in date'];
    }
    
    if (strtotime($checkin) < strtotime(date('Y-m-d'))) {
        return ['valid' => false, 'message' => 'Check-in date cannot be in the past'];
    }
    
    if ($guests < 1 || $guests > 10) {
        return ['valid' => false, 'message' => 'Guest count must be between 1 and 10'];
    }
    
    return ['valid' => true];
}

function validateBookingData($input) {
    $required = ['room_id', 'guest_name', 'guest_email', 'guest_phone', 'checkin_date', 'checkout_date', 'adults'];
    
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['valid' => false, 'message' => "Missing required field: $field"];
        }
    }
    
    if (!filter_var($input['guest_email'], FILTER_VALIDATE_EMAIL)) {
        return ['valid' => false, 'message' => 'Invalid email address'];
    }
    
    if (!validateDateFormat($input['checkin_date']) || !validateDateFormat($input['checkout_date'])) {
        return ['valid' => false, 'message' => 'Invalid date format for checkin/checkout dates'];
    }
    
    return ['valid' => true];
}

function validateDateFormat($date) {
    $d = DateTim
