# RentMate - Camping Items Rental Platform# RentMate



A full-stack web application for renting and lending camping equipment and outdoor gear. Built with Node.js, Express, MySQL, and vanilla JavaScript.Rent and Lend your items easily - A modern marketplace platform.



## 🚀 Project Overview## Getting Started



RentMate is a peer-to-peer rental marketplace that enables users to:### Installation

- List camping items for rent

- Browse and search available items with live suggestions1. Install dependencies:

- Request rentals and manage bookings```bash

- Process payments with admin approval workflownpm install

- Chat with other users```

- Track rental progress and history

- Manage banking information and refunds2. Build Tailwind CSS:

```bash

## 🛠️ Technology Stacknpm run build:css

```

### **Backend**

3. Start the server:

#### Core Framework & Runtime```bash

- **Node.js** - JavaScript runtime environmentnpm start

- **Express.js v4.18.2** - Fast, minimalist web framework for Node.js```

- **dotenv v16.3.1** - Environment variable management

4. Open your browser and visit: `http://localhost:3000`

#### Database

- **MySQL** - Relational database management system## Development

- **mysql2 v3.15.1** - MySQL client for Node.js with Promise support

To run in development mode with auto-reload:

#### Authentication & Security

- **bcryptjs v2.4.3** - Password hashing and encryption```bash

- **jsonwebtoken v9.0.2** - JWT token generation and verification for user authenticationnpm run dev

- **express-validator v7.0.1** - Input validation and sanitization middleware```



#### Middleware & UtilitiesTo watch for CSS changes:

- **cors v2.8.5** - Cross-Origin Resource Sharing support

- **multer v1.4.5** - Multipart/form-data handling for file uploads (images, payment slips)```bash

npm run build:css

#### Development Tools```

- **nodemon v3.0.1** - Auto-restart server on file changes during development

## Project Structure

### **Frontend**

```

#### UI Framework & StylingRentMate/

- **Tailwind CSS v3.3.0** - Utility-first CSS framework for rapid UI development├── assets/

- **Tailwind CDN** - Used in HTML for instant styling│   └── images/

- **Lucide Icons** - Beautiful, consistent icon library│       └── bg.gif

- **Google Fonts (Manrope)** - Modern, clean typography├── public/

│   └── index.html

#### JavaScript Libraries├── src/

- **SweetAlert2** - Beautiful, customizable alert/modal library for user notifications│   └── input.css

- **Vanilla JavaScript (ES6+)** - Pure JavaScript with modern features├── server.js

  - Async/await for API calls├── tailwind.config.js

  - Fetch API for HTTP requests└── package.json

  - Template literals for dynamic HTML```

  - Arrow functions and destructuring

## Features

#### Frontend Features

- **Responsive Design** - Mobile-first approach with Tailwind CSS- 🎨 Beautiful UI with Tailwind CSS

- **Live Search Suggestions** - Google-style autocomplete dropdown- 🚀 Fast and responsive design

- **Dynamic Data Loading** - Real-time stats and content updates- 🔍 Search functionality

- **Single Page Components** - Modular HTML pages with shared JS utilities- 📱 Mobile-friendly

- 🎭 Animated background

### **Architecture**- ⚡ Node.js backend



#### Design Patterns## Technologies

- **MVC Architecture** - Model-View-Controller separation

  - Models: Database schemas (User, Item, Rental, Payment, Review, Banking)- Node.js

  - Views: HTML pages with dynamic rendering- Express.js

  - Controllers: Business logic handlers- Tailwind CSS

- Lucide Icons

- **RESTful API** - Standard HTTP methods and routes
  - GET, POST, PUT, DELETE operations
  - Resource-based URL structure
  - JSON request/response format

- **Middleware Pipeline** - Request processing chain
  - Authentication middleware
  - Admin authorization middleware
  - Error handling middleware

#### Project Structure
```
nodeapp/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pooling
│   ├── controllers/             # Business logic
│   │   ├── userController.js
│   │   ├── itemController.js
│   │   ├── rentalController.js
│   │   ├── paymentController.js
│   │   ├── bankingController.js
│   │   ├── reviewController.js
│   │   ├── chatController.js
│   │   └── notificationController.js
│   ├── middleware/
│   │   └── auth.js              # JWT authentication & authorization
│   ├── models/                  # Database models (MySQL schemas)
│   │   ├── User.js
│   │   ├── Item.js
│   │   ├── Rental.js
│   │   ├── Review.js
│   │   └── Banking.js
│   ├── routes/                  # API route definitions
│   │   ├── userRoutes.js
│   │   ├── itemRoutes.js
│   │   ├── rentalRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── bankingRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── chatRoutes.js
│   │   └── notificationRoutes.js
│   ├── scripts/                 # Database setup & migration scripts
│   └── server.js                # Express server entry point
├── public/                      # Static frontend files
│   ├── index.html               # Landing page
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── browse_items.html
│   ├── item_detail.html
│   ├── my_items.html
│   ├── borrowing.html
│   ├── lending.html
│   ├── chat.html
│   ├── payment.html
│   ├── profile.html
│   ├── app.js                   # Shared JavaScript utilities
│   ├── dashboard.js
│   ├── admin.js
│   └── styles.css               # Compiled Tailwind CSS
├── assets/
│   └── images/
└── package.json
```

### **Database Schema**

#### Tables
- **users** - User accounts, authentication, verification status
- **items** - Rental items with details, pricing, availability
- **rentals** - Booking records with workflow status tracking
- **payments** - Payment transactions with slip uploads
- **banking** - User banking accounts for transfers
- **reviews** - User and item ratings/reviews
- **chat_messages** - Real-time communication between users
- **notifications** - System notifications for users
- **rental_progress** - Audit trail of rental workflow steps

#### Key Features
- Foreign key relationships for data integrity
- ENUM types for status fields (workflow_status, payment_status)
- Timestamps for created_at, updated_at tracking
- JSON storage for images array
- Base64 encoded payment/refund slips

## 🔑 Key Features

### User Management
- User registration with email/password
- JWT-based authentication
- Role-based access control (Admin/User)
- Lender verification system with document upload
- Profile management with bank account details

### Item Management
- List items with images, pricing, deposit requirements
- Item approval workflow (admin review)
- Category organization (tent, sleeping-bag, backpack, cooking)
- Condition status tracking (new, like-new, good, fair)
- Availability status management

### Rental Workflow
1. **Request** - Borrower requests item rental
2. **Payment** - Borrower uploads payment slip
3. **Admin Review** - Admin approves payment
4. **Payment Transfer** - Admin transfers payment to lender
5. **Active Rental** - Item in use by borrower
6. **Return** - Borrower returns item with photo proof
7. **Refund** - Admin processes deposit refund
8. **Completed** - Rental cycle complete

### Payment System
- Bank transfer payment method
- Payment slip upload (Base64 encoding)
- Admin approval workflow
- Deposit handling (hold and refund)
- Payment history tracking
- Refund slip generation

### Search & Discovery
- Live search with Google-style autocomplete
- Debounced search input (300ms delay)
- Filter by category, location, availability
- Dynamic suggestions dropdown with item preview

### Communication
- Real-time chat between borrowers and lenders
- Notification system for rental updates
- Unread message tracking

### Admin Panel
- User management (view, edit, delete)
- Item approval/rejection
- Payment approval workflow
- Banking account management
- Rental status monitoring
- Statistics dashboard

## 📦 API Endpoints

### Authentication
- `POST /api/users/register` - Create new user account
- `POST /api/users/login` - User login with JWT token

### Users
- `GET /api/users/profile` - Get current user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Lender Verification
- `POST /api/users/verify-lender` - Submit lender verification (protected)
- `GET /api/users/pending-verifications` - Get pending verifications (admin)
- `PUT /api/users/verify/:id` - Approve/reject lender (admin)

### Items
- `GET /api/items` - Get all items (with filters: search, category, location)
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item (protected)
- `PUT /api/items/:id` - Update item (protected)
- `DELETE /api/items/:id` - Delete item (protected)
- `GET /api/items/my/listings` - Get user's items (protected)

### Rentals
- `POST /api/rentals` - Create rental request (protected)
- `GET /api/rentals/myborrowing` - Get user's borrowing history (protected)
- `GET /api/rentals/mylending` - Get user's lending history (protected)
- `PUT /api/rentals/:id/status` - Update rental status (protected)
- `PUT /api/rentals/:id/complete` - Complete rental (protected)
- `GET /api/rentals` - Get all rentals (admin)
- `GET /api/rentals/progress/:id` - Get rental progress (protected)
- `POST /api/rentals/confirm-return` - Confirm item return (protected)

### Payments
- `POST /api/payments/create` - Create payment with slip (protected)
- `POST /api/payments/approve` - Approve payment (admin)
- `POST /api/payments/transfer` - Transfer payment to lender (admin)
- `POST /api/payments/refund` - Refund deposit to borrower (admin)
- `GET /api/payments/history` - Get payment history (protected)

### Banking
- `GET /api/banking` - Get all banking accounts (admin)
- `GET /api/banking/active` - Get active accounts (protected)
- `GET /api/banking/:id` - Get account by ID (protected)
- `POST /api/banking` - Create banking account (protected)
- `PUT /api/banking/:id` - Update banking account (protected)
- `PUT /api/banking/:id/toggle` - Toggle account status (protected)
- `DELETE /api/banking/:id` - Delete banking account (protected)

### Reviews
- `POST /api/reviews` - Create review (protected)
- `GET /api/reviews/item/:id` - Get item reviews
- `GET /api/reviews/user/:id` - Get user reviews

### Chat
- `POST /api/chat/send` - Send message (protected)
- `GET /api/chat/:rentalId` - Get chat messages (protected)
- `GET /api/chat/unread/count` - Get unread count (protected)

### Notifications
- `GET /api/notifications` - Get user notifications (protected)
- `PUT /api/notifications/:id/read` - Mark as read (protected)

## 🔐 Security Features

- **Password Hashing** - bcrypt with salt rounds
- **JWT Authentication** - Secure token-based auth
- **Protected Routes** - Middleware for authentication
- **Admin Authorization** - Role-based access control
- **Input Validation** - express-validator sanitization
- **CORS Configuration** - Cross-origin request handling
- **SQL Injection Prevention** - Parameterized queries with mysql2

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd nodeapp
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

3. **Configure environment variables**
Create a `.env` file in the `backend` directory:
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=rentmate

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
```

4. **Setup database**
```bash
cd backend
npm run setup
```
This will create all necessary tables and initial data.

5. **Run the application**

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

6. **Access the application**
- Frontend: http://localhost:3000
- API: http://localhost:3000/api

### Development Workflow

**Watch Tailwind CSS compilation:**
```bash
npm run build:css
```

**Run database migrations:**
```bash
node backend/scripts/setupDatabase.js
node backend/scripts/setupRentalWorkflow.js
node backend/scripts/setupBankingTable.js
```

## 📱 Page Structure

### Public Pages
- **Landing Page** (`/index.html`) - Homepage with search, features, and available items
- **Login** (`/login.html`) - User authentication
- **Signup** (`/signup.html`) - New user registration

### Protected Pages (Require Login)
- **Dashboard** (`/dashboard.html`) - User overview with quick actions
- **Browse Items** (`/browse_items.html`) - Search and filter rental items
- **Item Detail** (`/item_detail.html`) - Full item information and rental request
- **My Items** (`/my_items.html`) - Manage listed items
- **List New Item** (`/list_new_item.html`) - Create new item listing
- **Borrowing** (`/borrowing.html`) - Track items you're renting
- **Lending** (`/lending.html`) - Manage items you're lending
- **Chat** (`/chat.html`) - Message other users
- **Payment** (`/payment.html`) - Upload payment slips
- **Profile** (`/profile.html`) - User settings and bank account
- **Verification** (`/verification.html`) - Lender verification submission

### Admin Pages (Require Admin Role)
- **Admin Dashboard** (`/admin.html`) - Admin overview
- **User Management** (`/admin/account_detail.html`) - View and manage users
- **Item Approval** (`/admin/item_approval.html`) - Review and approve items
- **Rental Management** (`/admin/rental_management.html`) - Monitor all rentals
- **Banking Management** (`/admin/banking.html`) - Manage user bank accounts
- **Statistics** (`/admin/statistics.html`) - Platform analytics

## 🎨 UI/UX Features

- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Loading States** - Skeleton screens and spinners for better UX
- **Toast Notifications** - SweetAlert2 for success/error messages
- **Modal Dialogs** - Interactive forms and confirmations
- **Icon System** - Lucide icons for consistent visual language
- **Gradient Backgrounds** - Teal/blue theme with animated gradients
- **Card-Based Layout** - Clean, modern card components
- **Sidebar Navigation** - Fixed sidebar for easy navigation
- **Form Validation** - Client-side and server-side validation
- **Search Autocomplete** - Live suggestions with debouncing

## 🐛 Error Handling

- Comprehensive try-catch blocks in all async operations
- Custom error messages for common scenarios
- Validation errors returned with specific field information
- 404 handling for missing resources
- 500 error handling for server errors
- Client-side error display with user-friendly messages

## 📊 Database Migrations & Scripts

Available scripts in `backend/scripts/`:
- `setupDatabase.js` - Initial database and tables setup
- `setupRentalWorkflow.js` - Rental workflow columns and payment tables
- `setupBankingTable.js` - Banking accounts table
- `addItemApproval.js` - Item approval status column
- `addPaymentSlipColumn.js` - Payment slip storage
- `addRefundSlipColumn.js` - Refund slip storage
- `addReturnPhoto.js` - Return photo proof column
- `addUserBankFields.js` - User banking information
- `migrateDatabase.js` - Database migrations handler

## 🔄 Workflow Status Values

### Rental Workflow States
- `payment_pending` - Waiting for borrower payment
- `payment_made` - Payment slip uploaded, awaiting admin approval
- `admin_review` - Under admin review
- `approved` - Payment approved, awaiting transfer
- `active` - Payment transferred, rental in progress
- `return_pending` - Item being returned
- `completed` - Rental cycle complete
- `cancelled` - Rental cancelled

### Payment Status
- `pending` - Payment not yet approved
- `paid` - Payment made by borrower
- `approved` - Payment approved by admin
- `transferred` - Payment transferred to lender
- `refunded` - Deposit refunded to borrower

## 📝 License

ISC License

## 👥 Support & Contact

For issues, questions, or contributions, please contact the development team.

---

**Built with ❤️ for the outdoor community**
