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
})();