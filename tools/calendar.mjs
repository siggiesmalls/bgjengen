// Writes cal/<memberId>.ics: each member's planned buy days for the next four weeks, read from the page itself.
// Usage: node tools/calendar.mjs [pageUrl] [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.argv[2] || 'https://siggiesmalls.github.io/bgjengen/';
const out = process.argv[3] || 'cal';
const osloDate = t => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(t);
const until = osloDate(Date.now() + 28 * 86400000);

const browser = await chromium.launch();
const page = await (await browser.newContext({ timezoneId: 'Europe/Oslo' })).newPage();
await page.goto(url);
await page.waitForFunction(() => window.bgjengenPlan && window.bgjengenPlan(), null, { timeout: 60000 });
const plan = await page.evaluate(() => window.bgjengenPlan());
await browser.close();

const text = s => String(s).replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
const alarm = trigger => ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Kjøp brød', trigger, 'END:VALARM'];
const OSLO = ['BEGIN:VTIMEZONE', 'TZID:Europe/Oslo',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];

mkdirSync(out, { recursive: true });
for (const m of plan.members) {
  const events = plan.buys.filter(b => b.id === m.id && b.date <= until).flatMap(b => {
    const d = b.date.replaceAll('-', '');
    return ['BEGIN:VEVENT', `UID:${b.date}-${m.id}@bgjengen`, 'DTSTAMP:20261026T000000Z',
      `DTSTART;TZID=Europe/Oslo:${d}T060000`, `DTEND;TZID=Europe/Oslo:${d}T063000`,
      'SUMMARY:Kjøp brød – B-gjengen', `DESCRIPTION:${text('Planen: ' + b.why)}`,
      ...alarm('TRIGGER:-PT12H'), ...alarm('TRIGGER;RELATED=END:PT30M'), 'END:VEVENT'];
  });
  const cal = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//B-gjengen//Brødplan//NB', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${text('B-gjengen – ' + m.name)}`, 'X-WR-TIMEZONE:Europe/Oslo', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
    ...OSLO, ...events, 'END:VCALENDAR'];
  writeFileSync(`${out}/${m.id}.ics`, cal.join('\r\n') + '\r\n');
  console.log(`${m.id} ${m.name}: ${events.filter(l => l === 'BEGIN:VEVENT').length} buy days`);
}
