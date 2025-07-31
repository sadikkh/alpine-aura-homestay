<?php
/**
 * Alpine Aura Homestay - AWS DynamoDB Configuration Template
 * 
 * IMPORTANT SECURITY INSTRUCTIONS:
 * 1. Copy this file to aws-config.php
 * 2. Replace ALL placeholder values with your actual AWS credentials
 * 3. NEVER commit the actual config file to version control
 * 4. Use IAM roles in production for enhanced security
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Aws\DynamoDb\DynamoDbClient;
use Aws\Exception\AwsException;
use Aws\Credentials\Credentials;

// AWS Configuration Class
class AWSConfig {
    private $dynamodb;
    private $region;
    private $credentials;
    
    public function __construct() {
        // Your AWS Configuration - REPLACE THESE VALUES!
        $this->region = 'ap-south-1'; // Change to your preferred region
        
        // Method 1: Using Access Keys (Development)
        $this->credentials = new Credentials(
            ' AKIA2USRPI3BSTBISL6Y ',     // Replace with your access key
            ' DBZ5HrsAv5X1Ta66b1ftO0uF/rtaCPK/nM23YRL6 '   // Replace with your secret key
        );
        
        /* Method 2: Using Environment Variables (Production - Recommended)
        $this->credentials = new Credentials(
            getenv('AWS_ACCESS_KEY_ID'),
            getenv('AWS_SECRET_ACCESS_KEY')
        );
        */
        
        // Initialize DynamoDB Client
        $this->dynamodb = new DynamoDbClient([
            'region' => $this->region,
            'version' => 'latest',
            'credentials' => $this->credentials,
            'http' => [
                'timeout' => 30,
                'connect_timeout' => 10
            ]
        ]);
    }
    
    public function getDynamoDb() {
        return $this->dynamodb;
    }
    
    public function getRegion() {
        return $this->region;
    }
    
    /**
     * Test AWS DynamoDB connection
     */
    public function testConnection() {
        try {
            $result = $this->dynamodb->listTables(['Limit' => 1]);
            return [
                'success' => true,
                'message' => 'AWS DynamoDB connection successful!',
                'region' => $this->region,
                'tables_accessible' => true,
                'timestamp' => date('c')
            ];
        } catch (AwsException $e) {
            return [
                'success' => false,
                'message' => 'AWS connection failed: ' . $e->getMessage(),
                'error_code' => $e->getAwsErrorCode(),
                'region' => $this->region,
                'timestamp' => date('c')
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Configuration error: ' . $e->getMessage(),
                'region' => $this->region,
                'timestamp' => date('c')
            ];
        }
    }
}

// Initialize global AWS connection
try {
    $awsConfig = new AWSConfig();
    $dynamodb = $awsConfig->getDynamoDb();
} catch (Exception $e) {
    error_log("Failed to initialize AWS: " . $e->getMessage());
    $dynamodb = null;
    $awsConfig = null;
}

// Table names - modify if you want different table names
define('ROOMS_TABLE', 'AlpineAura-Rooms');
define('BOOKINGS_TABLE', 'AlpineAura-Bookings');
define('AVAILABILITY_TABLE', 'AlpineAura-Availability');
define('USERS_TABLE', 'AlpineAura-Users');
define('SETTINGS_TABLE', 'AlpineAura-Settings');

// Configuration constants
define('AWS_REGION', 'us-east-1');
define('CURRENCY', 'INR');
define('TIMEZONE', 'Asia/Kolkata');

// Set timezone
date_default_timezone_set(TIMEZONE);

/**
 * Helper function to check if AWS is properly configured
 */
function isAWSConfigured() {
    global $dynamodb, $awsConfig;
    return ($dynamodb !== null && $awsConfig !== null);
}

/**
 * Test AWS connection function
 */
function testAWSConnection() {
    global $awsConfig;
    if ($awsConfig) {
        $result = $awsConfig->testConnection();
        return $result['success'];
    }
    return false;
}

/**
 * =================================================================
 * AWS SETUP INSTRUCTIONS
 * =================================================================
 * 
 * STEP 1: CREATE AWS ACCOUNT
 * --------------------------
 * 1. Go to https://aws.amazon.com
 * 2. Click "Create an AWS Account"
 * 3. Follow the registration process
 * 4. Verify your account (requires credit card)
 * 
 * STEP 2: CREATE IAM USER
 * ----------------------
 * 1. Go to AWS Console → IAM
 * 2. Click "Users" → "Add User"
 * 3. Username: alpine-aura-dynamodb
 * 4. Access type: Programmatic access
 * 5. Attach policy: AmazonDynamoDBFullAccess
 * 6. Note down Access Key ID and Secret Access Key
 * 
 * STEP 3: CONFIGURE THIS FILE
 * ---------------------------
 * 1. Copy this file to: php/aws-config.php
 * 2. Replace YOUR_AWS_ACCESS_KEY_ID_HERE with your Access Key ID
 * 3. Replace YOUR_AWS_SECRET_ACCESS_KEY_HERE with your Secret Access Key
 * 4. Choose your preferred AWS region:
 *    - us-east-1 (N. Virginia) - Default, lowest latency globally
 *    - ap-south-1 (Mumbai) - Best for India
 *    - ap-southeast-1 (Singapore) - Good for Asia
 * 
 * STEP 4: CREATE DYNAMODB TABLES
 * ------------------------------
 * Run: php setup/create-tables.php
 * This will create all required tables with proper indexes
 * 
 * STEP 5: TEST CONNECTION
 * ----------------------
 * Visit: http://localhost:8000/php/booking.php?action=test_connection
 * Should return: {"success": true, "message": "AWS DynamoDB connection successful!"}
 * 
 * STEP 6: SECURITY BEST PRACTICES
 * -------------------------------
 * 1. Never commit aws-config.php to version control
 * 2. Use IAM roles in production (EC2/Lambda)
 * 3. Enable MFA on your AWS account
 * 4. Regularly rotate access keys
 * 5. Use least privilege principle for permissions
 * 
 * STEP 7: AWS PRICING INFORMATION
 * ------------------------------
 * DynamoDB Free Tier (per month):
 * - 25 GB of storage
 * - 25 provisioned Write Capacity Units (WCU)
 * - 25 provisioned Read Capacity Units (RCU)
 * - 2.5 million stream read requests
 * 
 * Estimated costs for small homestay:
 * - Free tier covers most small operations
 * - Beyond free tier: ~$1-10/month for typical usage
 * - On-demand pricing: $1.25 per million write requests, $0.25 per million read requests
 * 
 * STEP 8: RECOMMENDED REGIONS FOR ALPINE AURA
 * -------------------------------------------
 * 1. ap-south-1 (Mumbai) - Best latency for Indian users
 * 2. ap-southeast-1 (Singapore) - Good for Asia-Pacific
 * 3. us-east-1 (N. Virginia) - Lowest cost, global users
 * 
 * STEP 9: TROUBLESHOOTING
 * ----------------------
 * Common issues:
 * 1. "Access Denied" - Check IAM permissions
 * 2. "Region not found" - Verify region name spelling
 * 3. "Invalid credentials" - Check access key and secret key
 * 4. "Table not found" - Run create-tables.php script
 * 
 * For support: Check AWS documentation or create GitHub issue
 */
?>
