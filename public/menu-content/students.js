// students.js - Handles student management functionality
(function() {
    // Constants
    const ROWS_PER_PAGE = 10;
    
    // DOM Element References
    const elements = {
        mainContent: document.querySelector('.main_content'),
        modal: document.getElementById('add-student-modal'),
        openModalBtn: document.getElementById('openModalBtn'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        tabButtons: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
        submitSingleBtn: document.getElementById('submitSingleBtn'),
        submitMultipleBtn: document.getElementById('submitMultipleBtn'),
        fileUploadForm: document.getElementById('file-upload-form'),
        fileInput: document.getElementById('file-input'),
        fileNameDisplay: document.querySelector('.file-name'),
        addMoreStudentsBtn: document.getElementById('add-more-students'),
        studentEntriesContainer: document.getElementById('student-entries-container'),
        downloadSampleBtn: document.getElementById('download-sample'),
        totalStudentsCount: document.querySelector('.students_overview_wrapper:nth-child(2) h2')
    };
    
    // State
    let studentCount = 1;
    
    // Initialize the page
    async function initPage() {
        await renderStudentListTable();
        setupEventListeners();
        setDefaultDates();
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        // Modal controls
        if (elements.openModalBtn) {
            elements.openModalBtn.addEventListener('click', () => elements.modal.classList.add('show'));
        }
        
        if (elements.closeModalBtn) {
            elements.closeModalBtn.addEventListener('click', () => elements.modal.classList.remove('show'));
        }
        
        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                if (e.target === elements.modal) {
                    elements.modal.classList.remove('show');
                }
            });
        }
        
        // Tab navigation
        elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Toggle active state
                elements.tabButtons.forEach(btn => btn.classList.remove('active'));
                elements.tabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                
                // Show corresponding content
                const tabId = button.getAttribute('data-tab') + '-tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Add more students button
        if (elements.addMoreStudentsBtn) {
            elements.addMoreStudentsBtn.addEventListener('click', addStudentEntry);
        }
        
        // Form submissions
        if (elements.submitSingleBtn) {
            elements.submitSingleBtn.addEventListener('click', handleSingleStudentSubmit);
        }
        
        if (elements.submitMultipleBtn) {
            elements.submitMultipleBtn.addEventListener('click', handleMultipleStudentsSubmit);
        }
        
        // File upload
        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', handleFileSelect);
        }
        
        if (elements.fileUploadForm) {
            elements.fileUploadForm.addEventListener('submit', handleFileUpload);
        }
        
        // Sample download
        if (elements.downloadSampleBtn) {
            elements.downloadSampleBtn.addEventListener('click', downloadSampleTemplate);
        }
    }
    
    // Set today's date as default for enrollment date fields
    function setDefaultDates() {
        const today = new Date();
        const formattedDate = window.appUtils.formatDate(today);
        
        const singleEnrollmentDate = document.getElementById('single-enrollment-date');
        const commonEnrollmentDate = document.getElementById('common-enrollment-date');
        
        if (singleEnrollmentDate) singleEnrollmentDate.value = formattedDate;
        if (commonEnrollmentDate) commonEnrollmentDate.value = formattedDate;
    }
    
    // Load and render the student list table
    async function renderStudentListTable() {
        try {
            await window.appUtils.showLoadingIndicator();
            await loadStudentData();
        } catch (error) {
            console.error("Error rendering student table:", error);
            document.querySelector('tbody').innerHTML = '<tr><td colspan="9">Error loading student data</td></tr>';
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Load student data from the server
    async function loadStudentData() {
        const data = await window.appUtils.loadList('student');
        
        // Update total students count
        if (elements.totalStudentsCount) {
            elements.totalStudentsCount.textContent = data.length;
        }
        
        // Populate table
        const table = document.querySelector('tbody');
        table.innerHTML = ''; // Clear existing rows
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            // Add data cells
            Object.values(row).forEach((value, index) => {
                if (index !== 6) {
                    const td = document.createElement('td');
                    td.textContent = value;
                    tr.appendChild(td);
                } else {
                    // Status cell with SVG
                    const td = document.createElement('td');
                    if (value === 'inactive') {
                        td.innerHTML = createInactiveStatusSVG();
                    } else if (value === 'active') {
                        td.innerHTML = createActiveStatusSVG();
                    }
                    tr.appendChild(td);
                }
            });
            
            // Add details button
            const detailsCell = document.createElement('td');
            detailsCell.innerHTML = createDetailsButtonSVG();
            detailsCell.addEventListener('click', () => handleStudentDetailsView(row[0])); // row[0] is student ID
            tr.appendChild(detailsCell);
            
            // Add manage button
            const manageCell = document.createElement('td');
            manageCell.innerHTML = createManageButtonSVG();
            manageCell.addEventListener('click', () => navigateToStudentManage(row[0])); // row[0] is student ID
            tr.appendChild(manageCell);
            
            table.appendChild(tr);
        });
        
        // Initialize table pagination
        window.appUtils.setTable(ROWS_PER_PAGE);
    }
    
    // Generate SVGs for table cells
    function createActiveStatusSVG() {
        return '<img src="/assets/active-status.svg" alt="Active" class="status-svg">';
    }
    
    function createInactiveStatusSVG() {
        return '<img src="/assets/inactive-status.svg" alt="Inactive" class="status-svg">';
    }
    
    function createDetailsButtonSVG() {
        return '<img src="/assets/details-view.svg" alt="Details" class="details-svg action-svg">';
    }
    
    function createManageButtonSVG() {
        return '<img src="/assets/manage-view.svg" alt="Manage" class="manage-svg action-svg">';
    }
    
    // Handle click on student details button
    async function handleStudentDetailsView(studentId) {
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Fetch student details
            const studentDetails = await fetchStudentDetails(studentId);
            
            // Show popup with student information
            showStudentPopup(studentDetails);
            
        } catch (error) {
            console.error("Error loading student details:", error);
            alert("Failed to load student details. Please try again.");
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Navigate to the student management page
    function navigateToStudentManage(studentId) {
        // You can implement this in different ways:
        
        // Option 1: Store the ID in local storage and redirect to a student management page
        localStorage.setItem('currentStudentId', studentId);
        window.location.href = '/student-management.html';
        
        // Option 2: Use a hash-based navigation
        // window.location.hash = `#student-manage=${studentId}`;
        
        // Option 3: Open in a new tab
        // window.open(`/student-management.html?id=${studentId}`, '_blank');
        
        // For now, we'll just alert for demonstration
        alert(`Navigating to management page for student ID: ${studentId}`);
    }
    
    // Fetch student details from the server
    async function fetchStudentDetails(studentId) {
        // In a real implementation, you would fetch this from the server
        // For now, we'll simulate with a mock fetch
        
        // Get all students
        const students = await window.appUtils.loadList('student');
        
        // Find the specific student
        const student = students.find(s => s[0] == studentId);
        
        if (!student) {
            throw new Error("Student not found");
        }
        
        // Format student data
        return {
            id: student[0],
            name: student[1],
            school: student[2],
            generation: student[3],
            phone: student[4],
            enrollment_date: student[5],
            status: student[6]
        };
    }
    
    // Show a popup with student information
    function showStudentPopup(student) {
        // Create popup element if it doesn't exist
        let popup = document.getElementById('student-popup');
        
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'student-popup';
            popup.className = 'popup-overlay';
            elements.mainContent.appendChild(popup);
            
            // Close popup when clicking outside
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    popup.classList.remove('show');
                }
            });
        }
        
        // Set popup content
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h2>${student.name}</h2>
                    <span class="popup-close">&times;</span>
                </div>
                <div class="popup-body">
                    <div class="student-info-grid">
                        <div class="info-item">
                            <div class="info-label">ID</div>
                            <div class="info-value">${student.id}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">School</div>
                            <div class="info-value">${student.school}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Generation</div>
                            <div class="info-value">${student.generation}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Phone</div>
                            <div class="info-value">${student.phone || 'Not provided'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Enrollment Date</div>
                            <div class="info-value">${formatDate(student.enrollment_date)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value ${student.status}">${student.status}</div>
                        </div>
                    </div>
                    
                    <div class="student-actions">
                        <button class="action-btn edit-btn">Edit Student</button>
                        <button class="action-btn ${student.status === 'active' ? 'deactivate-btn' : 'activate-btn'}">
                            ${student.status === 'active' ? 'Deactivate' : 'Activate'} Student
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        popup.querySelector('.popup-close').addEventListener('click', () => {
            popup.classList.remove('show');
        });
        
        // Show popup
        popup.classList.add('show');
        
        // Add event listeners for action buttons
        popup.querySelector('.edit-btn').addEventListener('click', () => {
            alert(`Edit student: ${student.id}`);
            // Implement edit functionality
        });
        
        const statusBtn = popup.querySelector(`.${student.status === 'active' ? 'deactivate-btn' : 'activate-btn'}`);
        statusBtn.addEventListener('click', () => {
            alert(`Change status for student: ${student.id} to ${student.status === 'active' ? 'inactive' : 'active'}`);
            // Implement status change functionality
        });
    }
    
    // Format date for display
    function formatDate(dateStr) {
        if (!dateStr) return 'Not set';
        
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr || 'Not set';
        }
    }
    
    // Add a new student entry to the multiple students form
    function addStudentEntry() {
        studentCount++;
        
        const newEntry = document.createElement('div');
        newEntry.className = 'student-entry';
        newEntry.dataset.entryIndex = studentCount - 1;
        
        newEntry.innerHTML = `
            <div class="entry-header">
                <span class="entry-number">Student ${studentCount}</span>
                <span class="remove-entry">Remove</span>
            </div>
            <div class="form-group">
                <input type="text" placeholder="Name" class="form-input student-name">
            </div>
            <div class="form-group">
                <input type="text" placeholder="Phone" class="form-input student-phone">
            </div>
        `;
        
        elements.studentEntriesContainer.appendChild(newEntry);
        
        // Add event listener to the remove button
        const removeBtn = newEntry.querySelector('.remove-entry');
        removeBtn.addEventListener('click', () => {
            newEntry.remove();
            reindexStudentEntries();
        });
    }
    
    // Reindex student entries after removal
    function reindexStudentEntries() {
        const entries = elements.studentEntriesContainer.querySelectorAll('.student-entry');
        
        entries.forEach((entry, index) => {
            entry.dataset.entryIndex = index;
            const numberSpan = entry.querySelector('.entry-number');
            numberSpan.textContent = `Student ${index + 1}`;
        });
        
        studentCount = entries.length;
    }
    
    // Generate a unique student ID
    function generateStudentId() {
        // For consistent format with your Excel database
        return Math.floor(1000000 + Math.random() * 9000000);
    }
    
    // Handle file selection for upload
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            elements.fileNameDisplay.textContent = file.name;
        } else {
            elements.fileNameDisplay.textContent = 'No file chosen';
        }
    }
    
    // Handle file upload submission
    async function handleFileUpload(event) {
        event.preventDefault();
        
        if (!elements.fileInput.files.length) {
            alert('Please select a file first');
            return;
        }
        
        const file = elements.fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        // Add common fields if they exist
        const commonSchool = document.getElementById('common-school');
        const commonGeneration = document.getElementById('common-generation');
        const commonEnrollmentDate = document.getElementById('common-enrollment-date');
        
        if (commonSchool && commonSchool.value) {
            formData.append('commonSchool', commonSchool.value);
        }
        
        if (commonGeneration && commonGeneration.value) {
            formData.append('commonGeneration', commonGeneration.value);
        }
        
        if (commonEnrollmentDate && commonEnrollmentDate.value) {
            formData.append('commonEnrollmentDate', commonEnrollmentDate.value);
        }
        
        try {
            // Show loading indicator and disable button
            const submitBtn = elements.fileUploadForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Uploading...';
            submitBtn.disabled = true;
            
            await window.appUtils.showLoadingIndicator();
            
            // Actually upload the file - uncomment when ready
            /*
            const response = await fetch('/upload-student-file', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('File upload failed');
            }
            
            const result = await response.json();
            console.log('Server response:', result);
            */
            
            // For development, log instead of submitting
            console.log('Uploading file:', file.name);
            
            // Simulate server delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Success feedback and reset
            alert('File uploaded successfully!');
            elements.fileInput.value = '';
            elements.fileNameDisplay.textContent = 'No file chosen';
            elements.modal.classList.remove('show');
            
            // Refresh the student list
            await renderStudentListTable();
            
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('File upload failed. Please try again.');
        } finally {
            // Restore button state
            const submitBtn = elements.fileUploadForm.querySelector('button[type="submit"]');
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Handle single student form submission
    async function handleSingleStudentSubmit() {
        // Collect form data
        const nameInput = document.querySelector('#single-student-tab input[placeholder="Name"]');
        const schoolInput = document.querySelector('#single-student-tab input[placeholder="School"]');
        const generationInput = document.querySelector('#single-student-tab input[placeholder="Generation"]');
        const phoneInput = document.querySelector('#single-student-tab input[placeholder="Phone"]');
        const enrollmentDateInput = document.getElementById('single-enrollment-date');
        
        // Basic validation
        if (!nameInput.value.trim()) {
            alert('Please enter a student name');
            return;
        }
        
        // Prepare data
        const studentData = {
            student_id: generateStudentId(),
            name: nameInput.value.trim(),
            school: schoolInput.value.trim(),
            generation: generationInput.value.trim(),
            number: phoneInput.value.trim(),
            enrollment_date: enrollmentDateInput.value,
            status: 'active'
        };
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // For development, log the data instead of submitting
            console.log('Student data to submit:', studentData);
            
            // Simulate server delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Uncomment to actually submit when ready
            /*
            const response = await fetch('/add-student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to add student');
            }
            
            const result = await response.json();
            console.log('Server response:', result);
            */
            
            alert('Student added successfully!');
            
            // Close modal
            elements.modal.classList.remove('show');
            
            // Refresh the student list
            await renderStudentListTable();
            
        } catch (error) {
            console.error('Error submitting student data:', error);
            alert('Failed to add student. Please try again.');
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Handle multiple students form submission
    async function handleMultipleStudentsSubmit() {
        // Get common data
        const commonSchool = document.getElementById('common-school').value.trim();
        const commonGeneration = document.getElementById('common-generation').value.trim();
        const commonEnrollmentDate = document.getElementById('common-enrollment-date').value;
        
        // Get all student entries
        const studentEntries = document.querySelectorAll('.student-entry');
        const studentsData = [];
        
        studentEntries.forEach(entry => {
            const nameInput = entry.querySelector('.student-name');
            const phoneInput = entry.querySelector('.student-phone');
            
            if (nameInput.value.trim() !== '') {
                studentsData.push({
                    student_id: generateStudentId(),
                    name: nameInput.value.trim(),
                    school: commonSchool,
                    generation: commonGeneration,
                    number: phoneInput.value.trim(),
                    enrollment_date: commonEnrollmentDate,
                    status: 'active'
                });
            }
        });
        
        if (studentsData.length === 0) {
            alert('Please add at least one student with a name');
            return;
        }
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // For development, log the data instead of submitting
            console.log('Multiple students data to submit:', studentsData);
            
            // Simulate server delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Uncomment to actually submit when ready
            /*
            const response = await fetch('/add-students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentsData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to add students');
            }
            
            const result = await response.json();
            console.log('Server response:', result);
            */
            
            alert(`${studentsData.length} students added successfully!`);
            
            // Close modal
            elements.modal.classList.remove('show');
            
            // Refresh the student list
            await renderStudentListTable();
            
        } catch (error) {
            console.error('Error submitting multiple students data:', error);
            alert('Failed to add students. Please try again.');
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Download sample Excel template
    function downloadSampleTemplate(e) {
        e.preventDefault();
        
        // In a real implementation, this would trigger a download of your sample file
        const sampleFileUrl = 'Student_Submit_Form_Sample.xlsx';
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = sampleFileUrl;
        link.download = 'Student_Submit_Form_Sample.xlsx';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Initialize the page when the script loads
    initPage();
})();