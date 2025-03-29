// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const fs = require('fs');
const multer = require('multer'); // For file uploads
const xlsx = require('xlsx'); // For Excel processing

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure file upload storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Google Sheets API setup
const setupGoogleSheetsAPI = () => {
  try {
    const keys = JSON.parse(fs.readFileSync('credential.json', 'utf8'));
    const client = new google.auth.JWT(
      keys.client_email,
      null,
      keys.private_key.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    );
    
    client.authorize((err) => {
      if (err) {
        console.error('Error connecting to Google Sheets API:', err);
        return null;
      } else {
        console.log('Connected to Google Sheets API');
      }
    });
    
    return google.sheets({ version: 'v4', auth: client });
  } catch (error) {
    console.error('Failed to initialize Google Sheets API:', error);
    return null;
  }
};

const sheets = setupGoogleSheetsAPI();
const spreadsheetId = "1NbcwKdFAwm0RRw5JIpaOMtCibWM_9gsUbYCOQ2GUNlI";

// Define sheet ranges
const sheetsRange = {   
  'student': 'student!A2:G', 
  'class': 'class!A2:G', 
  'lecture': 'lecture!A2:E', 
  'enrollment': 'enrollment!A2:D', 
  'attendance': 'attendance!A2:D', 
  'homework': 'homework!A2:E', 
  'exam': 'exam!A2:B', 
  'problem': 'problem!A2:C', 
  'exam_problem': 'exam_problem!A2:E',
  'score': 'score!A2:I'     
};

// Routes
app.get('/render/:page', (req, res) => {
  const { page } = req.params;
  const filePath = path.join(__dirname, 'public', 'menu-content', `${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('<p>Page not found.</p>');
    }
  });
});

// Load list from Google Sheets
app.get('/load-list/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!sheetsRange[id]) {
    return res.status(400).send({ error: 'Invalid sheet ID' });
  }
  
  const range = sheetsRange[id];
  
  try {
    const result = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    res.json(result.data.values || []);
  } catch (err) {
    console.error(`Error loading ${id} list:`, err);
    res.status(500).send({ error: err.message });
  }
});

// Add single student or multiple students
app.post('/add-student', async (req, res) => {
  try {
    const students = Array.isArray(req.body) ? req.body : [req.body];
    
    // Format data for Google Sheets
    const values = students.map(student => [
      student.student_id,
      student.name,
      student.school,
      student.generation,
      student.number,
      student.enrollment_date,
      student.status
    ]);
    
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetsRange.student,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
    
    res.status(200).json({
      message: `${students.length} students added successfully`,
      updatedRows: result.data.updates.updatedRows
    });
  } catch (err) {
    console.error('Error adding student(s):', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload student data from Excel/CSV file
app.post('/upload-student-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert Excel data to JSON
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // Extract common fields from request if available
    const commonSchool = req.body.commonSchool || '';
    const commonGeneration = req.body.commonGeneration || '';
    const commonEnrollmentDate = req.body.commonEnrollmentDate || '';
    
    // Format student data
    const students = data.map(row => ({
      student_id: generateStudentId(),
      name: row.Name || '',
      school: row.School || commonSchool,
      generation: row.Generation || commonGeneration,
      number: row.Phone || '',
      enrollment_date: row.EnrollmentDate || commonEnrollmentDate,
      status: 'active'
    }));
    
    // Call the add-student endpoint to process the data
    const values = students.map(student => [
      student.student_id,
      student.name,
      student.school,
      student.generation,
      student.number,
      student.enrollment_date,
      student.status
    ]);
    
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetsRange.student,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
    
    // Clean up the uploaded file
    fs.unlinkSync(filePath);
    
    res.status(200).json({
      message: `${students.length} students imported successfully`,
      updatedRows: result.data.updates.updatedRows
    });
  } catch (err) {
    console.error('Error processing uploaded file:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to generate a student ID
function generateStudentId() {
  return 'S' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});