const fmt = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
const yesterday = fmt(new Date(Date.now() - 86400000));
return [{ json: { date: yesterday } }];
