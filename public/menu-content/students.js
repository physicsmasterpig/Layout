// students.js - Handles student management functionality
(function() {
    // Constants
    const ROWS_PER_PAGE = 10;
    
    // DOM Element References
    const elements = {
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
            document.querySelector('tbody').innerHTML = '<tr><td colspan="8">Error loading student data</td></tr>';
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
            
            // Add action button
            const actionCell = document.createElement('td');
            actionCell.innerHTML = createActionButtonSVG();
            actionCell.addEventListener('click', () => handleStudentDetailView(row[0])); // row[0] is student ID
            tr.appendChild(actionCell);
            
            table.appendChild(tr);
        });
        
        // Initialize table pagination
        window.appUtils.setTable(ROWS_PER_PAGE);
    }
    
    // Generate SVGs for table cells
    function createActiveStatusSVG() {
        return '<svg class="active" width="100" height="36" viewBox="0 0 100 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="99" height="35" rx="4.5" fill="#0C0E12"/><rect x="0.5" y="0.5" width="99" height="35" rx="4.5" stroke="#373A41"/><circle cx="13" cy="18" r="3" fill="#17B26A"/><path d="M28.642 23.5H26.392L30.4886 11.8636H33.0909L37.1932 23.5H34.9432L31.8352 14.25H31.7443L28.642 23.5ZM28.7159 18.9375H34.8523V20.6307H28.7159V18.9375ZM42.1761 23.6705C41.3049 23.6705 40.5568 23.4792 39.9318 23.0966C39.3106 22.714 38.8314 22.1856 38.4943 21.5114C38.161 20.8333 37.9943 20.053 37.9943 19.1705C37.9943 18.2841 38.1648 17.5019 38.5057 16.8239C38.8466 16.142 39.3277 15.6117 39.9489 15.233C40.5739 14.8504 41.3125 14.6591 42.1648 14.6591C42.8731 14.6591 43.5 14.7898 44.0455 15.0511C44.5947 15.3087 45.0322 15.6742 45.358 16.1477C45.6837 16.6174 45.8693 17.1667 45.9148 17.7955H43.9489C43.8693 17.375 43.6799 17.0246 43.3807 16.7443C43.0852 16.4602 42.6894 16.3182 42.1932 16.3182C41.7727 16.3182 41.4034 16.4318 41.0852 16.6591C40.767 16.8826 40.5189 17.2045 40.3409 17.625C40.1667 18.0455 40.0795 18.5492 40.0795 19.1364C40.0795 19.7311 40.1667 20.2424 40.3409 20.6705C40.5152 21.0947 40.7595 21.4223 41.0739 21.6534C41.392 21.8807 41.7652 21.9943 42.1932 21.9943C42.4962 21.9943 42.767 21.9375 43.0057 21.8239C43.2481 21.7064 43.4508 21.5379 43.6136 21.3182C43.7765 21.0985 43.8883 20.8314 43.9489 20.517H45.9148C45.8655 21.1345 45.6837 21.6818 45.3693 22.1591C45.0549 22.6326 44.6269 23.0038 44.0852 23.2727C43.5436 23.5379 42.9072 23.6705 42.1761 23.6705ZM51.9616 14.7727V16.3636H46.9446V14.7727H51.9616ZM48.1832 12.6818H50.2401V20.875C50.2401 21.1515 50.2817 21.3636 50.3651 21.5114C50.4522 21.6553 50.5658 21.7538 50.706 21.8068C50.8461 21.8598 51.0014 21.8864 51.1719 21.8864C51.3007 21.8864 51.4181 21.8769 51.5241 21.858C51.634 21.839 51.7173 21.822 51.7741 21.8068L52.1207 23.4148C52.0109 23.4527 51.8537 23.4943 51.6491 23.5398C51.4484 23.5852 51.2022 23.6117 50.9105 23.6193C50.3954 23.6345 49.9313 23.5568 49.5185 23.3864C49.1056 23.2121 48.7779 22.9432 48.5355 22.5795C48.2969 22.2159 48.1795 21.7614 48.1832 21.2159V12.6818ZM53.6818 23.5V14.7727H55.7386V23.5H53.6818ZM54.7159 13.5341C54.3902 13.5341 54.1098 13.4261 53.875 13.2102C53.6402 12.9905 53.5227 12.7273 53.5227 12.4205C53.5227 12.1098 53.6402 11.8466 53.875 11.6307C54.1098 11.411 54.3902 11.3011 54.7159 11.3011C55.0455 11.3011 55.3258 11.411 55.5568 11.6307C55.7917 11.8466 55.9091 12.1098 55.9091 12.4205C55.9091 12.7273 55.7917 12.9905 55.5568 13.2102C55.3258 13.4261 55.0455 13.5341 54.7159 13.5341ZM65.6491 14.7727L62.5412 23.5H60.2685L57.1605 14.7727H59.3537L61.3594 21.2557H61.4503L63.4616 14.7727H65.6491ZM70.6392 23.6705C69.7642 23.6705 69.0085 23.4886 68.3722 23.125C67.7396 22.7576 67.2528 22.2386 66.9119 21.5682C66.571 20.8939 66.4006 20.1004 66.4006 19.1875C66.4006 18.2898 66.571 17.5019 66.9119 16.8239C67.2566 16.142 67.7377 15.6117 68.3551 15.233C68.9725 14.8504 69.6979 14.6591 70.5312 14.6591C71.0691 14.6591 71.5767 14.7462 72.054 14.9205C72.535 15.0909 72.9593 15.3561 73.3267 15.7159C73.6979 16.0758 73.9896 16.5341 74.2017 17.0909C74.4138 17.6439 74.5199 18.303 74.5199 19.0682V19.6989H67.3665V18.3125H72.5483C72.5445 17.9186 72.4593 17.5682 72.2926 17.2614C72.1259 16.9508 71.893 16.7064 71.5938 16.5284C71.2983 16.3504 70.9536 16.2614 70.5597 16.2614C70.1392 16.2614 69.7699 16.3636 69.4517 16.5682C69.1335 16.7689 68.8854 17.0341 68.7074 17.3636C68.5331 17.6894 68.4441 18.0473 68.4403 18.4375V19.6477C68.4403 20.1553 68.5331 20.5909 68.7188 20.9545C68.9044 21.3144 69.1638 21.5909 69.4972 21.7841C69.8305 21.9735 70.2206 22.0682 70.6676 22.0682C70.9669 22.0682 71.2377 22.0265 71.4801 21.9432C71.7225 21.8561 71.9328 21.7292 72.1108 21.5625C72.2888 21.3958 72.4233 21.1894 72.5142 20.9432L74.4347 21.1591C74.3134 21.6667 74.0824 22.1098 73.7415 22.4886C73.4044 22.8636 72.9725 23.1553 72.446 23.3636C71.9195 23.5682 71.3172 23.6705 70.6392 23.6705Z" fill="#CECFD2"/></svg>';
    }
    
    function createInactiveStatusSVG() {
        return '<svg class="inactive" width="100" height="36" viewBox="0 0 100 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="99" height="35" rx="4.5" fill="#0C0E12"/><rect x="0.5" y="0.5" width="99" height="35" rx="4.5" stroke="#373A41"/><circle cx="13" cy="18" r="3" fill="#F04438"/><path d="M29.2557 11.8636V23.5H27.1477V11.8636H29.2557ZM33.5043 18.3864V23.5H31.4474V14.7727H33.4134V16.2557H33.5156C33.7164 15.767 34.0365 15.3788 34.4759 15.0909C34.919 14.803 35.4664 14.6591 36.1179 14.6591C36.7202 14.6591 37.2448 14.7879 37.6918 15.0455C38.1425 15.303 38.491 15.6761 38.7372 16.1648C38.9872 16.6534 39.1103 17.2462 39.1065 17.9432V23.5H37.0497V18.2614C37.0497 17.678 36.8982 17.2216 36.5952 16.892C36.2959 16.5625 35.8812 16.3977 35.3509 16.3977C34.991 16.3977 34.6709 16.4773 34.3906 16.6364C34.1141 16.7917 33.8963 17.017 33.7372 17.3125C33.5819 17.608 33.5043 17.9659 33.5043 18.3864ZM43.7088 23.6761C43.1558 23.6761 42.6577 23.5777 42.2145 23.3807C41.7751 23.1799 41.4266 22.8845 41.169 22.4943C40.9152 22.1042 40.7884 21.6231 40.7884 21.0511C40.7884 20.5587 40.8793 20.1515 41.0611 19.8295C41.2429 19.5076 41.491 19.25 41.8054 19.0568C42.1198 18.8636 42.474 18.7178 42.8679 18.6193C43.2656 18.517 43.6766 18.4432 44.1009 18.3977C44.6122 18.3447 45.027 18.2973 45.3452 18.2557C45.6634 18.2102 45.8944 18.142 46.0384 18.0511C46.1861 17.9564 46.2599 17.8106 46.2599 17.6136V17.5795C46.2599 17.1515 46.133 16.8201 45.8793 16.5852C45.6255 16.3504 45.2599 16.233 44.7827 16.233C44.2789 16.233 43.8793 16.3428 43.5838 16.5625C43.2921 16.7822 43.0952 17.0417 42.9929 17.3409L41.0724 17.0682C41.224 16.5379 41.474 16.0947 41.8224 15.7386C42.1709 15.3788 42.5971 15.1098 43.1009 14.9318C43.6046 14.75 44.1615 14.6591 44.7713 14.6591C45.1918 14.6591 45.6103 14.7083 46.027 14.8068C46.4437 14.9053 46.8243 15.0682 47.169 15.2955C47.5137 15.5189 47.7902 15.8239 47.9986 16.2102C48.2107 16.5966 48.3168 17.0795 48.3168 17.6591V23.5H46.3395V22.3011H46.2713C46.1463 22.5436 45.9702 22.7708 45.7429 22.983C45.5194 23.1913 45.2372 23.3598 44.8963 23.4886C44.5592 23.6136 44.1634 23.6761 43.7088 23.6761ZM44.2429 22.1648C44.6558 22.1648 45.0137 22.0833 45.3168 21.9205C45.6198 21.7538 45.8527 21.5341 46.0156 21.2614C46.1823 20.9886 46.2656 20.6913 46.2656 20.3693V19.3409C46.2012 19.3939 46.0914 19.4432 45.9361 19.4886C45.7846 19.5341 45.6141 19.5739 45.4247 19.608C45.2353 19.642 45.0478 19.6723 44.8622 19.6989C44.6766 19.7254 44.5156 19.7481 44.3793 19.767C44.0724 19.8087 43.7978 19.8769 43.5554 19.9716C43.313 20.0663 43.1217 20.1989 42.9815 20.3693C42.8414 20.536 42.7713 20.7519 42.7713 21.017C42.7713 21.3958 42.9096 21.6818 43.1861 21.875C43.4626 22.0682 43.8149 22.1648 44.2429 22.1648ZM54.1918 23.6705C53.3205 23.6705 52.5724 23.4792 51.9474 23.0966C51.3262 22.714 50.8471 22.1856 50.5099 21.5114C50.1766 20.8333 50.0099 20.053 50.0099 19.1705C50.0099 18.2841 50.1804 17.5019 50.5213 16.8239C50.8622 16.142 51.3433 15.6117 51.9645 15.233C52.5895 14.8504 53.3281 14.6591 54.1804 14.6591C54.8887 14.6591 55.5156 14.7898 56.0611 15.0511C56.6103 15.3087 57.0478 15.6742 57.3736 16.1477C57.6993 16.6174 57.8849 17.1667 57.9304 17.7955H55.9645C55.8849 17.375 55.6955 17.0246 55.3963 16.7443C55.1009 16.4602 54.705 16.3182 54.2088 16.3182C53.7884 16.3182 53.419 16.4318 53.1009 16.6591C52.7827 16.8826 52.5346 17.2045 52.3565 17.625C52.1823 18.0455 52.0952 18.5492 52.0952 19.1364C52.0952 19.7311 52.1823 20.2424 52.3565 20.6705C52.5308 21.0947 52.7751 21.4223 53.0895 21.6534C53.4077 21.8807 53.7808 21.9943 54.2088 21.9943C54.5118 21.9943 54.7827 21.9375 55.0213 21.8239C55.2637 21.7064 55.4664 21.5379 55.6293 21.3182C55.7921 21.0985 55.9039 20.8314 55.9645 20.517H57.9304C57.8812 21.1345 57.6993 21.6818 57.3849 22.1591C57.0705 22.6326 56.6425 23.0038 56.1009 23.2727C55.5592 23.5379 54.9228 23.6705 54.1918 23.6705ZM63.9773 14.7727V16.3636H58.9602V14.7727H63.9773ZM60.1989 12.6818H62.2557V20.875C62.2557 21.1515 62.2973 21.3636 62.3807 21.5114C62.4678 21.6553 62.5814 21.7538 62.7216 21.8068C62.8617 21.8598 63.017 21.8864 63.1875 21.8864C63.3163 21.8864 63.4337 21.8769 63.5398 21.858C63.6496 21.839 63.733 21.822 63.7898 21.8068L64.1364 23.4148C64.0265 23.4527 63.8693 23.4943 63.6648 23.5398C63.464 23.5852 63.2178 23.6117 62.9261 23.6193C62.411 23.6345 61.947 23.5568 61.5341 23.3864C61.1212 23.2121 60.7936 22.9432 60.5511 22.5795C60.3125 22.2159 60.1951 21.7614 60.1989 21.2159V12.6818ZM65.6974 23.5V14.7727H67.7543V23.5H65.6974ZM66.7315 13.5341C66.4058 13.5341 66.1255 13.4261 65.8906 13.2102C65.6558 12.9905 65.5384 12.7273 65.5384 12.4205C65.5384 12.1098 65.6558 11.8466 65.8906 11.6307C66.1255 11.411 66.4058 11.3011 66.7315 11.3011C67.0611 11.3011 67.3414 11.411 67.5724 11.6307C67.8073 11.8466 67.9247 12.1098 67.9247 12.4205C67.9247 12.7273 67.8073 12.9905 67.5724 13.2102C67.3414 13.4261 67.0611 13.5341 66.7315 13.5341ZM77.6648 14.7727L74.5568 23.5H72.2841L69.1761 14.7727H71.3693L73.375 21.2557H73.4659L75.4773 14.7727H77.6648ZM82.6548 23.6705C81.7798 23.6705 81.0241 23.4886 80.3878 23.125C79.7552 22.7576 79.2685 22.2386 78.9276 21.5682C78.5866 20.8939 78.4162 20.1004 78.4162 19.1875C78.4162 18.2898 78.5866 17.5019 78.9276 16.8239C79.2723 16.142 79.7533 15.6117 80.3707 15.233C80.9882 14.8504 81.7135 14.6591 82.5469 14.6591C83.0848 14.6591 83.5923 14.7462 84.0696 14.9205C84.5507 15.0909 84.9749 15.3561 85.3423 15.7159C85.7135 16.0758 86.0052 16.5341 86.2173 17.0909C86.4295 17.6439 86.5355 18.303 86.5355 19.0682V19.6989H79.3821V18.3125H84.5639C84.5601 17.9186 84.4749 17.5682 84.3082 17.2614C84.1416 16.9508 83.9086 16.7064 83.6094 16.5284C83.3139 16.3504 82.9692 16.2614 82.5753 16.2614C82.1548 16.2614 81.7855 16.3636 81.4673 16.5682C81.1491 16.7689 80.901 17.0341 80.723 17.3636C80.5488 17.6894 80.4598 18.0473 80.456 18.4375V19.6477C80.456 20.1553 80.5488 20.5909 80.7344 20.9545C80.92 21.3144 81.1795 21.5909 81.5128 21.7841C81.8461 21.9735 82.2363 22.0682 82.6832 22.0682C82.9825 22.0682 83.2533 22.0265 83.4957 21.9432C83.7382 21.8561 83.9484 21.7292 84.1264 21.5625C84.3045 21.3958 84.4389 21.1894 84.5298 20.9432L86.4503 21.1591C86.3291 21.6667 86.098 22.1098 85.7571 22.4886C85.42 22.8636 84.9882 23.1553 84.4616 23.3636C83.9351 23.5682 83.3329 23.6705 82.6548 23.6705Z" fill="#CECFD2"/></svg>';
    }
    
    function createActionButtonSVG() {
        return '<svg class="go_student_detail" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="#61656C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    
    // Handle click on student row for details view
    function handleStudentDetailView(studentId) {
        console.log('View student details:', studentId);
        // Implementation for viewing student details would go here
        // This could open a new detail page or a modal with the student's information
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
        return 'S' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
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
            const response = await fetch('/add-student', {
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