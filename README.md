# Expense Tracker

A modern expense tracking web application that stores your data in Google Sheets. Track expenses, manage budgets, visualize spending patterns, and access your data from any device.

## Features

- **Google OAuth Authentication** - Secure login with your Google account
- **Google Sheets Storage** - Your data is stored in your own Google Sheets
- **Expense Management** - Add, edit, delete, and categorize expenses
- **Income Tracking** - Track your income sources
- **Budget Settings** - Set monthly budgets per category with alerts
- **Recurring Expenses** - Manage subscriptions and recurring bills
- **Data Visualization** - Charts and graphs to visualize spending patterns
- **Search & Filter** - Powerful search and filtering capabilities
- **Date Range Reports** - View expenses within specific date ranges
- **Responsive Design** - Works seamlessly on mobile, tablet, and desktop

## Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Authentication**: Google OAuth 2.0
- **Data Storage**: Google Sheets API
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd expense-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Sheets API
   - Google Drive API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen:
   - User Type: External
   - Add required scopes: `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/drive.file`
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Your production URL (for deployment)
   - Authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - Your production URL (for deployment)
7. Copy the Client ID

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Google Client ID:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
VITE_SPREADSHEET_NAME=ExpenseTracker
```

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
```

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Add environment variables in Vercel dashboard:
   - Go to your project settings
   - Add `VITE_GOOGLE_CLIENT_ID` with your Google Client ID

### Option 2: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add environment variables:
   - `VITE_GOOGLE_CLIENT_ID`: Your Google Client ID
7. Click "Deploy"

### Important: Update Google Cloud OAuth Settings

After deployment, update your Google Cloud Console OAuth settings:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your project → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add your Vercel deployment URL to:
   - Authorized JavaScript origins: `https://your-app.vercel.app`
   - Authorized redirect URIs: `https://your-app.vercel.app`

## Usage

1. **Login**: Click "Sign in with Google" to authenticate
2. **Add Expenses**: Click "Add Expense" to record a new expense
3. **Add Income**: Click "Add Income" to track income
4. **View Expenses**: Browse, search, and filter your expenses
5. **Set Budgets**: Go to "Budgets" tab to set monthly limits per category
6. **Recurring Expenses**: Manage subscriptions and recurring bills in the "Recurring" tab
7. **View Charts**: See visualizations of your spending in the "Charts" tab
8. **Access Data**: Your data is stored in Google Sheets and can be accessed directly

## Project Structure

```
expense-tracker/
├── src/
│   ├── components/        # React components
│   │   ├── Dashboard.jsx  # Main dashboard
│   │   ├── Login.jsx      # Login page
│   │   ├── ExpenseForm.jsx
│   │   ├── ExpenseList.jsx
│   │   ├── IncomeForm.jsx
│   │   ├── BudgetSettings.jsx
│   │   ├── RecurringExpenses.jsx
│   │   ├── Charts.jsx
│   │   └── Statistics.jsx
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.jsx
│   │   └── DataContext.jsx
│   ├── services/          # API services
│   │   └── googleSheetsService.js
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── .env.example         # Environment variables template
├── vercel.json          # Vercel configuration
└── package.json         # Dependencies

```

## Google Sheets Structure

The app creates a Google Sheet with the following tabs:

- **Expenses**: ID, Date, Amount, Category, Description, IsRecurring, RecurringId
- **Income**: ID, Date, Amount, Source, Description
- **Categories**: Category, Color
- **Budgets**: Category, MonthlyLimit
- **RecurringExpenses**: ID, Amount, Category, Description, Frequency, StartDate, IsActive

## Contributing

Feel free to submit issues and pull requests!

## License

MIT License
