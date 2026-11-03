document.addEventListener('DOMContentLoaded', () => {
    const validation = window.PawCareValidation;
    const api = window.PawCareApi;
    const cookies = window.PawCareCookies;
    const form = document.querySelector('#visitForm');
    if (!validation || !api || !cookies || !form) return;

    const patientSelect = form.elements.namedItem('patient_id');
    const dateField = form.elements.namedItem('date');
    const timeField = form.elements.namedItem('time');
    const notesField = form.elements.namedItem('notes');
    const notesCounter = document.querySelector('#notesCounter');
    const successAlert = document.querySelector('#visitSuccess');
    const errorAlert = document.querySelector('#visitError');
    const saveButton = form.querySelector('button[type="submit"]');
    const upcomingVisits = document.querySelector('#upcomingVisits');
    const fields = ['patient_id', 'date', 'visit_type', 'time', 'notes'];
    const apiFieldNames = { patientId: 'patient_id', visitType: 'visit_type', staffName: 'staff_name' };
    let patients = [];

    function localDateValue(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function setDefaults() {
        const today = localDateValue(new Date());
        dateField.max = today;
        if (!dateField.value) dateField.value = today;
        const now = new Date();
        if (!timeField.value) timeField.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    function showAlert(element, message) {
        element.textContent = message;
        element.classList.remove('d-none');
    }

    function hideAlerts() {
        [successAlert, errorAlert].forEach((element) => {
            element.textContent = '';
            element.classList.add('d-none');
        });
    }

    function updateNotesCounter() {
        notesCounter.textContent = `${notesField.value.length} / 200`;
    }

    function loadPatientOptions(selectedId = '') {
        patientSelect.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = patients.length ? 'Select patient' : 'No patients available';
        patientSelect.append(placeholder);
        patients.forEach((patient) => {
            const option = document.createElement('option');
            option.value = String(patient.id);
            option.textContent = `${patient.pet_name} - ${patient.species}`;
            patientSelect.append(option);
        });
        if (selectedId && patients.some((patient) => String(patient.id) === selectedId)) {
            patientSelect.value = selectedId;
        }
    }

    async function renderUpcomingVisits() {
        upcomingVisits.replaceChildren();
        const visits = await api.getVisits();
        if (!visits.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 5;
            cell.className = 'text-muted';
            cell.textContent = 'No visits scheduled yet.';
            row.append(cell);
            upcomingVisits.append(row);
            return;
        }
        visits.forEach((visit) => {
            const row = document.createElement('tr');
            [visit.date, visit.time, visit.pet_name, visit.owner_name].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || '';
                row.append(cell);
            });
            const typeCell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'badge text-bg-primary rounded-pill';
            badge.textContent = visit.visit_type;
            typeCell.append(badge);
            row.append(typeCell);
            upcomingVisits.append(row);
        });
    }

    function getValues() {
        return {
            patient_id: patientSelect.value,
            date: dateField.value,
            visit_type: form.elements.namedItem('visit_type').value,
            time: timeField.value,
            notes: notesField.value.trim(),
        };
    }

    function getFieldError(fieldName, values) {
        const rules = {
            patient_id: () => validation.validatePatientId(values.patient_id, patients),
            date: () => validation.validateVisitDate(values.date),
            visit_type: () => validation.validateVisitType(values.visit_type),
            time: () => validation.validateVisitTime(values.time),
            notes: () => validation.validateNotes(values.notes),
        };
        return rules[fieldName]();
    }

    function validateField(fieldName, values) {
        const message = getFieldError(fieldName, values);
        validation.showFieldError(form, fieldName, message);
        return message;
    }

    function validateForm(values) {
        const errors = {};
        fields.forEach((fieldName) => {
            const message = validateField(fieldName, values);
            if (message) errors[fieldName] = message;
        });
        return errors;
    }

    function showServerErrors(errors) {
        Object.entries(errors).forEach(([apiName, message]) => {
            validation.showFieldError(form, apiFieldNames[apiName] || apiName, message);
        });
        const firstName = Object.keys(errors)[0];
        form.elements.namedItem(apiFieldNames[firstName] || firstName)?.focus();
    }

    async function initialize() {
        setDefaults();
        updateNotesCounter();
        try {
            patients = await api.getPatients();
            const requestedPatient = new URLSearchParams(window.location.search).get('patient') || '';
            loadPatientOptions(requestedPatient);
        } catch (error) {
            loadPatientOptions();
            showAlert(errorAlert, error.message || 'We could not load the patient list.');
            return;
        }
        try {
            await renderUpcomingVisits();
        } catch (error) {
            showAlert(errorAlert, error.message || 'We could not load visits.');
        }
    }

    form.addEventListener('blur', (event) => {
        if (fields.includes(event.target.name)) validateField(event.target.name, getValues());
    }, true);
    form.addEventListener('input', (event) => {
        if (event.target === notesField) updateNotesCounter();
        if (event.target.classList.contains('is-invalid') && fields.includes(event.target.name)) {
            validateField(event.target.name, getValues());
        }
    });
    form.addEventListener('change', (event) => {
        if (event.target.classList.contains('is-invalid') && fields.includes(event.target.name)) {
            validateField(event.target.name, getValues());
        }
    });
    form.addEventListener('reset', () => {
        window.setTimeout(() => {
            validation.clearFormErrors(form);
            hideAlerts();
            setDefaults();
            updateNotesCounter();
        }, 0);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideAlerts();
        const staffName = cookies.getCookie('staffName').trim();
        if (!staffName) {
            showAlert(errorAlert, 'Set a staff name before saving a visit.');
            window.bootstrap?.Modal.getOrCreateInstance(document.querySelector('#staffNameModal')).show();
            return;
        }

        const values = getValues();
        const errors = validateForm(values);
        if (Object.keys(errors).length) {
            form.elements.namedItem(Object.keys(errors)[0])?.focus();
            return;
        }

        const patient = patients.find((item) => String(item.id) === values.patient_id);
        const payload = {
            patient_id: Number(patient.id),
            visit_type: values.visit_type,
            date: values.date,
            time: values.time,
            notes: values.notes,
            staff_name: staffName,
        };
        saveButton.disabled = true;
        try {
            console.log('Visit object:', payload);
            await api.saveVisit(payload);
            const successMessage = `Visit for ${patient.pet_name} has been recorded.`;
            await renderUpcomingVisits();
            form.reset();
            window.setTimeout(() => showAlert(successAlert, successMessage), 0);
        } catch (error) {
            console.error('Unexpected visit-save error:', error);
            if (error.errors && Object.keys(error.errors).length) {
                showServerErrors(error.errors);
            } else {
                showAlert(errorAlert, error.message || 'We could not save this visit. Please try again.');
            }
        } finally {
            saveButton.disabled = false;
        }
    });

    initialize();
});
