// attendances.js - Handles attendance management functionality
(function() {
    // Constants
    const ATTENDANCE_STATUS = {
        PRESENT: 'present',
        LATE: 'late',
        ABSENT: 'absent'
    };
    
    const HOMEWORK_CLASSIFICATION = {
        EXCELLENT: 'excellent',
        GOOD: 'good',
        AVERAGE: 'average',
        NEEDS_IMPROVEMENT: 'needs_improvement',
        INCOMPLETE: 'incomplete'
    };
    
    // DOM Element References
    const elements = {
        classSelect: document.getElementById('class-select'),
        lectureSelect: document.getElementById('lecture-select'),
        viewAttendanceBtn: document.getElementById('view-attendance-btn'),
        attendanceContent: document.getElementById('attendance-content'),
        
        // Stats elements
        activeClassesCount: document.getElementById('active-classes-count'),
        totalAttendanceCount: document.getElementById('total-attendance-count'),
        homeworkCompletionRate: document.getElementById('homework-completion-rate'),
        
        // Modal elements
        editAttendanceModal: document.getElementById('edit-attendance-modal'),
        modalClose: document.querySelector('.modal_close'),
        modalClassName: document.getElementById('modal-class-name'),
        modalLectureTopic: document.getElementById('modal-lecture-topic'),
        modalLectureDate: document.getElementById('modal-lecture-date'),
        tabButtons: document.querySelectorAll('.tab_button'),
        tabContents: document.querySelectorAll('.tab_content'),
        attendanceStudentsContainer: document.getElementById('attendance-students-container'),
        homeworkStudentsContainer: document.getElementById('homework-students-container'),
        totalProblemsInput: document.getElementById('total-problems'),
        cancelButton: document.querySelector('.cancel_button'),
        saveButton: document.querySelector('.save_button')
    };
    
    // State
    let selectedClassId = null;
    let selectedLectureId = null;
    let currentAttendanceData = null;
    let currentHomeworkData = null;
    let classesData = [];
    let lecturesData = [];
    let studentsData = [];
    let enrollmentsData = [];
    let attendanceData = [];
    let homeworkData = [];
    let currentTotalProblems = 10; // Default value for total problems
    
    // Initialize the page
    async function initPage() {
        await loadInitialData();
        setupEventListeners();
        updateStatistics();
        console.log("Page initialized successfully.");
    }
    
    // Load all required data from server
    async function loadInitialData() {
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Load classes data
            const classes = await window.appUtils.loadList('class');
            classesData = classes.map(row => ({
                id: row[0],
                school: row[1],
                year: row[2],
                semester: row[3],
                generation: row[4],
                schedule: row[5],
                status: row[6]
            }));
            
            // Populate class dropdown with active classes
            const activeClasses = classesData.filter(c => c.status === 'active');
            populateClassDropdown(activeClasses);
            
            // Load lectures data (we'll filter by selected class later)
            const lectures = await window.appUtils.loadList('lecture');
            lecturesData = lectures.map(row => ({
                id: row[0],
                class_id: row[1],
                date: row[2],
                time: row[3],
                topic: row[4] || 'Untitled Lecture'
            }));
            
            // Load students data
            const students = await window.appUtils.loadList('student');
            studentsData = students.map(row => ({
                id: row[0],
                name: row[1],
                school: row[2],
                generation: row[3],
                number: row[4],
                enrollment_date: row[5],
                status: row[6]
            }));
            
            // Load enrollments data
            const enrollments = await window.appUtils.loadList('enrollment');
            enrollmentsData = enrollments.map(row => ({
                id: row[0],
                student_id: row[1],
                class_id: row[2],
                enrollment_date: row[3]
            }));
            
            // Load attendance data
            const attendance = await window.appUtils.loadList('attendance');
            attendanceData = attendance.map(row => ({
                id: row[0],
                lecture_id: row[1],
                student_id: row[2],
                status: row[3] || ATTENDANCE_STATUS.ABSENT
            }));
            
            // Load homework data (if available)
            try {
                const homework = await window.appUtils.loadList('homework');
                homeworkData = homework.map(row => ({
                    id: row[0],
                    lecture_id: row[1],
                    student_id: row[2],
                    total_problems: row[3] ? parseInt(row[3]) : 0,
                    completed_problems: row[4] ? parseInt(row[4]) : 0,
                    classification: row[5] || HOMEWORK_CLASSIFICATION.INCOMPLETE,
                    comments: row[6] || ''
                }));
            } catch (error) {
                console.error("Error loading homework data:", error);
                homeworkData = [];
            }
            
        } catch (error) {
            console.error("Error loading initial data:", error);
            alert("Failed to load required data. Please refresh the page.");
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Class selection change
        elements.classSelect.addEventListener('change', handleClassChange);
        
        // Lecture selection change
        elements.lectureSelect.addEventListener('change', handleLectureChange);
        
        // View attendance button
        elements.viewAttendanceBtn.addEventListener('click', loadAttendanceData);
        
        // Modal close button
        elements.modalClose.addEventListener('click', () => {
            elements.editAttendanceModal.classList.remove('show');
        });
        
        // Modal tab buttons
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
        
        // Modal cancel button
        elements.cancelButton.addEventListener('click', () => {
            elements.editAttendanceModal.classList.remove('show');
        });
        
        // Modal save button
        elements.saveButton.addEventListener('click', saveAttendanceAndHomework);
        
        // Total problems input
        elements.totalProblemsInput.addEventListener('change', updateMaxProblemsValues);
        
        // Close modal when clicking outside
        elements.editAttendanceModal.addEventListener('click', (e) => {
            if (e.target === elements.editAttendanceModal) {
                elements.editAttendanceModal.classList.remove('show');
            }
        });
    }

    // Populate class dropdown with active classes
    function populateClassDropdown(classes) {
        elements.classSelect.innerHTML = '<option value="">Select Class</option>';
        classes.forEach(classItem => {
            const option = document.createElement('option');
            option.value = classItem.id;
            option.textContent = `${classItem.school} - ${classItem.year}년 ${classItem.semester}학기`;
            elements.classSelect.appendChild(option);
        });
    }

    // Handle class selection change
    function handleClassChange() {
        selectedClassId = elements.classSelect.value;
        if (selectedClassId) {
            const filteredLectures = lecturesData.filter(lecture => lecture.class_id === selectedClassId);
            populateLectureDropdown(filteredLectures);
        } else {
            elements.lectureSelect.innerHTML = '<option value="">Select Lecture</option>';
        }
    }
    // Populate lecture dropdown based on selected class
    function populateLectureDropdown(lectures) {
        elements.lectureSelect.removeAttribute('disabled');
        elements.lectureSelect.innerHTML = '<option value="">Select Lecture</option>';
        lectures.forEach(lecture => {
            const option = document.createElement('option');
            option.value = lecture.id;
            option.textContent = `${lecture.date} - ${lecture.topic}`;
            elements.lectureSelect.appendChild(option);
        });
    }

    // Handle lecture selection change
    function handleLectureChange() {
        selectedLectureId = elements.lectureSelect.value;
        if (selectedLectureId) {
            elements.viewAttendanceBtn.removeAttribute('disabled');
        } else {
            elements.viewAttendanceBtn.setAttribute('disabled', true);
        }
    }

    // Load attendance data for selected class and lecture
    async function loadAttendanceData() {
        if (!selectedClassId || !selectedLectureId) {
            alert("Please select a class and a lecture.");
            return;
        }
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Filter attendance data for selected class and lecture
            currentAttendanceData = attendanceData.filter(att => {
                const lecture = lecturesData.find(lec => lec.id === att.lecture_id);
                return lecture && lecture.class_id === selectedClassId && att.lecture_id === selectedLectureId;
            });
            
            // Filter homework data for selected class and lecture
            currentHomeworkData = homeworkData.filter(hw => hw.lecture_id === selectedLectureId);
            
            // Populate modal with data
            populateModalWithAttendanceData();
            
            // Show modal
            elements.editAttendanceModal.classList.add('show');
            
        } catch (error) {
            console.error("Error loading attendance data:", error);
            alert("Failed to load attendance data. Please try again.");
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    // Populate modal with attendance data
    function populateModalWithAttendanceData() {
        const lecture = lecturesData.find(lec => lec.id === selectedLectureId);
        elements.modalClassName.textContent = classesData.find(cls => cls.id === selectedClassId).school;
        elements.modalLectureTopic.textContent = lecture.topic;
        elements.modalLectureDate.textContent = lecture.date;
        
        // Clear previous data
        elements.attendanceStudentsContainer.innerHTML = '';
        elements.homeworkStudentsContainer.innerHTML = '';
        
        // Populate attendance students
        currentAttendanceData.forEach(att => {
            const student = studentsData.find(st => st.id === att.student_id);
            if (student) {
                const div = document.createElement('div');
                div.className = 'student_item';
                div.innerHTML = `<span>${student.name}</span>`;
                const select = document.createElement('select');
                select.setAttribute('data-student-id', student.id);
                select.innerHTML = `
                    <option value="${ATTENDANCE_STATUS.PRESENT}" ${att.status === ATTENDANCE_STATUS.PRESENT ? 'selected' : ''}>Present</option>
                    <option value="${ATTENDANCE_STATUS.LATE}" ${att.status === ATTENDANCE_STATUS.LATE ? 'selected' : ''}>Late</option>
                    <option value="${ATTENDANCE_STATUS.ABSENT}" ${att.status === ATTENDANCE_STATUS.ABSENT ? 'selected' : ''}>Absent</option>
                `;
                div.appendChild(select);
                elements.attendanceStudentsContainer.appendChild(div);
            }
        });
        
        // Populate homework students
        currentHomeworkData.forEach(hw => {
            const student = studentsData.find(st => st.id === hw.student_id);
            if (student) {
                const div = document.createElement('div');
                div.className = 'student_item';
                div.innerHTML = `<span>${student.name}</span>`;
                const input = document.createElement('input');
                input.type = 'number';
                input.value = hw.completed_problems || 0;
                input.setAttribute('data-student-id', student.id);
                input.setAttribute('data-homework-id', hw.id);
                div.appendChild(input);
                
                elements.homeworkStudentsContainer.appendChild(div);
            }
        });
    }
    // Save attendance and homework data
    async function saveAttendanceAndHomework() {
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Save attendance data
            const attendanceUpdates = Array.from(elements.attendanceStudentsContainer.querySelectorAll('.student_item select')).map(select => {
                const studentId = select.getAttribute('data-student-id');
                const status = select.value;
                return { studentId, status };
            });
            
            for (const update of attendanceUpdates) {
                const { studentId, status } = update;
                const existingAttendance = currentAttendanceData.find(att => att.student_id === studentId && att.lecture_id === selectedLectureId);
                if (existingAttendance) {
                    existingAttendance.status = status;
                    await window.appUtils.updateData('attendance', existingAttendance.id, { status });
                } else {
                    await window.appUtils.createData('attendance', { lecture_id: selectedLectureId, student_id: studentId, status });
                }
            }
            
            // Save homework data
            const homeworkUpdates = Array.from(elements.homeworkStudentsContainer.querySelectorAll('.student_item input')).map(input => {
                const studentId = input.getAttribute('data-student-id');
                const homeworkId = input.getAttribute('data-homework-id');
                const completedProblems = parseInt(input.value) || 0;
                return { studentId, homeworkId, completedProblems };
            });
            
            for (const update of homeworkUpdates) {
                const { studentId, homeworkId, completedProblems } = update;
                if (homeworkId) {
                    await window.appUtils.updateData('homework', homeworkId, { completed_problems: completedProblems });
                } else {
                    await window.appUtils.createData('homework', { lecture_id: selectedLectureId, student_id: studentId, total_problems: currentTotalProblems, completed_problems: completedProblems });
                }
            }
            
            alert("Attendance and homework data saved successfully.");
            
        } catch (error) {
            console.error("Error saving attendance and homework data:", error);
            alert("Failed to save data. Please try again.");
        } finally {
            elements.editAttendanceModal.classList.remove('show');
            await window.appUtils.hideLoadingIndicator();
        }
    }
    // Update statistics based on loaded data
    function updateStatistics() {
        const activeClasses = classesData.filter(c => c.status === 'active').length;
        const totalAttendance = attendanceData.length;
        const totalHomework = homeworkData.length;
        
        elements.activeClassesCount.textContent = activeClasses;
        elements.totalAttendanceCount.textContent = totalAttendance;
        elements.homeworkCompletionRate.textContent = totalHomework ? `${(totalHomework / (totalAttendance + totalHomework) * 100).toFixed(2)}%` : '0%';
    }
    // Update max problems values based on input
    function updateMaxProblemsValues() {
        const maxProblems = parseInt(elements.totalProblemsInput.value) || 0;
        currentTotalProblems = maxProblems;
        
        // Update homework inputs with new max problems
        Array.from(elements.homeworkStudentsContainer.querySelectorAll('.student_item input')).forEach(input => {
            input.setAttribute('max', maxProblems);
        });
    }

    initPage();
})();