// classes.js - Handles class management functionality
(function() {
    // Constants
    const ROWS_PER_PAGE = 10;
    
    // DOM Element References
    const elements = {
        modal: document.getElementById('add-class-modal'),
        detailsModal: document.getElementById('class-details-modal'),
        openModalBtn: document.getElementById('openModalBtn'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        detailCloseBtn: document.getElementById('detail-close-btn'),
        addMoreLecturesBtn: document.getElementById('add-more-lectures'),
        lecturesContainer: document.getElementById('lectures-container'),
        submitClassBtn: document.getElementById('submit-class-btn'),
        studentList: document.getElementById('student-list'),
        studentSearch: document.getElementById('student-search'),
        selectedCountSpan: document.getElementById('selected-count'),
        tabButtons: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
        activeClassesCount: document.getElementById('active-classes-count'),
        totalClassesCount: document.getElementById('total-classes-count'),
        totalEnrolledCount: document.getElementById('total-enrolled-count')
    };
    
    // State
    let lectureCount = 1;
    let studentsData = [];
    let selectedStudents = [];
    
    // Initialize the page
    async function initPage() {
        await renderClassListTable();
        loadStudents();
        setupEventListeners();
        setDefaultDates();
        setDefaultValues();
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
        
        if (elements.detailCloseBtn) {
            elements.detailCloseBtn.addEventListener('click', () => elements.detailsModal.classList.remove('show'));
        }
        
        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                if (e.target === elements.modal) {
                    elements.modal.classList.remove('show');
                }
            });
        }
        
        if (elements.detailsModal) {
            elements.detailsModal.addEventListener('click', (e) => {
                if (e.target === elements.detailsModal) {
                    elements.detailsModal.classList.remove('show');
                }
            });
        }
        
        // Add more lectures button
        if (elements.addMoreLecturesBtn) {
            elements.addMoreLecturesBtn.addEventListener('click', addLectureEntry);
        }
        
        // Student search filter
        if (elements.studentSearch) {
            elements.studentSearch.addEventListener('input', filterStudents);
        }
        
        // Form submission
        if (elements.submitClassBtn) {
            elements.submitClassBtn.addEventListener('click', handleClassSubmit);
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
    }
    
    // Set today's date as default for date fields
    function setDefaultDates() {
        const today = new Date();
        const formattedDate = window.appUtils.formatDate(today);
        
        // Set default for first lecture date
        const firstLectureDate = document.querySelector('.lecture-date');
        if (firstLectureDate) firstLectureDate.value = formattedDate;
        
        // Set default time for first lecture
        const firstLectureTime = document.querySelector('.lecture-time');
        if (firstLectureTime) firstLectureTime.value = "19:00";
    }
    
    // Set default values for form fields
    function setDefaultValues() {
        const yearInput = document.getElementById('class-year');
        if (yearInput) yearInput.value = new Date().getFullYear();
        
        const semesterSelect = document.getElementById('class-semester');
        if (semesterSelect) {
            // Set semester based on current month (1 for Jan-Jun, 2 for Jul-Dec)
            const currentMonth = new Date().getMonth();
            semesterSelect.value = currentMonth < 6 ? "1" : "2";
        }
    }
    
    // Load and render the class list table
    async function renderClassListTable() {
        try {
            await window.appUtils.showLoadingIndicator();
            await loadClassData();
        } catch (error) {
            console.error("Error rendering class table:", error);
            document.querySelector('tbody').innerHTML = '<tr><td colspan="8">Error loading class data</td></tr>';
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Update the loadClassData function to modify how the table is populated
    async function loadClassData() {
        try {
            const data = await window.appUtils.loadList('class');
            
            // Update counters
            if (elements.activeClassesCount && elements.totalClassesCount) {
                elements.totalClassesCount.textContent = data.length;
                const activeClasses = data.filter(row => row[6] === 'active').length;
                elements.activeClassesCount.textContent = activeClasses;
            }
            
            // Calculate total enrolled students (by loading enrollment data)
            try {
                const enrollmentData = await window.appUtils.loadList('enrollment');
                if (elements.totalEnrolledCount) {
                    elements.totalEnrolledCount.textContent = enrollmentData.length;
                }
            } catch (enrollmentError) {
                console.error("Error loading enrollment data:", enrollmentError);
                if (elements.totalEnrolledCount) {
                    elements.totalEnrolledCount.textContent = "N/A";
                }
            }
            
            // Populate table
            const table = document.querySelector('tbody');
            table.innerHTML = ''; // Clear existing rows
            
            data.forEach(row => {
                const tr = document.createElement('tr');
                
                // Add data cells
                row.forEach((value, index) => {
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
                detailsCell.addEventListener('click', () => handleClassDetailView(row[0])); // row[0] is class ID
                tr.appendChild(detailsCell);
                
                // Add manage button
                const manageCell = document.createElement('td');
                manageCell.innerHTML = createManageButtonSVG();
                manageCell.addEventListener('click', () => navigateToClassManage(row[0])); // row[0] is class ID
                tr.appendChild(manageCell);
                
                table.appendChild(tr);
            });
            
            // Initialize table pagination
            window.appUtils.setTable(ROWS_PER_PAGE);
        } catch (error) {
            console.error("Error loading class data:", error);
            throw error;
        }
    }

    // Create SVG functions to match the student tab
    function createDetailsButtonSVG() {
        return '<img src="/assets/details-view.svg" alt="Details" class="details-svg action-svg">';
    }

    function createManageButtonSVG() {
        return '<img src="/assets/manage-view.svg" alt="Manage" class="manage-svg action-svg">';
    }

    // Add new function to handle class management navigation
    function navigateToClassManage(classId) {
        // You can implement this in different ways:
        
        // Option 1: Store the ID in local storage and redirect to a class management page
        localStorage.setItem('currentClassId', classId);
        // window.location.href = '/class-management.html';
        
        // Option 2: Use a hash-based navigation
        // window.location.hash = `#class-manage=${classId}`;
        
        // Option 3: Open in a new tab
        // window.open(`/class-management.html?id=${classId}`, '_blank');
        
        // For now, we'll just alert for demonstration
        alert(`Navigating to management page for class ID: ${classId}`);
    }
    
    // Load students for enrollment
    async function loadStudents() {
        try {
            // Load students from server
            const students = await window.appUtils.loadList('student');
            
            // Filter only active students
            studentsData = students.filter(student => student[6] === 'active');
            
            // Render the student list for selection
            renderStudentList(studentsData);
        } catch (error) {
            console.error("Error loading students:", error);
            elements.studentList.innerHTML = '<p>Error loading students</p>';
        }
    }
    
    // Render students in the selection list
    function renderStudentList(students) {
        if (!elements.studentList) return;
        
        elements.studentList.innerHTML = ''; // Clear existing list
        
        students.forEach(student => {
            const isSelected = selectedStudents.includes(student[0]);
            
            const studentItem = document.createElement('div');
            studentItem.className = 'student-item';
            studentItem.dataset.studentId = student[0];
            
            studentItem.innerHTML = `
                <input type="checkbox" class="student-checkbox" ${isSelected ? 'checked' : ''}>
                <div class="student-info">
                    <span class="student-name">${student[1]}</span>
                    <span class="student-detail">${student[2]} - ${student[3]}기</span>
                </div>
            `;
            
            // Add event listener for selection
            studentItem.addEventListener('click', () => toggleStudentSelection(student[0]));
            
            elements.studentList.appendChild(studentItem);
        });
        
        // Update selected count
        updateSelectedCount();
    }
    
    // Toggle student selection
    function toggleStudentSelection(studentId) {
        const index = selectedStudents.indexOf(studentId);
        
        if (index === -1) {
            // Add to selected
            selectedStudents.push(studentId);
        } else {
            // Remove from selected
            selectedStudents.splice(index, 1);
        }
        
        // Update UI
        const checkbox = document.querySelector(`.student-item[data-student-id="${studentId}"] .student-checkbox`);
        if (checkbox) {
            checkbox.checked = index === -1;
        }
        
        // Update selected count
        updateSelectedCount();
    }
    
    // Update the selected students count display
    function updateSelectedCount() {
        if (elements.selectedCountSpan) {
            elements.selectedCountSpan.textContent = `${selectedStudents.length} selected`;
        }
    }
    
    // Filter students list based on search input
    function filterStudents() {
        const searchValue = elements.studentSearch.value.toLowerCase();
        
        const filteredStudents = studentsData.filter(student => {
            // Search in name, school, and generation
            return student[1].toLowerCase().includes(searchValue) || // name
                   student[2].toLowerCase().includes(searchValue) || // school
                   student[3].toString().includes(searchValue);     // generation
        });
        
        renderStudentList(filteredStudents);
    }
    
    // Add a new lecture entry to the form
    function addLectureEntry() {
        lectureCount++;
        
        const newEntry = document.createElement('div');
        newEntry.className = 'lecture-entry';
        newEntry.dataset.lectureIndex = lectureCount - 1;
        
        newEntry.innerHTML = `
            <div class="lecture-header">
                <span class="lecture-number">Lecture ${lectureCount}</span>
                <span class="remove-lecture">Remove</span>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Topic</label>
                    <input type="text" class="form-input lecture-topic" placeholder="Lecture topic">
                </div>
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-input lecture-date">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Time</label>
                <input type="time" class="form-input lecture-time">
            </div>
        `;
        
        elements.lecturesContainer.appendChild(newEntry);
        
        // Set default date (1 week after previous lecture)
        const allLectureDates = document.querySelectorAll('.lecture-date');
        const previousLectureDate = allLectureDates[allLectureDates.length - 2];
        
        if (previousLectureDate && previousLectureDate.value) {
            const prevDate = new Date(previousLectureDate.value);
            prevDate.setDate(prevDate.getDate() + 7); // One week later
            const nextDate = window.appUtils.formatDate(prevDate);
            const newLectureDate = newEntry.querySelector('.lecture-date');
            newLectureDate.value = nextDate;
        }
        
        // Set default time (same as previous lecture)
        const allLectureTimes = document.querySelectorAll('.lecture-time');
        const previousLectureTime = allLectureTimes[allLectureTimes.length - 2];
        
        if (previousLectureTime && previousLectureTime.value) {
            const newLectureTime = newEntry.querySelector('.lecture-time');
            newLectureTime.value = previousLectureTime.value;
        }
        
        // Add event listener to the remove button
        const removeBtn = newEntry.querySelector('.remove-lecture');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            newEntry.remove();
            reindexLectureEntries();
        });
    }
    
    // Reindex lecture entries after removal
    function reindexLectureEntries() {
        const entries = elements.lecturesContainer.querySelectorAll('.lecture-entry');
        
        entries.forEach((entry, index) => {
            entry.dataset.lectureIndex = index;
            const numberSpan = entry.querySelector('.lecture-number');
            numberSpan.textContent = `Lecture ${index + 1}`;
        });
        
        lectureCount = entries.length;
    }
    
    // Generate unique IDs
    function generateClassId() {
        // Use numeric IDs like in the database (1000000 format)
        return Math.floor(1000000 + Math.random() * 9000000);
    }
    
    function generateLectureId() {
        // Use numeric IDs like in the database (1000000 format)
        return Math.floor(1000000 + Math.random() * 9000000);
    }
    
    function generateEnrollmentId() {
        // Use numeric IDs like in the database (1000000 format)
        return Math.floor(1000000 + Math.random() * 9000000);
    }
    
    // Handle class form submission
    async function handleClassSubmit() {
        // Collect class data
        const classSchool = document.getElementById('class-school').value.trim();
        const classYear = document.getElementById('class-year').value;
        const classSemester = document.getElementById('class-semester').value;
        const classGeneration = document.getElementById('class-generation').value;
        const classSchedule = document.getElementById('class-schedule').value.trim();
        
        // Basic validation
        if (!classSchool) {
            alert('Please enter a school name');
            return;
        }
        
        if (!classYear) {
            alert('Please enter a year');
            return;
        }
        
        if (!classGeneration) {
            alert('Please enter a generation');
            return;
        }
        
        if (!classSchedule) {
            alert('Please enter a schedule');
            return;
        }
        
        // Collect lectures data
        const lectureEntries = document.querySelectorAll('.lecture-entry');
        const lectures = [];
        
        let lecturesValid = true;
        
        lectureEntries.forEach((entry, index) => {
            const topic = entry.querySelector('.lecture-topic').value.trim();
            const date = entry.querySelector('.lecture-date').value;
            const time = entry.querySelector('.lecture-time').value;
            
            if (!topic || !date || !time) {
                lecturesValid = false;
                return;
            }
            
            // Create lecture data object
            const lectureDate = new Date(`${date}T${time}`);
            
            lectures.push({
                lecture_id: generateLectureId(),
                class_id: null, // Will be set after class creation
                lecture_date: lectureDate.toISOString(),
                lecture_time: time,
                lecture_topic: topic
            });
        });
        
        if (!lecturesValid) {
            alert('Please complete all lecture information');
            return;
        }
        
        // Generate class ID
        const classId = generateClassId();
        
        // Update lecture class_id references
        lectures.forEach(lecture => {
            lecture.class_id = classId;
        });
        
        // Prepare enrollment data
        const enrollments = selectedStudents.map(studentId => ({
            enrollment_id: generateEnrollmentId(),
            student_id: studentId,
            class_id: classId,
            enrollment_date: new Date().toISOString()
        }));
        
        // Prepare class data
        const classData = {
            class_id: classId,
            school: classSchool,
            year: Number(classYear),
            semester: Number(classSemester),
            generation: Number(classGeneration),
            schedule: classSchedule,
            status: 'active',
            lectures: lectures,
            enrollments: enrollments
        };
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // For development, log the data instead of submitting
            console.log('Class data to submit:', classData);
            
            // Simulate server delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Uncomment to actually submit when ready
            /*
            const response = await fetch('/add-class', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(classData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to add class');
            }
            
            const result = await response.json();
            console.log('Server response:', result);
            */
            
            alert('Class created successfully!');
            
            // Close modal and reset form
            elements.modal.classList.remove('show');
            resetClassForm();
            
            // Refresh the class list
            await renderClassListTable();
            
        } catch (error) {
            console.error('Error submitting class data:', error);
            alert('Failed to create class. Please try again.');
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Reset the class form
    function resetClassForm() {
        // Reset class info fields
        document.getElementById('class-school').value = '';
        document.getElementById('class-schedule').value = '';
        document.getElementById('class-generation').value = '';
        
        // Reset default values
        setDefaultValues();
        
        // Reset lectures (keep only the first one)
        const lectureEntries = document.querySelectorAll('.lecture-entry');
        
        // Remove all but the first lecture
        for (let i = 1; i < lectureEntries.length; i++) {
            lectureEntries[i].remove();
        }
        
        // Reset first lecture
        if (lectureEntries[0]) {
            lectureEntries[0].querySelector('.lecture-topic').value = '';
        }
        
        // Reset lecture count
        lectureCount = 1;
        
        // Reset student selection
        selectedStudents = [];
        renderStudentList(studentsData);
        
        // Set default dates again
        setDefaultDates();
    }
    
    // Handle click on class row for details view
    async function handleClassDetailView(classId) {
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Load class data
            const classData = await loadClassDetails(classId);
            
            // Populate the details modal
            populateClassDetails(classData);
            
            // Show the details modal
            elements.detailsModal.classList.add('show');
            
        } catch (error) {
            console.error("Error loading class details:", error);
            alert("Failed to load class details. Please try again.");
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Load class details from server
    async function loadClassDetails(classId) {
        // In a real implementation, this would fetch from the server
        // For now, we'll simulate with mock data
        
        // 1. Get class data
        const classesData = await window.appUtils.loadList('class');
        const classData = classesData.find(row => row[0] == classId);
        
        if (!classData) {
            throw new Error("Class not found");
        }
        
        // 2. Get enrollments
        const enrollmentsData = await window.appUtils.loadList('enrollment');
        const enrollments = enrollmentsData.filter(row => row[2] == classId);
        
        // 3. Get students for enrollments
        const studentsData = await window.appUtils.loadList('student');
        const enrolledStudents = enrollments.map(enrollment => {
            const studentId = enrollment[1];
            const student = studentsData.find(s => s[0] == studentId);
            return student ? {
                student_id: student[0],
                name: student[1],
                school: student[2],
                generation: student[3],
                enrollment_date: enrollment[3]
            } : null;
        }).filter(Boolean);
        
        // 4. Get lectures
        const lecturesData = await window.appUtils.loadList('lecture');
        const lectures = lecturesData.filter(row => row[1] == classId).map(lecture => ({
            lecture_id: lecture[0],
            class_id: lecture[1],
            lecture_date: lecture[2],
            lecture_time: lecture[3],
            lecture_topic: lecture[4]
        }));
        
        // Return combined data
        return {
            class_id: classData[0],
            school: classData[1],
            year: classData[2],
            semester: classData[3],
            generation: classData[4],
            schedule: classData[5],
            status: classData[6],
            enrolled_students: enrolledStudents,
            lectures: lectures
        };
    }
    
    // Populate class details in the modal
    function populateClassDetails(classData) {
        // Set header info
        document.getElementById('detail-class-school').textContent = classData.school;
        document.getElementById('detail-class-id').textContent = `ID: ${classData.class_id}`;
        
        // Set status
        const statusElement = document.getElementById('detail-class-status');
        statusElement.textContent = classData.status.charAt(0).toUpperCase() + classData.status.slice(1);
        statusElement.className = classData.status === 'active' ? 'class-status status-active' : 'class-status status-inactive';
        
        // Set details
        document.getElementById('detail-year').textContent = classData.year;
        document.getElementById('detail-semester').textContent = classData.semester;
        document.getElementById('detail-generation').textContent = classData.generation;
        document.getElementById('detail-schedule').textContent = classData.schedule;
        
        // Populate enrolled students
        const enrolledContainer = document.getElementById('enrolled-students-container');
        enrolledContainer.innerHTML = '';
        
        if (classData.enrolled_students && classData.enrolled_students.length > 0) {
            classData.enrolled_students.forEach(student => {
                const studentElement = document.createElement('div');
                studentElement.className = 'enrolled-student-item';
                studentElement.innerHTML = `
                    <div class="enrolled-student-info">
                        <span class="enrolled-student-name">${student.name}</span>
                        <span class="enrolled-student-detail">${student.school} - ${student.generation}기</span>
                    </div>
                    <span class="student-id">ID: ${student.student_id}</span>
                `;
                enrolledContainer.appendChild(studentElement);
            });
        } else {
            enrolledContainer.innerHTML = '<p>No students enrolled in this class.</p>';
        }
        
        // Populate lectures
        const lecturesContainer = document.getElementById('lectures-list-container');
        lecturesContainer.innerHTML = '';
        
        if (classData.lectures && classData.lectures.length > 0) {
            classData.lectures.forEach(lecture => {
                const lectureDate = new Date(lecture.lecture_date);
                const formattedDate = lectureDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                const lectureElement = document.createElement('div');
                lectureElement.className = 'lectures-list-item';
                lectureElement.innerHTML = `
                    <div class="lecture-info">
                        <span class="lecture-title">${lecture.lecture_topic || 'No Topic'}</span>
                        <span class="lecture-date">${formattedDate} ${lecture.lecture_time}</span>
                    </div>
                    <button class="lecture-button">Take Attendance</button>
                `;
                
                // Add event listener for attendance button
                const attendanceBtn = lectureElement.querySelector('.lecture-button');
                attendanceBtn.addEventListener('click', () => handleAttendanceAction(lecture.lecture_id));
                
                lecturesContainer.appendChild(lectureElement);
            });
        } else {
            lecturesContainer.innerHTML = '<p>No lectures scheduled for this class.</p>';
        }
    }
    
    // Handle attendance button click
    function handleAttendanceAction(lectureId) {
        console.log(`Take attendance for lecture: ${lectureId}`);
        alert('Attendance taking form would be displayed here');
    }
    
    // Format date string for display (YYYY-MM-DD to more readable format)
    function formatDateForDisplay(dateStr) {
        const date = new Date(dateStr);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('ko-KR', options);
    }
    
    // Generate SVGs for table cells
    function createActiveStatusSVG() {
        // Use <img> to load the external SVG
        return '<img src="/assets/active-status.svg" alt="Active" class="status-svg">';
    }
    
    function createInactiveStatusSVG() {
        // Use <img> to load the external SVG
        return '<img src="/assets/inactive-status.svg" alt="Inactive" class="status-svg">';
    }
    
    function createActionButtonSVG() {
        // Use <img> to load the external SVG
        return '<img src="/assets/action-button.svg" alt="View" class="action-svg">';
    }
    
    // Initialize the page when the script loads
    initPage();
})();