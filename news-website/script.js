// Constants
const API_KEY = 'f163b8ed56b24b5dac2fa8692905a602';
const API_URL = 'https://newsapi.org/v2';  // Ensure HTTPS
const DEFAULT_CATEGORY = 'general';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';  // CORS proxy for development

// DOM Elements
const featuredGrid = document.getElementById('featuredGrid');
const newsGrid = document.getElementById('newsGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoryBtns = document.querySelectorAll('.category-btn');
const loadingContainer = document.getElementById('loadingContainer');
const articleTemplate = document.getElementById('articleTemplate');

// State
let currentCategory = DEFAULT_CATEGORY;
let isLoading = false;
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 1000; // Minimum delay between requests

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadNews().catch(handleError);
    initializeEventListeners();
});

// Error Handler
function handleError(error) {
    console.error('News API Error:', error);
    let message = 'An error occurred while fetching news';
    
    if (error.response) {
        switch (error.response.status) {
            case 426:
                message = 'Please use HTTPS for API requests';
                break;
            case 429:
                message = 'Too many requests. Please wait a moment';
                break;
            case 500:
                message = 'Server error. Please try again later';
                break;
            default:
                message = `Error: ${error.response.status}`;
        }
    }
    
    showToast(message, 'error');
    hideLoading();
}

// Event Listeners
function initializeEventListeners() {
    // Search functionality with debounce
    searchBtn.addEventListener('click', () => {
        if (!isLoading) handleSearch();
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isLoading) handleSearch();
    });

    // Category switching with rate limiting
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isLoading) return;
            
            const category = btn.dataset.category;
            if (category !== currentCategory) {
                updateActiveCategory(btn);
                currentCategory = category;
                loadNews().catch(handleError);
            }
        });
    });

    // Infinite scroll with rate limiting
    window.addEventListener('scroll', debounce(() => {
        if (isLoading) return;
        
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
            loadMoreNews().catch(handleError);
        }
    }, 200));
}

// API Functions with Rate Limiting
async function fetchNews(params = {}) {
    // Ensure minimum delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }

    const queryParams = new URLSearchParams({
        apiKey: API_KEY,
        ...params
    });

    try {
        const url = `${API_URL}/top-headlines?${queryParams}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'NewsFlash/1.0'
            }
        });

        lastRequestTime = Date.now();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.message || 'API Error');
        }

        return data;
    } catch (error) {
        throw new Error(`Failed to fetch news: ${error.message}`);
    }
}

// News Loading Functions with Error Handling
async function loadNews() {
    if (isLoading) return;
    
    showLoading();
    try {
        const [featuredNews, latestNews] = await Promise.all([
            fetchNews({ category: currentCategory, pageSize: 3 }),
            fetchNews({ category: currentCategory, pageSize: 12, page: 1 })
        ]);

        // Clear existing content
        featuredGrid.innerHTML = '';
        newsGrid.innerHTML = '';

        // Check if we have articles
        if (!featuredNews.articles?.length && !latestNews.articles?.length) {
            showNoResults();
            return;
        }

        // Render news
        featuredNews.articles?.forEach(article => {
            renderArticle(article, featuredGrid, true);
        });

        latestNews.articles?.forEach(article => {
            renderArticle(article, newsGrid);
        });

        showToast('News loaded successfully', 'success');
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

// Rest of the code remains the same...
// Include all the rendering functions, utility functions, etc.

function showNoResults() {
    const message = document.createElement('div');
    message.className = 'no-results';
    message.innerHTML = `
        <i class="fas fa-newspaper" style="font-size: 3rem; color: var(--text-secondary);"></i>
        <h3>No news available</h3>
        <p>Please try another category or check back later</p>
    `;
    newsGrid.appendChild(message);
}

// Utility Functions
function showLoading() {
    isLoading = true;
    loadingContainer.classList.add('active');
}

function hideLoading() {
    isLoading = false;
    loadingContainer.classList.remove('active');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');

    toast.className = `toast ${type}`;
    icon.className = `toast-icon fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`;
    messageEl.textContent = message;

    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleError,
        fetchNews,
        showToast
    };
}