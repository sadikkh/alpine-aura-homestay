<?php
/**
 * Alpine Aura Homestay - AWS DynamoDB Tables Creation Script
 * Creates all required DynamoDB tables with proper indexes and configurations
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Include AWS configuration
$configFile = __DIR__ . '/../php/aws-config.php';

if (!file_exists($configFile)) {
    echo "❌ AWS configuration not found!\n\n";
    echo "SETUP REQUIRED:\n";
    echo "1. Copy aws-config.example.php to aws-config.php\n";
    echo "2. Update with your AWS credentials\n";
    echo "3. Run this script again\n\n";
    echo "Commands:\n";
    echo "   cp php/aws-config.example.php php/aws-config.php\n";
    echo "   # Edit php/aws-config.php with your AWS credentials\n";
    echo "   php setup/create-tables.php\n";
    exit(1);
}

require_once $configFile;

use Aws\DynamoDb\Exception\DynamoDbException;

echo "🏔️ Alpine Aura Homestay - DynamoDB Setup\n";
echo "==========================================\n\n";

if (!isAWSConfigured()) {
    echo "❌ AWS is not properly configured!\n\n";
    echo "TROUBLESHOOTING CHECKLIST:\n";
    echo "1. ✓ AWS Access Key ID is correct\n";
    echo "2. ✓ AWS Secret Access Key is correct\n";
    echo "3. ✓ AWS region is valid (e.g., us-east-1, ap-south-1)\n";
    echo "4. ✓ IAM user has DynamoDB permissions\n";
    echo "5. ✓ Composer dependencies are installed\n\n";
    echo "Test your connection:\n";
    echo "   php -r \"require 'php/aws-config.php'; print_r(\$awsConfig->testConnection());\"\n";
    exit(1);
}

try {
    echo "🔍 Testing AWS DynamoDB connection...\n";
    $testResult = $awsConfig->testConnection();
    
    if (!$testResult['success']) {
        echo "❌ Connection failed: " . $testResult['message'] . "\n\n";
        echo "COMMON SOLUTIONS:\n";
        echo "1. Verify your AWS credentials are correct\n";
        echo "2. Check your AWS region setting\n";
        echo "3. Ensure DynamoDB permissions in IAM\n";
        echo "4. Verify internet connectivity\n";
        exit(1);
    }
    
    echo "✅ AWS DynamoDB connection successful!\n";
    echo "   Region: " . $testResult['region'] . "\n";
    echo "   Timestamp: " . $testResult['timestamp'] . "\n\n";
    
    // Create all required tables
    echo "📦 Creating DynamoDB tables...\n\n";
    
    createRoomsTable();
    createBookingsTable();
    createAvailabilityTable();
    createUsersTable();
    createSettingsTable();
    
    echo "\n🎉 All tables created successfully!\n";
    echo "====================================\n\n";
    
    echo "📋 SUMMARY:\n";
    echo "✅ " . ROOMS_TABLE . " - Room information and pricing\n";
    echo "✅ " . BOOKINGS_TABLE . " - Guest bookings and reservations\n";
    echo "✅ " . AVAILABILITY_TABLE . " - Room availability calendar\n";
    echo "✅ " . USERS_TABLE . " - Admin users and authentication\n";
    echo "✅ " . SETTINGS_TABLE . " - System configuration\n\n";
    
    echo "🚀 NEXT STEPS:\n";
    echo "1. Add sample data: php setup/seed-sample-data.php\n";
    echo "2. Start development server: composer serve\n";
    echo "3. Test API: http://localhost:8000/php/booking.php?action=test_connection\n";
    echo "4. View documentation: http://localhost:8000/php/booking.php?action=docs\n\n";
    
    echo "💰 COST INFORMATION:\n";
    echo "- These tables use on-demand billing (pay-per-request)\n";
    echo "- Small homestay usage: typically under $5/month\n";
    echo "- Free tier: 25 GB storage + 25 WCU/RCU per month\n";
    echo "- Monitor costs in AWS Console → DynamoDB → Tables\n\n";
    
    echo "🔒 SECURITY REMINDERS:\n";
    echo "- Keep your AWS credentials secure\n";
    echo "- Use IAM roles in production\n";
    echo "- Enable CloudTrail for audit logging\n";
    echo "- Regularly review access permissions\n";
    
} catch (Exception $e) {
    echo "❌ Setup failed: " . $e->getMessage() . "\n\n";
    echo "TROUBLESHOOTING:\n";
    echo "1. Check your AWS credentials\n";
    echo "2. Verify DynamoDB permissions\n";
    echo "3. Ensure region is correct\n";
    echo "4. Check internet connectivity\n";
    exit(1);
}

/**
 * Create Rooms table
 */
function createRoomsTable() {
    global $dynamodb;
    
    echo "🏠 Creating Rooms table...\n";
    
    $tableExists = checkIfTableExists(ROOMS_TABLE);
    if ($tableExists) {
        echo "   ⚠️  Table " . ROOMS_TABLE . " already exists, skipping creation\n";
        return;
    }
    
    try {
        $result = $dynamodb->createTable([
            'TableName' => ROOMS_TABLE,
            'KeySchema' => [
                [
                    'AttributeName' => 'room_id',
                    'KeyType' => 'HASH'
                ]
            ],
            'AttributeDefinitions' => [
                [
                    'AttributeName' => 'room_id',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'status',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'capacity',
                    'AttributeType' => 'N'
                ]
            ],
            'GlobalSecondaryIndexes' => [
                [
                    'IndexName' => 'StatusIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'status',
                            'KeyType' => 'HASH'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ],
                [
                    'IndexName' => 'CapacityIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'capacity',
                            'KeyType' => 'HASH'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ]
            ],
            'BillingMode' => 'PAY_PER_REQUEST',
            'Tags' => [
                [
                    'Key' => 'Project',
                    'Value' => 'Alpine-Aura-Homestay'
                ],
                [
                    'Key' => 'Environment',
                    'Value' => 'Development'
                ]
            ]
        ]);
        
        echo "   ✅ " . ROOMS_TABLE . " table created successfully\n";
        waitForTableActive(ROOMS_TABLE);
        
    } catch (DynamoDbException $e) {
        echo "   ❌ Failed to create " . ROOMS_TABLE . ": " . $e->getMessage() . "\n";
        throw $e;
    }
}

/**
 * Create Bookings table
 */
function createBookingsTable() {
    global $dynamodb;
    
    echo "📅 Creating Bookings table...\n";
    
    $tableExists = checkIfTableExists(BOOKINGS_TABLE);
    if ($tableExists) {
        echo "   ⚠️  Table " . BOOKINGS_TABLE . " already exists, skipping creation\n";
        return;
    }
    
    try {
        $result = $dynamodb->createTable([
            'TableName' => BOOKINGS_TABLE,
            'KeySchema' => [
                [
                    'AttributeName' => 'booking_id',
                    'KeyType' => 'HASH'
                ]
            ],
            'AttributeDefinitions' => [
                [
                    'AttributeName' => 'booking_id',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'room_id',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'checkin_date',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'booking_status',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'guest_email',
                    'AttributeType' => 'S'
                ]
            ],
            'GlobalSecondaryIndexes' => [
                [
                    'IndexName' => 'RoomDateIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'room_id',
                            'KeyType' => 'HASH'
                        ],
                        [
                            'AttributeName' => 'checkin_date',
                            'KeyType' => 'RANGE'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ],
                [
                    'IndexName' => 'StatusIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'booking_status',
                            'KeyType' => 'HASH'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ],
                [
                    'IndexName' => 'GuestEmailIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'guest_email',
                            'KeyType' => 'HASH'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ]
            ],
            'BillingMode' => 'PAY_PER_REQUEST',
            'Tags' => [
                [
                    'Key' => 'Project',
                    'Value' => 'Alpine-Aura-Homestay'
                ],
                [
                    'Key' => 'Environment',
                    'Value' => 'Development'
                ]
            ]
        ]);
        
        echo "   ✅ " . BOOKINGS_TABLE . " table created successfully\n";
        waitForTableActive(BOOKINGS_TABLE);
        
    } catch (DynamoDbException $e) {
        echo "   ❌ Failed to create " . BOOKINGS_TABLE . ": " . $e->getMessage() . "\n";
        throw $e;
    }
}

/**
 * Create Availability table
 */
function createAvailabilityTable() {
    global $dynamodb;
    
    echo "📊 Creating Availability table...\n";
    
    $tableExists = checkIfTableExists(AVAILABILITY_TABLE);
    if ($tableExists) {
        echo "   ⚠️  Table " . AVAILABILITY_TABLE . " already exists, skipping creation\n";
        return;
    }
    
    try {
        $result = $dynamodb->createTable([
            'TableName' => AVAILABILITY_TABLE,
            'KeySchema' => [
                [
                    'AttributeName' => 'room_id',
                    'KeyType' => 'HASH'
                ],
                [
                    'AttributeName' => 'date',
                    'KeyType' => 'RANGE'
                ]
            ],
            'AttributeDefinitions' => [
                [
                    'AttributeName' => 'room_id',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'date',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'status',
                    'AttributeType' => 'S'
                ]
            ],
            'GlobalSecondaryIndexes' => [
                [
                    'IndexName' => 'StatusDateIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'status',
                            'KeyType' => 'HASH'
                        ],
                        [
                            'AttributeName' => 'date',
                            'KeyType' => 'RANGE'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ]
            ],
            'BillingMode' => 'PAY_PER_REQUEST',
            'Tags' => [
                [
                    'Key' => 'Project',
                    'Value' => 'Alpine-Aura-Homestay'
                ],
                [
                    'Key' => 'Environment',
                    'Value' => 'Development'
                ]
            ]
        ]);
        
        echo "   ✅ " . AVAILABILITY_TABLE . " table created successfully\n";
        waitForTableActive(AVAILABILITY_TABLE);
        
    } catch (DynamoDbException $e) {
        echo "   ❌ Failed to create " . AVAILABILITY_TABLE . ": " . $e->getMessage() . "\n";
        throw $e;
    }
}

/**
 * Create Users table (for admin authentication)
 */
function createUsersTable() {
    global $dynamodb;
    
    echo "👤 Creating Users table...\n";
    
    $tableExists = checkIfTableExists(USERS_TABLE);
    if ($tableExists) {
        echo "   ⚠️  Table " . USERS_TABLE . " already exists, skipping creation\n";
        return;
    }
    
    try {
        $result = $dynamodb->createTable([
            'TableName' => USERS_TABLE,
            'KeySchema' => [
                [
                    'AttributeName' => 'user_id',
                    'KeyType' => 'HASH'
                ]
            ],
            'AttributeDefinitions' => [
                [
                    'AttributeName' => 'user_id',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'email',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'role',
                    'AttributeType' => 'S'
                ]
            ],
            'GlobalSecondaryIndexes' => [
                [
                    'IndexName' => 'EmailIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'email',
                            'KeyType' => 'HASH'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ],
                [
                    'IndexName' => 'RoleIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'role',
                            'KeyType' => 'HASH'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ]
            ],
            'BillingMode' => 'PAY_PER_REQUEST',
            'Tags' => [
                [
                    'Key' => 'Project',
                    'Value' => 'Alpine-Aura-Homestay'
                ],
                [
                    'Key' => 'Environment',
                    'Value' => 'Development'
                ]
            ]
        ]);
        
        echo "   ✅ " . USERS_TABLE . " table created successfully\n";
        waitForTableActive(USERS_TABLE);
        
    } catch (DynamoDbException $e) {
        echo "   ❌ Failed to create " . USERS_TABLE . ": " . $e->getMessage() . "\n";
        throw $e;
    }
}

/**
 * Create Settings table
 */
function createSettingsTable() {
    global $dynamodb;
    
    echo "⚙️  Creating Settings table...\n";
    
    $tableExists = checkIfTableExists(SETTINGS_TABLE);
    if ($tableExists) {
        echo "   ⚠️  Table " . SETTINGS_TABLE . " already exists, skipping creation\n";
        return;
    }
    
    try {
        $result = $dynamodb->createTable([
            'TableName' => SETTINGS_TABLE,
            'KeySchema' => [
                [
                    'AttributeName' => 'setting_key',
                    'KeyType' => 'HASH'
                ]
            ],
            'AttributeDefinitions' => [
                [
                    'AttributeName' => 'setting_key',
                    'AttributeType' => 'S'
                ],
                [
                    'AttributeName' => 'category',
                    'AttributeType' => 'S'
                ]
            ],
            'GlobalSecondaryIndexes' => [
                [
                    'IndexName' => 'CategoryIndex',
                    'KeySchema' => [
                        [
                            'AttributeName' => 'category',
                            'KeyType' => 'HASH'
                        ]
                    ],
                    'Projection' => [
                        'ProjectionType' => 'ALL'
                    ]
                ]
            ],
            'BillingMode' => 'PAY_PER_REQUEST',
            'Tags' => [
                [
                    'Key' => 'Project',
                    'Value' => 'Alpine-Aura-Homestay'
                ],
                [
                    'Key' => 'Environment',
                    'Value' => 'Development'
                ]
            ]
        ]);
        
        echo "   ✅ " . SETTINGS_TABLE . " table created successfully\n";
        waitForTableActive(SETTINGS_TABLE);
        
    } catch (DynamoDbException $e) {
        echo "   ❌ Failed to create " . SETTINGS_TABLE . ": " . $e->getMessage() . "\n";
        throw $e;
    }
}

/**
 * Check if table exists
 */
function checkIfTableExists($tableName) {
    global $dynamodb;
    
    try {
        $result = $dynamodb->describeTable(['TableName' => $tableName]);
        return true;
    } catch (DynamoDbException $e) {
        if ($e->getAwsErrorCode() === 'ResourceNotFoundException') {
            return false;
        }
        throw $e;
    }
}

/**
 * Wait for table to become active
 */
function waitForTableActive($tableName) {
    global $dynamodb;
    
    echo "   ⏳ Waiting for " . $tableName . " to become active...\n";
    
    $attempts = 0;
    $maxAttempts = 30; // 5 minutes max wait time
    
    while ($attempts < $maxAttempts) {
        try {
            $result = $dynamodb->describeTable(['TableName' => $tableName]);
            $status = $result['Table']['TableStatus'];
            
            if ($status === 'ACTIVE') {
                echo "   ✅ " . $tableName . " is now active\n";
                return;
            }
            
            echo "   ⏳ Table status: " . $status . " (waiting...)\n";
            sleep(10); // Wait 10 seconds
            $attempts++;
            
        } catch (DynamoDbException $e) {
            echo "   ❌ Error checking table status: " . $e->getMessage() . "\n";
            throw $e;
        }
    }
    
    throw new Exception("Table " . $tableName . " did not become active within timeout period");
}

/**
 * Display table creation summary
 */
function displayTableSummary() {
    echo "\n📊 TABLE STRUCTURE SUMMARY:\n";
    echo "===========================\n\n";
    
    echo "1. " . ROOMS_TABLE . "\n";
    echo "   Primary Key: room_id (String)\n";
    echo "   Indexes: StatusIndex, CapacityIndex\n";
    echo "   Purpose: Store room information, pricing, amenities\n\n";
    
    echo "2. " . BOOKINGS_TABLE . "\n";
    echo "   Primary Key: booking_id (String)\n";
    echo "   Indexes: RoomDateIndex, StatusIndex, GuestEmailIndex\n";
    echo "   Purpose: Store guest bookings and reservations\n\n";
    
    echo "3. " . AVAILABILITY_TABLE . "\n";
    echo "   Primary Key: room_id (String), date (String)\n";
    echo "   Indexes: StatusDateIndex\n";
    echo "   Purpose: Track room availability by date\n\n";
    
    echo "4. " . USERS_TABLE . "\n";
    echo "   Primary Key: user_id (String)\n";
    echo "   Indexes: EmailIndex, RoleIndex\n";
    echo "   Purpose: Admin user authentication and roles\n\n";
    
    echo "5. " . SETTINGS_TABLE . "\n";
    echo "   Primary Key: setting_key (String)\n";
    echo "   Indexes: CategoryIndex\n";
    echo "   Purpose: System configuration and settings\n\n";
}

displayTableSummary();
?>
