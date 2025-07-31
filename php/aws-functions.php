<?php
/**
 * Alpine Aura Homestay - AWS DynamoDB Integration Functions
 * Complete implementation of all DynamoDB operations
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/aws-config.php';

use Aws\DynamoDb\Exception\DynamoDbException;
use Aws\DynamoDb\Marshaler;

/**
 * Get all rooms from DynamoDB
 */
function getRoomsFromDynamoDB() {
    global $dynamodb;
    
    try {
        $result = $dynamodb->query([
            'TableName' => ROOMS_TABLE,
            'IndexName' => 'StatusIndex',
            'KeyConditionExpression' => '#status = :status',
            'ExpressionAttributeNames' => [
                '#status' => 'status'
            ],
            'ExpressionAttributeValues' => [
                ':status' => 'active'
            ]
        ]);
        
        $marshaler = new Marshaler();
        $rooms = [];
        
        foreach ($result['Items'] as $item) {
            $room = $marshaler->unmarshalItem($item);
            $rooms[] = $room;
        }
        
        // Sort by price
        usort($rooms, function($a, $b) {
            return $a['price'] <=> $b['price'];
        });
        
        return $rooms;
        
    } catch (DynamoDbException $e) {
        error_log("Error fetching rooms from DynamoDB: " . $e->getMessage());
        throw new Exception("Failed to fetch rooms: " . $e->getMessage());
    }
}

/**
 * Check room availability in DynamoDB
 */
function checkRoomAvailabilityAWS($checkin, $checkout, $totalGuests) {
    global $dynamodb;
    
    try {
        // First, get all active rooms that can accommodate the guests
        $roomsResult = $dynamodb->scan([
            'TableName' => ROOMS_TABLE,
            'FilterExpression' => '#status = :status AND capacity >= :capacity',
            'ExpressionAttributeNames' => [
                '#status' => 'status'
            ],
            'ExpressionAttributeValues' => [
                ':status' => 'active',
                ':capacity' => $totalGuests
            ]
        ]);
        
        $marshaler = new Marshaler();
        $availableRooms = [];
        
        foreach ($roomsResult['Items'] as $item) {
            $room = $marshaler->unmarshalItem($item);
            
            // Check if this room is available for the requested dates
            if (isRoomAvailableForDates($room['room_id'], $checkin, $checkout)) {
                $availableRooms[] = $room;
            }
        }
        
        return $availableRooms;
        
    } catch (DynamoDbException $e) {
        error_log("Error checking availability: " . $e->getMessage());
        throw new Exception("Failed to check availability: " . $e->getMessage());
    }
}

/**
 * Check if a specific room is available for given dates
 */
function isRoomAvailableForDates($roomId, $checkin, $checkout) {
    global $dynamodb;
    
    try {
        $checkinDate = new DateTime($checkin);
        $checkoutDate = new DateTime($checkout);
        $interval = new DateInterval('P1D');
        $period = new DatePeriod($checkinDate, $interval, $checkoutDate);
        
        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            
            $result = $dynamodb->getItem([
                'TableName' => AVAILABILITY_TABLE,
                'Key' => [
                    'room_id' => $roomId,
                    'date' => $dateStr
                ]
            ]);
            
            if (!empty($result['Item'])) {
                $marshaler = new Marshaler();
                $availability = $marshaler->unmarshalItem($result['Item']);
                
                if ($availability['status'] !== 'available') {
                    return false; // Room is not available on this date
                }
            }
        }
        
        return true; // Room is available for all requested dates
        
    } catch (Exception $e) {
        error_log("Error checking room availability for dates: " . $e->getMessage());
        return false; // Conservative approach - assume not available on error
    }
}

/**
 * Create a new booking in DynamoDB
 */
function createBookingInDynamoDB($input) {
    global $dynamodb;
    
    try {
        // Generate booking ID
        $bookingId = generateBookingId();
        $nights = calculateNights($input['checkin_date'], $input['checkout_date']);
        
        // Get room details for pricing
        $roomResult = $dynamodb->getItem([
            'TableName' => ROOMS_TABLE,
            'Key' => [
                'room_id' => $input['room_id']
            ]
        ]);
        
        if (empty($roomResult['Item'])) {
            throw new Exception("Room not found: " . $input['room_id']);
        }
        
        $marshaler = new Marshaler();
        $room = $marshaler->unmarshalItem($roomResult['Item']);
        
        // Calculate pricing
        $baseAmount = $room['price'] * $nights;
        $taxAmount = round($baseAmount * 0.12); // 12% GST
        $totalAmount = $baseAmount + $taxAmount;
        
        // Create booking item
        $bookingItem = [
            'booking_id' => $bookingId,
            'room_id' => $input['room_id'],
            'room_name' => $room['name'],
            'guest_name' => $input['guest_name'],
            'guest_email' => $input['guest_email'],
            'guest_phone' => $input['guest_phone'],
            'checkin_date' => $input['checkin_date'],
            'checkout_date' => $input['checkout_date'],
            'adults' => intval($input['adults']),
            'children' => intval($input['children'] ?? 0),
            'nights' => $nights,
            'base_amount' => $baseAmount,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'booking_status' => 'confirmed',
            'payment_status' => 'pending',
            'special_requests' => $input['special_requests'] ?? '',
            'booking_source' => 'website',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ];
        
        // Save booking
        $dynamodb->putItem([
            'TableName' => BOOKINGS_TABLE,
            'Item' => $bookingItem
        ]);
        
        // Block the dates in availability table
        blockDatesInAvailability($input['room_id'], $input['checkin_date'], $input['checkout_date'], $bookingId);
        
        return [
            'booking_id' => $bookingId,
            'total_amount' => $totalAmount,
            'nights' => $nights,
            'status' => 'confirmed'
        ];
        
    } catch (DynamoDbException $e) {
        error_log("Error creating booking: " . $e->getMessage());
        throw new Exception("Failed to create booking: " . $e->getMessage());
    }
}

/**
 * Block dates in availability table
 */
function blockDatesInAvailability($roomId, $checkin, $checkout, $bookingId) {
    global $dynamodb;
    
    try {
        $checkinDate = new DateTime($checkin);
        $checkoutDate = new DateTime($checkout);
        $interval = new DateInterval('P1D');
        $period = new DatePeriod($checkinDate, $interval, $checkoutDate);
        
        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            
            $dynamodb->putItem([
                'TableName' => AVAILABILITY_TABLE,
                'Item' => [
                    'room_id' => $roomId,
                    'date' => $dateStr,
                    'status' => 'booked',
                    'booking_id' => $bookingId,
                    'created_at' => date('c')
                ]
            ]);
        }
        
    } catch (DynamoDbException $e) {
        error_log("Error blocking dates: " . $e->getMessage());
        // Don't throw exception here as booking was already created
    }
}

/**
 * Get booking from DynamoDB
 */
function getBookingFromDynamoDB($bookingId) {
    global $dynamodb;
    
    try {
        $result = $dynamodb->getItem([
            'TableName' => BOOKINGS_TABLE,
            'Key' => [
                'booking_id' => $bookingId
            ]
        ]);
        
        if (empty($result['Item'])) {
            return null;
        }
        
        $marshaler = new Marshaler();
        return $marshaler->unmarshalItem($result['Item']);
        
    } catch (DynamoDbException $e) {
        error_log("Error fetching booking: " . $e->getMessage());
        throw new Exception("Failed to fetch booking: " . $e->getMessage());
    }
}

/**
 * Get all bookings from DynamoDB with filters
 */
function getBookingsFromDynamoDB($limit = 50, $status = '', $startDate = '', $endDate = '') {
    global $dynamodb;
    
    try {
        $params = [
            'TableName' => BOOKINGS_TABLE,
            'Limit' => $limit
        ];
        
        // Add status filter if provided
        if (!empty($status)) {
            $params['IndexName'] = 'StatusIndex';
            $params['KeyConditionExpression'] = 'booking_status = :status';
            $params['ExpressionAttributeValues'] = [
                ':status' => $status
            ];
        }
        
        // Use scan if no index-based filter
        if (empty($status)) {
            $result = $dynamodb->scan($params);
        } else {
            $result = $dynamodb->query($params);
        }
        
        $marshaler = new Marshaler();
        $bookings = [];
        
        foreach ($result['Items'] as $item) {
            $booking = $marshaler->unmarshalItem($item);
            
            // Apply date filters if provided
            if (!empty($startDate) && $booking['checkin_date'] < $startDate) {
                continue;
            }
            if (!empty($endDate) && $booking['checkin_date'] > $endDate) {
                continue;
            }
            
            $bookings[] = $booking;
        }
        
        // Sort by creation date (newest first)
        usort($bookings, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });
        
        return $bookings;
        
    } catch (DynamoDbException $e) {
        error_log("Error fetching bookings: " . $e->getMessage());
        throw new Exception("Failed to fetch bookings: " . $e->getMessage());
    }
}

/**
 * Update booking in DynamoDB
 */
function updateBookingInDynamoDB($bookingId, $status, $input) {
    global $dynamodb;
    
    try {
        $updateExpression = 'SET booking_status = :status, updated_at = :updated_at';
        $expressionAttributeValues = [
            ':status' => $status,
            ':updated_at' => date('c')
        ];
        
        // Add optional fields if provided
        if (isset($input['payment_status'])) {
            $updateExpression .= ', payment_status = :payment_status';
            $expressionAttributeValues[':payment_status'] = $input['payment_status'];
        }
        
        if (isset($input['admin_notes'])) {
            $updateExpression .= ', admin_notes = :admin_notes';
            $expressionAttributeValues[':admin_notes'] = $input['admin_notes'];
        }
        
        $result = $dynamodb->updateItem([
            'TableName' => BOOKINGS_TABLE,
            'Key' => [
                'booking_id' => $bookingId
            ],
            'UpdateExpression' => $updateExpression,
            'ExpressionAttributeValues' => $expressionAttributeValues,
            'ReturnValues' => 'ALL_NEW'
        ]);
        
        // If booking is cancelled, free up the dates
        if ($status === 'cancelled') {
            freeDatesInAvailability($bookingId);
        }
        
        return true;
        
    } catch (DynamoDbException $e) {
        error_log("Error updating booking: " . $e->getMessage());
        throw new Exception("Failed to update booking: " . $e->getMessage());
    }
}

/**
 * Free dates in availability table (for cancelled bookings)
 */
function freeDatesInAvailability($bookingId) {
    global $dynamodb;
    
    try {
        // First, find all availability records for this booking
        $result = $dynamodb->scan([
            'TableName' => AVAILABILITY_TABLE,
            'FilterExpression' => 'booking_id = :booking_id',
            'ExpressionAttributeValues' => [
                ':booking_id' => $bookingId
            ]
        ]);
        
        $marshaler = new Marshaler();
        
        foreach ($result['Items'] as $item) {
            $availability = $marshaler->unmarshalItem($item);
            
            // Update status to available
            $dynamodb->updateItem([
                'TableName' => AVAILABILITY_TABLE,
                'Key' => [
                    'room_id' => $availability['room_id'],
                    'date' => $availability['date']
                ],
                'UpdateExpression' => 'SET #status = :status REMOVE booking_id',
                'ExpressionAttributeNames' => [
                    '#status' => 'status'
                ],
                'ExpressionAttributeValues' => [
                    ':status' => 'available'
                ]
            ]);
        }
        
    } catch (DynamoDbException $e) {
        error_log("Error freeing dates: " . $e->getMessage());
        // Don't throw exception as this is a cleanup operation
    }
}

/**
 * Get booking statistics for dashboard
 */
function getBookingStatistics() {
    global $dynamodb;
    
    try {
        // Get all bookings for statistics
        $result = $dynamodb->scan([
            'TableName' => BOOKINGS_TABLE
        ]);
        
        $marshaler = new Marshaler();
        $bookings = [];
        
        foreach ($result['Items'] as $item) {
            $bookings[] = $marshaler->unmarshalItem($item);
        }
        
        // Calculate statistics
        $stats = [
            'total_bookings' => count($bookings),
            'confirmed_bookings' => 0,
            'pending_bookings' => 0,
            'cancelled_bookings' => 0,
            'completed_bookings' => 0,
            'total_revenue' => 0,
            'monthly_revenue' => 0,
            'average_booking_value' => 0
        ];
        
        $currentMonth = date('Y-m');
        
        foreach ($bookings as $booking) {
            // Count by status
            switch ($booking['booking_status']) {
                case 'confirmed':
                    $stats['confirmed_bookings']++;
                    break;
                case 'pending':
                    $stats['pending_bookings']++;
                    break;
                case 'cancelled':
                    $stats['cancelled_bookings']++;
                    break;
                case 'completed':
                    $stats['completed_bookings']++;
                    break;
            }
            
            // Revenue calculations (only for confirmed and completed)
            if (in_array($booking['booking_status'], ['confirmed', 'completed'])) {
                $stats['total_revenue'] += $booking['total_amount'];
                
                // Monthly revenue
                if (substr($booking['created_at'], 0, 7) === $currentMonth) {
                    $stats['monthly_revenue'] += $booking['total_amount'];
                }
            }
        }
        
        // Calculate average
        if ($stats['total_bookings'] > 0) {
            $stats['average_booking_value'] = round($stats['total_revenue'] / ($stats['confirmed_bookings'] + $stats['completed_bookings']));
        }
        
        return $stats;
        
    } catch (DynamoDbException $e) {
        error_log("Error getting statistics: " . $e->getMessage());
        throw new Exception("Failed to get statistics: " . $e->getMessage());
    }
}

/**
 * Get room occupancy statistics
 */
function getRoomOccupancyStats($startDate = null, $endDate = null) {
    global $dynamodb;
    
    try {
        if (!$startDate) $startDate = date('Y-m-01'); // First day of current month
        if (!$endDate) $endDate = date('Y-m-t'); // Last day of current month
        
        $params = [
            'TableName' => AVAILABILITY_TABLE,
            'FilterExpression' => '#date BETWEEN :start_date AND :end_date',
            'ExpressionAttributeNames' => [
                '#date' => 'date'
            ],
            'ExpressionAttributeValues' => [
                ':start_date' => $startDate,
                ':end_date' => $endDate
            ]
        ];
        
        $result = $dynamodb->scan($params);
        
        $marshaler = new Marshaler();
        $occupancyData = [];
        
        foreach ($result['Items'] as $item) {
            $availability = $marshaler->unmarshalItem($item);
            $roomId = $availability['room_id'];
            
            if (!isset($occupancyData[$roomId])) {
                $occupancyData[$roomId] = [
                    'room_id' => $roomId,
                    'total_days' => 0,
                    'booked_days' => 0,
                    'available_days' => 0,
                    'maintenance_days' => 0,
                    'occupancy_rate' => 0
                ];
            }
            
            $occupancyData[$roomId]['total_days']++;
            
            switch ($availability['status']) {
                case 'booked':
                    $occupancyData[$roomId]['booked_days']++;
                    break;
                case 'available':
                    $occupancyData[$roomId]['available_days']++;
                    break;
                case 'maintenance':
                    $occupancyData[$roomId]['maintenance_days']++;
                    break;
            }
        }
        
        // Calculate occupancy rates
        foreach ($occupancyData as &$data) {
            if ($data['total_days'] > 0) {
                $data['occupancy_rate'] = round(($data['booked_days'] / $data['total_days']) * 100, 2);
            }
        }
        
        return array_values($occupancyData);
        
    } catch (DynamoDbException $e) {
        error_log("Error getting occupancy stats: " . $e->getMessage());
        throw new Exception("Failed to get occupancy statistics: " . $e->getMessage());
    }
}

/**
 * Helper function to generate unique booking ID
 */
function generateBookingId() {
    return 'AA' . date('Ymd') . sprintf('%04d', rand(1000, 9999));
}

/**
 * Helper function to calculate nights between dates
 */
function calculateNights($checkin, $checkout) {
    $checkinDate = new DateTime($checkin);
    $checkoutDate = new DateTime($checkout);
    return $checkinDate->diff($checkoutDate)->days;
}
?>
