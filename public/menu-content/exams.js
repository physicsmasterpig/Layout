// exams.js - Handles exam management functionality
(function() {
    // Constants
    const ROWS_PER_PAGE = 10;
    
    // State
    let currentTags = [];
    let availableTags = [];
    let selectedProblems = [];
    let problems = [];
    let exams = [];
    let lectures = [];
    
    // Initialize the page
    async function initPage() {
        console.log("Initializing exams page");
        setupEventListeners();
        setDefaultValues();
        
        try {
            await window.appUtils.showLoadingIndicator();
            await Promise.all([
                loadProblems(),
                loadExams(),
                loadLectures()
            ]);
            updateCounters();
        } catch (error) {
            console.error('Error initializing page:', error);
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        console.log("Setting up event listeners");
        
        // Main tab navigation
        document.querySelectorAll('.main_tab_button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                switchMainTab(tabId);
            });
        });
        
        // Problem upload form
        const addTagBtn = document.getElementById('add-tag-btn');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', addTag);
        }
        
        const tagInput = document.getElementById('tag-input');
        if (tagInput) {
            tagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                }
            });
        }
        
        const problemFile = document.getElementById('problem-file');
        if (problemFile) {
            problemFile.addEventListener('change', handleFileSelect);
        }
        
        const resetProblemBtn = document.getElementById('reset-problem-btn');
        if (resetProblemBtn) {
            resetProblemBtn.addEventListener('click', resetProblemForm);
        }
        
        const uploadProblemBtn = document.getElementById('upload-problem-btn');
        if (uploadProblemBtn) {
            uploadProblemBtn.addEventListener('click', handleProblemUpload);
        }
        
        // Exam maker form
        const filterDifficulty = document.getElementById('filter-difficulty');
        if (filterDifficulty) {
            filterDifficulty.addEventListener('change', filterProblems);
        }
        
        const filterTag = document.getElementById('filter-tag');
        if (filterTag) {
            filterTag.addEventListener('change', filterProblems);
        }
        
        const filterSearch = document.getElementById('filter-search');
        if (filterSearch) {
            filterSearch.addEventListener('input', filterProblems);
        }
        
        const resetExamBtn = document.getElementById('reset-exam-btn');
        if (resetExamBtn) {
            resetExamBtn.addEventListener('click', resetExamForm);
        }
        
        const createExamBtn = document.getElementById('create-exam-btn');
        if (createExamBtn) {
            createExamBtn.addEventListener('click', handleExamCreation);
        }
        
        // Exam overview buttons
        const createNewExamBtn = document.getElementById('create-new-exam-btn');
        if (createNewExamBtn) {
            createNewExamBtn.addEventListener('click', () => switchMainTab('maker'));
        }
        
        // Modals
        const problemPreviewModal = document.getElementById('problem-preview-modal');
        const previewCloseBtn = document.getElementById('preview-close-btn');
        
        if (previewCloseBtn) {
            previewCloseBtn.addEventListener('click', () => {
                if (problemPreviewModal) {
                    problemPreviewModal.classList.remove('show');
                }
            });
        }
        
        if (problemPreviewModal) {
            problemPreviewModal.addEventListener('click', (e) => {
                if (e.target === problemPreviewModal) {
                    problemPreviewModal.classList.remove('show');
                }
            });
        }
        
        const previewModeToggle = document.getElementById('preview-mode-toggle');
        if (previewModeToggle) {
            previewModeToggle.addEventListener('change', togglePreviewMode);
        }
        
        const examDetailsModal = document.getElementById('exam-details-modal');
        const examDetailsCloseBtn = document.getElementById('exam-details-close-btn');
        
        if (examDetailsCloseBtn) {
            examDetailsCloseBtn.addEventListener('click', () => {
                if (examDetailsModal) {
                    examDetailsModal.classList.remove('show');
                }
            });
        }
        
        if (examDetailsModal) {
            examDetailsModal.addEventListener('click', (e) => {
                if (e.target === examDetailsModal) {
                    examDetailsModal.classList.remove('show');
                }
            });
        }
    }
    
    // Switch between main tabs
    function switchMainTab(tabId) {
        console.log(`Switching to tab: ${tabId}`);
        
        // Update tab buttons
        document.querySelectorAll('.main_tab_button').forEach(button => {
            if (button.getAttribute('data-tab') === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update tab contents
        document.querySelectorAll('.main_tab_content').forEach(content => {
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // Special actions for specific tabs
        if (tabId === 'maker') {
            populateAvailableProblems();
            populateLectureDropdown();
        } else if (tabId === 'overview') {
            renderExamsTable();
        }
    }
    
    // Set default values for form fields
    function setDefaultValues() {
        console.log("Setting default values");
        
        // Set today's date for exam date
        const today = new Date();
        const formattedDate = window.appUtils.formatDate(today);
        
        const examDate = document.getElementById('exam-date');
        if (examDate) {
            examDate.value = formattedDate;
        }
        
        // Set default values for exam duration and points
        const examDuration = document.getElementById('exam-duration');
        if (examDuration) {
            examDuration.value = "120";
        }
        
        const examPoints = document.getElementById('exam-points');
        if (examPoints) {
            examPoints.value = "100";
        }
    }
    
    // Handle tag addition
    function addTag() {
        const tagInput = document.getElementById('tag-input');
        const tagsContainer = document.getElementById('tags-container');
        
        if (!tagInput || !tagsContainer) return;
        
        const tagValue = tagInput.value.trim();
        
        if (tagValue && !currentTags.includes(tagValue)) {
            currentTags.push(tagValue);
            renderTags();
            tagInput.value = '';
        }
    }
    
    // Handle tag removal
    function removeTag(tag) {
        currentTags = currentTags.filter(t => t !== tag);
        renderTags();
    }
    
    // Render tags in the container
    function renderTags() {
        const tagsContainer = document.getElementById('tags-container');
        if (!tagsContainer) return;
        
        tagsContainer.innerHTML = '';
        
        currentTags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <span class="tag-remove">✕</span>
            `;
            
            tagElement.querySelector('.tag-remove').addEventListener('click', () => removeTag(tag));
            tagsContainer.appendChild(tagElement);
        });
    }
    
    // Handle file selection for problem upload
    function handleFileSelect(event) {
        const fileNameDisplay = document.getElementById('file-name-display');
        if (!fileNameDisplay) return;
        
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
        } else {
            fileNameDisplay.textContent = 'No file chosen';
        }
    }
    
    // Reset problem upload form
    function resetProblemForm() {
        console.log("Resetting problem form");
        
        const problemTitle = document.getElementById('problem-title');
        const problemDifficulty = document.getElementById('problem-difficulty');
        const problemDescription = document.getElementById('problem-description');
        const problemFile = document.getElementById('problem-file');
        const fileNameDisplay = document.getElementById('file-name-display');
        
        if (problemTitle) problemTitle.value = '';
        if (problemDifficulty) problemDifficulty.value = 'easy';
        if (problemDescription) problemDescription.value = '';
        if (problemFile) problemFile.value = '';
        if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen';
        
        currentTags = [];
        renderTags();
    }
    
    // Handle problem upload
    async function handleProblemUpload() {
        console.log("Handling problem upload");
        
        // Validate form
        if (!validateProblemForm()) {
            return;
        }
        
        const problemTitle = document.getElementById('problem-title');
        const problemDifficulty = document.getElementById('problem-difficulty');
        const problemDescription = document.getElementById('problem-description');
        const problemFile = document.getElementById('problem-file');
        const fileNameDisplay = document.getElementById('file-name-display');
        
        // Ensure required elements exist
        if (!problemTitle || !problemDifficulty || !problemDescription || !problemFile || !fileNameDisplay) {
            console.error('Required form elements not found');
            return;
        }
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Prepare problem data
            const problemData = {
                problem_id: generateProblemId(),
                title: problemTitle.value.trim(),
                difficulty: problemDifficulty.value,
                description: problemDescription.value.trim(),
                tags: currentTags.join(','),
                file: fileNameDisplay.textContent,
                upload_date: new Date().toISOString()
            };
            
            console.log('Problem data to submit:', problemData);
            
            // Handle file upload
            if (problemFile.files.length > 0) {
                const file = problemFile.files[0];
                console.log('Uploading file:', file.name);
                
                // Create FormData for file upload
                const formData = new FormData();
                formData.append('file', file);
                
                // In a real implementation, you would upload the file to Google Drive
                /*
                try {
                    const response = await fetch('/upload-file', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error('File upload failed');
                    }
                    
                    const result = await response.json();
                    console.log('File uploaded to:', result.fileUrl);
                    
                    // Update problem data with file URL
                    problemData.file_url = result.fileUrl;
                } catch (error) {
                    console.error('Error uploading file:', error);
                    throw new Error('File upload failed');
                }
                */
                
                // For now, simulate a delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Simulate successful upload
                console.log('File uploaded successfully');
            }
            
            // In a real implementation, you would send the problem data to the server
            /*
            const response = await fetch('/add-problem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(problemData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to add problem');
            }
            
            const result = await response.json();
            console.log('Server response:', result);
            */
            
            // For now, add to local data
            problems.push(problemData);
            
            // Update available tags
            updateAvailableTags();
            
            // Update UI
            renderProblemsTable();
            updateCounters();
            
            // Reset form
            resetProblemForm();
            
            // Show success message
            alert('Problem uploaded successfully!');
            
        } catch (error) {
            console.error('Error uploading problem:', error);
            alert('Failed to upload problem. Please try again.');
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Validate problem upload form
    function validateProblemForm() {
        const problemTitle = document.getElementById('problem-title');
        const problemDescription = document.getElementById('problem-description');
        const problemFile = document.getElementById('problem-file');
        
        if (!problemTitle || !problemTitle.value.trim()) {
            alert('Please enter a problem title');
            return false;
        }
        
        if (!problemDescription || !problemDescription.value.trim()) {
            alert('Please enter a problem description');
            return false;
        }
        
        if (!problemFile || !problemFile.files.length) {
            alert('Please select a file to upload');
            return false;
        }
        
        return true;
    }
    
    // Generate unique problem ID
    function generateProblemId() {
        return Math.floor(1000000 + Math.random() * 9000000);
    }
    
    // Load problems from the server
    async function loadProblems() {
        console.log("Loading problems");
        
        try {
            // In a real implementation, this would fetch from the server:
            // const data = await window.appUtils.loadList('problem');
            
            // For now, use mock data
            problems = await getMockProblems();
            
            // Update available tags
            updateAvailableTags();
            
            // Render the problems table
            renderProblemsTable();
            
            return problems;
        } catch (error) {
            console.error('Error loading problems:', error);
            throw error;
        }
    }
    
    // Render problems table
    function renderProblemsTable() {
        console.log("Rendering problems table");
        
        const problemsTableBody = document.getElementById('problems-table-body');
        if (!problemsTableBody) return;
        
        problemsTableBody.innerHTML = '';
        
        problems.forEach(problem => {
            const tr = document.createElement('tr');
            
            // Format date for display
            const uploadDate = new Date(problem.upload_date);
            const formattedDate = uploadDate.toLocaleDateString();
            
            // Format tags for display
            const tags = problem.tags.split(',').filter(Boolean);
            const tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
            
            tr.innerHTML = `
                <td>${problem.problem_id}</td>
                <td>${problem.title}</td>
                <td>${problem.difficulty}</td>
                <td>${tagsHtml}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="problem-preview" data-id="${problem.problem_id}">View</button>
                </td>
            `;
            
            // Add event listener for preview button
            tr.querySelector('.problem-preview').addEventListener('click', () => {
                showProblemPreview(problem);
            });
            
            problemsTableBody.appendChild(tr);
        });
        
        // Initialize table pagination
        window.appUtils.setTable(ROWS_PER_PAGE);
    }
    
    // Update available tags from all problems
    function updateAvailableTags() {
        const tagSet = new Set();
        
        problems.forEach(problem => {
            const tags = problem.tags.split(',').filter(Boolean);
            tags.forEach(tag => tagSet.add(tag));
        });
        
        availableTags = Array.from(tagSet);
        
        // Update filter dropdown
        const filterTag = document.getElementById('filter-tag');
        if (filterTag) {
            // Keep the "All Tags" option
            filterTag.innerHTML = '<option value="all">All Tags</option>';
            
            // Add each tag as an option
            availableTags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                filterTag.appendChild(option);
            });
        }
    }
    
    // Show problem preview modal
    function showProblemPreview(problem) {
        console.log(`Showing preview for problem: ${problem.problem_id}`);
        
        const problemPreviewModal = document.getElementById('problem-preview-modal');
        const problemPreviewContainer = document.getElementById('problem-preview-container');
        
        if (!problemPreviewModal || !problemPreviewContainer) return;
        
        problemPreviewContainer.innerHTML = `
            <h3>${problem.title}</h3>
            <p class="preview-problem">${problem.description}</p>
            
            <div class="preview-file-info">
                <p>Attached file: ${problem.file}</p>
                <p>This would display the actual file content (PDF, image, etc.) in a real implementation.</p>
            </div>
            
            <div class="preview-metadata">
                <p><strong>Difficulty:</strong> ${problem.difficulty}</p>
                <p><strong>Tags:</strong> ${problem.tags}</p>
                <p><strong>Uploaded:</strong> ${new Date(problem.upload_date).toLocaleDateString()}</p>
            </div>
        `;
        
        // Show the modal
        problemPreviewModal.classList.add('show');
    }
    
    // Toggle preview mode (dark/light)
    function togglePreviewMode() {
        const previewModeToggle = document.getElementById('preview-mode-toggle');
        const problemPreviewContainer = document.getElementById('problem-preview-container');
        
        if (!previewModeToggle || !problemPreviewContainer) return;
        
        if (previewModeToggle.checked) {
            problemPreviewContainer.classList.add('preview-dark');
        } else {
            problemPreviewContainer.classList.remove('preview-dark');
        }
    }
    
    // Populate available problems in the exam maker tab
    function populateAvailableProblems() {
        console.log("Populating available problems");
        
        const availableProblems = document.getElementById('available-problems');
        if (!availableProblems) return;
        
        availableProblems.innerHTML = '';
        
        if (problems.length === 0) {
            availableProblems.innerHTML = '<div class="no-problems-message">No problems available. Please upload problems first.</div>';
            return;
        }
        
        // Apply filters
        const filteredProblems = filterProblemsForDisplay();
        
        if (filteredProblems.length === 0) {
            availableProblems.innerHTML = '<div class="no-problems-message">No problems match your filter criteria.</div>';
            return;
        }
        
        filteredProblems.forEach(problem => {
            const isSelected = selectedProblems.some(p => p.problem_id === problem.problem_id);
            
            const problemElement = document.createElement('div');
            problemElement.className = `problem-item${isSelected ? ' selected' : ''}`;
            problemElement.dataset.id = problem.problem_id;
            
            problemElement.innerHTML = `
                <div class="problem-info">
                    <div class="problem-title">${problem.title}</div>
                    <div class="problem-details">
                        Difficulty: ${problem.difficulty} | Tags: ${problem.tags}
                    </div>
                </div>
                <button class="problem-preview" data-id="${problem.problem_id}">Preview</button>
            `;
            
            // Add event listener for selecting the problem
            problemElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('problem-preview')) {
                    toggleProblemSelection(problem);
                }
            });
            
            // Add event listener for preview button
            problemElement.querySelector('.problem-preview').addEventListener('click', (e) => {
                e.stopPropagation();
                showProblemPreview(problem);
            });
            
            availableProblems.appendChild(problemElement);
        });
    }
    
    // Filter problems based on user selection
    function filterProblems() {
        populateAvailableProblems();
    }
    
    // Apply filters and return filtered problems
    function filterProblemsForDisplay() {
        const filterDifficulty = document.getElementById('filter-difficulty');
        const filterTag = document.getElementById('filter-tag');
        const filterSearch = document.getElementById('filter-search');
        
        const difficultyFilter = filterDifficulty ? filterDifficulty.value : 'all';
        const tagFilter = filterTag ? filterTag.value : 'all';
        const searchFilter = filterSearch ? filterSearch.value.toLowerCase() : '';
        
        return problems.filter(problem => {
            // Difficulty filter
            if (difficultyFilter !== 'all' && problem.difficulty !== difficultyFilter) {
                return false;
            }
            
            // Tag filter
            if (tagFilter !== 'all' && !problem.tags.includes(tagFilter)) {
                return false;
            }
            
            // Search filter
            if (searchFilter && !problem.title.toLowerCase().includes(searchFilter)) {
                return false;
            }
            
            return true;
        });
    }
    
    // Toggle problem selection for exam
    function toggleProblemSelection(problem) {
        console.log(`Toggling selection for problem: ${problem.problem_id}`);
        
        const index = selectedProblems.findIndex(p => p.problem_id === problem.problem_id);
        
        if (index === -1) {
            // Add to selected problems
            selectedProblems.push(problem);
        } else {
            // Remove from selected problems
            selectedProblems.splice(index, 1);
        }
        
        // Update UI
        updateSelectedProblemsList();
        populateAvailableProblems();
    }
    
    // Update the selected problems list
    function updateSelectedProblemsList() {
        const selectedProblemsList = document.getElementById('selected-problems-list');
        const selectedProblemsCount = document.getElementById('selected-problems-count');
        
        if (!selectedProblemsList || !selectedProblemsCount) return;
        
        selectedProblemsList.innerHTML = '';
        selectedProblemsCount.textContent = selectedProblems.length;
        
        if (selectedProblems.length === 0) {
            selectedProblemsList.innerHTML = '<div class="no-problems-message">No problems selected yet</div>';
            return;
        }
        
        selectedProblems.forEach(problem => {
            const problemElement = document.createElement('div');
            problemElement.className = 'selected-problem-item';
            
            problemElement.innerHTML = `
                <div class="problem-info">
                    <div class="problem-title">${problem.title}</div>
                    <div class="problem-details">
                        Difficulty: ${problem.difficulty}
                    </div>
                </div>
                <button class="problem-remove" data-id="${problem.problem_id}">Remove</button>
            `;
            
            // Add event listener for remove button
            problemElement.querySelector('.problem-remove').addEventListener('click', () => {
                toggleProblemSelection(problem);
            });
            
            selectedProblemsList.appendChild(problemElement);
        });
    }
    
    // Load lectures from the server
    async function loadLectures() {
        console.log("Loading lectures");
        
        try {
            // In a real implementation, this would fetch from the server:
            // const data = await window.appUtils.loadList('lecture');
            
            // For now, use mock data
            lectures = await getMockLectures();
            return lectures;
        } catch (error) {
            console.error('Error loading lectures:', error);
            throw error;
        }
    }
    
    // Populate lecture dropdown in exam maker
    function populateLectureDropdown() {
        console.log("Populating lecture dropdown");
        
        const assignLecture = document.getElementById('assign-lecture');
        if (!assignLecture) return;
        
        assignLecture.innerHTML = '<option value="">Select a lecture...</option>';
        
        lectures.forEach(lecture => {
            const option = document.createElement('option');
            option.value = lecture.lecture_id;
            
            const formattedDate = new Date(lecture.lecture_date).toLocaleDateString();
            option.textContent = `${formattedDate} - ${lecture.lecture_topic} (Class: ${lecture.class_id})`;
            
            assignLecture.appendChild(option);
        });
    }
    
    // Reset exam maker form
    function resetExamForm() {
        console.log("Resetting exam form");
        
        const examTitle = document.getElementById('exam-title');
        const examDate = document.getElementById('exam-date');
        const examDuration = document.getElementById('exam-duration');
        const examPoints = document.getElementById('exam-points');
        const assignLecture = document.getElementById('assign-lecture');
        const examInstructions = document.getElementById('exam-instructions');
        
        if (examTitle) examTitle.value = '';
        if (examDate) examDate.value = window.appUtils.formatDate(new Date());
        if (examDuration) examDuration.value = '120';
        if (examPoints) examPoints.value = '100';
        if (assignLecture) assignLecture.value = '';
        if (examInstructions) examInstructions.value = '';
        
        // Clear selected problems
        selectedProblems = [];
        updateSelectedProblemsList();
        populateAvailableProblems();
    }
    
    // Handle exam creation
    async function handleExamCreation() {
        console.log("Handling exam creation");
        
        // Validate form
        if (!validateExamForm()) {
            return;
        }
        
        const examTitle = document.getElementById('exam-title');
        const examDate = document.getElementById('exam-date');
        const examDuration = document.getElementById('exam-duration');
        const examPoints = document.getElementById('exam-points');
        const assignLecture = document.getElementById('assign-lecture');
        const examInstructions = document.getElementById('exam-instructions');
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Prepare exam data
            const examData = {
                exam_id: generateExamId(),
                title: examTitle.value.trim(),
                date: examDate.value,
                duration: parseInt(examDuration.value),
                total_points: parseInt(examPoints.value),
                lecture_id: assignLecture.value,
                instructions: examInstructions.value.trim(),
                problems: selectedProblems.map(p => p.problem_id).join(','),
                status: new Date(examDate.value) > new Date() ? 'scheduled' : 'in-progress',
                created_at: new Date().toISOString()
            };
            
            console.log('Exam data to submit:', examData);
            
            // In a real implementation, you would send the exam data to the server
            /*
            const response = await fetch('/add-exam', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(examData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to add exam');
            }
            
            const result = await response.json();
            console.log('Server response:', result);
            */
            
            // For now, add to local data
            exams.push(examData);
            
            // Update UI
            updateCounters();
            
            // Reset form
            resetExamForm();
            
            // Show success message
            alert('Exam created successfully!');
            
            // Switch to overview tab
            switchMainTab('overview');
            
        } catch (error) {
            console.error('Error creating exam:', error);
            alert('Failed to create exam. Please try again.');
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Validate exam form
    function validateExamForm() {
        const examTitle = document.getElementById('exam-title');
        const examDate = document.getElementById('exam-date');
        const examDuration = document.getElementById('exam-duration');
        const examPoints = document.getElementById('exam-points');
        
        if (!examTitle || !examTitle.value.trim()) {
            alert('Please enter an exam title');
            return false;
        }
        
        if (!examDate || !examDate.value) {
            alert('Please select an exam date');
            return false;
        }
        
        if (!examDuration || !examDuration.value || parseInt(examDuration.value) <= 0) {
            alert('Please enter a valid duration');
            return false;
        }
        
        if (!examPoints || !examPoints.value || parseInt(examPoints.value) <= 0) {
            alert('Please enter valid total points');
            return false;
        }
        
        if (selectedProblems.length === 0) {
            alert('Please select at least one problem for the exam');
            return false;
        }
        
        return true;
    }
    
    // Generate unique exam ID
    function generateExamId() {
        return Math.floor(1000000 + Math.random() * 9000000);
    }
    
    // Load exams from the server
    async function loadExams() {
        console.log("Loading exams");
        
        try {
            // In a real implementation, this would fetch from the server:
            // const data = await window.appUtils.loadList('exam');
            
            // For now, use mock data
            exams = await getMockExams();
            
            // Render the exams table
            renderExamsTable();
            
            return exams;
        } catch (error) {
            console.error('Error loading exams:', error);
            throw error;
        }
    }
    
    // Render exams table
    function renderExamsTable() {
        console.log("Rendering exams table");
        
        const examsTableBody = document.getElementById('exams-table-body');
        if (!examsTableBody) return;
        
        examsTableBody.innerHTML = '';
        
        exams.forEach(exam => {
            const tr = document.createElement('tr');
            
            // Format date for display
            const examDate = new Date(exam.date);
            const formattedDate = examDate.toLocaleDateString();
            
            // Find lecture details
            const lecture = lectures.find(l => l.lecture_id == exam.lecture_id);
            const lectureName = lecture ? lecture.lecture_topic : 'Not assigned';
            
            // Count problems
            const problemCount = exam.problems ? exam.problems.split(',').length : 0;
            
            //// Determine status badge
            let statusBadge = '';
            if (exam.status === 'scheduled') {
                statusBadge = `<span class="status-badge badge-scheduled">Scheduled</span>`;
            } else if (exam.status === 'in-progress') {
                statusBadge = `<span class="status-badge badge-in-progress">In Progress</span>`;
            } else if (exam.status === 'completed') {
                statusBadge = `<span class="status-badge badge-completed">Completed</span>`;
            }
            
            tr.innerHTML = `
                <td>${exam.exam_id}</td>
                <td>${exam.title}</td>
                <td>${formattedDate}</td>
                <td>${lectureName}</td>
                <td>${exam.duration} min</td>
                <td>${problemCount}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="problem-preview" data-id="${exam.exam_id}">Details</button>
                </td>
            `;
            
            // Add event listener for details button
            tr.querySelector('.problem-preview').addEventListener('click', () => {
                showExamDetails(exam);
            });
            
            examsTableBody.appendChild(tr);
        });
        
        // Initialize table pagination
        window.appUtils.setTable(ROWS_PER_PAGE);
    }
    
    // Show exam details modal
    function showExamDetails(exam) {
        console.log(`Showing details for exam: ${exam.exam_id}`);
        
        const examDetailsModal = document.getElementById('exam-details-modal');
        const examDetailsContent = document.getElementById('exam-details-content');
        
        if (!examDetailsModal || !examDetailsContent) return;
        
        // Find lecture details
        const lecture = lectures.find(l => l.lecture_id == exam.lecture_id);
        const lectureName = lecture ? lecture.lecture_topic : 'Not assigned';
        
        // Get problem details
        const problemIds = exam.problems ? exam.problems.split(',') : [];
        const examProblems = problemIds.map(id => {
            return problems.find(p => p.problem_id == id) || { title: 'Unknown Problem', difficulty: 'unknown' };
        });
        
        // Format problem list
        const problemListHtml = examProblems.map((problem, index) => `
            <div class="preview-problem-item">
                <strong>${index + 1}. ${problem.title}</strong> - ${problem.difficulty}
            </div>
        `).join('');
        
        examDetailsContent.innerHTML = `
            <div class="exam-detail-info">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Exam ID</label>
                        <div class="preview-field">${exam.exam_id}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <div class="preview-field">${exam.status}</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <div class="preview-field">${exam.title}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <div class="preview-field">${new Date(exam.date).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Duration</label>
                        <div class="preview-field">${exam.duration} minutes</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Total Points</label>
                        <div class="preview-field">${exam.total_points} points</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Assigned Lecture</label>
                    <div class="preview-field">${lectureName}</div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Instructions</label>
                    <div class="preview-field">${exam.instructions || 'No specific instructions'}</div>
                </div>
            </div>
            
            <div class="divider"></div>
            
            <div class="exam-problems">
                <h3>Problems (${examProblems.length})</h3>
                <div class="exam-problems-list">
                    ${problemListHtml || '<div class="no-problems-message">No problems added to this exam</div>'}
                </div>
            </div>
        `;
        
        // Show the modal
        examDetailsModal.classList.add('show');
    }
    
    // Update counters in the page header
    function updateCounters() {
        const totalExamsCount = document.getElementById('total-exams-count');
        const totalProblemsCount = document.getElementById('total-problems-count');
        const upcomingExamsCount = document.getElementById('upcoming-exams-count');
        
        if (totalExamsCount) {
            totalExamsCount.textContent = exams.length;
        }
        
        if (totalProblemsCount) {
            totalProblemsCount.textContent = problems.length;
        }
        
        if (upcomingExamsCount) {
            const today = new Date();
            const upcoming = exams.filter(exam => new Date(exam.date) > today).length;
            upcomingExamsCount.textContent = upcoming;
        }
    }
    
    // Mock data functions
    
    // Get mock problems data
    async function getMockProblems() {
        console.log("Fetching mock problems data");
        
        // Simulate server delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return [
            {
                problem_id: 1001001,
                title: "Linear Equations",
                difficulty: "easy",
                description: "Solve the following linear equation: 3x + 5 = 14",
                tags: "algebra,equations,linear",
                file: "linear_equations.pdf",
                upload_date: "2025-02-05T08:30:00Z"
            },
            {
                problem_id: 1001002,
                title: "Quadratic Formula",
                difficulty: "medium",
                description: "Solve the quadratic equation using the quadratic formula: 2x² - 7x + 3 = 0",
                tags: "algebra,equations,quadratic",
                file: "quadratic_formula.pdf",
                upload_date: "2025-02-10T09:45:00Z"
            },
            {
                problem_id: 1001003,
                title: "Definite Integrals",
                difficulty: "hard",
                description: "Evaluate the definite integral: ∫(0,1) x² dx",
                tags: "calculus,integration",
                file: "definite_integrals.pdf",
                upload_date: "2025-02-15T14:20:00Z"
            },
            {
                problem_id: 1001004,
                title: "Pythagorean Theorem",
                difficulty: "easy",
                description: "Find the length of the hypotenuse in a right triangle with legs measuring 3 and 4 units.",
                tags: "geometry,trigonometry",
                file: "pythagorean_theorem.pdf",
                upload_date: "2025-02-20T11:15:00Z"
            },
            {
                problem_id: 1001005,
                title: "Matrix Multiplication",
                difficulty: "medium",
                description: "Multiply the following matrices: A = [[1, 2], [3, 4]] and B = [[5, 6], [7, 8]]",
                tags: "linear algebra,matrices",
                file: "matrix_multiplication.pdf",
                upload_date: "2025-02-25T16:30:00Z"
            }
        ];
    }
    
    // Get mock exams data
    async function getMockExams() {
        console.log("Fetching mock exams data");
        
        // Simulate server delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return [
            {
                exam_id: 2001001,
                title: "Midterm Algebra Exam",
                date: "2025-04-15T09:00:00Z",
                duration: 120,
                total_points: 100,
                lecture_id: 3001002,
                instructions: "Answer all questions. Show your work for partial credit.",
                problems: "1001001,1001002,1001004",
                status: "scheduled",
                created_at: "2025-03-01T10:30:00Z"
            },
            {
                exam_id: 2001002,
                title: "Advanced Mathematics Quiz",
                date: "2025-04-05T14:00:00Z",
                duration: 60,
                total_points: 50,
                lecture_id: 3001001,
                instructions: "Choose 3 out of 5 problems to solve.",
                problems: "1001003,1001005",
                status: "scheduled",
                created_at: "2025-03-05T11:45:00Z"
            },
            {
                exam_id: 2001003,
                title: "Geometry Test",
                date: "2025-03-10T10:00:00Z",
                duration: 90,
                total_points: 75,
                lecture_id: 3001003,
                instructions: "No calculators allowed.",
                problems: "1001001,1001004",
                status: "completed",
                created_at: "2025-02-20T09:30:00Z"
            }
        ];
    }
    
    // Get mock lectures data
    async function getMockLectures() {
        console.log("Fetching mock lectures data");
        
        // Simulate server delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return [
            {
                lecture_id: 3001001,
                class_id: 4001001,
                lecture_date: "2025-03-05",
                lecture_time: "14:00",
                lecture_topic: "Introduction to Calculus"
            },
            {
                lecture_id: 3001002,
                class_id: 4001001,
                lecture_date: "2025-03-12",
                lecture_time: "14:00",
                lecture_topic: "Derivatives and Applications"
            },
            {
                lecture_id: 3001003,
                class_id: 4001002,
                lecture_date: "2025-03-07",
                lecture_time: "10:00",
                lecture_topic: "Geometry Fundamentals"
            },
            {
                lecture_id: 3001004,
                class_id: 4001002,
                lecture_date: "2025-03-14",
                lecture_time: "10:00",
                lecture_topic: "Triangles and Circles"
            },
            {
                lecture_id: 3001005,
                class_id: 4001003,
                lecture_date: "2025-03-09",
                lecture_time: "15:30",
                lecture_topic: "Linear Algebra Basics"
            }
        ];
    }
    
    // Initialize the page when the script loads
    initPage();
})();