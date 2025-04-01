// exams.js - Handles exam management functionality
(function() {
    // Constants
    const ROWS_PER_PAGE = 10;
    
    // DOM Element References
    const elements = {
        // Tab Navigation
        tabButtons: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
        
        // Overview counters
        totalExamsCount: document.getElementById('total-exams-count'),
        totalProblemsCount: document.getElementById('total-problems-count'),
        activeExamsCount: document.getElementById('active-exams-count'),
        
        // Exam Maker Tab
        examTitle: document.getElementById('exam-title'),
        examClass: document.getElementById('exam-class'),
        examDate: document.getElementById('exam-date'),
        examDescription: document.getElementById('exam-description'),
        examTotalPoints: document.getElementById('exam-total-points'),
        examStatus: document.getElementById('exam-status'),
        problemSearchInput: document.getElementById('problem-search-input'),
        problemFilterDifficulty: document.getElementById('problem-filter-difficulty'),
        problemFilterCategory: document.getElementById('problem-filter-category'),
        problemsList: document.getElementById('problems-list'),
        saveExamBtn: document.getElementById('save-exam-btn'),
        cancelExamBtn: document.getElementById('cancel-exam-btn'),
        
        // Upload Problem Tab
        problemTitle: document.getElementById('problem-title'),
        problemDifficulty: document.getElementById('problem-difficulty'),
        problemStatement: document.getElementById('problem-statement'),
        problemSolution: document.getElementById('problem-solution'),
        fileDropArea: document.getElementById('file-drop-area'),
        problemFileInput: document.getElementById('problem-file-input'),
        filePreview: document.getElementById('file-preview'),
        fileName: document.getElementById('file-name'),
        fileSize: document.getElementById('file-size'),
        removeFileBtn: document.getElementById('remove-file-btn'),
        downloadTemplateBtn: document.getElementById('download-template-btn'),
        saveProblemBtn: document.getElementById('save-problem-btn'),
        cancelProblemBtn: document.getElementById('cancel-problem-btn'),
        
        // Overview Tab
        examsTableBody: document.getElementById('exams-table-body'),
        createExamBtn: document.getElementById('create-exam-btn'),
        prevPageBtn: document.getElementById('prev-page-btn'),
        nextPageBtn: document.getElementById('next-page-btn'),
        startItem: document.getElementById('start-item'),
        endItem: document.getElementById('end-item'),
        totalItems: document.getElementById('total-items')
    };
    
    // State
    let currentPage = 1;
    let selectedProblems = [];
    let allProblems = [];
    let allExams = [];
    let filteredProblems = [];
    let selectedFile = null;
    let currentEditExamId = null; // Keep track of exam being edited
    
    // Initialize the page
    async function initPage() {
        setupEventListeners();
        setDefaultDate();
        await loadData();
        updateCounts();
        renderProblemsList();
        renderExamsTable();
        
        // Initialize default values
        if (elements.examTotalPoints && !elements.examTotalPoints.value) {
            elements.examTotalPoints.value = 100;
        }
    }
    
    // Handle tab navigation
    function handleTabClick(e) {
        // Remove active class from all tabs
        elements.tabButtons.forEach(btn => btn.classList.remove('active'));
        elements.tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab
        e.target.classList.add('active');
        
        // Show the corresponding content
        const tabId = e.target.getAttribute('data-tab') + '-tab';
        const contentElement = document.getElementById(tabId);
        if (contentElement) {
            contentElement.classList.add('active');
        }
    }
    
    // Set default date to today
    function setDefaultDate() {
        if (elements.examDate) {
            const today = new Date();
            const formattedDate = formatDateForInput(today);
            elements.examDate.value = formattedDate;
        }
    }
    
    // Format date for input field (YYYY-MM-DD)
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Format date for display (Month DD, YYYY)
    function formatDateForDisplay(dateStr) {
        if (!dateStr) return 'Not set';
        
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateStr || 'Not set';
        }
    }
    
    // Capitalize first letter of a string
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Generate a unique problem ID
    function generateProblemId() {
        // For consistent format with your database
        return `P${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
    
    // Generate a unique exam ID
    function generateExamId() {
        // For consistent format with your database
        return `E${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        // Tab Navigation
        if (elements.tabButtons) {
            elements.tabButtons.forEach(button => {
                button.addEventListener('click', handleTabClick);
            });
        }
        
        // Exam Maker Events
        if (elements.saveExamBtn) {
            elements.saveExamBtn.addEventListener('click', handleSaveExam);
        }
        
        if (elements.cancelExamBtn) {
            elements.cancelExamBtn.addEventListener('click', resetExamForm);
        }
        
        if (elements.problemSearchInput) {
            elements.problemSearchInput.addEventListener('input', filterProblems);
        }
        
        if (elements.problemFilterDifficulty) {
            elements.problemFilterDifficulty.addEventListener('change', filterProblems);
        }
        
        if (elements.problemFilterCategory) {
            elements.problemFilterCategory.addEventListener('change', filterProblems);
        }
        
        // Upload Problem Events
        if (elements.problemFileInput) {
            elements.problemFileInput.addEventListener('change', handleFileSelect);
        }
        
        if (elements.fileDropArea) {
            elements.fileDropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                elements.fileDropArea.style.borderColor = '#7F56D9';
            });
            
            elements.fileDropArea.addEventListener('dragleave', () => {
                elements.fileDropArea.style.borderColor = '#22262F';
            });
            
            elements.fileDropArea.addEventListener('drop', handleFileDrop);
        }
        
        if (elements.removeFileBtn) {
            elements.removeFileBtn.addEventListener('click', removeSelectedFile);
        }
        
        if (elements.downloadTemplateBtn) {
            elements.downloadTemplateBtn.addEventListener('click', downloadProblemTemplate);
        }
        
        if (elements.saveProblemBtn) {
            elements.saveProblemBtn.addEventListener('click', handleSaveProblem);
        }
        
        if (elements.cancelProblemBtn) {
            elements.cancelProblemBtn.addEventListener('click', resetProblemForm);
        }
        
        // Overview Tab Events
        if (elements.createExamBtn) {
            elements.createExamBtn.addEventListener('click', navigateToExamMaker);
        }
        
        if (elements.prevPageBtn) {
            elements.prevPageBtn.addEventListener('click', goToPreviousPage);
        }
        
        if (elements.nextPageBtn) {
            elements.nextPageBtn.addEventListener('click', goToNextPage);
        }
        
        // Set up click event for the dynamically created problem checkboxes
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('problem-checkbox')) {
                handleProblemSelection(e.target);
            }
        });
        
        // Set up click event for the dynamically created preview buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-preview')) {
                const problemId = e.target.closest('.problem-item').dataset.id;
                showProblemPreview(problemId);
            }
        });
        
        // Set up click event for the dynamically created exam actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-edit-exam')) {
                const examId = e.target.closest('tr').dataset.id;
                editExam(examId);
            } else if (e.target.classList.contains('btn-view-exam')) {
                const examId = e.target.closest('tr').dataset.id;
                viewExam(examId);
            }
        });
    }
    
    // Load all necessary data
    async function loadData() {
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Load problems
            await loadProblems();
            
            // Load exams
            await loadExams();
            
            // Load classes for the dropdown
            await loadClasses();
            
        } catch (error) {
            console.error("Error loading data:", error);
            alert("Failed to load data. Please try again.");
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Load problems from server
    async function loadProblems() {
        try {
            // Fetch problems from server
            const problems = await window.appUtils.loadList('problem');
            
            // Format problem data
            allProblems = problems.map(problem => ({
                id: problem[0],
                title: problem[1],
                difficulty: problem[2] || 'medium',
                category: 'math', // Default category if not available
                statement: '',
                solution: ''
            }));
            
            // Initialize filtered problems to all problems
            filteredProblems = [...allProblems];
            
        } catch (error) {
            console.error("Error loading problems:", error);
            throw error;
        }
    }
    
    // Load exams from server
    async function loadExams() {
        try {
            // Fetch exams from server
            const exams = await window.appUtils.loadList('exam');
            
            // Load exam problems for each exam
            const examProblems = await window.appUtils.loadList('exam_problem');
            
            // Format exam data
            allExams = exams.map(exam => {
                // Count problems for this exam
                const problemCount = examProblems.filter(ep => ep[1] === exam[0]).length;
                
                return {
                    id: exam[0],
                    title: exam[1] || 'Untitled Exam',
                    class_id: '',
                    class_name: 'Loading...',
                    date: exam[2] || '',
                    problemCount,
                    status: 'active' // Default status
                };
            });
            
            // Load class names for each exam
            await loadClassNames();
            
        } catch (error) {
            console.error("Error loading exams:", error);
            throw error;
        }
    }
    
    // Load class names for exams
    async function loadClassNames() {
        try {
            // Fetch classes from server
            const classes = await window.appUtils.loadList('class');
            
            // Update exam objects with class names
            allExams = allExams.map(exam => {
                const classObj = classes.find(c => c[0] === exam.class_id);
                return {
                    ...exam,
                    class_name: classObj ? `${classObj[1]} - ${classObj[4]}기` : 'Unknown Class'
                };
            });
            
        } catch (error) {
            console.error("Error loading class names:", error);
        }
    }
    
    // Load classes for dropdown
    async function loadClasses() {
        try {
            // Fetch active classes from server
            const classes = await window.appUtils.loadList('class');
            const activeClasses = classes.filter(c => c[6] === 'active');
            
            // Populate class dropdown
            if (elements.examClass) {
                elements.examClass.innerHTML = '<option value="">Select a class</option>';
                
                activeClasses.forEach(classData => {
                    const option = document.createElement('option');
                    option.value = classData[0];
                    option.textContent = `${classData[1]} - ${classData[4]}기`;
                    elements.examClass.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error("Error loading classes:", error);
        }
    }
    
    // Update overview counts
    function updateCounts() {
        if (elements.totalExamsCount) {
            elements.totalExamsCount.textContent = allExams.length;
        }
        
        if (elements.totalProblemsCount) {
            elements.totalProblemsCount.textContent = allProblems.length;
        }
        
        if (elements.activeExamsCount) {
            const activeCount = allExams.filter(exam => exam.status === 'active').length;
            elements.activeExamsCount.textContent = activeCount;
        }
    }
    
    // Render problems list
    function renderProblemsList() {
        if (!elements.problemsList) return;
        
        elements.problemsList.innerHTML = '';
        
        if (filteredProblems.length === 0) {
            elements.problemsList.innerHTML = '<div class="empty-state">No problems found. Try adjusting your filters.</div>';
            return;
        }
        
        filteredProblems.forEach(problem => {
            const isSelected = selectedProblems.find(p => p.id === problem.id);
            
            const problemItem = document.createElement('div');
            problemItem.className = 'problem-item';
            problemItem.dataset.id = problem.id;
            
            problemItem.innerHTML = `
                <div class="problem-info">
                    <input type="checkbox" class="problem-checkbox" ${isSelected ? 'checked' : ''}>
                    <div>
                        <div class="problem-name">${problem.title}</div>
                        <div class="problem-id">#${problem.id}</div>
                    </div>
                </div>
                <div class="problem-actions">
                    <span class="problem-difficulty difficulty-${problem.difficulty}">${capitalizeFirstLetter(problem.difficulty)}</span>
                    <button class="btn btn-secondary btn-sm btn-preview">Preview</button>
                </div>
            `;
            
            elements.problemsList.appendChild(problemItem);
        });
    }
    
    // Render exams table
    function renderExamsTable() {
        if (!elements.examsTableBody) return;
        
        elements.examsTableBody.innerHTML = '';
        
        if (allExams.length === 0) {
            elements.examsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No exams found.</td></tr>';
            return;
        }
        
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        const endIndex = Math.min(startIndex + ROWS_PER_PAGE, allExams.length);
        const examsToShow = allExams.slice(startIndex, endIndex);
        
        examsToShow.forEach(exam => {
            const tr = document.createElement('tr');
            tr.dataset.id = exam.id;
            
            tr.innerHTML = `
                <td>${exam.id}</td>
                <td>${exam.title}</td>
                <td>${exam.class_name}</td>
                <td>${exam.date ? formatDateForDisplay(exam.date) : 'Not set'}</td>
                <td>${exam.problemCount}</td>
                <td><span class="status-badge badge-${exam.status}">${capitalizeFirstLetter(exam.status)}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm btn-edit-exam">Edit</button>
                    <button class="btn btn-secondary btn-sm btn-view-exam">View</button>
                </td>
            `;
            
            elements.examsTableBody.appendChild(tr);
        });
        
        // Update pagination info
        if (elements.startItem) {
            elements.startItem.textContent = allExams.length > 0 ? startIndex + 1 : 0;
        }
        
        if (elements.endItem) {
            elements.endItem.textContent = endIndex;
        }
        
        if (elements.totalItems) {
            elements.totalItems.textContent = allExams.length;
        }
        
        // Update pagination buttons
        updatePaginationButtons();
    }
    
    // Update pagination buttons state
    function updatePaginationButtons() {
        const totalPages = Math.ceil(allExams.length / ROWS_PER_PAGE);
        
        if (elements.prevPageBtn) {
            elements.prevPageBtn.disabled = currentPage === 1;
        }
        
        if (elements.nextPageBtn) {
            elements.nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
        }
        
        // Update pagination page buttons
        const paginationContainer = document.querySelector('.pagination');
        if (paginationContainer) {
            // Keep prev and next buttons
            const prevBtn = elements.prevPageBtn;
            const nextBtn = elements.nextPageBtn;
            
            // Clear existing page buttons
            paginationContainer.innerHTML = '';
            
            // Add prev button back
            if (prevBtn) {
                paginationContainer.appendChild(prevBtn);
            }
            
            // Add page buttons
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = 'page-btn' + (i === currentPage ? ' active' : '');
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    renderExamsTable();
                });
                
                paginationContainer.appendChild(pageBtn);
            }
            
            // Add next button back
            if (nextBtn) {
                paginationContainer.appendChild(nextBtn);
            }
        }
    }
    
    // Navigate to previous page
    function goToPreviousPage() {
        if (currentPage > 1) {
            currentPage--;
            renderExamsTable();
        }
    }
    
    // Navigate to next page
    function goToNextPage() {
        const totalPages = Math.ceil(allExams.length / ROWS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderExamsTable();
        }
    }
    
    // Navigate to exam maker
    function navigateToExamMaker() {
        // Reset current edit exam ID
        currentEditExamId = null;
        
        // Reset form
        resetExamForm();
        
        // Switch to exam maker tab
        const examMakerTab = document.querySelector('.tab-button[data-tab="exam-maker"]');
        if (examMakerTab) {
            examMakerTab.click();
        }
    }
    
    // Filter problems based on search input and filters
    function filterProblems() {
        if (!elements.problemSearchInput) return;
        
        const searchTerm = elements.problemSearchInput.value.toLowerCase();
        const difficultyFilter = elements.problemFilterDifficulty ? elements.problemFilterDifficulty.value : '';
        const categoryFilter = elements.problemFilterCategory ? elements.problemFilterCategory.value : '';
        
        filteredProblems = allProblems.filter(problem => {
            const matchesSearch = problem.title.toLowerCase().includes(searchTerm);
            const matchesDifficulty = !difficultyFilter || problem.difficulty === difficultyFilter;
            const matchesCategory = !categoryFilter || problem.category === categoryFilter;
            
            return matchesSearch && matchesDifficulty && matchesCategory;
        });
        
        renderProblemsList();
    }
    
    // Handle problem selection
    function handleProblemSelection(checkbox) {
        const problemItem = checkbox.closest('.problem-item');
        if (!problemItem) return;
        
        const problemId = problemItem.dataset.id;
        
        if (checkbox.checked) {
            // Add to selected if not already included
            if (!selectedProblems.find(p => p.id === problemId)) {
                const problem = allProblems.find(p => p.id === problemId);
                if (problem) {
                    selectedProblems.push(problem);
                }
            }
        } else {
            // Remove from selected
            selectedProblems = selectedProblems.filter(p => p.id !== problemId);
        }
    }
    
    // Show problem preview
    function showProblemPreview(problemId) {
        const problem = allProblems.find(p => p.id === problemId);
        
        if (!problem) {
            alert('Problem not found');
            return;
        }
        
        // Create a simple modal to preview the problem
        const previewModal = document.createElement('div');
        previewModal.className = 'modal-overlay show';
        
        previewModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h2>${problem.title}</h2>
                <div style="margin-bottom: 16px;">
                    <span class="problem-difficulty difficulty-${problem.difficulty}">${capitalizeFirstLetter(problem.difficulty)}</span>
                </div>
                <div style="margin-bottom: 16px;">
                    <h3>Problem Statement</h3>
                    <p>${problem.statement || 'No statement available'}</p>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3>Solution</h3>
                    <p>${problem.solution || 'No solution available'}</p>
                </div>
                <div style="display: flex; justify-content: center;">
                    <button class="btn btn-primary close-preview-btn">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(previewModal);
        
        // Add close button event
        const closeBtn = previewModal.querySelector('.close-preview-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(previewModal);
            });
        }
        
        // Close on overlay click
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                document.body.removeChild(previewModal);
            }
        });
    }
    
    // Handle file selection
    function handleFileSelect(e) {
        const file = e.target.files && e.target.files[0];
        if (file) {
            displayFileInfo(file);
        }
    }
    
    // Handle file drop
    function handleFileDrop(e) {
        e.preventDefault();
        if (elements.fileDropArea) {
            elements.fileDropArea.style.borderColor = '#22262F';
        }
        
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (elements.problemFileInput) {
                elements.problemFileInput.files = e.dataTransfer.files;
            }
            displayFileInfo(file);
        }
    }
    
    // Display file information
    function displayFileInfo(file) {
        selectedFile = file;
        
        // Show file preview
        if (elements.filePreview) {
            elements.filePreview.style.display = 'block';
        }
        
        if (elements.fileName) {
            elements.fileName.textContent = file.name;
        }
        
        // Format file size
        if (elements.fileSize) {
            const fileSize = formatFileSize(file.size);
            elements.fileSize.textContent = fileSize;
        }
    }
    
    // Remove selected file
    function removeSelectedFile() {
        selectedFile = null;
        
        if (elements.problemFileInput) {
            elements.problemFileInput.value = '';
        }
        
        if (elements.filePreview) {
            elements.filePreview.style.display = 'none';
        }
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Download problem template
    function downloadProblemTemplate(e) {
        e.preventDefault();
        
        // Create a simple template file
        const templateContent = 'Problem Title: [Title Here]\nDifficulty: Easy/Medium/Hard\n\nProblem Statement:\n[Write problem statement here]\n\nSolution:\n[Write solution here]';
        
        // Create a blob and download it
        const blob = new Blob([templateContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'problem_template.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Handle save problem form
    async function handleSaveProblem() {
        // Basic validation
        if (!elements.problemTitle || !elements.problemTitle.value.trim()) {
            alert('Please enter a problem title');
            return;
        }
        
        // Prepare problem data
        let problemData = {
            id: generateProblemId(),
            title: elements.problemTitle.value.trim(),
            difficulty: elements.problemDifficulty ? elements.problemDifficulty.value : 'easy',
            statement: elements.problemStatement ? elements.problemStatement.value.trim() : '',
            solution: elements.problemSolution ? elements.problemSolution.value.trim() : ''
        };
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // Handle file upload if a file is selected
            if (selectedFile) {
                // In a real implementation, you would upload the file to the server
                // and get a file URL or ID in response
                console.log('Uploading file:', selectedFile.name);
                
                // Here we're just simulating a file upload
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Update problem data with file info
                problemData.hasFile = true;
                problemData.fileName = selectedFile.name;
            }
            
            // For development, log the data instead of submitting
            console.log('Exam data to submit:', examData);
            
            // Simulate server delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Add or update in local exam list (would normally come from server response)
            const selectedClass = elements.examClass.options[elements.examClass.selectedIndex];
            const className = selectedClass ? selectedClass.textContent : 'Unknown Class';
            
            if (currentEditExamId) {
                // Update existing exam
                const examIndex = allExams.findIndex(e => e.id === currentEditExamId);
                if (examIndex !== -1) {
                    allExams[examIndex] = {
                        id: examData.id,
                        title: examData.title,
                        class_id: examData.class_id,
                        class_name: className,
                        date: examData.date,
                        problemCount: selectedProblems.length,
                        status: examData.status
                    };
                }
            } else {
                // Add new exam
                allExams.push({
                    id: examData.id,
                    title: examData.title,
                    class_id: examData.class_id,
                    class_name: className,
                    date: examData.date,
                    problemCount: selectedProblems.length,
                    status: examData.status
                });
            }
            
            // Update UI
            updateCounts();
            renderExamsTable();
            
            // Reset form and state
            resetExamForm();
            currentEditExamId = null;
            
            alert(`Exam ${currentEditExamId ? 'updated' : 'saved'} successfully!`);
            
            // Switch to overview tab
            const overviewTab = document.querySelector('.tab-button[data-tab="overview"]');
            if (overviewTab) {
                overviewTab.click();
            }
            console.log('Problem data to submit:', problemData);
            
            // Simulate server delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Add to local problem list (would normally come from server response)
            allProblems.push(problemData);
            filteredProblems = [...allProblems];
            
            // Update UI
            updateCounts();
            renderProblemsList();
            
            // Reset form
            resetProblemForm();
            
            alert('Problem saved successfully!');
            
            // Switch to problems tab
            const problemsTab = document.querySelector('.tab-button[data-tab="problems"]');
            if (problemsTab) {
                problemsTab.click();
            }
            
        } catch (error) {
            console.error('Error saving problem:', error);
            alert('Failed to save problem. Please try again.');
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }
    
    // Reset problem form
    function resetProblemForm() {
        if (elements.problemTitle) elements.problemTitle.value = '';
        if (elements.problemDifficulty) elements.problemDifficulty.value = 'easy';
        if (elements.problemStatement) elements.problemStatement.value = '';
        if (elements.problemSolution) elements.problemSolution.value = '';
        removeSelectedFile();
    }
    
    // Handle save exam form
    async function handleSaveExam() {
        // Basic validation
        if (!elements.examTitle || !elements.examTitle.value.trim()) {
            alert('Please enter an exam title');
            return;
        }
        
        if (!elements.examClass || !elements.examClass.value) {
            alert('Please select a class');
            return;
        }
        
        if (selectedProblems.length === 0) {
            alert('Please select at least one problem');
            return;
        }
        
        // Prepare exam data
        const examId = currentEditExamId || generateExamId();
        const examData = {
            id: examId,
            title: elements.examTitle.value.trim(),
            class_id: elements.examClass.value,
            date: elements.examDate ? elements.examDate.value : '',
            description: elements.examDescription ? elements.examDescription.value.trim() : '',
            totalPoints: elements.examTotalPoints ? elements.examTotalPoints.value : 100,
            status: elements.examStatus ? elements.examStatus.value : 'active',
            problems: selectedProblems.map((problem, index) => ({
                id: problem.id,
                points: Math.floor((elements.examTotalPoints ? elements.examTotalPoints.value : 100) / selectedProblems.length) // Distribute points evenly
            }))
        };
        
        try {
            await window.appUtils.showLoadingIndicator();
            
            // For development, log the data instead of submitting
            console.log('Exam data to submit:', examData);
        
            // Simulate server delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Add to local exam list (would normally come from server response)
            const selectedClass = elements.examClass.options[elements.examClass.selectedIndex];
            const className = selectedClass ? selectedClass.textContent : 'Unknown Class';
            
            allExams.push({
                id: examData.id,
                title: examData.title,
                class_id: examData.class_id,
                class_name: className,
                date: examData.date,
                problemCount: selectedProblems.length,
                status: examData.status
            });
            
            // Update UI
            updateCounts();
            renderExamsTable();
            
            // Reset form
            resetExamForm();
            
            alert('Exam saved successfully!');
            
            // Switch to overview tab
            document.querySelector('.tab-button[data-tab="overview"]').click();
            
        } catch (error) {
            console.error('Error saving exam:', error);
            alert('Failed to save exam. Please try again.');
        } finally {
            await window.appUtils.hideLoadingIndicator();
        }
    }

    initPage();
})();