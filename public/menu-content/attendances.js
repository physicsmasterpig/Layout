// attendances.js - Improved Attendance Management
(function() {
    // Constants
    const ATTENDANCE_STATUS = {
        PRESENT: 'present',
        LATE: 'late',
        ABSENT: 'absent', 
        VIDEO: 'video',
        EXCUSED: 'excused', 
        NONE: 'N\/A'
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
        console.log("Attendance page initialized successfully.");
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
                status: row[3] || ATTENDANCE_STATUS.NONE
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
                    classification: row[5] || HOMEWORK_CLASSIFICATION.NONE,
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
            // Enable lecture selection
            const filteredLectures = lecturesData.filter(lecture => lecture.class_id === selectedClassId);
            populateLectureDropdown(filteredLectures);
            
            // Clear the selected lecture
            selectedLectureId = null;
            elements.lectureSelect.value = "";
            
            // Disable the view button until lecture is selected
            elements.viewAttendanceBtn.setAttribute('disabled', true);
            
            // Show the class overview in the main content area
            renderClassAttendanceOverview(selectedClassId);
        } else {
            // Reset everything if no class is selected
            elements.lectureSelect.innerHTML = '<option value="">Select Lecture</option>';
            elements.lectureSelect.setAttribute('disabled', true);
            elements.viewAttendanceBtn.setAttribute('disabled', true);
            
            // Show empty state
            renderEmptyState();
        }
    }
    
    // Populate lecture dropdown based on selected class
    function populateLectureDropdown(lectures) {
        elements.lectureSelect.removeAttribute('disabled');
        elements.lectureSelect.innerHTML = '<option value="">Select Lecture</option>';
        
        // Sort lectures by date (oldest first)
        const sortedLectures = [...lectures].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        
        sortedLectures.forEach(lecture => {
            const option = document.createElement('option');
            option.value = lecture.id;
            
            // Format date nicely
            const lectureDate = new Date(lecture.date);
            const formattedDate = lectureDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            option.textContent = `${formattedDate} - ${lecture.topic}`;
            elements.lectureSelect.appendChild(option);
        });
    }

    // Handle lecture selection change
    function handleLectureChange() {
        selectedLectureId = elements.lectureSelect.value;
        
        if (selectedLectureId) {
            elements.viewAttendanceBtn.removeAttribute('disabled');
            
            // Highlight the selected lecture in the attendance overview
            highlightSelectedLecture(selectedLectureId);
        } else {
            elements.viewAttendanceBtn.setAttribute('disabled', true);
            
            // Remove highlight from all lectures
            const lectureRows = document.querySelectorAll('.lecture_row');
            lectureRows.forEach(row => row.classList.remove('selected'));
        }
    }
    
    // Highlight the selected lecture in the overview
    function highlightSelectedLecture(lectureId) {
        const lectureRows = document.querySelectorAll('.lecture_row');
        
        lectureRows.forEach(row => {
            if (row.getAttribute('data-lecture-id') === lectureId) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    // Render empty state for attendance content
    function renderEmptyState() {
        elements.attendanceContent.innerHTML = `
            <div class="empty_state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 6.75H7.75C6.64543 6.75 5.75 7.64543 5.75 8.75V17.25C5.75 18.3546 6.64543 19.25 7.75 19.25H16.25C17.3546 19.25 18.25 18.3546 18.25 17.25V8.75C18.25 7.64543 17.3546 6.75 16.25 6.75H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14 8.25H10C9.44772 8.25 9 7.80228 9 7.25V5.75C9 5.19772 9.44772 4.75 10 4.75H14C14.5523 4.75 15 5.19772 15 5.75V7.25C15 7.80228 14.5523 8.25 14 8.25Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9.75 12.25H14.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9.75 15.75H14.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h2>No attendance data selected</h2>
                <p>Select a class and lecture above to view attendance records</p>
            </div>
        `;
    }

    // Render class attendance overview in the main content area
    async function renderClassAttendanceOverview(classId) {
        try {
            await window.appUtils.showLoadingIndicator();
            
            const classInfo = classesData.find(c => c.id === classId);
            if (!classInfo) {
                renderEmptyState();
                return;
            }
            
            // Get enrolled students for this class
            const enrolledStudentIds = enrollmentsData
                .filter(e => e.class_id === classId)
                .map(e => e.student_id);
            
            // Get student info for enrolled students
            const enrolledStudents = studentsData
                .filter(s => enrolledStudentIds.includes(s.id) && s.status === 'active')
                .sort((a, b) => a.name.localeCompare(b.name));
            
            // Get lectures for this class
            const classLectures = lecturesData
                .filter(l => l.class_id === classId)
                .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date, oldest first
            
            // Start building the HTML
            let html = `
                <div class="attendance_header">
                    <h1>
                        ${classInfo.school}
                        <span class="class_badge">${classInfo.year}년 ${classInfo.semester}학기 ${classInfo.generation}기</span>
                    </h1>
                    <div class="attendance_actions">
                        <button id="export-attendance-btn" class="action_button">Export Attendance</button>
                    </div>
                </div>
                
                <div class="attendance_overview">
                    <div class="attendance_stats">
                        <div class="stat_item">
                            <span class="stat_label">Total Students</span>
                            <span class="stat_value">${enrolledStudents.length}</span>
                        </div>
                        <div class="stat_item">
                            <span class="stat_label">Total Lectures</span>
                            <span class="stat_value">${classLectures.length}</span>
                        </div>
                        <div class="stat_item">
                            <span class="stat_label">Avg. Attendance</span>
                            <span class="stat_value">${calculateAverageAttendance(classId, classLectures, enrolledStudents)}%</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Add attendance table
            html += `
                <div class="attendance_table_container">
                    <table class="attendance_table">
                        <thead>
                            <tr>
                                <th class="student_col">Student</th>
                                ${classLectures.map(lecture => {
                                    const lectureDate = new Date(lecture.date);
                                    const formattedDate = lectureDate.toLocaleDateString('ko-KR', {
                                        month: 'short',
                                        day: 'numeric'
                                    });
                                    return `<th class="lecture_col" data-lecture-id="${lecture.id}" title="${lecture.topic}">${formattedDate}</th>`;
                                }).join('')}
                                <th class="total_col">Total</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add student rows
            for (const student of enrolledStudents) {
                // Calculate attendance counts for this student
                const studentAttendanceCounts = {
                    present: 0,
                    late: 0,
                    absent: 0,
                    video: 0,
                    excused: 0,
                    none: 0,
                    total: classLectures.length
                };
                
                html += `
                    <tr data-student-id="${student.id}">
                        <td class="student_name">${student.name}</td>
                `;
                
                // Add attendance status for each lecture
                for (const lecture of classLectures) {
                    const attendance = attendanceData.find(a => 
                        a.lecture_id === lecture.id && a.student_id === student.id
                    );
                    
                    const status = attendance ? attendance.status : ATTENDANCE_STATUS.NONE;
                    
                    // Update counts
                    if (status === ATTENDANCE_STATUS.PRESENT) {
                        studentAttendanceCounts.present++;
                    } else if (status === ATTENDANCE_STATUS.LATE) {
                        studentAttendanceCounts.late++;
                    } else if (status === ATTENDANCE_STATUS.VIDEO) {
                        studentAttendanceCounts.video++;
                    } else if (status === ATTENDANCE_STATUS.EXCUSED) {
                        studentAttendanceCounts.excused++;
                    } else if (status === ATTENDANCE_STATUS.NONE) {
                        studentAttendanceCounts.none++;
                    }
                     else {
                        studentAttendanceCounts.absent++;
                    }
                    
                    // Add cell with status
                    html += `
                        <td class="attendance_cell ${status}" data-lecture-id="${lecture.id}" data-student-id="${student.id}">
                            <div class="status_indicator ${status}"></div>
                        </td>
                    `;
                }
                
                // Calculate attendance rate
                const attendanceRate = classLectures.length > 0 
                    ? Math.round(((studentAttendanceCounts.present + studentAttendanceCounts.late + studentAttendanceCounts.video + studentAttendanceCounts.excused) / (studentAttendanceCounts.total - studentAttendanceCounts.none)) * 100) 
                    : 0;
                
                // Add attendance rate column
                html += `
                        <td class="attendance_rate">
                            <div class="rate_display ${getAttendanceRateClass(attendanceRate)}">
                                ${attendanceRate}%
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            // Add lecture details section
            html += `
                <div class="lecture_details_section">
                    <h2>Lecture Details</h2>
                    <div class="lecture_list">
            `;
            
            // Add each lecture with its details
            for (const lecture of classLectures) {
                const lectureDate = new Date(lecture.date);
                const formattedDate = lectureDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                // Calculate attendance stats for this lecture
                const lectureStats = calculateLectureStats(lecture.id, enrolledStudents);
                
                html += `
                    <div class="lecture_row ${selectedLectureId === lecture.id ? 'selected' : ''}" data-lecture-id="${lecture.id}">
                        <div class="lecture_info">
                            <div class="lecture_title">${lecture.topic}</div>
                            <div class="lecture_date">${formattedDate} ${lecture.time}</div>
                        </div>
                        <div class="lecture_stats">
                            <div class="lecture_stat">
                                <span class="stat_label">Present</span>
                                <span class="stat_value present">${lectureStats.present}</span>
                            </div>
                            <div class="lecture_stat">
                                <span class="stat_label">Late</span>
                                <span class="stat_value late">${lectureStats.late}</span>
                            </div>
                            <div class="lecture_stat">
                                <span class="stat_label">Absent</span>
                                <span class="stat_value absent">${lectureStats.absent}</span>
                            </div>
                            <div class="lecture_stat">
                                <span class="stat_label">Video</span>
                                <span class="stat_value video">${lectureStats.video}</span>
                            </div>
                            <div class="lecture_stat">
                                <span class="stat_label">Excused</span>
                                <span class="stat_value excused">${lectureStats.excused}</span>
                            </div>
                            <div class="lecture_stat">
                                <span class="stat_label">None</span>
                                <span class="stat_value none">${lectureStats.none}</span>
                            </div>
                        </div>
                        <button class="edit_button" data-lecture-id="${lecture.id}">Edit Attendance</button>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
            
            // Update the attendance content
            elements.attendanceContent.innerHTML = html;
            
            // Add event listeners for the attendance cells and edit buttons
            setupAttendanceTableInteractions();
            
        } catch (error) {
            console.error("Error rendering class attendance:", error);
            renderEmptyState();
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Setup interactions for the attendance table
    function setupAttendanceTableInteractions() {
        // Add click event for lecture columns to select that lecture
        const lectureColumns = document.querySelectorAll('th.lecture_col');
        lectureColumns.forEach(column => {
            column.addEventListener('click', () => {
                const lectureId = column.getAttribute('data-lecture-id');
                
                // Update dropdown to match
                elements.lectureSelect.value = lectureId;
                
                // Trigger the change event
                const event = new Event('change');
                elements.lectureSelect.dispatchEvent(event);
            });
        });
        
        // Add click event for attendance cells to quick-edit status
        const attendanceCells = document.querySelectorAll('.attendance_cell');
        attendanceCells.forEach(cell => {
            cell.addEventListener('click', () => {
                const lectureId = cell.getAttribute('data-lecture-id');
                const studentId = cell.getAttribute('data-student-id');
                
                // Update selected lecture
                selectedLectureId = lectureId;
                elements.lectureSelect.value = lectureId;
                
                // Highlight the selected lecture
                highlightSelectedLecture(lectureId);
                
                // Load the attendance data and show the modal
                loadAttendanceData(studentId);
            });
        });
        
        // Add click event for edit buttons
        const editButtons = document.querySelectorAll('.edit_button');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const lectureId = button.getAttribute('data-lecture-id');
                
                // Update selected lecture
                selectedLectureId = lectureId;
                elements.lectureSelect.value = lectureId;
                
                // Highlight the selected lecture
                highlightSelectedLecture(lectureId);
                
                // Load the attendance data and show the modal
                loadAttendanceData();
            });
        });
        
        // Add click event for lecture rows to select that lecture
        const lectureRows = document.querySelectorAll('.lecture_row');
        lectureRows.forEach(row => {
            row.addEventListener('click', (e) => {
                // Ignore clicks on the edit button
                if (e.target.classList.contains('edit_button')) {
                    return;
                }
                
                const lectureId = row.getAttribute('data-lecture-id');
                
                // Update selected lecture
                selectedLectureId = lectureId;
                elements.lectureSelect.value = lectureId;
                
                // Highlight the selected lecture
                highlightSelectedLecture(lectureId);
                
                // Enable the view button
                elements.viewAttendanceBtn.removeAttribute('disabled');
            });
        });
    }
    
    // Calculate lecture statistics
    function calculateLectureStats(lectureId, enrolledStudents) {
        const stats = {
            present: 0,
            late: 0,
            absent: 0,
            video: 0,
            excused: 0,
            none: 0,
            total: enrolledStudents.length
        };
        
        // Count attendance for each student
        enrolledStudents.forEach(student => {
            const attendance = attendanceData.find(a => 
                a.lecture_id === lectureId && a.student_id === student.id
            );
            
            if (attendance) {
                if (attendance.status === ATTENDANCE_STATUS.PRESENT) {
                    stats.present++;
                } else if (attendance.status === ATTENDANCE_STATUS.LATE) {
                    stats.late++;
                } else if (attendance.status === ATTENDANCE_STATUS.VIDEO) {
                    stats.video++;
                }
                else if (attendance.status === ATTENDANCE_STATUS.EXCUSED) {
                    stats.excused++;
                } 
                else if (attendance.status === ATTENDANCE_STATUS.NONE) {
                    stats.none++;
                }
                else {
                    stats.absent++;
                }
            } else {
                stats.none++;
            }
        });
        
        return stats;
    }
    
    // Calculate average attendance rate for a class
    function calculateAverageAttendance(classId, lectures, students) {
        if (lectures.length === 0 || students.length === 0) {
            return 0;
        }
        
        let totalPresent = 0;
        let totalLate = 0;
        let totalVideo = 0;
        let totalExcused = 0;
        let totalNone = 0;

        let totalSessions = lectures.length * students.length;
        
        // Count present and late for all students and lectures
        lectures.forEach(lecture => {
            students.forEach(student => {
                const attendance = attendanceData.find(a => 
                    a.lecture_id === lecture.id && a.student_id === student.id
                );
                
                if (attendance) {
                    if (attendance.status === ATTENDANCE_STATUS.PRESENT) {
                        totalPresent++;
                    } else if (attendance.status === ATTENDANCE_STATUS.LATE) {
                        totalLate++;
                    } else if (attendance.status === ATTENDANCE_STATUS.VIDEO) {
                        totalVideo++;
                    } else if (attendance.status === ATTENDANCE_STATUS.EXCUSED) {
                        totalExcused++;
                    } else if (attendance.status === ATTENDANCE_STATUS.NONE) {
                        totalNone++;
                    }
                } else {
                    totalNone++;
                }
            });
        });
        
        // Calculate rate (late counts as 0.5)
        const rate = ((totalPresent + totalLate + totalExcused + totalVideo) / (totalSessions - totalNone)) * 100;
        return Math.round(rate);
    }
    
    // Get CSS class based on attendance rate
    function getAttendanceRateClass(rate) {
        if (rate >= 90) return 'excellent';
        if (rate >= 80) return 'good';
        if (rate >= 70) return 'average';
        if (rate >= 50) return 'warning';
        return 'poor';
    }

    // Load attendance data for selected class and lecture
    async function loadAttendanceData(focusStudentId = null) {
        if (!selectedClassId || !selectedLectureId) {
            alert("Please select a class and a lecture.");
            return;
        }
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Get enrolled students for this class
            const enrolledStudentIds = enrollmentsData
                .filter(e => e.class_id === selectedClassId)
                .map(e => e.student_id);
            
            // Filter students who are active
            const activeEnrolledStudents = studentsData
                .filter(s => enrolledStudentIds.includes(s.id) && s.status === 'active')
                .sort((a, b) => a.name.localeCompare(b.name));
            
            // Create attendance data for all enrolled students
            currentAttendanceData = [];
            
            activeEnrolledStudents.forEach(student => {
                // Find existing attendance record
                const existingRecord = attendanceData.find(a => 
                    a.lecture_id === selectedLectureId && a.student_id === student.id
                );
                
                // Create or use existing record
                const record = existingRecord ? {
                    id: existingRecord.id,
                    lecture_id: existingRecord.lecture_id,
                    student_id: existingRecord.student_id,
                    status: existingRecord.status
                } : {
                    id: generateAttendanceId(),
                    lecture_id: selectedLectureId,
                    student_id: student.id,
                    status: ATTENDANCE_STATUS.NONE // Default to none
                };
                
                currentAttendanceData.push(record);
            });
            
            // Get homework data
            currentHomeworkData = homeworkData.filter(hw => 
                hw.lecture_id === selectedLectureId &&
                enrolledStudentIds.includes(hw.student_id)
            );
            
            // Create homework data for students without records
            activeEnrolledStudents.forEach(student => {
                const existingHomework = currentHomeworkData.find(hw => 
                    hw.student_id === student.id
                );
                
                if (!existingHomework) {
                    currentHomeworkData.push({
                        id: generateHomeworkId(),
                        lecture_id: selectedLectureId,
                        student_id: student.id,
                        total_problems: currentTotalProblems,
                        completed_problems: 0,
                        classification: HOMEWORK_CLASSIFICATION.INCOMPLETE,
                        comments: ''
                    });
                }
            });
            
            // Populate modal with data
            await populateModalWithAttendanceData(focusStudentId);
            
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
    async function populateModalWithAttendanceData(focusStudentId = null) {
        // Get class and lecture info
        const classInfo = classesData.find(cls => cls.id === selectedClassId);
        const lecture = lecturesData.find(lec => lec.id === selectedLectureId);
        
        if (!classInfo || !lecture) {
            console.error("Missing class or lecture info");
            return;
        }
        
        // Set header info
        elements.modalClassName.textContent = classInfo.school;
        elements.modalLectureTopic.textContent = lecture.topic;
        
        const lectureDate = new Date(lecture.date);
        const formattedDate = lectureDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        elements.modalLectureDate.textContent = formattedDate;
        
        // Clear previous data
        elements.attendanceStudentsContainer.innerHTML = '';
        elements.homeworkStudentsContainer.innerHTML = '';
        
        // Set total problems value
        const maxProblems = Math.max(...currentHomeworkData.map(hw => hw.total_problems || 0), 0);
        currentTotalProblems = maxProblems > 0 ? maxProblems : 10;
        elements.totalProblemsInput.value = currentTotalProblems;
        
        // Populate attendance students
        currentAttendanceData.forEach(att => {
            const student = studentsData.find(st => st.id === att.student_id);
            if (student) {
                const studentRow = document.createElement('div');
                studentRow.className = 'student_row';
                studentRow.dataset.studentId = student.id;
                
                studentRow.innerHTML = `
                    <div class="student_info">
                        <div class="student_name">${student.name}</div>
                        <div class="student_school">${student.school} - ${student.generation}기</div>
                    </div>
                    <div class="attendance_options">
                        <div class="attendance_option">
                            <input type="radio" name="attendance-${student.id}" id="present-${student.id}" value="${ATTENDANCE_STATUS.PRESENT}" ${att.status === ATTENDANCE_STATUS.PRESENT ? 'checked' : ''}>
                            <label for="present-${student.id}" class="status_text present">Present</label>
                        </div>
                        <div class="attendance_option">
                            <input type="radio" name="attendance-${student.id}" id="late-${student.id}" value="${ATTENDANCE_STATUS.LATE}" ${att.status === ATTENDANCE_STATUS.LATE ? 'checked' : ''}>
                            <label for="late-${student.id}" class="status_text late">Late</label>
                        </div>
                        <div class="attendance_option">
                            <input type="radio" name="attendance-${student.id}" id="absent-${student.id}" value="${ATTENDANCE_STATUS.ABSENT}" ${att.status === ATTENDANCE_STATUS.ABSENT ? 'checked' : ''}>
                            <label for="absent-${student.id}" class="status_text absent">Absent</label>
                        </div>
                        <div class="attendance_option">
                            <input type="radio" name="attendance-${student.id}" id="video-${student.id}" value="${ATTENDANCE_STATUS.VIDEO}" ${att.status === ATTENDANCE_STATUS.VIDEO ? 'checked' : ''}>
                            <label for="video-${student.id}" class="status_text video">Video</label>
                        </div>
                        <div class="attendance_option">
                            <input type="radio" name="attendance-${student.id}" id="excused-${student.id}" value="${ATTENDANCE_STATUS.EXCUSED}" ${att.status === ATTENDANCE_STATUS.EXCUSED ? 'checked' : ''}>
                            <label for="excused-${student.id}" class="status_text excused">Excused</label>
                        </div>
                        <div class="attendance_option">
                            <input type="radio" name="attendance-${student.id}" id="none-${student.id}" value="${ATTENDANCE_STATUS.NONE}" ${att.status === ATTENDANCE_STATUS.NONE ? 'checked' : ''}>
                            <label for="none-${student.id}" class="status_text none">None</label>
                        </div>
                    </div>
                `;
                
                elements.attendanceStudentsContainer.appendChild(studentRow);
                
                // Attach event listeners to radio buttons
                const radioButtons = studentRow.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.addEventListener('change', () => {
                        // Update attendance data
                        const status = radio.value;
                        const attIndex = currentAttendanceData.findIndex(a => a.student_id === student.id);
                        if (attIndex !== -1) {
                            currentAttendanceData[attIndex].status = status;
                        }
                    });
                });
            }
        });
        
        // Populate homework students
        currentHomeworkData.forEach(hw => {
            const student = studentsData.find(st => st.id === hw.student_id);
            if (student) {
                const studentRow = document.createElement('div');
                studentRow.className = 'student_row';
                studentRow.dataset.studentId = student.id;
                
                studentRow.innerHTML = `
                    <div class="student_info">
                        <div class="student_name">${student.name}</div>
                        <div class="student_school">${student.school} - ${student.generation}기</div>
                    </div>
                    <div class="homework_row">
                        <div class="homework_header">
                            <div class="homework_title">Homework Details</div>
                        </div>
                        <div class="homework_inputs">
                            <div class="input_group">
                                <label>Problems Completed</label>
                                <input type="number" min="0" max="${currentTotalProblems}" value="${hw.completed_problems || 0}" class="completed-problems">
                            </div>
                            <div class="input_group">
                                <label>Classification</label>
                                <select class="homework-classification">
                                    <option value="${HOMEWORK_CLASSIFICATION.EXCELLENT}" ${hw.classification === HOMEWORK_CLASSIFICATION.EXCELLENT ? 'selected' : ''}>Excellent</option>
                                    <option value="${HOMEWORK_CLASSIFICATION.GOOD}" ${hw.classification === HOMEWORK_CLASSIFICATION.GOOD ? 'selected' : ''}>Good</option>
                                    <option value="${HOMEWORK_CLASSIFICATION.AVERAGE}" ${hw.classification === HOMEWORK_CLASSIFICATION.AVERAGE ? 'selected' : ''}>Average</option>
                                    <option value="${HOMEWORK_CLASSIFICATION.NEEDS_IMPROVEMENT}" ${hw.classification === HOMEWORK_CLASSIFICATION.NEEDS_IMPROVEMENT ? 'selected' : ''}>Needs Improvement</option>
                                    <option value="${HOMEWORK_CLASSIFICATION.INCOMPLETE}" ${hw.classification === HOMEWORK_CLASSIFICATION.INCOMPLETE ? 'selected' : ''}>Incomplete</option>
                                </select>
                            </div>
                        </div>
                        <div class="input_group" style="margin-top: 12px;">
                            <label>Comments</label>
                            <textarea rows="2" placeholder="Add comment about this student's homework" class="homework-comments">${hw.comments || ''}</textarea>
                        </div>
                    </div>
                `;
                
                elements.homeworkStudentsContainer.appendChild(studentRow);
                
                // Attach event listeners
                const completedInput = studentRow.querySelector('.completed-problems');
                const classificationSelect = studentRow.querySelector('.homework-classification');
                const commentsTextarea = studentRow.querySelector('.homework-comments');
                
                // Update homework data when values change
                const updateHomework = () => {
                    const hwIndex = currentHomeworkData.findIndex(h => h.student_id === student.id);
                    if (hwIndex !== -1) {
                        currentHomeworkData[hwIndex].completed_problems = parseInt(completedInput.value) || 0;
                        currentHomeworkData[hwIndex].classification = classificationSelect.value;
                        currentHomeworkData[hwIndex].comments = commentsTextarea.value;
                    }
                };
                
                completedInput.addEventListener('change', updateHomework);
                classificationSelect.addEventListener('change', updateHomework);
                commentsTextarea.addEventListener('blur', updateHomework);
            }
        });
        
        // If a specific student is focused, scroll to that student
        if (focusStudentId) {
            // First switch to attendance tab
            document.querySelector('.tab_button[data-tab="attendance"]').click();
            
            // Find the student row
            const studentRow = document.querySelector(`.student_row[data-student-id="${focusStudentId}"]`);
            if (studentRow) {
                setTimeout(() => {
                    studentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    studentRow.classList.add('highlight');
                    
                    // Remove highlight after animation
                    setTimeout(() => {
                        studentRow.classList.remove('highlight');
                    }, 2000);
                }, 300);
            }
        }
    }
    
    // Save attendance and homework data
    async function saveAttendanceAndHomework() {
        try {
            await window.appUtils.showLoadingIndicator();
            
            // In a real implementation, we would send this data to the server
            // For now, we'll update our local data structures
            
            // Update attendance data
            const updatedAttendances = Array.from(elements.attendanceStudentsContainer.querySelectorAll('.student_row')).map(row => {
                const studentId = row.dataset.studentId;
                const checkedRadio = row.querySelector('input[type="radio"]:checked');
                
                // If a radio is checked, use its value
                if (checkedRadio) {
                    return {
                        studentId,
                        status: checkedRadio.value
                    };
                }
                
                // Find existing record to maintain current status
                const existingRecord = currentAttendanceData.find(a => a.student_id === studentId);
                if (existingRecord) {
                    return {
                        studentId,
                        status: existingRecord.status
                    };
                }
                
                // Default to none if no existing record and no selection
                return {
                    studentId,
                    status: ATTENDANCE_STATUS.NONE
                };
            });
            
            updatedAttendances.forEach(update => {
                const index = attendanceData.findIndex(a => 
                    a.lecture_id === selectedLectureId && a.student_id === update.studentId
                );
                
                if (index !== -1) {
                    // Update existing record
                    attendanceData[index].status = update.status;
                } else {
                    // Create new record
                    const newRecord = {
                        id: generateAttendanceId(),
                        lecture_id: selectedLectureId,
                        student_id: update.studentId,
                        status: update.status
                    };
                    
                    attendanceData.push(newRecord);
                }
            });
            
            // Update homework data
            const homeworkRows = elements.homeworkStudentsContainer.querySelectorAll('.student_row');
            for (const row of homeworkRows) {
                const studentId = row.dataset.studentId;
                const completedProblems = parseInt(row.querySelector('.completed-problems').value) || 0;
                const classification = row.querySelector('.homework-classification').value;
                const comments = row.querySelector('.homework-comments').value;
                
                const index = homeworkData.findIndex(hw => 
                    hw.lecture_id === selectedLectureId && hw.student_id === studentId
                );
                
                if (index !== -1) {
                    // Update existing record
                    homeworkData[index].total_problems = currentTotalProblems;
                    homeworkData[index].completed_problems = completedProblems;
                    homeworkData[index].classification = classification;
                    homeworkData[index].comments = comments;
                } else {
                    // Create new record
                    const newRecord = {
                        id: generateHomeworkId(),
                        lecture_id: selectedLectureId,
                        student_id: studentId,
                        total_problems: currentTotalProblems,
                        completed_problems: completedProblems,
                        classification: classification,
                        comments: comments
                    };
                    
                    homeworkData.push(newRecord);
                }
            }
            
            // Update statistics
            updateStatistics();
            
            // Refresh the class overview
            await renderClassAttendanceOverview(selectedClassId);
            
            // Success message
            alert("Attendance and homework data saved successfully!");
            
            // Close modal
            elements.editAttendanceModal.classList.remove('show');
            
        } catch (error) {
            console.error("Error saving attendance data:", error);
            alert("Failed to save attendance data. Please try again.");
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Update statistics for the page
    function updateStatistics() {
        // Count active classes
        const activeClassCount = classesData.filter(c => c.status === 'active').length;
        
        // Count total attendance records
        const totalAttendance = attendanceData.length;
        
        // Calculate homework completion rate
        let completedHomework = 0;
        let totalHomework = 0;
        
        homeworkData.forEach(hw => {
            if (hw.total_problems > 0) {
                totalHomework++;
                if (hw.completed_problems >= hw.total_problems) {
                    completedHomework++;
                }
            }
        });
        
        const homeworkRate = totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 0;
        
        // Update the UI
        elements.activeClassesCount.textContent = activeClassCount;
        elements.totalAttendanceCount.textContent = totalAttendance;
        elements.homeworkCompletionRate.textContent = homeworkRate + '%';
    }
    
    // Update max problems values when global setting changes
    function updateMaxProblemsValues() {
        const maxProblems = parseInt(elements.totalProblemsInput.value) || 0;
        currentTotalProblems = maxProblems;
        
        // Update all homework inputs
        const inputs = elements.homeworkStudentsContainer.querySelectorAll('.completed-problems');
        inputs.forEach(input => {
            input.setAttribute('max', maxProblems);
        });
        
        // Update all homework records
        currentHomeworkData.forEach(hw => {
            hw.total_problems = maxProblems;
        });
    }
    
    // Generate unique IDs for new records
    function generateAttendanceId() {
        return 'ATT' + Date.now().toString() + Math.floor(Math.random() * 1000);
    }
    
    function generateHomeworkId() {
        return 'HW' + Date.now().toString() + Math.floor(Math.random() * 1000);
    }
    
    // Initialize the page
    initPage();
})();