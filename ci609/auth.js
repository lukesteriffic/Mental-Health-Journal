// Authentication functionality 
class AuthManager {
    constructor() {
        this.currentPin = '';
        this.isSetup = localStorage.getItem('pinSet') === 'true';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showCorrectAuthForm();
        this.updatePinDots(); // Initialize dots to empty state
    }

    setupEventListeners() {
        // PIN input handling
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', (e) => {
                const value = e.target.getAttribute('data-value');
                this.handleKeyPress(value);
            });
        });

        // Keyboard input support
        document.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') {
                this.handleKeyPress(e.key);
            } else if (e.key === 'Backspace') {
                this.handleKeyPress('clear');
            } else if (e.key === 'Enter') {
                this.handleKeyPress('submit');
            }
        });
    }

    showCorrectAuthForm() {
        const setupForm = document.getElementById('setup-pin');
        const loginForm = document.getElementById('login-pin');

        if (this.isSetup) {
            setupForm.style.display = 'none';
            loginForm.style.display = 'block';
        } else {
            setupForm.style.display = 'block';
            loginForm.style.display = 'none';
        }
        
        // Clear PIN when switching forms
        this.currentPin = '';
        this.updatePinDots();
    }

    handleKeyPress(value) {
        const errorElement = this.isSetup ? 
            document.getElementById('login-error') : 
            document.getElementById('pin-error');

        switch (value) {
            case 'clear':
                this.currentPin = this.currentPin.slice(0, -1);
                break;
            case 'submit':
                this.handleSubmit();
                break;
            default:
                if (this.currentPin.length < 4) {
                    this.currentPin += value;
                }
                break;
        }

        // Updates visual PIN dots
        this.updatePinDots();

        // Clear error when user starts typing again
        if (errorElement && errorElement.style.display !== 'none') {
            errorElement.style.display = 'none';
        }
        
        // Log for debugging in web tools
        console.log('PIN entered:', this.currentPin, 'Length:', this.currentPin.length);
    }

    updatePinDots() {
        // Get only the dots in the active form
        let dots;
        
        if (this.isSetup) {
            // Login form is active
            dots = document.querySelectorAll('#login-pin .pin-dot');
        } else {
            // Setup form is active
            dots = document.querySelectorAll('#setup-pin .pin-dot');
        }
        
        console.log('Found dots:', dots.length, 'Form:', this.isSetup ? 'login' : 'setup');
        
        if (!dots || dots.length === 0) {
            console.error('No PIN dots found for active form!');
            // Tries to find any dots as fallback
            dots = document.querySelectorAll('.pin-dot');
            if (dots.length === 0) {
                console.error('No PIN dots found anywhere!');
                return;
            }
        }
        
        // Updates each dot
        dots.forEach((dot, index) => {
            if (index < this.currentPin.length) {
                dot.classList.add('filled');
                console.log(`Dot ${index}: filled`);
            } else {
                dot.classList.remove('filled');
                console.log(`Dot ${index}: empty`);
            }
        });
    }

    handleSubmit() {
        if (this.currentPin.length !== 4) {
            this.showError('Please enter a 4-digit PIN');
            return;
        }

        if (this.isSetup) {
            this.verifyPin();
        } else {
            this.setupPin();
        }
    }

    setupPin() {
        try {
            console.log('Setting up PIN:', this.currentPin);
            
            // Stores PIN directly in local storage
            localStorage.setItem('userPIN', this.currentPin);
            localStorage.setItem('pinSet', 'true');
            
            // Stores PIN in session for immediate use
            sessionStorage.setItem('currentPIN', this.currentPin);
            
            this.isSetup = true;
            this.completeAuthentication();
            
        } catch (error) {
            console.error('PIN setup error:', error);
            this.showError('Failed to set up PIN. Please try again.');
            this.currentPin = '';
            this.updatePinDots();
        }
    }

    verifyPin() {
        try {
            const storedPIN = localStorage.getItem('userPIN');
            
            console.log('Verifying PIN. Stored:', storedPIN, 'Entered:', this.currentPin);
            
            if (!storedPIN) {
                this.showError('No PIN found. Please set up a new PIN.');
                this.currentPin = '';
                this.updatePinDots();
                this.isSetup = false;
                this.showCorrectAuthForm();
                return;
            }
            
            // Compares PINs
            if (this.currentPin === storedPIN) {
                // Stores PIN in session storage for immediate use
                sessionStorage.setItem('currentPIN', this.currentPin);
                this.completeAuthentication();
            } else {
                this.showError('Invalid PIN. Please try again.');
                this.currentPin = '';
                this.updatePinDots();
                this.shakePINInput();
            }
            
        } catch (error) {
            console.error('PIN verification error:', error);
            this.showError('Error verifying PIN. Please try again.');
            this.currentPin = '';
            this.updatePinDots();
        }
    }

    showError(message) {
        let errorElement;
        
        if (this.isSetup) {
            errorElement = document.getElementById('login-error');
        } else {
            errorElement = document.getElementById('pin-error');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            console.error('Error shown:', message);
        }
    }

    shakePINInput() {
        let pinContainer;
        
        if (this.isSetup) {
            pinContainer = document.querySelector('#login-pin .pin-input-container');
        } else {
            pinContainer = document.querySelector('#setup-pin .pin-input-container');
        }
        
        if (pinContainer) {
            // Adds shake animation for when the user enters the wrong pin when returning
            pinContainer.classList.add('shake');
            
            // Remove after animation completes
            setTimeout(() => {
                pinContainer.classList.remove('shake');
            }, 500);
        }
    }

    completeAuthentication() {
        console.log('Authentication has been completed, switching to main app');
        
        // Switches to main app screen after user has entered the correct PIN (the one they set up when they first visited the page)
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app-screen');
        
        if (authScreen && appScreen) {
            authScreen.classList.remove('active');
            appScreen.classList.add('active');
            
            // Initialize main app
            if (typeof app !== 'undefined' && app.init) {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    app.init();
                }, 100);
            } else {
                console.error('Main app not found or init method missing');
            }
        } else {
            console.error('Screen elements not found');
        }
    }

    getCurrentPIN() {
        // Gets PIN from session storage first, then localStorage
        return sessionStorage.getItem('currentPIN') || localStorage.getItem('userPIN') || '';
    }

    clearSession() {
        // Clears PIN from session storage on logout
        sessionStorage.removeItem('currentPIN');
    }

    logout() {
        console.log('Logging out...');
        this.currentPin = '';
        this.clearSession();
        this.updatePinDots();
        
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app-screen');
        
        if (authScreen && appScreen) {
            appScreen.classList.remove('active');
            authScreen.classList.add('active');
        }
        
        this.showCorrectAuthForm();
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing auth...');
    const auth = new AuthManager();
    
    // Makes auth available globally for logging out
    window.auth = auth;
    
    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.logout());
    }
    
    // Logs initial state to the console
    console.log('Initial auth state:', {
        isSetup: auth.isSetup,
        localStorage: {
            pinSet: localStorage.getItem('pinSet'),
            userPIN: localStorage.getItem('userPIN')
        }
    });
});