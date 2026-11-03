document.addEventListener('DOMContentLoaded', () => {
    const validation = window.PawCareValidation;
    const api = window.PawCareApi;
    const form = document.querySelector('#patientForm');
    if (!validation || !api || !form) {
        return;
    }

    const successAlert = document.querySelector('#patientSuccess');
    const warningAlert = document.querySelector('#patientWarning');
    const errorAlert = document.querySelector('#patientError');
    const saveButton = form.querySelector('button[type="submit"]');
    const dobField = form.elements.namedItem('dob');
    const ageLabel = document.querySelector('#petAge');
    const photoField = form.elements.namedItem('photo');
    const photoPreview = document.querySelector('#photoPreview');
    const fields = ['pet_name', 'species', 'breed', 'dob', 'gender', 'neutered_spayed', 'owner_name', 'email', 'phone'];
    const draftKey = 'pawcare.patientDraft';
    const apiFieldNames = {
        petName: 'pet_name',
        ownerName: 'owner_name',
        neuteredSpayed: 'neutered_spayed',
    };

    function valuesFromForm() {
        const values = new FormData(form);
        return {
            pet_name: String(values.get('pet_name') || '').trim(),
            species: String(values.get('species') || '').trim(),
            breed: String(values.get('breed') || '').trim(),
            dob: String(values.get('dob') || '').trim(),
            gender: form.querySelector('input[name="gender"]:checked')?.value || '',
            neutered_spayed: form.elements.namedItem('neutered_spayed').checked,
            owner_name: String(values.get('owner_name') || '').trim(),
            email: String(values.get('email') || '').trim(),
            phone: validation.normalizePhone(values.get('phone')),
        };
    }

    function showAlert(element, message) {
        element.textContent = message;
        element.classList.remove('d-none');
    }

    function hideAlerts() {
        [successAlert, warningAlert, errorAlert].forEach((element) => {
            element.textContent = '';
            element.classList.add('d-none');
        });
    }

    function fieldError(fieldName, data) {
        const rules = {
            pet_name: () => validation.validatePetName(data.pet_name),
            species: () => validation.validateSpecies(data.species),
            breed: () => validation.validateBreed(data.breed),
            dob: () => validation.validateDateOfBirth(data.dob),
            gender: () => validation.validateGender(data.gender),
            neutered_spayed: () => validation.validateNeuteredSpayed(data.neutered_spayed),
            owner_name: () => validation.validateOwnerName(data.owner_name),
            email: () => validation.validateEmail(data.email),
            phone: () => validation.validatePhone(data.phone),
        };
        return rules[fieldName]();
    }

    function validateField(fieldName, data) {
        const message = fieldError(fieldName, data);
        validation.showFieldError(form, fieldName, message);
        return message;
    }

    function validateForm(data) {
        const errors = {};
        fields.forEach((fieldName) => {
            const message = validateField(fieldName, data);
            if (message) errors[fieldName] = message;
        });
        return errors;
    }

    function focusFirstInvalid(errors) {
        const fieldName = apiFieldNames[Object.keys(errors)[0]] || Object.keys(errors)[0];
        const field = fieldName === 'gender'
            ? form.querySelector('input[name="gender"]')
            : form.elements.namedItem(fieldName);
        field?.focus();
    }

    function showServerErrors(errors) {
        Object.entries(errors).forEach(([apiName, message]) => {
            const fieldName = apiFieldNames[apiName] || apiName;
            validation.showFieldError(form, fieldName, message);
        });
        if (Object.keys(errors).length) focusFirstInvalid(errors);
    }

    function updateAge() {
        ageLabel.textContent = '';
        if (!dobField.value || validation.validateDateOfBirth(dobField.value)) return;

        const birthDate = new Date(`${dobField.value}T00:00:00`);
        const today = new Date();
        let months = (today.getFullYear() - birthDate.getFullYear()) * 12
            + today.getMonth() - birthDate.getMonth();
        if (today.getDate() < birthDate.getDate()) months -= 1;
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        ageLabel.textContent = `Age: ${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    }

    function setDateOfBirthLimit() {
        const today = new Date();
        dobField.max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    function readDraft() {
        try {
            const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
            if (draft.pet_name !== undefined) form.elements.namedItem('pet_name').value = draft.pet_name;
            if (draft.species !== undefined) form.elements.namedItem('species').value = draft.species;
            if (draft.breed !== undefined) form.elements.namedItem('breed').value = draft.breed;
            if (draft.dob !== undefined) form.elements.namedItem('dob').value = draft.dob;
            if (draft.gender !== undefined) {
                const radio = form.querySelector(`input[name="gender"][value="${draft.gender}"]`);
                if (radio) radio.checked = true;
            }
            if (draft.neutered_spayed !== undefined) {
                form.elements.namedItem('neutered_spayed').checked = Boolean(draft.neutered_spayed);
            }
        } catch (error) {
            console.error('Unable to restore the patient draft:', error);
        }
    }

    function saveDraft() {
        try {
            const data = valuesFromForm();
            localStorage.setItem(draftKey, JSON.stringify({
                pet_name: data.pet_name,
                species: data.species,
                breed: data.breed,
                dob: data.dob,
                gender: data.gender,
                neutered_spayed: data.neutered_spayed,
            }));
        } catch (error) {
            console.error('Unable to save the patient draft:', error);
        }
    }

    function clearDraft() {
        try {
            localStorage.removeItem(draftKey);
        } catch (error) {
            console.error('Unable to clear the patient draft:', error);
        }
    }

    setDateOfBirthLimit();
    updateAge();
    readDraft();
    updateAge();

    function validatePhoto(file) {
        if (!file) return '';
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) return 'Choose a JPEG, PNG or WebP image.';
        if (file.size > 2 * 1024 * 1024) return 'The image must be no larger than 2 MB.';
        return '';
    }

    function updatePhotoPreview() {
        const file = photoField.files?.[0];
        photoPreview.className = 'patient-photo-preview mt-2 d-none';
        photoPreview.removeAttribute('src');
        const message = validatePhoto(file);
        validation.showFieldError(form, 'photo', message);
        if (!file || message) return;
        photoPreview.src = URL.createObjectURL(file);
        photoPreview.className = 'patient-photo-preview mt-2';
        photoPreview.alt = `Preview for ${file.name}`;
    }

    form.addEventListener('blur', (event) => {
        if (fields.includes(event.target.name)) validateField(event.target.name, valuesFromForm());
    }, true);
    form.addEventListener('input', (event) => {
        if (event.target.classList.contains('is-invalid') && fields.includes(event.target.name)) {
            validateField(event.target.name, valuesFromForm());
        }
        saveDraft();
    });
    form.addEventListener('change', (event) => {
        if (event.target.type === 'radio' && fields.includes(event.target.name)) {
            validateField(event.target.name, valuesFromForm());
        }
        if (event.target === dobField) updateAge();
        if (event.target === photoField) updatePhotoPreview();
        saveDraft();
    });
    form.addEventListener('reset', () => {
        window.setTimeout(() => {
            validation.clearFormErrors(form);
            hideAlerts();
            ageLabel.textContent = '';
            updatePhotoPreview();
            clearDraft();
        }, 0);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideAlerts();
        const patient = valuesFromForm();
        const errors = validateForm(patient);
        if (Object.keys(errors).length) {
            focusFirstInvalid(errors);
            return;
        }

        saveButton.disabled = true;
        try {
            const photoFile = photoField.files?.[0];
            if (photoFile) {
                const photoError = validatePhoto(photoFile);
                if (photoError) {
                    validation.showFieldError(form, 'photo', photoError);
                    photoField.focus();
                    return;
                }
                const uploaded = await api.uploadPhoto(photoFile);
                patient.photo_path = uploaded.filename;
            }
            const result = await api.savePatient(patient);
            console.log('Patient object:', result.patient);
            const message = `${result.patient.pet_name} has been registered for ${result.patient.owner_name}.`;
            form.reset();
            window.setTimeout(() => showAlert(successAlert, message), 0);
        } catch (error) {
            console.error('Unexpected patient-save error:', error);
            if (error.errors && Object.keys(error.errors).length) {
                showServerErrors(error.errors);
                if (error.status === 409) showAlert(warningAlert, error.message);
            } else {
                showAlert(errorAlert, error.name === 'NetworkError'
                    ? error.message
                    : 'We could not save this patient. Please try again.');
            }
        } finally {
            saveButton.disabled = false;
        }
    });
});
