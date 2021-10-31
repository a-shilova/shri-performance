const EVENT_NAMES = {
	IMAGE_LOADED: 'imageLoaded',
	CONNECT: 'connect',
	TTFB: 'ttfb',
	FIRST_CLICK: 'first click',
	VIDEO_WATCH: 'video watch',
	IMAGE_ERROR: 'imageError',
	VIDEO_ERROR: 'videoError',
	VIDEO_LOADED: 'videoLoaded'
};


function quantile(arr, q) {
    const sorted = arr.sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (sorted[base + 1] !== undefined) {
        return Math.floor(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
    } else {
        return Math.floor(sorted[base]);
    }
};

function prepareData(result) {
	return result.data.map(item => {
		item.date = item.timestamp.split('T')[0];

		return item;
	});
}

// Вывести таблицу или ошибку
function showTable(table) {
	if (Object.keys(table).length > 0) {
		console.table(table);
	} else {
		console.log('Data not found');
	}
}

// показать значение метрики за несколько дней
function showMetricByPeriod(data, page, name, date1, date2, exp) {
	let dates = [];
	let sampleData = data.filter(item => {
		if (item.page == page
			&& item.name == name
			&& item.date >= date1
			&& item.date <= date2
			&& item.additional['experiment'] == exp
		) {
			if (!dates.includes(item.date)) {
				dates.push(item.date);
			}
			return true;
		}
		return false;
	});
	
	console.log(`Metrics for event "${name}" on page  "${page}" from ${date1} to ${date2}`);

	let table = {};
	let id = 1;
	dates.forEach(date => {
		table[id] = generateRow(page, name, sampleData, date);
		id += 1;
	});

	showTable(table);
}

// Сгенерировать строку для таблицы
function generateRow(page, name, data, date) {
	return Object.assign( { page, name }, addMetricByDate(data, page, name, date), {date} );
}

// показать все метрики за несколько дней
function showAllMetricByPeriod(data, page, date1, date2, exp) {
	let dates = [];
	let sampleData = data.filter(item => {
		if (item.page == page && item.date >= date1 && item.date <= date2 && exp == item.additional['experiment']) {
			if (!dates.includes(item.date)) {
				dates.push(item.date);
			}
			return true;
		}
		return false;
	});

	console.log(`All metrics on page "${page}" from ${date1} to ${date2}`);
	let table = {};
	let id = 0;
	Object.keys(EVENT_NAMES).forEach(name => {
		const event = EVENT_NAMES[name];
		dates.forEach(date => {
			table[id] = generateRow(page, event, sampleData, date);
			id += 1;
		});		
	});

	showTable(table);
}


// показать сессию пользователя за один день
function showSession(data, page, reqid, date) {
	let userData = data.filter(item => item.requestId == reqid);

	let table = {};
	Object.keys(EVENT_NAMES).forEach(name => {
		const event = EVENT_NAMES[name];
		table[event] = addMetricByDate(userData, page, event, date);
	});
	
	console.log(`Session user ${reqid} on page ${page} by ${date}:`);
	showTable(table);
}

// сравнить метрику в разных срезах
function compareMetric(data, page, name, section, exp) {
	// collect values of section
	const values = [];

	data.forEach(item => {
		const kind = item.additional[section];
		if (!values.includes(kind)) {
			values.push(kind);
		}
	});

	let table = {};
	// Agregate data for each values of section
	values.forEach(kind => {
		const sampleData = data.filter(item => item.page === page
			&& item.name == name
			&& item.additional[section] == kind
			&& item.additional['experiment'] == exp
		)
		.map(item => item.value);

		table[kind] = distributeDataByQuantiles(sampleData);
	});
	console.log(`Compare metric "${name}" on page ${page} by ${section}`);
	showTable(table);
}

// Пример
// добавить метрику за выбранный день
function addMetricByDate(data, page, name, date, exp) {
	let sampleData = data
					.filter(item => {
						return item.page == page
						&& item.name == name
						&& item.date == date 
						&& (!exp || item.additional['experiment'] == exp)
					})
					.map(item => item.value);

	return distributeDataByQuantiles(sampleData);
}

// распределение данных по квантилям
function distributeDataByQuantiles(data) {
	let result = {};

	result.hits = data.length;
	result.p25 = result.hits > 0 ? quantile(data, 0.25) : 0;
	result.p50 = result.hits > 0 ? quantile(data, 0.5) : 0;
	result.p75 = result.hits > 0 ? quantile(data, 0.75) : 0;
	result.p95 = result.hits > 0 ? quantile(data, 0.95) : 0;

	return result;
}

// рассчитывает все метрики за день
function calcMetricsByDate(data, page, date, exp) {
	console.log(`All metrics for ${date}:`);

	let table = {};
	Object.keys(EVENT_NAMES).forEach(name => {
		const event = EVENT_NAMES[name];
		table[event] = addMetricByDate(data, page, event, date, exp);
	});

	showTable(table);
};

fetch('https://shri.yandex/hw/stat/data?counterId=B385EFE3-C039-4CFE-BAE7-2E73D18DB989')
	.then(res => res.json())
	.then(result => {
		let data = prepareData(result);

		calcMetricsByDate(data, 'rick page', '2021-10-31', '2');
		showSession(data, 'rick page', '272008488241', '2021-10-31');

		// добавить свои сценарии, реализовать функции выше
		showAllMetricByPeriod(data, 'rick page', '2021-10-30', '2021-11-30', '2');
		showMetricByPeriod(data, 'rick page', 'imageLoaded', '2021-10-30', '2021-11-30');
		compareMetric(data, 'rick page', 'imageLoaded', 'platform', '2');

		showMetricByPeriod(data, 'rick page', 'videoLoaded', '2021-10-30', '2021-11-30', '2');
		showMetricByPeriod(data, 'rick page', 'video watch', '2021-10-30', '2021-11-30', '2');
		compareMetric(data, 'rick page', 'videoLoaded', 'platform', '2');
	});
