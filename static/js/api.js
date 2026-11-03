(() => {
    class ApiError extends Error {
        constructor(message, status, body) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.body = body;
            this.errors = body?.errors || {};
        }
    }

    async function requestJson(url, options = {}) {
        let response;
        try {
            response = await fetch(url, {
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                ...options,
            });
        } catch (cause) {
            const error = new Error('The server could not be reached. Check your connection and try again.');
            error.name = 'NetworkError';
            error.cause = cause;
            throw error;
        }

        let body;
        try {
            body = await response.json();
        } catch {
            body = {};
        }
        if (!response.ok) {
            throw new ApiError(body.error || `Request failed with status ${response.status}.`, response.status, body);
        }
        return body;
    }

    function dateQuery(start, end) {
        const params = new URLSearchParams();
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        const query = params.toString();
        return query ? `?${query}` : '';
    }

    async function mutationRequest(url, options = {}) {
        const tokenResponse = await requestJson('/api/csrf-token');
        return requestJson(url, {
            ...options,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-Token': tokenResponse.csrfToken,
                ...(options.headers || {}),
            },
        });
    }

    async function uploadPhoto(file) {
        const tokenResponse = await requestJson('/api/csrf-token');
        const formData = new FormData();
        formData.append('photo', file);
        let response;
        try {
            response = await fetch('/api/uploads', {
                method: 'POST',
                headers: { 'X-CSRF-Token': tokenResponse.csrfToken },
                body: formData,
            });
        } catch (cause) {
            const error = new Error('The server could not be reached. Check your connection and try again.');
            error.name = 'NetworkError';
            error.cause = cause;
            throw error;
        }
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new ApiError(body.error || `Upload failed with status ${response.status}.`, response.status, body);
        return body;
    }

    window.PawCareApi = {
        ApiError,
        getPatients: () => requestJson('/api/patients'),
        getPatient: (id) => requestJson(`/api/patients/${encodeURIComponent(id)}`),
        getPatientVisits: (id) => requestJson(`/api/patients/${encodeURIComponent(id)}/visits`),
        savePatient: (patient) => mutationRequest('/api/patients', {
            method: 'POST',
            body: JSON.stringify(patient),
        }),
        uploadPhoto,
        getVisits: (start, end) => requestJson(`/api/visits${dateQuery(start, end)}`),
        saveVisit: (visit) => mutationRequest('/api/visits', {
            method: 'POST',
            body: JSON.stringify(visit),
        }),
        getMonthlySummary: (start, end) => requestJson(`/api/reports/monthly${dateQuery(start, end)}`),
        getReportSummary: () => requestJson('/api/reports/summary'),
    };
})();
