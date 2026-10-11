export function appendElem(parent, tag, ...classes) {
	let elem = document.createElement(tag);
	elem.classList.add(...classes);
	parent.append(elem);
	return elem;
}

function elemFn(tag) {
	Node.prototype[tag] = function(...classes) {
		return appendElem(this, tag, ...classes);
	};
}

elemFn('div');
elemFn('button');
elemFn('i');

export async function loadHTML(url) {
	if (typeof window !== 'undefined' && window.__EMBEDDED_HTML__) {
		const cleanKey = url.replace(/.*(?:pieces\/|\/)/, (m) => m.includes('pieces') ? 'pieces/' : '');
		const content = window.__EMBEDDED_HTML__[url] || window.__EMBEDDED_HTML__[cleanKey];
		if (content) {
			return new DOMParser().parseFromString(content, 'text/html');
		}
	}
	let text = await fetch(url).then(r => r.text());
	return new DOMParser().parseFromString(text, 'text/html');
}

export async function loadJSON(url) {
	if (typeof window !== 'undefined' && window.__EMBEDDED_JSON__ && window.__EMBEDDED_JSON__[url]) {
		return window.__EMBEDDED_JSON__[url];
	}
	return fetch(url).then(r => r.json());
}

export function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

export function bound(index, size) {
	return clamp(index, 0, size - 1);
}

export function inBound(index, size) {
	return index >= 0 && index < size;
}
