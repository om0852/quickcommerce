// app/api/cron/route.ts
export async function GET(request) {
    // Your cron job logic here (e.g., database cleanup, data fetching, etc.)
    console.log('Cron job executed!');

    return new Response('Cron job executed', { status: 200 });
}
