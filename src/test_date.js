const moment = require('moment');

function getOccurences(start_date, end_date, weekday, start_minutes, end_minutes) {
    let current = moment(start_date);
    let end = moment(end_date).endOf('day');
    const occurences = [];

    // Weekday mapping: 2=Mon, 3=Tue, ... 7=Sat, 8=Sun
    const targetJsDay = weekday === 8 ? 0 : weekday - 1;

    // Move current to the first occurrence
    while(current.day() !== targetJsDay && current.isBefore(end)) {
        current.add(1, 'days');
    }

    while(current.isBefore(end) || current.isSame(end, 'day')) {
        let start = current.clone().startOf('day').add(start_minutes, 'minutes').toDate();
        let end_dt = current.clone().startOf('day').add(end_minutes, 'minutes').toDate();
        occurences.push({ start, end });
        current.add(1, 'weeks'); // advance week
    }
    return occurences;
}
console.log(getOccurences(new Date('2024-01-01'), new Date('2024-01-31'), 3, 420, 480));
