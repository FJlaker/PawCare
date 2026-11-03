(() => {
    const speciesValues = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Other'];
    const visitTypes = [
        'Annual checkup',
        'Vaccination booster',
        'Surgery follow-up',
        'Spay/Neuter',
        'Consultation',
        'Emergency',
    ];

    function validatePetName(value) {
        const name = String(value || '').trim();
        if (name.length < 2 || name.length > 40 || !/^[A-Za-z][A-Za-z '\-]*$/.test(name)) {
            return 'Enter 2-40 characters using letters, spaces, hyphens, or apostrophes. Start with a letter.';
        }
        return '';
    }

    function validateSpecies(value) {
        return speciesValues.includes(value) ? '' : 'Choose a valid species.';
    }

    function validateBreed(value) {
        return String(value || '').trim().length <= 40 ? '' : 'Breed must be 40 characters or fewer.';
    }

    function validateDateNotFuture(value, label) {
        if (!value) {
            return '';
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return `Enter a valid ${label.toLowerCase()}.`;
        }
        const date = new Date(`${value}T00:00:00`);
        const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (Number.isNaN(date.getTime()) || dateValue !== value) {
            return `Enter a valid ${label.toLowerCase()}.`;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today ? `${label} cannot be in the future.` : '';
    }

    function validateDateOfBirth(value) {
        return validateDateNotFuture(value, 'Date of birth');
    }

    function validateGender(value) {
        return ['Male', 'Female'].includes(value) ? '' : 'Choose Male or Female.';
    }

    function validateNeuteredSpayed(value) {
        return typeof value === 'boolean' ? '' : 'Choose whether the pet is neutered or spayed.';
    }

    function validateOwnerName(value) {
        const name = String(value || '').trim();
        if (name.length < 2 || name.length > 60 || !/^[A-Za-z][A-Za-z '\-]*$/.test(name)) {
            return 'Enter 2-60 characters using letters, spaces, hyphens, or apostrophes.';
        }
        return '';
    }

    function validateEmail(value) {
        const email = String(value || '').trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Enter a valid email address.';
    }

    function normalizePhone(value) {
        return String(value || '').replace(/\s/g, '');
    }

    function validatePhone(value) {
        return /^(?:0\d{9}|\+27\d{9})$/.test(normalizePhone(value))
            ? ''
            : 'Enter a South African number: 10 digits starting with 0, or +27 followed by 9 digits.';
    }

    function validateDuplicatePatient(data, patients) {
        const duplicate = patients.some((patient) =>
            String(patient.pet_name).trim().toLowerCase() === data.pet_name.trim().toLowerCase()
            && String(patient.email).trim().toLowerCase() === data.email.trim().toLowerCase(),
        );
        return duplicate ? 'This pet is already registered for that owner email address.' : '';
    }

    function validatePatientId(value, patients) {
        return patients.some((patient) => String(patient.id) === String(value))
            ? ''
            : 'Select an existing patient.';
    }

    function validateVisitDate(value) {
        if (!value) {
            return 'Visit date is required.';
        }
        return validateDateNotFuture(value, 'Visit date');
    }

    function validateVisitType(value) {
        return visitTypes.includes(value) ? '' : 'Choose a valid visit type.';
    }

    function validateNotes(value) {
        return String(value || '').length <= 200 ? '' : 'Notes must be 200 characters or fewer.';
    }

    function validateVisitTime(value) {
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? '' : 'Enter a valid visit time.';
    }

    function showFieldError(form, fieldName, message) {
        const field = form.querySelector(`[name="${fieldName}"]`);
        const feedback = document.getElementById(`${fieldName}_error`);
        if (field) {
            field.classList.toggle('is-invalid', Boolean(message));
            field.setAttribute('aria-invalid', message ? 'true' : 'false');
            if (feedback) {
                field.setAttribute('aria-describedby', `${fieldName}_error`);
            } else {
                field.removeAttribute('aria-describedby');
            }
        }
        if (feedback) {
            feedback.textContent = message;
            feedback.classList.toggle('d-block', fieldName === 'gender' && Boolean(message));
            feedback.setAttribute('role', 'alert');
            feedback.setAttribute('aria-live', 'polite');
        }
    }

    function clearFormErrors(form) {
        form.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
        form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.setAttribute('aria-invalid', 'false'));
        form.querySelectorAll('.invalid-feedback').forEach((feedback) => {
            feedback.textContent = '';
            feedback.classList.remove('d-block');
        });
    }

    window.PawCareValidation = {
        normalizePhone,
        showFieldError,
        clearFormErrors,
        validatePetName,
        validateSpecies,
        validateBreed,
        validateDateOfBirth,
        validateGender,
        validateNeuteredSpayed,
        validateOwnerName,
        validateEmail,
        validatePhone,
        validateDuplicatePatient,
        validatePatientId,
        validateVisitDate,
        validateVisitType,
        validateNotes,
        validateVisitTime,
    };
})();
