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
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Google API Authentication
let sheets, drive;

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
      console.error('Error connecting to Google APIs:', err);
      return;
    } else {
      console.log('Connected to Google APIs');
      
      // Initialize both APIs after successful authentication
      sheets = google.sheets({ version: 'v4', auth: client });
      drive = google.drive({ version: 'v3', auth: client });
      
      // Optionally create app folder on startup
      createAppFolder().then(folderId => {
        console.log(`App folder created or found with ID: ${folderId}`);
        app.locals.driveFolderId = folderId; // Store folder ID in app locals for later use
      }).catch(error => {
        console.error('Failed to create app folder:', error);
      });
    }
  });
} catch (error) {
  console.error('Failed to initialize Google APIs:', error);
}

const spreadsheetId = "1NbcwKdFAwm0RRw5JIpaOMtCibWM_9gsUbYCOQ2GUNlI";

// Define sheet ranges
const sheetsRange = {   
  'student': 'student!A2:G', 
  'class': 'class!A2:G', 
  'lecture': 'lecture!A2:E', 
  'enrollment': 'enrollment!A2:D', 
  'attendance': 'attendance!A2:D', 
  'homework': 'homework!A2:G', 
  'exam': 'exam!A2:B', 
  'problem': 'problem!A2:C', 
  'exam_problem': 'exam_problem!A2:E',
  'score': 'score!A2:I'     
};

// Create a folder in Drive (run once to set up)
async function createAppFolder() {
  try {
    // First check if the folder already exists
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and name='BrainDB_Uploads' and trashed=false",
      fields: 'files(id, name)'
    });
    
    if (response.data.files.length > 0) {
      console.log('App folder already exists:', response.data.files[0].id);
      return response.data.files[0].id;
    }
    
    // Create new folder if it doesn't exist
    const folderMetadata = {
      name: 'BrainDB_Uploads',
      mimeType: 'application/vnd.google-apps.folder'
    };
    
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });
    
    console.log('New folder created with ID:', folder.data.id);
    return folder.data.id;
  } catch (error) {
    console.error('Error with app folder:', error);
    throw error;
  }
}

// Upload a file to Google Drive
async function uploadFileToDrive(filePath, fileName, folderId) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };
    
    const media = {
      mimeType: getMimeType(fileName),
      body: fs.createReadStream(filePath)
    };
    
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,webViewLink'
    });
    
    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Helper to determine MIME type
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// Serve assets directory
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));


// File upload endpoint
app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: 'No file uploaded' });
    }
    
    if (!drive) {
      return res.status(500).send({ error: 'Drive API not initialized' });
    }
    
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    
    // Get the folder ID from app locals or create a new folder
    let folderId = app.locals.driveFolderId;
    if (!folderId) {
      folderId = await createAppFolder();
      app.locals.driveFolderId = folderId;
    }
    
    // Upload to Google Drive
    const driveFile = await uploadFileToDrive(filePath, fileName, folderId);
    
    // Clean up the temporary file
    fs.unlinkSync(filePath);
    
    res.status(200).send({
      message: 'File uploaded successfully',
      fileId: driveFile.fileId,
      fileUrl: driveFile.webViewLink
    });
  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).send({ error: error.message });
  }
});

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
  
  if (!sheets) {
    return res.status(503).send({ error: 'Google Sheets API not initialized' });
  }
  
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
  if (!sheets) {
    return res.status(503).send({ error: 'Google Sheets API not initialized' });
  }
  
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
  if (!sheets) {
    return res.status(503).send({ error: 'Google Sheets API not initialized' });
  }
  
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


// Add these routes to server.js for class management with the updated database structure

// Add a new class with lectures and enrollment
app.post('/add-class', async (req, res) => {
  try {
    const classData = req.body;
    
    // 1. Add the class
    const classValues = [
      classData.class_id,
      classData.school,
      classData.year,
      classData.semester,
      classData.generation,
      classData.schedule,
      classData.status
    ];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetsRange.class,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [classValues] }
    });
    
    // 2. Add lectures
    if (classData.lectures && classData.lectures.length > 0) {
      const lectureValues = classData.lectures.map(lecture => [
        lecture.lecture_id,
        classData.class_id,
        lecture.lecture_date,
        lecture.lecture_time,
        lecture.lecture_topic
      ]);
      
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetsRange.lecture,
        valueInputOption: 'USER_ENTERED',
        resource: { values: lectureValues }
      });
    }
    
    // 3. Add student enrollments
    if (classData.enrollments && classData.enrollments.length > 0) {
      const enrollmentValues = classData.enrollments.map(enrollment => [
        enrollment.enrollment_id,
        enrollment.student_id,
        classData.class_id,
        enrollment.enrollment_date
      ]);
      
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetsRange.enrollment,
        valueInputOption: 'USER_ENTERED',
        resource: { values: enrollmentValues }
      });
    }
    
    res.status(200).json({
      message: 'Class created successfully',
      class_id: classData.class_id,
      lectures_added: classData.lectures ? classData.lectures.length : 0,
      enrollments_added: classData.enrollments ? classData.enrollments.length : 0
    });
    
  } catch (err) {
    console.error('Error adding class:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get class details (lectures and enrolled students)
app.get('/class-details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Get class data
    const classResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetsRange.class
    });
    
    const classRows = classResponse.data.values || [];
    const classData = classRows.find(row => row[0] == id);
    
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // 2. Get lectures for this class
    const lecturesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetsRange.lecture
    });
    
    const lectureRows = lecturesResponse.data.values || [];
    const lectures = lectureRows
      .filter(row => row[1] == id)
      .map(row => ({
        lecture_id: row[0],
        class_id: row[1],
        lecture_date: row[2],
        lecture_time: row[3],
        lecture_topic: row[4]
      }));
    
    // 3. Get enrollment data for this class
    const enrollmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetsRange.enrollment
    });
    
    const enrollmentRows = enrollmentResponse.data.values || [];
    const enrollments = enrollmentRows
      .filter(row => row[2] == id)
      .map(row => ({
        enrollment_id: row[0],
        student_id: row[1],
        class_id: row[2],
        enrollment_date: row[3]
      }));
    
    // 4. Get student data for enrolled students
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetsRange.student
    });
    
    const studentRows = studentResponse.data.values || [];
    const enrolledStudents = enrollments.map(enrollment => {
      const studentData = studentRows.find(row => row[0] == enrollment.student_id);
      return studentData ? {
        student_id: studentData[0],
        name: studentData[1],
        school: studentData[2],
        generation: studentData[3],
        number: studentData[4],
        enrollment_date: enrollment.enrollment_date
      } : null;
    }).filter(student => student !== null);
    
    // 5. Compose the response
    const classDetails = {
      class_id: classData[0],
      school: classData[1],
      year: classData[2],
      semester: classData[3],
      generation: classData[4],
      schedule: classData[5],
      status: classData[6],
      lectures: lectures,
      enrolled_students: enrolledStudents
    };
    
    res.status(200).json(classDetails);
    
  } catch (err) {
    console.error('Error fetching class details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add attendance for a lecture
app.post('/attendance', async (req, res) => {
  try {
    const { lecture_id, attendance_data } = req.body;
    
    if (!lecture_id || !attendance_data || !Array.isArray(attendance_data)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    // Format attendance records
    const attendanceValues = attendance_data.map(record => [
      record.attendance_id,      // Generate a unique ID for each attendance record
      lecture_id,                // The lecture ID
      record.student_id,         // Student ID
      record.status              // Attendance status (e.g., "ATT" for attended)
    ]);
    
    // Add attendance records
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetsRange.attendance,
      valueInputOption: 'USER_ENTERED',
      resource: { values: attendanceValues }
    });
    
    res.status(200).json({
      message: 'Attendance recorded successfully',
      attendance_records: attendanceValues.length
    });
    
  } catch (err) {
    console.error('Error recording attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get attendance for a lecture
app.get('/attendance/:lecture_id', async (req, res) => {
  try {
    const { lecture_id } = req.params;
    
    // Get all attendance records for this lecture
    const attendanceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetsRange.attendance
    });
    
    const attendanceRows = attendanceResponse.data.values || [];
    const lectureAttendance = attendanceRows
      .filter(row => row[1] == lecture_id)
      .map(row => ({
        attendance_id: row[0],
        lecture_id: row[1],
        student_id: row[2],
        status: row[3]
      }));
    
    // Get student data for context
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetsRange.student
    });
    
    const studentRows = studentResponse.data.values || [];
    
    // Combine attendance with student data
    const attendanceWithStudentInfo = lectureAttendance.map(attendance => {
      const studentData = studentRows.find(row => row[0] == attendance.student_id);
      return {
        ...attendance,
        student_name: studentData ? studentData[1] : 'Unknown',
        student_school: studentData ? studentData[2] : 'Unknown',
        student_generation: studentData ? studentData[3] : 'Unknown'
      };
    });
    
    res.status(200).json({
      lecture_id,
      attendance: attendanceWithStudentInfo
    });
    
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// In server.js or a dedicated routes file
app.post('/save-attendance-homework', async (req, res) => {
  try {
      const { lecture_id, attendance_data, homework_data } = req.body;
      
      // Validate lecture exists
      const lectureExists = await verifyLectureExists(lecture_id);
      if (!lectureExists) {
          return res.status(404).json({ error: 'Lecture not found' });
      }
      
      // Process attendance records
      const attendanceResults = [];
      for (const record of attendance_data) {
          // Check if record exists by finding the entry in the sheet
          const existingRecord = await findAttendanceRecord(record.lecture_id, record.student_id);
          
          if (existingRecord) {
              // Update existing record
              await updateAttendanceRecord(existingRecord.id, record.status);
              attendanceResults.push({
                  id: existingRecord.id,
                  student_id: record.student_id,
                  status: record.status,
                  updated: true
              });
          } else {
              // Create new record
              const newId = await createAttendanceRecord(record);
              attendanceResults.push({
                  id: newId,
                  student_id: record.student_id,
                  status: record.status,
                  updated: false
              });
          }
      }
      
      // Process homework records (similar approach)
      const homeworkResults = [];
      for (const record of homework_data) {
          const existingRecord = await findHomeworkRecord(record.lecture_id, record.student_id);
          
          if (existingRecord) {
              await updateHomeworkRecord(existingRecord.id, {
                  total_problems: record.total_problems,
                  completed_problems: record.completed_problems,
                  classification: record.classification,
                  comments: record.comments
              });
              homeworkResults.push({
                  id: existingRecord.id,
                  student_id: record.student_id,
                  updated: true
              });
          } else {
              const newId = await createHomeworkRecord(record);
              homeworkResults.push({
                  id: newId,
                  student_id: record.student_id,
                  updated: false
              });
          }
      }
      
      // Return success response with updated records
      res.status(200).json({
          success: true,
          message: 'Attendance and homework data saved successfully',
          attendance: attendanceResults,
          homework: homeworkResults
      });
      
  } catch (error) {
      console.error('Error saving attendance and homework:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to save data',
          error: error.message
      });
  }
});

// Helper function implementations would interact with your Google Sheets
async function findAttendanceRecord(lectureId, studentId) {
  try {
    // Get all attendance data from Google Sheets
    const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetsRange.attendance
    });
    
    const attendanceRows = result.data.values || [];
    
    // Find the record that matches lecture_id and student_id
    const record = attendanceRows.find(row => 
        row[1] === lectureId && row[2] === studentId
    );
    
    if (record) {
        return {
            id: record[0],
            lecture_id: record[1],
            student_id: record[2],
            status: record[3] || ''
        };
    }
    
    return null;
} catch (error) {
    console.error('Error finding attendance record:', error);
    throw error;
}
}

async function updateAttendanceRecord(recordId, status) {
 try {
      // First, get the row index of the record
      const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetsRange.attendance
      });
      
      const attendanceRows = result.data.values || [];
      const rowIndex = attendanceRows.findIndex(row => row[0] === recordId);
      
      if (rowIndex === -1) {
          throw new Error(`Attendance record with ID ${recordId} not found`);
      }
      
      // The actual row in the sheet is rowIndex + 2 (header row + 0-indexing)
      const sheetRow = rowIndex + 2;
      
      // Update the record
      await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `attendance!D${sheetRow}:D${sheetRow}`, // Update columns C through G
          valueInputOption: 'USER_ENTERED',
          resource: {
              values: [[
                  data.status
              ]]
          }
      });
      
      return true;
  } catch (error) {
      console.error('Error updating attendance record:', error);
      throw error;
  }
  }

async function createAttendanceRecord(record) {
try {
      // Generate a unique ID if not provided
      const attendanceId = record.attendance_id || `AT${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Append the new record
      await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: sheetsRange.attendance,
          valueInputOption: 'USER_ENTERED',
          resource: {
              values: [[
                  attendanceId,
                  record.lecture_id,
                  record.student_id,
                  record.status
              ]]
          }
      });
      
      return attendanceId;
  } catch (error) {
      console.error('Error creating attendance record:', error);
      throw error;
  }
}

async function findHomeworkRecord(lectureId, studentId) {
  try {
      // Get all homework data from Google Sheets
      const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetsRange.homework
      });
      
      const homeworkRows = result.data.values || [];
      
      // Find the record that matches lecture_id and student_id
      const record = homeworkRows.find(row => 
          row[1] === lectureId && row[2] === studentId
      );
      
      if (record) {
          return {
              id: record[0],
              lecture_id: record[1],
              student_id: record[2],
              total_problems: parseInt(record[3]) || 0,
              completed_problems: parseInt(record[4]) || 0,
              classification: record[5] || '',
              comments: record[6] || ''
          };
      }
      
      return null;
  } catch (error) {
      console.error('Error finding homework record:', error);
      throw error;
  }
}

async function updateHomeworkRecord(recordId, data) {
  try {
      // First, get the row index of the record
      const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetsRange.homework
      });
      
      const homeworkRows = result.data.values || [];
      const rowIndex = homeworkRows.findIndex(row => row[0] === recordId);
      
      if (rowIndex === -1) {
          throw new Error(`Homework record with ID ${recordId} not found`);
      }
      
      // The actual row in the sheet is rowIndex + 2 (header row + 0-indexing)
      const sheetRow = rowIndex + 2;
      
      // Update the record
      await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `homework!C${sheetRow}:G${sheetRow}`, // Update columns C through G
          valueInputOption: 'USER_ENTERED',
          resource: {
              values: [[
                  data.total_problems,
                  data.completed_problems,
                  data.classification,
                  data.comments
              ]]
          }
      });
      
      return true;
  } catch (error) {
      console.error('Error updating homework record:', error);
      throw error;
  }
}

async function createHomeworkRecord(record) {
  try {
      // Generate a unique ID if not provided
      const homeworkId = record.homework_id || `HW${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Append the new record
      await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: sheetsRange.homework,
          valueInputOption: 'USER_ENTERED',
          resource: {
              values: [[
                  homeworkId,
                  record.lecture_id,
                  record.student_id,
                  record.total_problems,
                  record.completed_problems,
                  record.classification,
                  record.comments
              ]]
          }
      });
      
      return homeworkId;
  } catch (error) {
      console.error('Error creating homework record:', error);
      throw error;
  }
}

async function verifyLectureExists(lectureId) {
  try {
      const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetsRange.lecture
      });
      
      const lectureRows = result.data.values || [];
      return lectureRows.some(row => row[0] === lectureId);
  } catch (error) {
      console.error('Error verifying lecture exists:', error);
      throw error;
  }
}
// Helper function to generate a student ID
function generateStudentId() {
  return 'S' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});