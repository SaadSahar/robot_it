/**
 * Gemini Handler Utilities
 * Helper functions for Gemini Live API text-to-audio processing
 * 
 * Note: The main Gemini Live API interaction is handled by gemini-live-client.js
 * This file provides utility functions for text processing and validation
 */

const { config } = require('./config');

/**
 * Validate if text is within the computer science domain
 * This is a client-side helper - the actual domain filtering is done by the system instruction
 * @param {string} text - Text to validate
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateComputerScienceDomain(text) {
  const lowerText = text.toLowerCase();
  
  // Keywords related to computer science and information engineering
  const csKeywords = [
    // Programming languages
    'برمجة', 'programming', 'python', 'java', 'javascript', 'c++', 'c#', 'ruby', 'php',
    'لغة', 'code', 'coding', 'algorithm', 'خوارزمية',
    
    // Computer science concepts
    'حاسب', 'آلي', 'computer', 'computing', 'software', 'hardware',
    'data structure', 'بنية البيانات', 'database', 'قاعدة بيانات',
    'network', 'شبكة', 'internet', 'إنترنت', 'web', 'ويب',
    
    // AI and ML
    'ذكاء اصطناعي', 'artificial intelligence', 'ai', 'machine learning',
    'تعلم آلة', 'deep learning', 'neural network', 'شبكة عصبية',
    
    // Security
    'security', 'أمن', 'cybersecurity', 'encryption', 'تشفير', 'hacking',
    
    // Systems
    'operating system', 'نظام تشغيل', 'linux', 'windows', 'cloud', 'سحابة',
    
    // Engineering
    'هندسة', 'engineering', 'information technology', 'it', 'تقنية المعلومات',
    
    // Development
    'development', 'تطوير', 'frontend', 'backend', 'fullstack',
    'api', 'framework', 'library'
  ];
  
  // Check if any CS keyword is present
  const hasCSKeyword = csKeywords.some(keyword => lowerText.includes(keyword));
  
  if (hasCSKeyword) {
    return { valid: true, reason: 'السؤال ضمن مجال علوم الحاسب' };
  }
  
  // Check for obviously non-CS topics
  const nonCSKeywords = [
    'طب', 'medicine', 'doctor', 'طبيب',
    'محاماة', 'law', 'lawyer', 'محامي',
    'تجارة', 'business', 'marketing', 'تسويق',
    'رياضة', 'sports', 'كرة', 'football',
    'طهي', 'cooking', 'وصفة', 'recipe',
    'زراعة', 'agriculture', 'farming'
  ];
  
  const hasNonCSKeyword = nonCSKeywords.some(keyword => lowerText.includes(keyword));
  
  if (hasNonCSKeyword) {
    return { 
      valid: false, 
      reason: 'السؤال خارج مجال تخصصي (هندسة المعلوماتية وعلوم الحاسب)' 
    };
  }
  
  // If no clear indicators, assume it might be valid (let the AI decide)
  return { valid: true, reason: 'يحتاج تقييم من الذكاء الاصطناعي' };
}

/**
 * Clean text by removing extra whitespace and normalizing
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/[\u200B-\u200D\uFEFF]/g, '');  // Remove zero-width characters
}

/**
 * Extract Arabic text from a mixed string
 * @param {string} text - Text to process
 * @returns {string} Arabic text portion
 */
function extractArabicText(text) {
  if (!text) return '';
  
  // Arabic Unicode range: \u0600-\u06FF
  const arabicRegex = /[\u0600-\u06FF\s\.,:;!?()]+/g;
  const matches = text.match(arabicRegex);
  
  return matches ? matches.join(' ').trim() : '';
}

/**
 * Check if text is primarily Arabic
 * @param {string} text - Text to check
 * @returns {boolean} True if primarily Arabic
 */
function isPrimarilyArabic(text) {
  if (!text) return false;
  
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  
  return totalChars > 0 && (arabicChars / totalChars) > 0.3;
}

/**
 * Format text for display (add proper spacing after punctuation)
 * @param {string} text - Text to format
 * @returns {string} Formatted text
 */
function formatTextForDisplay(text) {
  if (!text) return '';
  
  return text
    .replace(/([.!?])([^\s])/g, '$1 $2')  // Add space after punctuation
    .replace(/([:,])([^\s])/g, '$1 $2')   // Add space after colon/comma
    .trim();
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

module.exports = {
  validateComputerScienceDomain,
  cleanText,
  extractArabicText,
  isPrimarilyArabic,
  formatTextForDisplay,
  truncateText
};
