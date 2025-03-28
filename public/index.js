// const sidebar_menu_list = ['home','dashboard','calendar','analytics','students','classes', 'exams', 'homeworks','messages'];
const current_link = ['home'];
document.addEventListener('DOMContentLoaded', function () {

    const sidebar_menu = document.querySelectorAll('.sidebar_menu_item');
    sidebar_menu.forEach(item => {
        item.addEventListener('click', function () {
            sidebar_menu.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            const selected_page = this.id.split('_')[2];
            updateMainContent(selected_page);
            fetch(`/render/${selected_page}`)
                .then(response => response.text())
                .then(data => {
                    document.querySelector('.main_content').innerHTML = data;
                    loadScript(selected_page);
                });
        });
    });



});

function updateMainContent(page){
    document.querySelector('.main_title').textContent =page.charAt(0).toUpperCase() + page.slice(1);
}

function loadScript(page) {
        const existingScript = document.getElementById('dynamicScript');
        if (existingScript) {
            existingScript.remove();
        }

        // Create a new script element for the selected page
        const script = document.createElement('script');
        script.src = `menu-content/${page}.js`;
        script.id = 'dynamicScript'; // Assign a unique ID to identify this script

        // Append the new script to the document body
        document.body.appendChild(script);
}
async function loadList(type) {
    const response = await fetch(`/load-list/${type}`);
    return await response.json();
}


function setTable(rowsPerPage){
    if (typeof filteredRows === 'undefined') {
        var filteredRows = [];
    }
    if (typeof current_page === 'undefined') {
        var current_page = 1;
    }

    function setupFiltering() {
        const searchInput = document.querySelector('.searchbox');
        searchInput.addEventListener('input', filterTable);
    }
    
    function filterTable() {
        const searchQuery = document.querySelector('.searchbox').querySelector('input').value.toLowerCase();
        const allRows = Array.from(document.querySelector('tbody').getElementsByTagName('tr'));
    
        filteredRows = allRows.filter(row => {
            const cells = row.getElementsByTagName('td');
            const matchesSearch = Array.from(cells).some(cell => cell.textContent.toLowerCase().includes(searchQuery));
    
            return matchesSearch;
        });
        displayPage(1);
    }
    function displayPage(page) {
        const start = (page - 1) * rowsPerPage;
        const end = Math.min(start + rowsPerPage, filteredRows.length);
    
        // Hide all rows initially
        const allRows = Array.from(document.querySelector('tbody').getElementsByTagName('tr'));
        allRows.forEach(row => row.style.display = 'none');
    
        // Show only the rows in the current page
        filteredRows.slice(start, end).forEach(row => row.style.display = '');
        document.querySelector('.range_info').textContent = `Page ${page} of ${Math.ceil(filteredRows.length / rowsPerPage)}`;
    }
    document.getElementById('previous_button').addEventListener('click', function () {
        if (current_page > 1) {
            current_page--;
            displayPage(current_page);
        }
    });
    document.getElementById('next_button').addEventListener('click', function () {
        if (current_page < Math.ceil(filteredRows.length / rowsPerPage)) {
            current_page++;
            displayPage(current_page);
        }
    });
    filteredRows = Array.from(document.querySelector('tbody').getElementsByTagName('tr'));
    setupFiltering();
    displayPage(1);
}

// Show the loading indicator first
function showLoadingIndicator() {
    document.querySelector('.loading_indicator_wrapper').style.display = 'flex';
    return Promise.resolve(); // Return a resolved promise for chaining
}

// Function to hide the loading indicator
function hideLoadingIndicator() {
    document.querySelector('.loading_indicator_wrapper').style.display = 'none';
    return Promise.resolve(); // Return a resolved promise for chaining
}