# 🏔️ Alpine Aura Homestay - Kalimpong

A modern homestay booking website with real-time availability, AWS DynamoDB integration, and comprehensive admin dashboard for the beautiful Himalayan destination of Kalimpong.

![Alpine Aura Homestay](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop&q=80)

## 🌟 Key Features

- **🏠 Real-time Booking System** - Instant availability checking with AWS DynamoDB
- **☁️ AWS Cloud Integration** - Serverless, scalable architecture  
- **📱 Responsive Design** - Perfect experience on desktop, tablet, and mobile
- **👨‍💼 Admin Dashboard** - Complete property and booking management
- **🗺️ Kalimpong Travel Guide** - Local attractions and experiences
- **💳 Payment Gateway** - Secure Razorpay integration
- **🌄 Photo Gallery** - Stunning mountain and property images

## 🚀 Live Demo

- **Website:** https://yourusername.github.io/alpine-aura-homestay/
- **API Docs:** https://yourusername.github.io/alpine-aura-homestay/php/booking.php?action=docs
- **Admin Panel:** https://yourusername.github.io/alpine-aura-homestay/admin/

*Replace 'yourusername' with your GitHub username*

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript ES6+, Bootstrap 5
- **Backend:** PHP 8.0+, AWS SDK for PHP
- **Database:** AWS DynamoDB (NoSQL)
- **Storage:** AWS S3 (for images)
- **Payment:** Razorpay Integration
- **Hosting:** AWS Compatible / GitHub Pages
- **CDN:** AWS CloudFront ready

## 🏔️ About Kalimpong

Located in the Eastern Himalayas of West Bengal, our homestay offers:

- **🏔️ Kanchenjunga Views** - Third highest mountain in the world
- **🏛️ Buddhist Monasteries** - Rich spiritual heritage
- **🌡️ Perfect Climate** - Pleasant weather year-round
- **🥾 Nature Trails** - Hiking and bird watching
- **🛒 Local Markets** - Authentic crafts and foods
- **🌸 Famous Nurseries** - Beautiful flower gardens

## 📦 Quick Start

### Prerequisites
- PHP 8.0+
- Composer
- AWS Account
- Web server

### Installation
Clone repository
git clone https://github.com/yourusername/alpine-aura-homestay.git
cd alpine-aura-homestay

Install dependencies
composer install

Configure AWS
cp php/aws-config.example.php php/aws-config.php

Edit with your AWS credentials
Create DynamoDB tables
php setup/create-tables.php

Start development server
php -S localhost:8000 -t public/

Open browser
http://localhost:8000

text

## 🗂️ Project Structure

alpine-aura-homestay/
├── 📄 README.md # Project documentation
├── 📄 .gitignore # Git ignore (AWS credentials protected)
├── 📄 composer.json # PHP dependencies (AWS SDK)
├── 📄 LICENSE # MIT License
│
├── 📁 public/ # Web accessible files
│ ├── 📄 index.html # Homepage with booking widget
│ ├── 📄 rooms.html # Room listings and details
│ ├── 📄 booking.html # Booking form and process
│ ├── 📄 kalimpong.html # Destination guide
│ ├── 📄 gallery.html # Photo galleries
│ ├── 📄 contact.html # Contact and location
│ │
│ ├── 📁 css/
│ │ └── 📄 style.css # Complete responsive styling
│ │
│ ├── 📁 js/
│ │ ├── 📄 main.js # Frontend booking logic
│ │ └── 📄 admin.js # Admin dashboard
│ │
│ ├── 📁 images/ # Optimized images
│ │ ├── 📁 rooms/ # Room photos
│ │ ├── 📁 kalimpong/ # Local attractions
│ │ └── 📁 hero/ # Hero section images
│ │
│ └── 📁 admin/
│ └── 📄 dashboard.html # Admin interface
│
├── 📁 php/ # Backend API files
│ ├── 📄 booking.php # Main booking API
│ ├── 📄 admin.php # Admin API endpoints
│ └── 📄 aws-config.example.php # AWS configuration template
│
├── 📁 setup/ # Installation scripts
│ └── 📄 create-tables.php # DynamoDB table setup
│
└── 📁 docs/ # Documentation
├── 📄 aws-setup.md # AWS configuration guide
├── 📄 api-docs.md # API documentation
└── 📄 installation.md # Detailed setup instructions

text

## ⚙️ AWS DynamoDB Configuration

### Required Tables:
1. **`AlpineAura-Rooms`** - Room details, pricing, amenities
2. **`AlpineAura-Bookings`** - Guest reservations and status  
3. **`AlpineAura-Availability`** - Room availability calendar

### AWS Services Used:
- **DynamoDB** - Primary database
- **IAM** - Access management
- **S3** - Image storage (optional)
- **SES** - Email notifications (optional)

## 🔌 API Endpoints

### Booking API (`php/booking.php`)
- `GET ?action=get_rooms` - List available rooms
- `GET ?action=check_availability` - Check dates and capacity
- `POST ?action=create_booking` - Make reservation
- `GET ?action=get_booking&id=X` - Retrieve booking details
- `PUT ?action=update_booking` - Modify reservation
- `GET ?action=test_connection` - Verify AWS connection

### Admin API (`php/admin.php`)
- `GET ?action=dashboard_stats` - Booking metrics
- `GET ?action=all_bookings` - Complete booking list
- `PUT ?action=update_room` - Room management
- `GET ?action=revenue_report` - Financial analytics

## 💰 AWS Pricing (Estimated)

**DynamoDB:**
- Free Tier: 25 GB storage, 25 RCU/WCU
- Small homestay: $5-15/month
- Medium traffic: $15-40/month

**Total AWS costs: ~$10-30/month**

## 🧪 Testing

### Frontend (No AWS Required)
- Visit GitHub Pages deployment
- Test responsive design
- Validate form interactions
- Check all page navigation

### Backend (AWS Required)
- Configure AWS credentials
- Test complete booking flow
- Verify admin dashboard
- Check availability system

## 🚀 Deployment Options

### 1. GitHub Pages (Free - Frontend Only)
Enable GitHub Pages in repository settings
Select "Deploy from a branch" → main → /root
Access: https://yourusername.github.io/alpine-aura-homestay/
text

### 2. AWS Hosting (Full Stack)
- **Elastic Beanstalk** - Easy PHP deployment
- **EC2** - Full server control  
- **Lambda** - Serverless functions
- **S3 + CloudFront** - Static hosting with CDN

### 3. Shared Hosting
- Upload to web hosting provider
- Configure AWS credentials
- Install Composer dependencies
- Set up domain and SSL

## 🔒 Security Features

- **AWS IAM** - Secure credential management
- **Input Validation** - XSS and injection protection
- **Rate Limiting** - API abuse prevention
- **HTTPS Ready** - SSL/TLS encryption
- **Data Encryption** - DynamoDB encryption at rest
- **Audit Logging** - All actions tracked

## 📈 Future Enhancements

- [ ] **Multi-language Support** (Hindi, Bengali, Nepali)
- [ ] **Progressive Web App** (PWA)
- [ ] **Advanced Analytics** with AWS CloudWatch
- [ ] **Email Automation** with AWS SES
- [ ] **Image Optimization** with AWS Lambda
- [ ] **Real-time Chat** support
- [ ] **Mobile App** development
- [ ] **Integration APIs** for travel platforms

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 📞 Contact

**Alpine Aura Homestay**
- 🌐 Website: alpineaura.com
- 📧 Email: info@alpineaura.com
- 📱 Phone: +91-XXXXX-XXXXX
- 📍 Location: Kalimpong, West Bengal, India

**Technical Support**
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/alpine-aura-homestay/issues)
- 📚 Docs: [Documentation](./docs/)

---

**🏔️ Built with ❤️ for authentic Himalayan experiences**
