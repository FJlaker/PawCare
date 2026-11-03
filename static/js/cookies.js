(() => {
	function setCookie(name, value, days) {
		const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
		document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
	}

	function getCookie(name) {
		const prefix = `${encodeURIComponent(name)}=`;
		const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix));
		return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : '';
	}

	window.PawCareCookies = { setCookie, getCookie };
})();
