import { Solitude } from "../core/api";

(() => {
class LocalSearch {
    constructor() {
        this.store = [];
        this.currentQuery = '';
        this.currentPage = 0;
        this.resultsPerPage = 10;
        this.currentResults = [];
        this.lastSearchTime = null;
        this.isLoading = false;
        this.searchTimeout = null;
        this.boundElements = new WeakSet();
        this.keyboardBound = false;
        this.pjaxBound = false;
        this.fixSafariHeight = this.fixSafariHeight.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handlePjaxComplete = this.handlePjaxComplete.bind(this);
        this.handleSearchInputDebounced = this.debounce((event) => {
            this.handleSearchInput(event.target.value.trim());
        }, 300);
        this.elements = this.cacheElements();
        this.init();
    }

    cacheElements() {
        return {
            searchMask: document.getElementById('search-mask'),
            searchDialog: document.querySelector('#local-search .search-dialog'),
            searchInput: document.getElementById('search-input'),
            searchSuggestions: document.getElementById('search-suggestions'),
            searchResults: document.getElementById('search-results'),
            searchPagination: document.getElementById('search-pagination'),
            searchTips: document.getElementById('search-tips'),
            searchButton: document.querySelector('#search-button > .search'),
            closeButton: document.querySelector('#local-search .search-close-button'),
            menuSearch: document.getElementById('menu-search')
        };
    }

    async init() {
        this.bindEvents();
        this.bindKeyboardShortcuts();
        this.bindPjaxEvents();
        this.syncSearchState();
        Solitude.openSearch = () => this.openSearch();

        try {
            await this.loadSearchData();
            const query = this.elements.searchInput?.value.trim();
            if (query) this.handleSearchInput(query);
        } catch (error) {
            console.error('Search initialization failed:', error);
        }
    }

    async loadSearchData() {
        if (!Solitude.config?.localsearch?.path) {
            throw new Error('Search data path not configured');
        }

        this.isLoading = true;
        try {
            const response = await fetch(Solitude.config.localsearch.path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.text();
            this.parseSearchData(data);
        } catch (error) {
            throw new Error(`Failed to load search data: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    parseSearchData(xmlData) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
            const entries = xmlDoc.getElementsByTagName('entry');

            this.store = Array.from(entries).map(entry => {
                const getTextContent = (tagName) => {
                    const element = entry.getElementsByTagName(tagName)[0];
                    return element ? element.textContent.trim() : '';
                };

                return {
                    title: getTextContent('title'),
                    link: getTextContent('url'),
                    content: getTextContent('content')
                };
            }).filter(item => item.title && item.link);
        } catch (error) {
            throw new Error(`Failed to parse search data: ${error.message}`);
        }
    }

    bindOnce(element, eventName, handler) {
        if (!element || this.boundElements.has(element)) return;
        element.addEventListener(eventName, handler);
        this.boundElements.add(element);
    }

    bindEvents() {
        this.bindOnce(this.elements.searchInput, 'input', this.handleSearchInputDebounced);
        this.bindOnce(this.elements.searchButton, 'click', () => this.openSearch());
        this.bindOnce(this.elements.closeButton, 'click', () => this.closeSearch());
        this.bindOnce(this.elements.searchMask, 'click', () => this.closeSearch());

        document.querySelectorAll('#local-search .tag-list').forEach(button => {
            this.bindOnce(button, 'click', () => {
                const query = button.dataset.query?.trim();
                if (!query || !this.elements.searchInput) return;
                this.elements.searchInput.value = query;
                this.handleSearchInput(query);
                this.elements.searchInput.focus();
            });
        });

        if (Solitude.config.right_menu && this.elements.menuSearch) {
            this.bindOnce(this.elements.menuSearch, 'click', () => {
                Solitude.hideRightMenu?.();
                this.openSearch();
                if (Solitude.selectedText && this.elements.searchInput) {
                    this.elements.searchInput.value = Solitude.selectedText;
                    this.handleSearchInput(Solitude.selectedText.trim());
                }
            });
        }
    }

    bindKeyboardShortcuts() {
        if (this.keyboardBound) return;
        document.addEventListener('keydown', this.handleKeydown);
        this.keyboardBound = true;
    }

    bindPjaxEvents() {
        if (this.pjaxBound) return;
        window.addEventListener('pjax:complete', this.handlePjaxComplete);
        this.pjaxBound = true;
    }

    handleKeydown(event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            this.openSearch();
            return;
        }

        if (event.code === 'Escape' && this.isSearchOpen()) {
            this.closeSearch();
        }
    }

    handlePjaxComplete() {
        this.elements = this.cacheElements();
        this.bindEvents();
        this.syncSearchState();
    }

    openSearch() {
        if (!this.elements.searchMask || !this.elements.searchDialog) return;

        Solitude.animateIn(this.elements.searchMask, 'to_show 0.5s');
        this.elements.searchDialog.style.display = 'flex';
        document.documentElement.classList.add('search-open');
        this.syncSearchState();
        this.fixSafariHeight();
        window.addEventListener('resize', this.fixSafariHeight);

        setTimeout(() => this.elements.searchInput?.focus(), 100);
    }

    closeSearch() {
        if (!this.elements.searchMask || !this.elements.searchDialog) return;

        Solitude.animateOut(this.elements.searchDialog, 'search_close .5s');
        Solitude.animateOut(this.elements.searchMask, 'to_hide 0.5s');
        document.documentElement.classList.remove('search-open');
        window.removeEventListener('resize', this.fixSafariHeight);
    }

    isSearchOpen() {
        return this.elements.searchDialog?.style.display === 'flex';
    }

    fixSafariHeight() {
        if (!this.elements.searchDialog) return;
        if (window.innerWidth < 768) {
            this.elements.searchDialog.style.setProperty('--search-height', `${window.innerHeight}px`);
        } else {
            this.elements.searchDialog.style.removeProperty('--search-height');
        }
    }

    syncSearchState() {
        const query = this.elements.searchInput?.value.trim() || '';
        this.setQueryState(Boolean(query));
    }

    setQueryState(hasQuery) {
        if (this.elements.searchSuggestions) {
            this.elements.searchSuggestions.hidden = hasQuery;
        }
        if (this.elements.searchResults) {
            this.elements.searchResults.hidden = !hasQuery;
        }
    }

    handleSearchInput(query) {
        this.currentQuery = query;
        this.currentPage = 0;

        if (!query) {
            this.clearSearchResults();
            return;
        }

        this.setQueryState(true);

        if (this.isLoading) {
            this.showStatusMessage(Solitude.config.lang?.search?.loading || 'Searching...', 'search-result-loading');
            return;
        }

        try {
            const startTime = performance.now();
            this.currentResults = this.performSearch(query);
            this.lastSearchTime = (performance.now() - startTime).toFixed(2);
            this.renderResults(this.currentResults, this.currentPage, this.lastSearchTime);
            this.renderPagination(this.currentResults.length);
        } catch (error) {
            console.error('Search error:', error);
            this.showErrorMessage('Search failed, please try again');
        }
    }

    performSearch(query) {
        if (!query || !this.store.length) return [];

        const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (!keywords.length) return [];

        return this.store.filter(item => {
            const titleLower = item.title.toLowerCase();
            const contentLower = item.content.toLowerCase();
            return keywords.every(keyword =>
                titleLower.includes(keyword) || contentLower.includes(keyword)
            );
        }).sort((a, b) =>
            this.calculateRelevanceScore(b, keywords) - this.calculateRelevanceScore(a, keywords)
        );
    }

    calculateRelevanceScore(item, keywords) {
        const titleLower = item.title.toLowerCase();
        const contentLower = item.content.toLowerCase();

        return keywords.reduce((score, keyword) => {
            if (titleLower === keyword) return score + 10;
            if (titleLower.includes(keyword)) return score + 5;
            if (contentLower.includes(keyword)) return score + 1;
            return score;
        }, 0);
    }

    renderResults(results, page, searchTime = this.lastSearchTime) {
        if (!this.elements.searchResults || !this.elements.searchTips) return;

        this.elements.searchResults.innerHTML = '';
        this.elements.searchTips.innerHTML = '';
        this.setQueryState(true);

        const start = page * this.resultsPerPage;
        const end = start + this.resultsPerPage;

        if (!results.length) {
            this.showEmptyMessage();
            return;
        }

        const fragment = document.createDocumentFragment();
        results.slice(start, end).forEach(result => {
            fragment.appendChild(this.createResultElement(result));
        });
        this.elements.searchResults.appendChild(fragment);
        this.showResultCount(results.length, searchTime);
    }

    createResultElement(result) {
        const resultItem = document.createElement('li');
        resultItem.className = 'search-result-item';

        const link = document.createElement('a');
        link.className = 'search-result-title';
        link.href = result.link;
        link.innerHTML = this.highlightKeywords(result.title, this.currentQuery);
        link.addEventListener('click', () => this.closeSearch());

        resultItem.appendChild(link);
        return resultItem;
    }

    highlightKeywords(text, query) {
        if (!query) return text;

        return query.split(/\s+/).filter(Boolean).reduce((highlightedText, keyword) => {
            const regex = new RegExp(`(${this.escapeRegExp(keyword)})`, 'gi');
            return highlightedText.replace(regex, '<em>$1</em>');
        }, text);
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    renderPagination(totalResults) {
        if (!this.elements.searchPagination) return;

        const totalPages = Math.ceil(totalResults / this.resultsPerPage);
        this.elements.searchPagination.innerHTML = '';
        if (totalPages <= 1) return;

        const paginationList = document.createElement('ul');
        paginationList.className = 'pagination-list';

        for (let page = 0; page < totalPages; page++) {
            paginationList.appendChild(this.createPaginationItem(page));
        }

        this.elements.searchPagination.appendChild(paginationList);
    }

    createPaginationItem(page) {
        const item = document.createElement('li');
        item.className = 'pagination-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pagination-button';
        button.textContent = page + 1;
        button.setAttribute('aria-label', `${page + 1}`);

        if (page === this.currentPage) {
            button.classList.add('select');
            button.setAttribute('aria-current', 'page');
        } else {
            button.addEventListener('click', () => this.goToPage(page));
        }

        item.appendChild(button);
        return item;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderResults(this.currentResults, page, this.lastSearchTime);
        this.renderPagination(this.currentResults.length);
        if (this.elements.searchResults) this.elements.searchResults.scrollTop = 0;
    }

    showEmptyMessage() {
        const empty = document.createElement('span');
        empty.className = 'search-result-empty';
        empty.textContent = Solitude.config.lang?.search?.empty?.replace(/\$\{query}/g, this.currentQuery) ||
            `没有找到与 "${this.currentQuery}" 相关的内容`;
        this.elements.searchResults.appendChild(empty);
    }

    showResultCount(count, time) {
        const countElement = document.createElement('span');
        countElement.className = 'search-result-count';
        const template = Solitude.config.lang?.search?.hit || 'Found ${hits} results in ${time} ms';
        countElement.innerHTML = template
            .replace(/\$\{hits}/g, count)
            .replace(/\$\{query}/g, count)
            .replace(/\$\{time}/g, time || '0.00');
        this.elements.searchTips.appendChild(countElement);
    }

    showStatusMessage(message, className) {
        if (!this.elements.searchResults) return;
        this.elements.searchResults.innerHTML = '';
        this.elements.searchTips.innerHTML = '';
        this.elements.searchPagination.innerHTML = '';
        this.setQueryState(true);

        const status = document.createElement('span');
        status.className = className;
        status.textContent = message;
        this.elements.searchResults.appendChild(status);
    }

    showErrorMessage(message) {
        this.showStatusMessage(message, 'search-result-error');
    }

    clearSearchResults() {
        if (this.elements.searchResults) this.elements.searchResults.innerHTML = '';
        if (this.elements.searchPagination) this.elements.searchPagination.innerHTML = '';
        if (this.elements.searchTips) this.elements.searchTips.innerHTML = '';

        this.currentResults = [];
        this.currentPage = 0;
        this.lastSearchTime = null;
        this.setQueryState(false);
    }

    debounce(func, wait) {
        return (...args) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

const initializeLocalSearch = () => {
    if (!Solitude.localSearch) Solitude.localSearch = new LocalSearch();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocalSearch, { once: true });
} else {
    initializeLocalSearch();
}
})();
