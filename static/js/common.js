document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href]').forEach((link) => {
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
            });
        }
    });

    const cookies = window.PawCareCookies;
    const display = document.querySelector('#staffNameDisplay');
    const button = document.querySelector('#staffNameButton');
    const form = document.querySelector('#staffNameForm');
    const input = document.querySelector('#staffNameInput');
    const error = document.querySelector('#staffNameError');
    if (!cookies || !display || !button || !form || !input || !error) {
        return;
    }

    function updateStaffName() {
        const staffName = cookies.getCookie('staffName');
        display.textContent = staffName ? `Staff: ${staffName}` : 'Staff name not set';
        button.setAttribute('aria-label', staffName ? `Change staff name, currently ${staffName}` : 'Set staff name');
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const staffName = input.value.trim();
        if (staffName.length < 2 || staffName.length > 60) {
            error.textContent = 'Enter a name between 2 and 60 characters.';
            input.classList.add('is-invalid');
            input.setAttribute('aria-invalid', 'true');
            input.focus();
            return;
        }

        cookies.setCookie('staffName', staffName, 30);
        input.value = '';
        error.textContent = '';
        input.classList.remove('is-invalid');
        input.setAttribute('aria-invalid', 'false');
        updateStaffName();
        window.bootstrap?.Modal.getOrCreateInstance(document.querySelector('#staffNameModal')).hide();
    });

    input.addEventListener('input', () => {
        input.classList.remove('is-invalid');
        input.setAttribute('aria-invalid', 'false');
        error.textContent = '';
    });

    updateStaffName();

    const connectionStatus = document.querySelector('#connectionStatus');
    if (connectionStatus) {
        const updateConnectionStatus = () => {
            connectionStatus.classList.toggle('d-none', navigator.onLine);
        };
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);
        updateConnectionStatus();
    }

    document.querySelector('#offlineRetry')?.addEventListener('click', () => window.location.reload());
});
