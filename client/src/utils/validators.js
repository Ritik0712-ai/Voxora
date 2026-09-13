export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(String(email).toLowerCase())
}

export const validatePassword = (password) => {
  return password && password.length >= 8
}

export const validateText = (text, maxLength = 5000) => {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Text is required' }
  }
  if (text.length > maxLength) {
    return { valid: false, error: `Text exceeds maximum length of ${maxLength} characters` }
  }
  return { valid: true }
}

export const countWords = (text) => {
  if (!text || text.trim().length === 0) return 0
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

export const countCharacters = (text) => {
  return text ? text.length : 0
}
