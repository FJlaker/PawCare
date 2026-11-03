document.addEventListener('DOMContentLoaded', () => {
    const api = window.PawCareApi;
    const startField = document.querySelector('#startDate');
    const endField = document.querySelector('#endDate');
    const generateButton = document.querySelector('#generateReport');
    const viewAllButton = document.querySelector('#viewAll');
    const rowsElement = document.querySelector('#reportRows');
    const summaryElement = document.querySelector('#reportSummary');
    const messageElement = document.querySelector('#reportMessage');
    const chartElement = document.querySelector('#reportChart');
    const typeFilter = document.querySelector('#visitTypeFilter');
    const searchFilter = document.querySelector('#reportSearchFilter');
    let currentVisits = [];
    if (!api || !startField || !endField || !rowsElement || !summaryElement || !messageElement) return;

    let reportChart = null;
    let requestSequence = 0;

    async function loadSummary() {
        try {
            const summary = await api.getReportSummary();
            document.querySelector('#summaryPatients').textContent = summary.patients;
            document.querySelector('#summaryVisits').textContent = summary.visits;
            document.querySelector('#summaryToday').textContent = summary.todaysVisits;
            document.querySelector('#summaryCases').textContent = summary.openCases;
        } catch (error) {
            console.error('Unable to load dashboard summary:', error);
        }
    }

    function setMessage(message) {
        messageElement.textContent = message;
        messageElement.classList.toggle('d-none', !message);
    }

    function restoreDates() {
        try {
            startField.value = sessionStorage.getItem('pawcare.report.start') || '';
            endField.value = sessionStorage.getItem('pawcare.report.end') || '';
        } catch (error) {
            console.error('Unable to restore report dates:', error);
        }
    }

    function saveDates() {
        try {
            sessionStorage.setItem('pawcare.report.start', startField.value);
            sessionStorage.setItem('pawcare.report.end', endField.value);
        } catch (error) {
            console.error('Unable to save report dates:', error);
        }
    }

    function renderRows(visits) {
        currentVisits = visits;
        const selectedType = typeFilter?.value || 'All';
        const searchTerm = String(searchFilter?.value || '').trim().toLowerCase();
        const filteredVisits = visits.filter((visit) => {
            const matchesType = selectedType === 'All' || visit.visit_type === selectedType;
            const matchesSearch = !searchTerm
                || String(visit.pet_name || '').toLowerCase().includes(searchTerm)
                || String(visit.owner_name || '').toLowerCase().includes(searchTerm);
            return matchesType && matchesSearch;
        });
        rowsElement.replaceChildren();
        if (!filteredVisits.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4;
            cell.className = 'text-muted';
            cell.textContent = 'No visits recorded in this period.';
            row.append(cell);
            rowsElement.append(row);
            return;
        }
        filteredVisits.forEach((visit) => {
            const row = document.createElement('tr');
            const dateCell = document.createElement('td');
            const patientCell = document.createElement('td');
            const ownerCell = document.createElement('td');
            const typeCell = document.createElement('td');
            const badge = document.createElement('span');
            dateCell.textContent = visit.date;
            patientCell.textContent = `${visit.pet_name} - ${visit.species || 'Unknown'}`;
            ownerCell.textContent = visit.owner_name;
            badge.className = 'badge text-bg-primary rounded-pill';
            badge.textContent = visit.visit_type;
            typeCell.append(badge);
            row.append(dateCell, patientCell, ownerCell, typeCell);
            rowsElement.append(row);
        });
        summaryElement.textContent = `${filteredVisits.length} of ${visits.length} loaded ${visits.length === 1 ? 'visit' : 'visits'} shown`;
    }

    function renderChart(months) {
        if (!chartElement || typeof Chart === 'undefined') return;
        const labels = months.map((item) => item.month);
        const values = months.map((item) => item.visits);
        const chartDescription = months.map((item) => `${item.month}: ${item.visits} visits`).join('; ');
        chartElement.setAttribute(
            'aria-label',
            chartDescription ? `Monthly patient visits. ${chartDescription}.` : 'Monthly patient visits. No data.',
        );
        if (!reportChart) {
            reportChart = new Chart(chartElement, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{ label: 'Patient visits', data: values, backgroundColor: '#198754', borderRadius: 4 }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                },
            });
            return;
        }
        reportChart.data.labels = labels;
        reportChart.data.datasets[0].data = values;
        reportChart.update();
    }

    async function renderReport() {
        const start = startField.value;
        const end = endField.value;
        if (start && end && start > end) {
            setMessage('The start date must be on or before the end date. The report was not changed.');
            return;
        }

        const sequence = ++requestSequence;
        setMessage('');
        saveDates();
        generateButton.disabled = true;
        try {
            const [visits, allVisits, months] = await Promise.all([
                api.getVisits(start || undefined, end || undefined),
                api.getVisits(),
                api.getMonthlySummary(start || undefined, end || undefined),
            ]);
            if (sequence !== requestSequence) return;
            renderRows(visits);
            const effectiveStart = start || allVisits.at(-1)?.date || end;
            const effectiveEnd = end || allVisits[0]?.date || start;
            if (!visits.length && !effectiveStart && !effectiveEnd) {
                summaryElement.textContent = 'No visits recorded.';
            } else {
                const startLabel = effectiveStart || 'the beginning';
                const endLabel = effectiveEnd || 'today';
                const label = visits.length === 1 ? 'visit' : 'visits';
                summaryElement.textContent = `${visits.length} ${label} between ${startLabel} and ${endLabel}`;
            }
            renderChart(months);
        } catch (error) {
            if (sequence === requestSequence) {
                setMessage(error.message || 'The report could not be loaded. Please try again.');
            }
        } finally {
            if (sequence === requestSequence) generateButton.disabled = false;
        }
    }

    restoreDates();
    loadSummary();
    typeFilter?.addEventListener('change', () => renderRows(currentVisits));
    searchFilter?.addEventListener('input', () => renderRows(currentVisits));
    generateButton.addEventListener('click', renderReport);
    startField.addEventListener('change', renderReport);
    endField.addEventListener('change', renderReport);
    viewAllButton.addEventListener('click', () => {
        startField.value = '';
        endField.value = '';
        try {
            sessionStorage.removeItem('pawcare.report.start');
            sessionStorage.removeItem('pawcare.report.end');
        } catch (error) {
            console.error('Unable to clear report dates:', error);
        }
        renderReport();
    });
    renderReport();
});
