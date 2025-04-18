// ===== API CONFIGURATION =====
// Replace with your own NewsAPI key from https://newsapi.org
// You need to sign up on their website to get a free API key
const apiKey = '123456';
// Base URL for all NewsAPI endpoints
const apiUrl = 'https://newsapi.org/v2';

// ===== DOM ELEMENTS =====
// Getting references to HTML elements we'll need to work with
// This is more efficient than selecting elements repeatedly
const newsContainer = document.getElementById('news-container'); // Where news cards will be displayed
const searchInput = document.getElementById('search-input');     // Search input field
const searchButton = document.getElementById('search-button');   // Search button
const categoryButtons = document.querySelectorAll('.category-btn'); // All category filter buttons
const loader = document.getElementById('loader');               // Loading indicator
const errorMessage = document.getElementById('error-message');   // Error message display

// ===== APP STATE =====
// Variables to keep track of the current state of the application
let currentCategory = 'general'; // Default category when the page loads
let currentQuery = '';           // Search query, empty by default (no search)
let currentPage = 1;             // Current page of results (for pagination/infinite scroll)
const pageSize = 12;             // Number of articles to fetch per request

// ===== EVENT LISTENERS =====
// Wait until the DOM is fully loaded before attaching event listeners
// This ensures all HTML elements exist before we try to use them
document.addEventListener('DOMContentLoaded', () => {
    // Load initial news when the page first loads
    fetchNews();
    
    // Set up search button click - trigger search when button is clicked
    searchButton.addEventListener('click', handleSearch);
    
    // Allow searching by pressing Enter key while in the search input
    searchInput.addEventListener('keypress', (e) => {
        // Check if the pressed key was Enter (key code 13)
        if (e.key === 'Enter') {
            handleSearch(); // Execute the same search function
        }
    });
    
    // Set up category button clicks - switch category when a button is clicked
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'active' class from all buttons (visual indicator)
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            // Add 'active' class to the clicked button
            button.classList.add('active');
            
            // Update the current category based on the data-category attribute
            currentCategory = button.dataset.category;
            // Reset search-related state
            currentQuery = '';
            searchInput.value = '';
            currentPage = 1;
            
            // Fetch news for this category
            fetchNews();
        });
    });
    
    // Implement infinite scroll functionality
    // This detects when the user has scrolled to the bottom of the page
    window.addEventListener('scroll', () => {
        // Get scroll position and document dimensions
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        // Check if user has scrolled to the bottom (with a small buffer of 5px)
        // Also check that the loader is not currently hidden (prevents multiple loads)
        if (scrollTop + clientHeight >= scrollHeight - 5 && !loader.classList.contains('hidden')) {
            // Increment the page number to load the next batch of news
            currentPage++;
            // Fetch more news and append to existing content
            fetchNews(true);
        }
    });
});

// ===== CORE FUNCTIONS =====

// Handle search input - triggered when user searches for specific news
function handleSearch() {
    // Get the search query and remove any extra spaces
    const query = searchInput.value.trim();
    
    // Only proceed if there's actually text in the search box
    if (query) {
        // If there's a search query, update state to search mode
        currentQuery = query;
        currentCategory = ''; // Clear category when searching
        currentPage = 1;      // Start at the first page of results
        
        // Remove 'active' class from all category buttons
        // This provides visual feedback that we're in search mode, not category mode
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        
        // Fetch news based on search query
        fetchNews();
    }
}

// Fetch news from the API - the core function that gets news data
// isLoadMore parameter determines if we're adding more articles (infinite scroll)
// or replacing the current articles (new search/category)
async function fetchNews(isLoadMore = false) {
    try {
        // Show loading indicator and hide any previous error messages
        showLoader();
        hideError();
        
        // If this is a new search/category (not loading more), clear existing articles
        if (!isLoadMore) {
            newsContainer.innerHTML = '';
        }
        
        // Build the API URL based on current state
        let url;
        // If we have a search query, use the /everything endpoint for broader search
        if (currentQuery) {
            // Search for specific query across all news sources
            url = `${apiUrl}/everything?q=${currentQuery}&page=${currentPage}&pageSize=${pageSize}&apiKey=${apiKey}`;
        } else {
            // Otherwise, use the /top-headlines endpoint for category-based news
            // 'us' specifies news from United States - change this for other countries
            url = `${apiUrl}/top-headlines?country=us&category=${currentCategory}&page=${currentPage}&pageSize=${pageSize}&apiKey=${apiKey}`;
        }
        
        // Fetch data from the API using the Fetch API
        // This makes an HTTP request to the NewsAPI server
        const response = await fetch(url);
        // Parse the JSON response into a JavaScript object
        const data = await response.json();
        
        // Check if the API request was successful
        if (data.status !== 'ok') {
            throw new Error(data.message || 'Failed to fetch news');
        }
        
        // Check if any articles were found
        if (data.articles.length === 0) {
            // Only show "no results" error if this is a new search, not when loading more
            if (!isLoadMore) {
                showError('No news found. Try another search or category.');
            }
            return; // Exit the function early
        }
        
        // Display the fetched news articles
        displayNews(data.articles);
    } catch (error) {
        // Handle any errors that occurred during the fetch
        console.error('Error fetching news:', error);
        showError('Error fetching news. Please check your API key or try again later.');
    } finally {
        // Hide the loader regardless of success or failure
        // 'finally' block always executes, whether there was an error or not
        hideLoader();
    }
}

// Display news articles on the page - turns API data into HTML elements
function displayNews(articles) {
    // Loop through each article in the received data
    articles.forEach(article => {
        // Format the publication date from ISO format to a readable date
        const date = new Date(article.publishedAt);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Create a new div element for this article
        const card = document.createElement('div');
        card.className = 'news-card';
        
        // Build the HTML for this card using template literals
        // This creates the structure for each news card
        card.innerHTML = `
            ${article.urlToImage 
                // If there's an image, display it (with error handling if it fails to load)
                ? `<img src="${article.urlToImage}" alt="${article.title}" class="news-image" onerror="this.onerror=null; this.src=''; this.classList.add('placeholder'); this.innerHTML='Image not available';">` 
                // If there's no image, show a placeholder
                : `<div class="news-image placeholder">Image not available</div>`
            }
            <div class="news-content">
                <div class="news-source">${article.source.name || 'Unknown Source'}</div>
                <h3 class="news-title">${article.title}</h3>
                <p class="news-description">${article.description || 'No description available'}</p>
                <div class="news-date">${formattedDate}</div>
                <a href="${article.url}" class="read-more" target="_blank" rel="noopener noreferrer">Read More</a>
            </div>
        `;
        
        // Add the completed card to the news container in the DOM
        newsContainer.appendChild(card);
    });
}

// ===== UTILITY FUNCTIONS =====

// Shows the loading indicator
function showLoader() {
    loader.classList.remove('hidden');
}

// Hides the loading indicator
function hideLoader() {
    loader.classList.add('hidden');
}

// Shows an error message with the provided text
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Hides the error message
function hideError() {
    errorMessage.classList.add('hidden');
} 
