<?php
/**
 * Alpine Aura Homestay - Sample Data Seeding Script
 * Populates DynamoDB tables with sample data for testing and demonstration
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../php/aws-config.php';

use Aws\DynamoDb\Exception\DynamoDbException;

echo "🌱 Alpine Aura Homestay - Sample Data Seeding\n";
echo "=============================================\n\n";

if (!isAWSConfigured()) {
    echo "❌ AWS is not configured! Please run:\n";
    echo "1. cp php/aws-config.example.php php/aws-config.php\n";
    echo "2. Edit php/aws-config.php with your credentials\n";
    echo "3. php setup/create-tables.php\n";
    echo "4. php setup/seed-sample-data.php\n";
    exit(1);
}

try {
    echo "🔍 Testing AWS connection...\n";
    $testResult = $awsConfig->testConnection();
    
    if (!$testResult['success']) {
        echo "❌ AWS connection failed: " . $testResult['message'] . "\n";
        exit(1);
    }
    
    echo "✅ AWS connection successful!\n\n";
    
    // Seed all tables
    seedRoomsData();
    seedBookingsData();
    seedAvailabilityData();
    seedUsersData();
    seedSettingsData();
    
    echo "\n🎉 Sample data seeded successfully!\n";
    echo "==================================\n\n";
    
    echo "🚀 NEXT STEPS:\n";
    echo "1. Start server: composer serve\n";
    echo "2. Test API: http://localhost:8000/php/booking.php?action=get_rooms\n";
    echo "3. View docs: http://localhost:8000/php/booking.php?action=docs\n";
    echo "4. Test booking: Use the website booking form\n\n";
    
    echo "📊 SAMPLE DATA ADDED:\n";
    echo "✅ 3 sample rooms with different price points\n";
    echo "✅ 2 sample bookings (1 confirmed, 1 pending)\n";
    echo "✅ Availability data for next 30 days\n";
    echo "✅ 1 admin user (admin@alpineaura.com)\n";
    echo "✅ System configuration settings\n";
    
} catch (Exception $e) {
    echo "❌ Seeding failed: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * Seed rooms data
 */
function seedRoomsData() {
    global $dynamodb;
    
    echo "🏠 Seeding rooms data...\n";
    
    $rooms = [
        [
            'room_id' => 'room-001',
            'name' => 'Mountain View Deluxe',
            'description' => 'Wake up to breathtaking Himalayan views from your private balcony. This spacious room features premium amenities and panoramic mountain vistas including views of Mount Kanchenjunga.',
            'price' => 2500,
            'capacity' => 3,
            'room_size' => '25 sqm',
            'bed_type' => 'King Bed',
            'floor' => 2,
            'room_number' => '201',
            'amenities' => [
                'Mountain View', 'AC', 'WiFi', 'Private Bathroom', 
                'Balcony', 'Room Service', 'Mini Bar', 'Work Desk'
            ],
            'images' => [
                'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&h=600&fit=crop&q=80',
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80',
                'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&q=80'
            ],
            'features' => [
                'Panoramic Himalayan views including Mount Kanchenjunga',
                'Private balcony with comfortable outdoor seating',
                'Premium bedding with high thread count linens',
                '24/7 room service with local and international cuisine',
                'Individual climate control for optimal comfort',
                'Complimentary high-speed WiFi throughout stay'
            ],
            'status' => 'active',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'room_id' => 'room-002',
            'name' => 'Cozy Garden Room',
            'description' => 'Peaceful garden views with modern amenities, perfect for couples or solo travelers seeking tranquility. Features a comfortable work area and serene garden outlook.',
            'price' => 2000,
            'capacity' => 2,
            'room_size' => '20 sqm',
            'bed_type' => 'Queen Bed',
            'floor' => 1,
            'room_number' => '101',
            'amenities' => [
                'Garden View', 'WiFi', 'Private Bathroom', 'Work Desk', 
                'Mini Fridge', 'Reading Corner', 'Tea/Coffee Maker'
            ],
            'images' => [
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80',
                'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&q=80',
                'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop&q=80'
            ],
            'features' => [
                'Serene garden views showcasing local Himalayan flora',
                'Dedicated workspace with ergonomic furniture',
                'Mini refrigerator for personal refreshments',
                'Premium tea and coffee making facilities',
                'Comfortable reading corner with natural lighting',
                'High-speed internet ideal for remote work'
            ],
            'status' => 'active',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'room_id' => 'room-003',
            'name' => 'Family Suite',
            'description' => 'Spacious suite perfect for families with separate living area, kitchenette, and stunning mountain views. Ideal for extended stays with all the comforts of home.',
            'price' => 3500,
            'capacity' => 6,
            'room_size' => '45 sqm',
            'bed_type' => '2 Bedrooms (1 King + 2 Singles)',
            'floor' => 2,
            'room_number' => '202-203',
            'amenities' => [
                'Mountain View', 'Separate Living Area', 'Kitchenette', 
                'WiFi', '2 Bathrooms', 'Dining Area', 'Washing Machine', 'Balcony'
            ],
            'images' => [
                'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&q=80',
                'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&h=600&fit=crop&q=80',
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80'
            ],
            'features' => [
                'Two separate bedrooms for family privacy',
                'Full kitchenette with modern cooking appliances',
                'Spacious living room with comfortable seating',
                'Mountain and garden views from multiple rooms',
                'Two full bathrooms with 24/7 hot water',
                'Family-friendly amenities and safety features'
            ],
            'status' => 'active',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ]
    ];
    
    foreach ($rooms as $room) {
        try {
            $dynamodb->putItem([
                'TableName' => ROOMS_TABLE,
                'Item' => $room
            ]);
            echo "   ✅ Added room: " . $room['name'] . " (₹" . number_format($room['price']) . "/night)\n";
        } catch (DynamoDbException $e) {
            echo "   ❌ Failed to add room " . $room['room_id'] . ": " . $e->getMessage() . "\n";
        }
    }
}

/**
 * Seed bookings data
 */
function seedBookingsData() {
    global $dynamodb;
    
    echo "📅 Seeding bookings data...\n";
    
    $bookings = [
        [
            'booking_id' => 'AA' . date('Ymd') . '0001',
            'room_id' => 'room-001',
            'room_name' => 'Mountain View Deluxe',
            'guest_name' => 'Rajesh Kumar',
            'guest_email' => 'rajesh.kumar@example.com',
            'guest_phone' => '+91-9876543210',
            'checkin_date' => date('Y-m-d', strtotime('+7 days')),
            'checkout_date' => date('Y-m-d', strtotime('+10 days')),
            'adults' => 2,
            'children' => 1,
            'nights' => 3,
            'base_amount' => 7500,
            'tax_amount' => 900,
            'total_amount' => 8400,
            'booking_status' => 'confirmed',
            'payment_status' => 'paid',
            'special_requests' => 'Late check-in expected, vegetarian meals preferred',
            'booking_source' => 'website',
            'guest_notes' => 'First time visiting Kalimpong, excited about mountain views',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'booking_id' => 'AA' . date('Ymd') . '0002',
            'room_id' => 'room-003',
            'room_name' => 'Family Suite',
            'guest_name' => 'Priya and Amit Sharma',
            'guest_email' => 'priya.sharma@example.com',
            'guest_phone' => '+91-9876543211',
            'checkin_date' => date('Y-m-d', strtotime('+14 days')),
            'checkout_date' => date('Y-m-d', strtotime('+17 days')),
            'adults' => 4,
            'children' => 2,
            'nights' => 3,
            'base_amount' => 10500,
            'tax_amount' => 1260,
            'total_amount' => 11760,
            'booking_status' => 'pending',
            'payment_status' => 'pending',
            'special_requests' => 'Ground floor room if available, extra towels for children',
            'booking_source' => 'website',
            'guest_notes' => 'Family vacation with grandparents, need accessible facilities',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ]
    ];
    
    foreach ($bookings as $booking) {
        try {
            $dynamodb->putItem([
                'TableName' => BOOKINGS_TABLE,
                'Item' => $booking
            ]);
            echo "   ✅ Added booking: " . $booking['booking_id'] . " for " . $booking['guest_name'] . "\n";
        } catch (DynamoDbException $e) {
            echo "   ❌ Failed to add booking " . $booking['booking_id'] . ": " . $e->getMessage() . "\n";
        }
    }
}

/**
 * Seed availability data
 */
function seedAvailabilityData() {
    global $dynamodb;
    
    echo "📊 Seeding availability data...\n";
    
    $rooms = ['room-001', 'room-002', 'room-003'];
    $addedCount = 0;
    
    // Create availability for next 30 days
    for ($i = 0; $i < 30; $i++) {
        $date = date('Y-m-d', strtotime("+$i days"));
        
        foreach ($rooms as $roomId) {
            // Mark some dates as booked for demonstration
            $status = 'available';
            $booking_id = null;
            
            // Room 001 is booked for days 7-9 (from sample booking)
            if ($roomId === 'room-001' && $i >= 7 && $i <= 9) {
                $status = 'booked';
                $booking_id = 'AA' . date('Ymd') . '0001';
            }
            
            // Room 003 is booked for days 14-16 (from sample booking)
            if ($roomId === 'room-003' && $i >= 14 && $i <= 16) {
                $status = 'booked';
                $booking_id = 'AA' . date('Ymd') . '0002';
            }
            
            // Random maintenance day for room-002
            if ($roomId === 'room-002' && $i === 20) {
                $status = 'maintenance';
            }
            
            $availabilityItem = [
                'room_id' => $roomId,
                'date' => $date,
                'status' => $status,
                'created_at' => date('c')
            ];
            
            if ($booking_id) {
                $availabilityItem['booking_id'] = $booking_id;
            }
            
            try {
                $dynamodb->putItem([
                    'TableName' => AVAILABILITY_TABLE,
                    'Item' => $availabilityItem
                ]);
                $addedCount++;
            } catch (DynamoDbException $e) {
                echo "   ❌ Failed to add availability for " . $roomId . " on " . $date . ": " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "   ✅ Added " . $addedCount . " availability records for next 30 days\n";
}

/**
 * Seed users data
 */
function seedUsersData() {
    global $dynamodb;
    
    echo "👤 Seeding users data...\n";
    
    $users = [
        [
            'user_id' => 'admin-001',
            'email' => 'admin@alpineaura.com',
            'name' => 'Admin User',
            'role' => 'admin',
            'password_hash' => password_hash('admin123', PASSWORD_DEFAULT), // Change this in production!
            'status' => 'active',
            'permissions' => ['manage_bookings', 'manage_rooms', 'view_reports', 'manage_users'],
            'last_login' => null,
            'created_at' => date('c'),
            'updated_at' => date('c')
        ]
    ];
    
    foreach ($users as $user) {
        try {
            $dynamodb->putItem([
                'TableName' => USERS_TABLE,
                'Item' => $user
            ]);
            echo "   ✅ Added user: " . $user['email'] . " (" . $user['role'] . ")\n";
            echo "   🔑 Default password: admin123 (CHANGE THIS IN PRODUCTION!)\n";
        } catch (DynamoDbException $e) {
            echo "   ❌ Failed to add user " . $user['user_id'] . ": " . $e->getMessage() . "\n";
        }
    }
}

/**
 * Seed settings data
 */
function seedSettingsData() {
    global $dynamodb;
    
    echo "⚙️  Seeding settings data...\n";
    
    $settings = [
        [
            'setting_key' => 'general.site_name',
            'setting_value' => 'Alpine Aura Homestay',
            'category' => 'general',
            'description' => 'Name of the homestay',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'setting_key' => 'general.site_tagline',
            'setting_value' => 'Authentic Himalayan Experience in Kalimpong',
            'category' => 'general',
            'description' => 'Site tagline',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'setting_key' => 'contact.email',
            'setting_value' => 'info@alpineaura.com',
            'category' => 'contact',
            'description' => 'Primary contact email',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'setting_key' => 'contact.phone',
            'setting_value' => '+91-XXXXX-XXXXX',
            'category' => 'contact',
            'description' => 'Primary contact phone',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'setting_key' => 'booking.check_in_time',
            'setting_value' => '14:00',
            'category' => 'booking',
            'description' => 'Standard check-in time',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'setting_key' => 'booking.check_out_time',
            'setting_value' => '11:00',
            'category' => 'booking',
            'description' => 'Standard check-out time',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'setting_key' => 'pricing.tax_rate',
            'setting_value' => '12',
            'category' => 'pricing',
            'description' => 'Tax rate percentage (GST)',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'setting_key' => 'pricing.currency',
            'setting_value' => 'INR',
            'category' => 'pricing',
            'description' => 'Base currency',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ]
    ];
    
    foreach ($settings as $setting) {
        try {
            $dynamodb->putItem([
                'TableName' => SETTINGS_TABLE,
                'Item' => $setting
            ]);
            echo "   ✅ Added setting: " . $setting['setting_key'] . " = " . $setting['setting_value'] . "\n";
        } catch (DynamoDbException $e) {
            echo "   ❌ Failed to add setting " . $setting['setting_key'] . ": " . $e->getMessage() . "\n";
        }
    }
}
?>
