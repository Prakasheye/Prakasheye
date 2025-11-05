    // Constants
    const API_KEY = 'f163b8ed56b24b5dac2fa8692905a602';
    const API_URL = 'https://newsapi.org/v2';
    const DEFAULT_CATEGORY = 'general';

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

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        loadNews();
        initializeEventListeners();
    });

    // Event Listeners
    function initializeEventListeners() {
        // Search functionality
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });

        // Category switching
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                if (category !== currentCategory) {
                    updateActiveCategory(btn);
                    currentCategory = category;
                    loadNews();
                }
            });
        });

        // Infinite scroll
        window.addEventListener('scroll', debounce(() => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
                loadMoreNews();
            }
        }, 200));
    }

    // News Loading Functions
    async function loadNews() {
        showLoading();
        try {
            const [featuredNews, latestNews] = await Promise.all([
                fetchNews({ category: currentCategory, pageSize: 3 }),
                fetchNews({ category: currentCategory, pageSize: 12, page: 1 })
            ]);

            // Clear existing content
            featuredGrid.innerHTML = '';
            newsGrid.innerHTML = '';

            // Render news
            featuredNews.articles.forEach(article => {
                renderArticle(article, featuredGrid, true);
            });

            latestNews.articles.forEach(article => {
                renderArticle(article, newsGrid);
            });
        } catch (error) {
            showToast('Error loading news', 'error');
        } finally {
            hideLoading();
        }
    }

    async function loadMoreNews() {
        if (isLoading) return;
        
        showLoading();
        try {
            const currentPage = Math.ceil(newsGrid.children.length / 12) + 1;
            const moreNews = await fetchNews({
                category: currentCategory,
                pageSize: 12,
                page: currentPage
            });

            moreNews.articles.forEach(article => {
                renderArticle(article, newsGrid);
            });
        } catch (error) {
            showToast('Error loading more news', 'error');
        } finally {
            hideLoading();
        }
    }

    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        showLoading();
        try {
            const searchResults = await fetchNews({ q: query, pageSize: 20 });
            
            // Clear and update grids
            featuredGrid.innerHTML = '';
            newsGrid.innerHTML = '';

            if (searchResults.articles.length === 0) {
                showNoResults();
            } else {
                searchResults.articles.forEach((article, index) => {
                    if (index < 3) {
                        renderArticle(article, featuredGrid, true);
                    } else {
                        renderArticle(article, newsGrid);
                    }
                });
            }
        } catch (error) {
            showToast('Error searching news', 'error');
        } finally {
            hideLoading();
        }
    }

    // API Functions
    async function fetchNews(params = {}) {
        const queryParams = new URLSearchParams({
            apiKey: API_KEY,
            ...params
        });

        const response = await fetch(`${API_URL}/top-headlines?${queryParams}`);
        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }
        return response.json();
    }

    // Rendering Functions
    function renderArticle(article, container, isFeatured = false) {
        const clone = articleTemplate.content.cloneNode(true);
        const newsCard = clone.querySelector('.news-card');
        
        // Add featured class if needed
        if (isFeatured) {
            newsCard.classList.add('featured');
        }

        // Set article content
        const img = clone.querySelector('img');
        img.src = article.urlToImage || 'https://via.placeholder.com/400x225?text=No+Image';
        img.alt = article.title;

        clone.querySelector('.category-tag').textContent = currentCategory;
        clone.querySelector('.article-title').textContent = article.title;
        clone.querySelector('.article-description').textContent = article.description || 'No description available';
        clone.querySelector('.source').textContent = article.source.name;
        clone.querySelector('.published-date').textContent = formatDate(article.publishedAt);

        // Add click event
        newsCard.addEventListener('click', () => {
            window.open(article.url, '_blank');
        });

        // Animate the card
        requestAnimationFrame(() => {
            newsCard.style.opacity = '0';
            newsCard.style.transform = 'translateY(20px)';
            container.appendChild(clone);

            requestAnimationFrame(() => {
                newsCard.style.opacity = '1';
                newsCard.style.transform = 'translateY(0)';
            });
        });
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

    function updateActiveCategory(activeBtn) {
        categoryBtns.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
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

    function showNoResults() {
        newsGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--text-secondary);"></i>
                <h3>No results found</h3>
                <p>Try different keywords or check back later</p>
            </div>
        `;
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
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