# BrainDB - Educational Database System

BrainDB is a comprehensive educational database system designed to help educational institutions manage students, classes, lectures, exams, attendance, and more. The application connects to Google Sheets as its backend database.

## Features

- Student management (add, view, update, delete)
- Class management
- Lecture tracking
- Attendance monitoring
- Exam management
- Homework assignments
- Analytics dashboard

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Database**: Google Sheets API
- **Authentication**: Google OAuth 2.0

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or later)
- npm (v6 or later)
- Google Cloud Platform account with Google Sheets API enabled

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/brain-db.git
   cd brain-db
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google Sheets API Credentials**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Sheets API and Google Drive API
   - Create service account credentials
   - Download the JSON key file and rename it to `credential.json`
   - Place the `credential.json` file in the root directory of the project

4. **Configure the Google Sheet**
   - Create a new Google Sheet
   - Share the sheet with the email address from your service account (with editor permissions)
   - Copy the spreadsheet ID (from the URL) and update the `spreadsheetId` variable in `server.js`
   - Create the following sheets in your spreadsheet:
     - student
     - class
     - lecture
     - enrollment
     - attendance
     - homework
     - exam
     - problem
     - exam_problem
     - score

5. **Run initial setup**
   ```bash
   npm run setup
   ```

6. **Start the application**
   ```bash
   npm start
   ```

7. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
brain-db/
├── server.js                # Main server entry point
├── package.json             # Project dependencies and scripts
├── credential.json          # Google API credentials (not included in repo)
├── public/                  # Static files
│   ├── index.html           # Main HTML file
│   ├── style.css            # Global styles
│   ├── index.js             # Global JavaScript
│   └── menu-content/        # Page-specific content
│       ├── home.html        # Home page content
│       ├── home.js          # Home page JavaScript
│       ├── students.html    # Students page content
│       ├── students.js      # Students page JavaScript
│       └── ...              # Other page files
└── uploads/                 # Directory for file uploads
```

## Development

For development with automatic server restarts:

```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.