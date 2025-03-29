// Main application JavaScript
document.addEventListener('DOMContentLoaded', function () {
    // Initialize application
    initializeSidebar();
    
    // Show home page by default
    updateMainContent('home');
    loadPageContent('home');
});

// Sidebar navigation initialization
function initializeSidebar() {
    const sidebarMenuItems = document.querySelectorAll('.sidebar_menu_item');
    
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', function () {
            // Update active menu item
            sidebarMenuItems.forEach(menuItem => menuItem.classList.remove('active'));
            this.classList.add('active');
            
            // Get the selected page from the item's ID
            const selectedPage = this.id.split('_')[2];
            
            // Update content
            updateMainContent(selectedPage);
            loadPageContent(selectedPage);
        });
    });
}

// Update the main content title
function updateMainContent(page) {
    const mainTitle = document.querySelector('.main_title');
    mainTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
}

// Load page content via AJAX
async function loadPageContent(page) {
    try {
        await showLoadingIndicator();
        
        const response = await fetch(`/render/${page}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${page} content: ${response.status}`);
        }
        
        const html = await response.text();
        document.querySelector('.main_content').innerHTML = html;
        
        // Load and execute the page's JavaScript
        loadPageScript(page);
        
    } catch (error) {
        console.error('Error loading content:', error);
        document.querySelector('.main_content').innerHTML = '<p>Error loading content. Please try again.</p>';
    } finally {
        await hideLoadingIndicator();
    }
}

// Load and execute the JavaScript for a specific page
function loadPageScript(page) {
    // Remove any previously loaded script
    const existingScript = document.getElementById('dynamicScript');
    if (existingScript) {
        existingScript.remove();
    }

    // Create and append a new script element
    const script = document.createElement('script');
    script.src = `menu-content/${page}.js`;
    script.id = 'dynamicScript';
    script.onerror = () => console.error(`Failed to load script for ${page}`);
    
    document.body.appendChild(script);
}

// Fetch data from server
async function loadList(type) {
    try {
        const response = await fetch(`/load-list/${type}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${type} data: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${type} list:`, error);
        throw error;
    }
}

// Table pagination and filtering setup
function setTable(rowsPerPage = 10) {
    // Initialize variables if they don't exist
    window.filteredRows = window.filteredRows || [];
    window.currentPage = window.currentPage || 1;
    
    // Setup search filtering
    setupFiltering();
    
    // Setup pagination buttons
    setupPaginationControls();
    
    // Initialize table display
    window.filteredRows = Array.from(document.querySelector('tbody').getElementsByTagName('tr'));
    displayPage(1);
}

// Configure search functionality for tables
function setupFiltering() {
    const searchInput = document.querySelector('.searchbox input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', filterTable);
}

// Filter table rows based on search input
function filterTable() {
    const searchQuery = document.querySelector('.searchbox input').value.toLowerCase();
    const allRows = Array.from(document.querySelector('tbody').getElementsByTagName('tr'));
    
    window.filteredRows = allRows.filter(row => {
        const cells = Array.from(row.getElementsByTagName('td'));
        return cells.some(cell => cell.textContent.toLowerCase().includes(searchQuery));
    });
    
    displayPage(1);
}

// Configure pagination buttons
function setupPaginationControls() {
    const prevButton = document.getElementById('previous_button');
    const nextButton = document.getElementById('next_button');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (window.currentPage > 1) {
                window.currentPage--;
                displayPage(window.currentPage);
            }
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const maxPage = Math.ceil(window.filteredRows.length / window.rowsPerPage || 10);
            if (window.currentPage < maxPage) {
                window.currentPage++;
                displayPage(window.currentPage);
            }
        });
    }
}

// Display a specific page of table results
function displayPage(page) {
    const rowsPerPage = window.rowsPerPage || 10;
    const start = (page - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, window.filteredRows.length);
    
    // Hide all rows
    const allRows = Array.from(document.querySelector('tbody').getElementsByTagName('tr'));
    allRows.forEach(row => row.style.display = 'none');
    
    // Show only the rows for the current page
    window.filteredRows.slice(start, end).forEach(row => row.style.display = '');
    
    // Update page indicator
    const maxPage = Math.ceil(window.filteredRows.length / rowsPerPage);
    const rangeInfo = document.querySelector('.range_info');
    if (rangeInfo) {
        rangeInfo.textContent = `Page ${page} of ${maxPage || 1}`;
    }
    
    // Store current page
    window.currentPage = page;
}

// Loading indicator functions
async function showLoadingIndicator() {
    const loadingIndicator = document.querySelector('.loading_indicator_wrapper');
    loadingIndicator.style.display = 'flex';
    
    // Return a promise that resolves after a small delay to ensure UI updates
    return new Promise(resolve => setTimeout(resolve, 50));
}

async function hideLoadingIndicator() {
    const loadingIndicator = document.querySelector('.loading_indicator_wrapper');
    loadingIndicator.style.display = 'none';
    
    // Return a promise that resolves after a small delay
    return new Promise(resolve => setTimeout(resolve, 50));
}

// Utility function to format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Export functions for use in page scripts
window.appUtils = {
    loadList,
    setTable,
    showLoadingIndicator,
    hideLoadingIndicator,
    formatDate
};