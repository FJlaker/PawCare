function validateRequired(value, fieldName) {
    if (!String(value || '').trim()) {
        return `${fieldName} is required.`;
    }
    return '';
}

function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !pattern.test(email)) {
        return 'Please enter a valid email address.';
    }
    return '';
}

function validatePhone(phone) {
    if (!phone || !/^[0-9+()\-\s]{8,20}$/.test(phone)) {
        return 'Please enter a valid phone number.';
    }
    return '';
}
