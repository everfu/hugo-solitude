const SAFE_ARCHIVE_PROTOCOLS = new Set(['http:', 'https:'])

const resolveArchivePostUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value, document.baseURI)
    return SAFE_ARCHIVE_PROTOCOLS.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export const archivePageController = (() => {
  const createElement = (tag, className, text) => {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (text !== undefined) element.textContent = text
    return element
  }

  const controller = {
    init() {
      const shell = document.getElementById('archives-page')
      const dataElement = document.getElementById('archive-page-data')
      if (!shell || !dataElement || shell.dataset.archiveInitialized === 'true') return

      const list = shell.querySelector('#archives-page-list')
      const yearList = shell.querySelector('#archives-year-filter-list')
      const pagination = shell.querySelector('#pagination .pagination')
      const paginationSection = shell.querySelector('.archive-page-section-pagination')
      if (!list || !yearList || !pagination || !paginationSection) return

      this.labels = {
        error: shell.dataset.labelError || 'Unable to load posts.',
        empty: shell.dataset.labelEmpty || 'No posts for this year.',
        uncategorized: shell.dataset.labelUncategorized || 'Uncategorized',
        previous: shell.dataset.labelPrevious || 'Previous page',
        next: shell.dataset.labelNext || 'Next page'
      }

      let posts
      try {
        posts = JSON.parse(dataElement.content?.textContent || dataElement.textContent || '[]')
      } catch (error) {
        this.renderState(shell, this.labels.error)
        console.error('Failed to parse archive data:', error)
        return
      }

      shell.dataset.archiveInitialized = 'true'
      this.shell = shell
      this.list = list
      this.yearList = yearList
      this.pagination = pagination
      this.paginationSection = paginationSection
      this.posts = Array.isArray(posts) ? posts : []
      this.perPage = Math.max(Number(shell.dataset.perPage) || 10, 1)
      this.years = [...new Set(this.posts.map((post) => String(post.year)))].sort((a, b) => Number(b) - Number(a))
      this.activeYear = this.years.includes(shell.dataset.initialYear) ? shell.dataset.initialYear : 'all'
      this.currentPage = Math.max(Number(shell.dataset.initialPage) || 1, 1)
      this.abortController = new AbortController()

      this.renderYears()
      this.bindEvents()
      this.render()
    },

    bindEvents() {
      this.shell.addEventListener('click', (event) => {
        const yearButton = event.target.closest('.archive-year-button')
        if (yearButton) {
          this.activeYear = yearButton.dataset.year
          this.currentPage = 1
          this.render()
          return
        }

        const pageButton = event.target.closest('[data-archive-page]')
        if (!pageButton || pageButton.disabled) return
        this.currentPage = Number(pageButton.dataset.archivePage)
        this.render()
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        this.shell.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      }, { signal: this.abortController.signal })
    },

    renderYears() {
      this.yearList.replaceChildren()
      this.years.forEach((year) => {
        const button = createElement('button', 'archive-year-button', year)
        button.type = 'button'
        button.dataset.year = year
        button.setAttribute('aria-pressed', 'false')
        this.yearList.appendChild(button)
      })
    },

    render() {
      const filteredPosts =
        this.activeYear === 'all' ? this.posts : this.posts.filter((post) => String(post.year) === this.activeYear)
      const totalPages = Math.max(Math.ceil(filteredPosts.length / this.perPage), 1)
      this.currentPage = Math.min(this.currentPage, totalPages)

      this.shell.querySelectorAll('.archive-year-button').forEach((button) => {
        const active = button.dataset.year === this.activeYear
        button.classList.toggle('is-active', active)
        button.setAttribute('aria-pressed', String(active))
      })

      this.list.replaceChildren()
      if (!filteredPosts.length) {
        this.renderState(this.shell, this.labels.empty)
      } else {
        const start = (this.currentPage - 1) * this.perPage
        filteredPosts.slice(start, start + this.perPage).forEach((post) => {
          this.list.appendChild(this.createPostItem(post))
        })
      }

      this.renderPagination(totalPages)
    },

    createPostItem(post) {
      const postUrl = resolveArchivePostUrl(post.url)
      const item = createElement(postUrl ? 'a' : 'div', 'archive-page-item')
      if (postUrl) item.href = postUrl
      else item.setAttribute('aria-disabled', 'true')
      item.title = post.title

      const thumb = createElement('div', 'archive-page-thumb')
      const image = createElement('img')
      image.src = post.cover
      image.alt = post.title
      image.loading = 'lazy'
      image.addEventListener('error', () => thumb.classList.add('is-fallback'), { once: true })
      const fallback = createElement(
        'span',
        'archive-page-thumb-fallback',
        (post.title || '文').trim().charAt(0) || '文'
      )
      thumb.append(image, fallback)

      const main = createElement('div', 'archive-page-item-main')
      const title = createElement('div', 'archive-page-item-title', post.title)
      const meta = createElement('div', 'archive-page-item-meta')
      meta.append(
        createElement('span', 'archive-page-item-category', post.primaryCategory || this.labels.uncategorized),
        createElement('span', 'archive-page-item-divider', '/'),
        createElement('span', 'archive-page-item-date', post.dateLabel)
      )
      main.append(title, meta)

      const arrow = createElement('div', 'archive-page-item-arrow')
      const arrowIcon = createElement('i', 'solitude fas fa-chevron-right')
      arrow.setAttribute('aria-hidden', 'true')
      arrow.appendChild(arrowIcon)
      item.append(thumb, main, arrow)
      return item
    },

    renderPagination(totalPages) {
      this.pagination.replaceChildren()
      this.paginationSection.hidden = totalPages <= 1
      if (totalPages <= 1) return

      this.pagination.appendChild(
        this.createPageButton(
          this.currentPage - 1,
          this.labels.previous,
          'archive-page-extend prev',
          this.currentPage === 1,
          'fa-chevron-left'
        )
      )

      this.getPageRange(totalPages).forEach((page) => {
        if (page === 'space') {
          this.pagination.appendChild(createElement('span', 'archive-page-space', '...'))
          return
        }
        const button = this.createPageButton(page, String(page), 'archive-page-number', false)
        if (page === this.currentPage) {
          button.classList.add('is-current')
          button.setAttribute('aria-current', 'page')
        }
        this.pagination.appendChild(button)
      })

      this.pagination.appendChild(
        this.createPageButton(
          this.currentPage + 1,
          this.labels.next,
          'archive-page-extend next',
          this.currentPage === totalPages,
          'fa-chevron-right'
        )
      )
    },

    createPageButton(page, label, className, disabled, iconName) {
      const button = createElement('button', className)
      button.type = 'button'
      button.disabled = disabled
      button.dataset.archivePage = String(page)
      button.setAttribute('aria-label', label)
      if (iconName === 'fa-chevron-left') button.appendChild(createElement('i', `solitude fas ${iconName}`))
      button.appendChild(createElement('span', '', label))
      if (iconName === 'fa-chevron-right') button.appendChild(createElement('i', `solitude fas ${iconName}`))
      return button
    },

    getPageRange(totalPages) {
      if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
      if (this.currentPage <= 4) return [1, 2, 3, 4, 5, 'space', totalPages]
      if (this.currentPage >= totalPages - 3)
        return [1, 'space', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
      return [1, 'space', this.currentPage - 1, this.currentPage, this.currentPage + 1, 'space', totalPages]
    },

    renderState(shell, message) {
      const list = shell.querySelector('#archives-page-list')
      if (!list) return
      list.replaceChildren(createElement('div', 'archive-page-state', message))
    },

    destroy() {
      this.abortController?.abort()
      this.abortController = null
      this.shell = null
      this.list = null
      this.yearList = null
      this.pagination = null
      this.paginationSection = null
      this.posts = []
      this.labels = null
    }
  }

  return controller
})()

export const initArchivePage = () => archivePageController.init()
