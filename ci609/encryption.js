// Encryption Service using Crypto-JS
class EncryptionService {
    constructor() {
        this.salt = "mind-app-salt"; // Fixed salt for key derivation
        this.iterations = 1000; // PBKDF2 iterations
        this.keySize = 256 / 32; // 256-bit key
    }

    /**
     * Derive encryption key from user's PIN
     * Uses PBKDF2 for key derivation
     */
    deriveKeyFromPIN(pin) {
        try {
            // Create a key from the PIN using PBKDF2
            const key = CryptoJS.PBKDF2(pin, this.salt, {
                keySize: this.keySize,
                iterations: this.iterations
            });
            
            return key.toString(CryptoJS.enc.Hex);
        } catch (error) {
            console.error('Error deriving key from PIN:', error);
            throw new Error('Failed to create encryption key');
        }
    }

    //Encrypts data using AES-256
     
     
    encryptData(data, pin) {
        try {
            // Converts user's data to string if it's not already
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            
            // Derives key from PIN
            const key = this.deriveKeyFromPIN(pin);
            
            // Generates a random IV (Initialization Vector)
            const iv = CryptoJS.lib.WordArray.random(16);
            
            // Encrypts the data
            const encrypted = CryptoJS.AES.encrypt(dataString, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            
            // Combines IV and encrypted data for storage
            const result = {
                iv: iv.toString(CryptoJS.enc.Base64),
                data: encrypted.toString(),
                version: '1.0' // For future compatibility
            };
            
            return JSON.stringify(result);
            
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    //Decrypt data using AES-256
     
     
    decryptData(encryptedData, pin) {
        try {
            // Parses the encrypted data
            const encryptedObj = JSON.parse(encryptedData);
            
            // Checks version (for future compatibility)
            if (encryptedObj.version !== '1.0') {
                throw new Error('Unsupported encryption version');
            }
            
            // Derives key from PIN
            const key = this.deriveKeyFromPIN(pin);
            
            // Converts IV from Base64
            const iv = CryptoJS.enc.Base64.parse(encryptedObj.iv);
            
            // Decrypts the data
            const decrypted = CryptoJS.AES.decrypt(encryptedObj.data, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            
            // Converts to UTF-8 string
            const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
            
            // Tries to parse as JSON, returns as a string if it fails
            try {
                return JSON.parse(decryptedString);
            } catch (e) {
                return decryptedString;
            }
            
        } catch (error) {
            console.error('Decryption error:', error);
            
            // Check if it's a wrong PIN error
            if (error.toString().includes('malformed utf-8 data') || 
                error.toString().includes('pad block corrupted')) {
                throw new Error('Wrong PIN or corrupted data');
            }
            
            throw new Error('Failed to decrypt data');
        }
    }

    //Generate a hash of the PIN for storage (not reversible)
     
    
    hashPIN(pin) {
        try {
            // UseS SHA-256 to create a secure hash of the PIN
            const hash = CryptoJS.SHA256(pin + this.salt);
            return hash.toString(CryptoJS.enc.Hex);
        } catch (error) {
            console.error('Error hashing PIN:', error);
            throw new Error('Failed to hash PIN');
        }
    }

    //Verify a PIN against a stored hash
     
     
    verifyPIN(pin, storedHash) {
        try {
            const hash = this.hashPIN(pin);
            return hash === storedHash;
        } catch (error) {
            console.error('Error verifying PIN:', error);
            return false;
        }
    }

    //Generates a random encryption key
     
     
    generateRandomKey() {
        return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    }

    //Check if data is encrypted (by checking structure)
     
     
    isEncrypted(data) {
        try {
            const parsed = JSON.parse(data);
            return parsed && parsed.iv && parsed.data && parsed.version === '1.0';
        } catch (e) {
            return false;
        }
    }

    //Simple obfuscation for non-sensitive data (weather cache, etc.)
     
     
    obfuscate(data) {
        try {
            const dataString = JSON.stringify(data);
            return btoa(unescape(encodeURIComponent(dataString)));
        } catch (error) {
            console.error('Obfuscation error:', error);
            return data;
        }
    }

    //Deobfuscate data
     
     
    deobfuscate(obfuscatedData) {
        try {
            const decodedString = decodeURIComponent(escape(atob(obfuscatedData)));
            return JSON.parse(decodedString);
        } catch (error) {
            console.error('Deobfuscation error:', error);
            return obfuscatedData;
        }
    }
}

// Create and export encryption service instance
window.encryptionService = new EncryptionService();