<?php
/**
 * Alpine Aura Homestay - Booking API
 * AWS DynamoDB integration with fallback to mock data
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get action from request
$action = $_GET['action'] ?? $_POST['action'] ?? 'docs';

// Mock data for demonstration
function getMockRooms() {
    return [
        [
            'room_id' => 'room-001',
            'name' => 'Mountain View Deluxe',
            'description' => 'Wake up to breathtaking Himalayan views from your private balcony. This spacious room features modern amenities while maintaining traditional charm.',
            'price' => 2500,
            'capacity' => 3,
            'room_size' => '30 sqm',
            'bed_type' => 'King Size Bed',
            'floor' => '2nd Floor',
            'amenities' => ['Mountain View', 'AC', 'WiFi', 'Private Bathroom', 'Balcony', 'Mini Fridge', 'Tea/Coffee Maker'],
            'images' => [
                'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80'
            ],
            'available' => true,
            'status' => 'active'
        ],
        [
            'room_id' => 'room-002',
            'name' => 'Cozy Garden Room',
            'description' => 'Peaceful garden views with modern amenities and comfortable furnishing. Perfect for couples seeking tranquility.',
            'price' => 2000,
            'capacity' => 2,
            'room_size' => '25 sqm',
            'bed_type' => 'Queen Size Bed',
            'floor' => '1st Floor',
            'amenities' => ['Garden View', 'WiFi', 'Private Bathroom', 'Work Desk', 'AC', 'Tea/Coffee Maker'],
            'images' => [
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=600&h=400&fit=crop&q=80'
            ],
            'available' => true,
            'status' => 'active'
        ],
        [
            'room_id' => 'room-003',
            'name' => 'Family Suite',
            'description' => 'Spacious suite perfect for families with separate living area and kitchenette. Accommodates up to 6 guests comfortably.',
            'price' => 3500,
            'capacity' => 6,
            'room_size' => '50 sqm',
            'bed_type' => '2 Queen Beds',
            'floor' => '2nd Floor',
            'amenities' => ['Mountain View', 'Living Area', 'Kitchenette', 'WiFi', '2 Bathrooms', 'AC', 'Dining Table', 'Sofa Bed'],
            'images' => [
                'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop&q=80',
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop&q=80'
            ],
            'available' => true,
            'status' => 'active'
        ]
    ];
}

// Handle different actions
switch ($action) {
    case 'test_connection':
        // Test AWS connection or return mock status
        echo json_encode([
            'success' => true,
            'message' => 'Running in demo mode with mock data',
            'mode' => 'mock_data',
            'database' => 'Mock Data (Demo Mode)',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        break;

    case 'get_rooms':
        // Return available rooms
        $rooms = getMockRooms();
        echo json_encode([
            'success' => true,
            'rooms' => $rooms,
            'count' => count($rooms),
            'source' => 'Mock Data',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        break;

    case 'check_availability':
        // Check room availability for specific dates
        $checkin = $_GET['checkin'] ?? '';
        $checkout = $_GET['checkout'] ?? '';
        $adults = intval($_GET['adults'] ?? 2);
        $children = intval($_GET['children'] ?? 0);
        
        if (empty($checkin) || empty($checkout)) {
            echo json_encode([
                'success' => false,
                'error' => 'Check-in and check-out dates are required'
            ]);
            break;
        }
        
        // Calculate nights
        $checkin_date = new DateTime($checkin);
        $checkout_date = new DateTime($checkout);
        $nights = $checkin_date->diff($checkout_date)->days;
        
        // Filter rooms based on capacity
        $rooms = getMockRooms();
        $total_guests = $adults + $children;
        $available_rooms = array_filter($rooms, function($room) use ($total_guests) {
            return $room['capacity'] >= $total_guests && $room['available'];
        });
        
        // Add calculated pricing
        foreach ($available_rooms as &$room) {
            $room['nights'] = $nights;
            $room['subtotal'] = $room['price'] * $nights;
            $room['tax'] = round($room['subtotal'] * 0.12); // 12% GST
            $room['total_amount'] = $room['subtotal'] + $room['tax'];
        }
        
        echo json_encode([
            'success' => true,
            'rooms' => array_values($available_rooms),
            'search_criteria' => [
                'checkin' => $checkin,
                'checkout' => $checkout,
                'nights' => $nights,
                'adults' => $adults,
                'children' => $children,
                'total_guests' => $total_guests
            ],
            'count' => count($available_rooms),
            'source' => 'Mock Data'
        ]);
        break;

    case 'create_booking':
        // Create a new booking
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            echo json_encode([
                'success' => false,
                'error' => 'Invalid booking data'
            ]);
            break;
        }
        
        // Validate required fields
        $required_fields = ['room_id', 'checkin_date', 'checkout_date', 'guest_name', 'guest_email', 'guest_phone'];
        foreach ($required_fields as $field) {
            if (empty($input[$field])) {
                echo json_encode([
                    'success' => false,
                    'error' => "Missing required field: $field"
                ]);
                exit;
            }
        }
        
        // Generate booking ID
        $booking_id = 'AA' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        // Calculate pricing
        $checkin = new DateTime($input['checkin_date']);
        $checkout = new DateTime($input['checkout_date']);
        $nights = $checkin->diff($checkout)->days;
        
        // Find room details
        $rooms = getMockRooms();
        $room = null;
        foreach ($rooms as $r) {
            if ($r['room_id'] === $input['room_id']) {
                $room = $r;
                break;
            }
        }
        
        if (!$room) {
            echo json_encode([
                'success' => false,
                'error' => 'Room not found'
            ]);
            break;
        }
        
        $subtotal = $room['price'] * $nights;
        $tax = round($subtotal * 0.12);
        $total_amount = $subtotal + $tax;
        
        // Mock booking creation (in real app, save to DynamoDB)
        $booking = [
            'booking_id' => $booking_id,
            'room_id' => $input['room_id'],
            'room_name' => $room['name'],
            'checkin_date' => $input['checkin_date'],
            'checkout_date' => $input['checkout_date'],
            'nights' => $nights,
            'adults' => $input['adults'] ?? 2,
            'children' => $input['children'] ?? 0,
            'guest_name' => $input['guest_name'],
            'guest_email' => $input['guest_email'],
            'guest_phone' => $input['guest_phone'],
            'special_requests' => $input['special_requests'] ?? '',
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total_amount' => $total_amount,
            'status' => 'confirmed',
            'created_at' => date('Y-m-d H:i:s'),
            'source' => 'Mock Booking System'
        ];
        
        echo json_encode([
            'success' => true,
            'message' => 'Booking created successfully',
            'booking_id' => $booking_id,
            'booking' => $booking,
            'total_amount' => $total_amount,
            'nights' => $nights,
            'status' => 'confirmed'
        ]);
        break;

    case 'docs':
    default:
        // API Documentation
        echo json_encode([
            'api_name' => 'Alpine Aura Homestay Booking API',
            'version' => '1.0.0',
            'description' => 'AWS DynamoDB powered booking system for Kalimpong homestay',
            'endpoints' => [
                'test_connection' => [
                    'method' => 'GET',
                    'description' => 'Test API and AWS connection',
                    'url' => '?action=test_connection'
                ],
                'get_rooms' => [
                    'method' => 'GET',
                    'description' => 'Get all available rooms',
                    'url' => '?action=get_rooms'
                ],
                'check_availability' => [
                    'method' => 'GET',
                    'description' => 'Check room availability for specific dates',
                    'url' => '?action=check_availability&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=2&children=0',
                    'parameters' => [
                        'checkin' => 'Check-in date (YYYY-MM-DD)',
                        'checkout' => 'Check-out date (YYYY-MM-DD)',
                        'adults' => 'Number of adults',
                        'children' => 'Number of children'
                    ]
                ],
                'create_booking' => [
                    'method' => 'POST',
                    'description' => 'Create a new booking',
                    'url' => '?action=create_booking',
                    'body' => [
                        'room_id' => 'Room ID',
                        'checkin_date' => 'Check-in date',
                        'checkout_date' => 'Check-out date',
                        'guest_name' => 'Guest name',
                        'guest_email' => 'Guest email',
                        'guest_phone' => 'Guest phone',
                        'special_requests' => 'Special requests (optional)'
                    ]
                ]
            ],
            'mock_mode' => true,
            'aws_integration' => 'Available with configuration',
            'demo_urls' => [
                'Test Connection' => '?action=test_connection',
                'Get Rooms' => '?action=get_rooms',
                'Check Availability' => '?action=check_availability&checkin=2024-12-01&checkout=2024-12-03&adults=2&children=0'
            ]
        ]);
        break;
}
?>
