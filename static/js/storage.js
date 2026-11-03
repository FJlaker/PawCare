(() => {
    const STORAGE_KEYS = {
        patients: 'pawcare.patients',
        visits: 'pawcare.visits',
        staffName: 'pawcare.staffName',
    };

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return fallback;
            }
            const parsed = JSON.parse(raw);
            return parsed ?? fallback;
        } catch (error) {
            console.error(`Could not read ${key} from localStorage`, error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function nextId(items) {
        return items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
    }

    function getPatients() {
        return readJson(STORAGE_KEYS.patients, []);
    }

    function savePatients(patients) {
        writeJson(STORAGE_KEYS.patients, patients);
    }

    function addPatient(patient) {
        const patients = getPatients();
        const nextPatient = {
            ...patient,
            id: Number(patient.id) || nextId(patients),
            phone: String(patient.phone || '').replace(/\s+/g, ''),
        };
        patients.unshift(nextPatient);
        savePatients(patients);
        return nextPatient;
    }

    function getVisits() {
        return readJson(STORAGE_KEYS.visits, []);
    }

    function saveVisits(visits) {
        writeJson(STORAGE_KEYS.visits, visits);
    }

    function addVisit(visit) {
        const visits = getVisits();
        const nextVisit = {
            ...visit,
            id: Number(visit.id) || nextId(visits),
        };
        visits.unshift(nextVisit);
        saveVisits(visits);
        return nextVisit;
    }

    function getStaffName() {
        return localStorage.getItem(STORAGE_KEYS.staffName) || 'Riley Quinn';
    }

    function setStaffName(name) {
        localStorage.setItem(STORAGE_KEYS.staffName, String(name || '').trim());
    }

    function clearAll() {
        Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    }

    window.PawCareStorage = {
        STORAGE_KEYS,
        getPatients,
        savePatients,
        addPatient,
        getVisits,
        saveVisits,
        addVisit,
        getStaffName,
        setStaffName,
        clearAll,
    };
})();
