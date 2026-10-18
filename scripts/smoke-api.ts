import 'dotenv/config';
import handler from '../api/[[...slug]]';

const out: { status?: number; body?: string } = {};

const res = {
  statusCode: 200,
  headers: {} as Record<string, string>,
  setHeader(name: string, value: string) {
    this.headers[name] = value;
  },
  end(chunk?: string) {
    out.status = this.statusCode;
    out.body = chunk;
  },
};

await handler(
  {
    method: 'GET',
    url: '/api/courses',
    query: {},
    headers: {},
  },
  res,
);

console.log('status:', out.status);
console.log('body:', out.body);
if (out.status !== 401) {
  console.error('EXPECTED 401 for unauthenticated request');
  process.exit(1);
}
console.log('SMOKE TEST PASS');
