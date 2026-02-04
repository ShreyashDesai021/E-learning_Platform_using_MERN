# E-learning Platform using MERN Stack

A full-stack e-learning platform built with the MERN (MongoDB, Express.js, React, Node.js) stack that enables instructors to create and manage courses while allowing students to enroll, learn, and earn certificates.

## 🌟 Features

### For Students
- 📚 Browse and search available courses
- 🎓 Enroll in courses with integrated payment system (Stripe)
- 📹 Watch video lectures with progress tracking
- 📝 Take tests and quizzes
- 🏆 Earn certificates upon course completion
- 📊 Track learning progress
- 🌙 Dark mode support

### For Instructors/Admins
- ➕ Create and manage courses
- 📹 Upload and organize lectures
- 📝 Create tests and quizzes for courses
- 📊 Dashboard with analytics
- 👥 View enrolled students
- ✏️ Edit course content and structure
- 📷 Upload course thumbnails and media

### General Features
- 🔐 Secure authentication with JWT
- 💳 Payment integration with Stripe
- ☁️ Media storage with Cloudinary
- 📱 Responsive design with Tailwind CSS
- 🎨 Modern UI with Radix UI components
- 📈 Real-time progress tracking
- 🔄 State management with Redux Toolkit

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **React Player** - Video playback
- **React Quill** - Rich text editor
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt.js** - Password hashing
- **Stripe** - Payment processing
- **Cloudinary** - Media storage
- **Multer** - File uploads
- **PDFKit** - Certificate generation

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- MongoDB (local or Atlas account)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/ShreyashDesai021/E-learning_Platform_using_MERN.git
cd E-learning_Platform_using_MERN
```

### 2. Setup Backend (Server)

```bash
cd server
npm install
```

Create a `.env` file in the server directory:
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=8080

# JWT
JWT_SECRET=your_jwt_secret

# Cloudinary (for media uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Stripe (for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Client URL
CLIENT_URL=http://localhost:5173
```

### 3. Setup Frontend (Client)

```bash
cd ../client
npm install
```

Create a `.env` file in the client directory:
```env
VITE_API_URL=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 4. Run the Application

**Terminal 1 - Start Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`

## 📁 Project Structure

```
E-learning_Platform_using_MERN/
├── client/                 # Frontend React application
│   ├── public/            # Static files
│   ├── src/
│   │   ├── app/           # Redux store configuration
│   │   ├── assets/        # Images and static assets
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Redux slices/features
│   │   ├── layout/        # Layout components
│   │   ├── lib/           # Utility functions
│   │   ├── pages/         # Page components
│   │   │   ├── admin/     # Admin/Instructor pages
│   │   │   └── student/   # Student pages
│   │   ├── App.jsx        # Main App component
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── vite.config.js
│
└── server/                # Backend Node.js application
    ├── controllers/       # Request handlers
    ├── database/          # Database configuration
    ├── middlewares/       # Custom middleware
    ├── models/            # Mongoose models
    ├── routes/            # API routes
    ├── utils/             # Utility functions
    ├── index.js           # Server entry point
    └── package.json
```

## 🔑 Key Models

- **User** - Student and instructor profiles
- **Course** - Course information and metadata
- **Lecture** - Individual video lectures
- **Test** - Quizzes and assessments
- **TestAttempt** - Student test submissions
- **CoursePurchase** - Payment and enrollment records
- **CourseProgress** - Student progress tracking

## 🎯 API Endpoints

### Authentication
- `POST /api/v1/user/register` - Register new user
- `POST /api/v1/user/login` - User login
- `POST /api/v1/user/logout` - User logout

### Courses
- `GET /api/v1/course` - Get all courses
- `POST /api/v1/course` - Create course (admin)
- `PUT /api/v1/course/:id` - Update course (admin)
- `DELETE /api/v1/course/:id` - Delete course (admin)

### Lectures
- `GET /api/v1/course/:courseId/lecture` - Get course lectures
- `POST /api/v1/course/:courseId/lecture` - Create lecture (admin)

### Payments
- `POST /api/v1/purchase/checkout` - Create checkout session
- `POST /api/v1/purchase/webhook` - Stripe webhook handler

### Progress
- `GET /api/v1/progress/:courseId` - Get course progress
- `POST /api/v1/progress/:courseId/lecture/:lectureId` - Update progress

## 🧪 Testing

The platform includes test functionality for courses:

```bash
# Run client tests (if available)
cd client
npm run lint

# Run server in development mode
cd server
npm run dev
```

## 📦 Build for Production

### Build Frontend
```bash
cd client
npm run build
```

### Run Backend in Production
```bash
cd server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Shreyash Desai**

## 🙏 Acknowledgments

- MERN Stack Community
- React and Node.js documentation
- Stripe for payment integration
- Cloudinary for media management
- All open-source libraries used in this project

## 📧 Support

For support, please open an issue in the GitHub repository.

---

Made with ❤️ using MERN Stack
