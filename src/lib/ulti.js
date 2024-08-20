export const fetcher = (...args) => fetch(...args).then((res) => res.json());
export const fetcheroptions = ([url, options]) => fetch(url, options).then((res) => res.json());

