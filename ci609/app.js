// Main app functionality 
class MindApp {
    constructor() {
        this.entries = [];
        this.currentMood = null;
        this.weatherData = null;
        this.currentView = 'mood-logger';
        this.weatherService = null;
    }

    init() {
        this.loadEntries();
        this.migrateToEncryption(); 
        this.setupEventListeners();
        this.initializeWeatherService();
        this.getWeatherData();
        this.updateEntriesView();
        console.log('Mind App initialized');
    }

    initializeWeatherService() {
    
        if (typeof weatherService !== 'undefined') {
            this.weatherService = weatherService;
        } else {
            console.warn('Weather service not loaded, using mock data');
            this.weatherService = {
                getCurrentWeather: async () => this.getDefaultWeather()
            };
        }
    }

    setupEventListeners() {
        // Mood selection
        document.querySelectorAll('.mood-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectMood(e.currentTarget);
            });
        });

        // Comment character count
        const commentInput = document.getElementById('mood-comment');
        if (commentInput) {
            commentInput.addEventListener('input', (e) => {
                this.updateCharCount(e.target.value.length);
            });
        }

        // Save entry
        const saveBtn = document.getElementById('save-entry');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveEntry();
            });
        }

        // Navigation
        const newEntryBtn = document.getElementById('new-entry-btn');
        const viewEntriesBtn = document.getElementById('view-entries-btn');
        const exportBtn = document.getElementById('export-btn');
        
        if (newEntryBtn) newEntryBtn.addEventListener('click', () => this.showView('mood-logger'));
        if (viewEntriesBtn) viewEntriesBtn.addEventListener('click', () => this.showView('entries-view'));
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());

        // Entries filter
        const moodFilter = document.getElementById('mood-filter');
        const clearFilter = document.getElementById('clear-filter');
        
        if (moodFilter) {
            moodFilter.addEventListener('change', (e) => {
                console.log('Filter changed to:', e.target.value);
                this.filterEntries(e.target.value);
            });
        }
        
        if (clearFilter) {
            clearFilter.addEventListener('click', () => {
                console.log('Clear filter clicked');
                document.getElementById('mood-filter').value = 'all';
                this.filterEntries('all');
            });
        }

        // Delete all entries button
        const deleteAllBtn = document.getElementById('delete-all-btn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.showDeleteConfirmation();
            });
        }
        
        // Modal buttons
        const cancelDeleteBtn = document.getElementById('cancel-delete');
        const confirmDeleteBtn = document.getElementById('confirm-delete');
        
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                this.hideDeleteConfirmation();
            });
        }
        
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.deleteAllEntries();
            });
        }
        
        // Close modal when clicking outside
        const modalOverlay = document.getElementById('delete-modal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideDeleteConfirmation();
                }
            });
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideDeleteConfirmation();
            }
        });
    }

    selectMood(option) {
        // Removes selected class from all options
        document.querySelectorAll('.mood-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Adds selected class to clicked option
        option.classList.add('selected');
        
        // Stores selected mood
        this.currentMood = option.getAttribute('data-mood');
        
        // Enables save button
        const saveBtn = document.getElementById('save-entry');
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    }

    updateCharCount(count) {
        const charCountElement = document.getElementById('char-count');
        if (charCountElement) {
            charCountElement.textContent = count;
        }
    }

    async getWeatherData() {
        const loadingElement = document.getElementById('weather-loading');
        const displayElement = document.getElementById('weather-display');
        const errorElement = document.getElementById('weather-error');
        
        if (!loadingElement || !displayElement || !errorElement) {
            console.warn('Weather display elements not found');
            return;
        }
        
        try {
            // Resets display
            loadingElement.style.display = 'flex';
            displayElement.style.display = 'none';
            errorElement.style.display = 'none';
            
            // Gets weather data from service
            const weather = await this.weatherService.getCurrentWeather();
            this.weatherData = weather;
            
            // Update display
            loadingElement.style.display = 'none';
            displayElement.style.display = 'block';
            
            // Updates weather icon
            const iconElement = document.getElementById('weather-icon');
            if (iconElement) {
                iconElement.textContent = weather.icon;
                iconElement.className = 'weather-icon ' + (weather.iconClass || 'weather-sunny');
            }
            
            // Updates weather text
            const conditionElement = document.getElementById('weather-condition');
            const tempElement = document.getElementById('weather-temp');
            const locationElement = document.getElementById('weather-location');
            
            if (conditionElement) conditionElement.textContent = weather.condition;
            if (tempElement) tempElement.textContent = `${weather.temperature}°C`;
            if (locationElement) locationElement.textContent = weather.location;
            
            // Updates time
            const timeElement = document.getElementById('weather-time');
            if (timeElement) {
                const now = new Date();
                timeElement.textContent = now.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            
        } catch (error) {
            console.error('Failed to get weather data:', error);
            
            if (loadingElement) loadingElement.style.display = 'none';
            if (displayElement) displayElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'block';
            
            // Use default weather data
            this.weatherData = this.getDefaultWeather();
        }
    }

    getDefaultWeather() {
        return {
            temperature: 15,
            feels_like: 15,
            condition: 'Weather data unavailable',
            icon: '🌤️',
            iconClass: 'weather-sunny',
            humidity: 65,
            pressure: 1013,
            windSpeed: 3.5,
            windDirection: 180,
            clouds: 20,
            location: 'Unknown location',
            timestamp: new Date()
        };
    }

    saveEntry() {
        if (!this.currentMood) {
            alert('Please select a mood first');
            return;
        }

        const commentElement = document.getElementById('mood-comment');
        const comment = commentElement ? commentElement.value.trim() : '';
        const selectedOption = document.querySelector('.mood-option.selected');
        
        if (!selectedOption) {
            alert('Please select a mood');
            return;
        }
        
        const emoji = selectedOption.getAttribute('data-emoji');

        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            mood: this.currentMood,
            emoji: emoji,
            comment: comment,
            weather: this.weatherData || this.getDefaultWeather()
        };

        // Add to entries array (newest first)
        this.entries.unshift(entry);
        
        // Save to localStorage with encryption
        this.saveToStorage();
        
        // Reset form
        this.resetForm();
        
        // Update entries view
        this.updateEntriesView();
        
        // Show success message
        this.showSuccessMessage();
        
        // Switch to entries view
        this.showView('entries-view');
        
        console.log('Entry saved and encrypted:', entry);
    }

    resetForm() {
        // Clear mood selection
        document.querySelectorAll('.mood-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Clear comment
        const commentInput = document.getElementById('mood-comment');
        if (commentInput) {
            commentInput.value = '';
            this.updateCharCount(0);
        }
        
        // Disable save button
        const saveBtn = document.getElementById('save-entry');
        if (saveBtn) {
            saveBtn.disabled = true;
        }
        
        this.currentMood = null;
    }

    showSuccessMessage() {
        const saveBtn = document.getElementById('save-entry');
        if (!saveBtn) return;
        
        const originalText = saveBtn.textContent;
        const originalBackground = saveBtn.style.background;
        
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = '#28a745';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = originalBackground || '#667eea';
        }, 2000);
    }

    saveToStorage() {
        try {
            // Gets current PIN from the auth manager
            const currentPIN = window.auth ? window.auth.getCurrentPIN() : '';
            
            if (!currentPIN) {
                console.error('No PIN available for encryption');
                alert('Security error: Cannot save data without PIN');
                return;
            }
            
            // Encrypts entries before saving
            if (typeof encryptionService !== 'undefined') {
                const encryptedEntries = encryptionService.encryptData(this.entries, currentPIN);
                localStorage.setItem('mindEntries', encryptedEntries);
                console.log('Entries encrypted and saved');
            } else {
                //As a fallback: store without encryption 
                console.warn('Encryption service not available, storing unencrypted');
                localStorage.setItem('mindEntries', JSON.stringify(this.entries));
            }
            
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            
            // Handle specific encryption errors
            if (error.message.includes('encrypt') || error.message.includes('PIN')) {
                alert('Security error: Failed to encrypt data. Please log out and log back in.');
            } else if (error.name === 'QuotaExceededError') {
                alert('Storage is full. Please delete some old entries.');
            } else {
                alert('Error saving data. Please try again.');
            }
        }
    }

    loadEntries() {
        try {
            const storedEntries = localStorage.getItem('mindEntries');
            
            if (!storedEntries) {
                this.entries = [];
                return;
            }
            
            // Get current PIN from auth manager
            const currentPIN = window.auth ? window.auth.getCurrentPIN() : '';
            
            if (!currentPIN) {
                console.error('No PIN available for decryption');
                this.entries = [];
                return;
            }
            
            // Check if data is encrypted
            if (typeof encryptionService !== 'undefined' && 
                encryptionService.isEncrypted(storedEntries)) {
                
                try {
                    // Decrypt the entries
                    const decryptedEntries = encryptionService.decryptData(storedEntries, currentPIN);
                    
                    // Ensure it's an array
                    if (Array.isArray(decryptedEntries)) {
                        this.entries = decryptedEntries;
                        // Ensures entries are sorted by timestamp (newest first)
                        this.entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        console.log('Entries decrypted and loaded:', this.entries.length);
                    } else {
                        console.error('Decrypted data is not an array');
                        this.entries = [];
                    }
                    
                } catch (decryptError) {
                    console.error('Decryption error:', decryptError);
                    
                    // Check if it's a wrong PIN error
                    if (decryptError.message && decryptError.message.includes('Wrong PIN')) {
                        alert('Security error: Could not decrypt data with current PIN. Please log out and log back in.');
                    } else {
                        alert('Error loading saved data. Some entries may be corrupted.');
                    }
                    
                    this.entries = [];
                }
                
            } else {
                // Data is not encrypted
                console.warn('Loading unencrypted data (legacy/fallback)');
                this.entries = JSON.parse(storedEntries);
                
                // Ensure entries are sorted by timestamp (newest first)
                if (this.entries && Array.isArray(this.entries)) {
                    this.entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                } else {
                    this.entries = [];
                }
            }
            
        } catch (error) {
            console.error('Error loading entries:', error);
            this.entries = [];
            
            // Try to recover with fallback
            try {
                const storedEntries = localStorage.getItem('mindEntries');
                if (storedEntries) {
                    this.entries = JSON.parse(storedEntries);
                    console.warn('Loaded entries without encryption (fallback)');
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                this.entries = [];
            }
        }
    }

    migrateToEncryption() {
        // Check if we have unencrypted data that needs to be encrypted
        const storedEntries = localStorage.getItem('mindEntries');
        
        if (!storedEntries) return;
        
        // Check if data is already encrypted
        if (typeof encryptionService !== 'undefined' && 
            encryptionService.isEncrypted(storedEntries)) {
            return; // Already encrypted
        }
        
        try {
            // Parse unencrypted data
            const unencryptedEntries = JSON.parse(storedEntries);
            
            // Get current PIN
            const currentPIN = window.auth ? window.auth.getCurrentPIN() : '';
            
            if (!currentPIN || !Array.isArray(unencryptedEntries)) {
                return;
            }
            
            // Encrypt the data
            const encryptedEntries = encryptionService.encryptData(unencryptedEntries, currentPIN);
            
            // Save encrypted version
            localStorage.setItem('mindEntries', encryptedEntries);
            localStorage.setItem('dataMigrated', 'true');
            
            console.log('Data migrated to encrypted format');
            
        } catch (error) {
            console.error('Migration error:', error);
        }
    }

    updateEntriesView() {
        const container = document.getElementById('entries-container');
        const noEntries = document.getElementById('no-entries');
        
        if (!container) {
            console.error('Entries container not found');
            return;
        }
        
        // Always reset filter to 'all' when updating view
        const moodFilter = document.getElementById('mood-filter');
        if (moodFilter) {
            moodFilter.value = 'all';
        }
        
        if (this.entries.length === 0) {
            // Show no entries message
            if (noEntries) {
                container.innerHTML = '';
                container.appendChild(noEntries);
                noEntries.style.display = 'block';
                // Update message text
                const messageElement = noEntries.querySelector('p');
                if (messageElement) {
                    messageElement.textContent = 'No entries yet. Start by logging your first mood!';
                }
            } else {
                container.innerHTML = '<div class="no-entries"><p>No entries yet. Start by logging your first mood!</p></div>';
            }
            
            // Update entry count
            this.updateEntryCount();
            // Update delete button state
            this.updateDeleteButtonState();
            
            return;
        }
        
        // Hide no entries message
        if (noEntries) {
            noEntries.style.display = 'none';
        }
        
        // Create entries HTML
        const entriesHTML = this.entries.map(entry => this.createEntryHTML(entry)).join('');
        container.innerHTML = entriesHTML;
        
        // Update entry count
        this.updateEntryCount();
        // Update delete button state
        this.updateDeleteButtonState();
        
        // Make sure all entries are visible
        setTimeout(() => {
            this.filterEntries('all');
        }, 10);
    }

    updateEntryCount() {
        const entryCountElement = document.getElementById('entry-count');
        if (entryCountElement) {
            entryCountElement.textContent = this.entries.length;
        }
    }

    createEntryHTML(entry) {
        const date = new Date(entry.timestamp);
        const formattedDate = date.toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const weather = entry.weather || this.getDefaultWeather();
        
        return `
            <div class="entry-card" data-mood="${entry.mood}" data-id="${entry.id}">
                <div class="entry-header">
                    <div class="entry-mood">${entry.emoji || '😐'}</div>
                    <div class="entry-details">
                        <div class="entry-date">${formattedDate}</div>
                        <div class="entry-weather">
                            <span>${weather.icon || '🌤️'} ${weather.condition || 'No weather data'}</span>
                            <span class="weather-detail">${weather.temperature || '?'}°C • ${weather.location || 'Unknown location'}</span>
                        </div>
                    </div>
                </div>
                ${entry.comment ? `<div class="entry-comment">${this.escapeHTML(entry.comment)}</div>` : ''}
            </div>
        `;
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    filterEntries(moodFilter) {
        console.log('Filtering entries for mood:', moodFilter);
        
        const container = document.getElementById('entries-container');
        if (!container) {
            console.error('Entries container not found');
            return;
        }
        
        const entries = container.querySelectorAll('.entry-card');
        let noEntriesElement = document.getElementById('no-entries');
        
        // Create no-entries element if it doesn't exist
        if (!noEntriesElement) {
            noEntriesElement = document.createElement('div');
            noEntriesElement.id = 'no-entries';
            noEntriesElement.className = 'no-entries';
            noEntriesElement.style.display = 'none';
            container.appendChild(noEntriesElement);
        }
        
        // If no entries exist, show appropriate message
        if (this.entries.length === 0) {
            noEntriesElement.innerHTML = '<p>No entries yet. Start by logging your first mood!</p>';
            noEntriesElement.style.display = 'block';
            return;
        }
        
        // Count entries for current mood
        let visibleCount = 0;
        let selectedMoodName = '';
        
        // Get the mood name for the message
        if (moodFilter !== 'all') {
            const filterElement = document.getElementById('mood-filter');
            if (filterElement) {
                const selectedOption = filterElement.options[filterElement.selectedIndex];
                selectedMoodName = selectedOption.textContent;
            }
        }
        
        // Show/hide entries based on filter
        entries.forEach(entry => {
            const entryMood = entry.getAttribute('data-mood');
            
            if (moodFilter === 'all' || entryMood === moodFilter) {
                entry.style.display = 'block';
                entry.style.opacity = '1';
                entry.style.visibility = 'visible';
                visibleCount++;
            } else {
                entry.style.display = 'none';
                entry.style.opacity = '0';
                entry.style.visibility = 'hidden';
            }
        });
        
        console.log(`Visible entries: ${visibleCount}/${entries.length}`);
        
        // Handle no entries message
        if (visibleCount === 0) {
            if (moodFilter === 'all') {
                
                noEntriesElement.innerHTML = '<p>No entries found.</p>';
            } else {
                // No entries for the selected mood
                noEntriesElement.innerHTML = `
                    <p>No entries match "${selectedMoodName}".</p>
                    <p class="filter-suggestion">Try selecting a different mood or click "Clear Filter" to see all entries.</p>
                `;
            }
            noEntriesElement.style.display = 'block';
        } else {
            noEntriesElement.style.display = 'none';
        }
    }

    showView(viewName) {
        console.log('Switching to view:', viewName);
        
        // Hide all views
        document.querySelectorAll('.mood-logger, .entries-view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show selected view
        const viewElement = document.getElementById(viewName);
        if (viewElement) {
            viewElement.classList.add('active');
        }
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (viewName === 'mood-logger') {
            const newEntryBtn = document.getElementById('new-entry-btn');
            if (newEntryBtn) newEntryBtn.classList.add('active');
            // Refresh weather data when showing mood logger
            this.getWeatherData();
        } else if (viewName === 'entries-view') {
            const viewEntriesBtn = document.getElementById('view-entries-btn');
            if (viewEntriesBtn) viewEntriesBtn.classList.add('active');
            // Make sure entries are visible
            this.filterEntries('all');
        }
        
        this.currentView = viewName;
    }

    exportData() {
        // Get current PIN from auth manager
        const currentPIN = window.auth ? window.auth.getCurrentPIN() : '';
        
        if (!currentPIN) {
            alert('Security error: Cannot export without PIN');
            return;
        }
        
        if (this.entries.length === 0) {
            alert('No entries to export yet.');
            return;
        }
        
        try {
            // Create export data structure
            const exportData = {
                app: "Mind App",
                version: "1.0",
                exportedAt: new Date().toISOString(),
                entryCount: this.entries.length,
                entries: this.entries,
                instructions: "Use your PIN to decrypt this data in a compatible viewer"
            };
            
            // Encrypt the export data
            const encryptedData = encryptionService.encryptData(exportData, currentPIN);
            
            // Create final export object
            const finalExport = {
                encrypted: true,
                data: encryptedData,
                format: "AES-256-CBC",
                salt: encryptionService.salt,
                iterations: encryptionService.iterations,
                note: "This data is encrypted. You need the original PIN to decrypt it."
            };
            
            const jsonString = JSON.stringify(finalExport, null, 2);
            
            // Check if Web Share API is available
            if (navigator.share) {
                try {
                    navigator.share({
                        title: 'Mind App Encrypted Data Export',
                        text: `My encrypted mental health journal with ${this.entries.length} entries`,
                        files: [
                            new File([jsonString], `mind-app-encrypted-${Date.now()}.json`, {
                                type: 'application/json'
                            })
                        ]
                    }).then(() => {
                        console.log('Encrypted export shared successfully');
                        this.showExportSuccessMessage();
                    }).catch(error => {
                        console.log('Share cancelled or failed:', error);
                        this.downloadEncryptedJSON(jsonString);
                    });
                } catch (error) {
                    console.log('Web Share API error, falling back to download:', error);
                    this.downloadEncryptedJSON(jsonString);
                }
            } else {
                // Fallback to download
                this.downloadEncryptedJSON(jsonString);
            }
            
        } catch (error) {
            console.error('Export encryption error:', error);
            alert('Failed to encrypt data for export. Please try again.');
        }
    }

    downloadEncryptedJSON(jsonString) {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mind-app-encrypted-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showExportSuccessMessage();
    }

    showExportSuccessMessage() {
    const exportBtn = document.getElementById('export-btn');
    if (!exportBtn) return;
    
    // Store original styles
    const originalText = exportBtn.textContent;
    const originalBackground = window.getComputedStyle(exportBtn).backgroundColor;
    const originalColor = window.getComputedStyle(exportBtn).color;
    
    // Change to success state
    exportBtn.textContent = 'Encrypted Export Complete!';
    exportBtn.style.backgroundColor = '#28a745';
    exportBtn.style.color = 'white';
    exportBtn.style.borderColor = '#28a745';
    
    // Resets back to original state after 2 seconds
    setTimeout(() => {
        exportBtn.textContent = originalText;
        exportBtn.style.backgroundColor = originalBackground;
        exportBtn.style.color = originalColor;
        exportBtn.style.borderColor = '';
        
        
        exportBtn.classList.remove('active');
    }, 2000);
   }

    showDeleteConfirmation() {
        if (this.entries.length === 0) {
            alert('There are no entries to delete.');
            return;
        }
        
        const modal = document.getElementById('delete-modal');
        const modalText = document.getElementById('delete-modal-text');
        
        if (modal && modalText) {
            // Update modal text with entry count
            const entryWord = this.entries.length === 1 ? 'entry' : 'entries';
            modalText.textContent = `Are you sure you want to delete all ${this.entries.length} journal ${entryWord}? This action cannot be undone.`;
            
            modal.classList.add('active');
        }
    }

    hideDeleteConfirmation() {
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    deleteAllEntries() {
        // Clear all entries
        this.entries = [];
        localStorage.removeItem('mindEntries');
        
        // Update UI
        this.updateEntriesView();
        
        // Hide modal
        this.hideDeleteConfirmation();
        
        // Show success message
        this.showDeleteSuccessMessage();
        
        console.log('All entries deleted');
    }

    showDeleteSuccessMessage() {
        
        const message = document.createElement('div');
        message.className = 'success-message';
        message.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1001;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                animation: slideIn 0.3s ease;
            ">
                <span style="font-size: 1.2rem;">✓</span>
                <span>All entries have been deleted successfully.</span>
            </div>
        `;
        
        document.body.appendChild(message);
        
        // Remove after 3 seconds
        setTimeout(() => {
            message.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 300);
        }, 3000);
    }

    updateDeleteButtonState() {
        const deleteBtn = document.getElementById('delete-all-btn');
        if (deleteBtn) {
            if (this.entries.length === 0) {
                deleteBtn.disabled = true;
                deleteBtn.title = 'No entries to delete';
            } else {
                deleteBtn.disabled = false;
                deleteBtn.title = `Delete all ${this.entries.length} entries`;
            }
        }
    }

    // Utility method to clear all data 
    clearAllData() {
        if (confirm('Are you sure you want to delete ALL your entries? This cannot be undone.')) {
            this.entries = [];
            localStorage.removeItem('mindEntries');
            this.updateEntriesView();
            alert('All entries have been deleted.');
        }
    }
}



window.app = new MindApp();

