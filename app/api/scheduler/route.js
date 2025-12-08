import { NextResponse } from 'next/server';
import { startCronScheduler, stopCronScheduler, getSchedulerStatus } from '@/lib/scheduler';

// GET - Check scheduler status
export async function GET() {
  try {
    const status = getSchedulerStatus();
    return NextResponse.json({ 
      success: true, 
      ...status 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Start or stop scheduler
export async function POST(request) {
  try {
    const { action } = await request.json();
    
    if (action === 'start') {
      startCronScheduler();
      return NextResponse.json({ 
        success: true, 
        message: 'Scheduler started successfully' 
      });
    } else if (action === 'stop') {
      stopCronScheduler();
      return NextResponse.json({ 
        success: true, 
        message: 'Scheduler stopped successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Use "start" or "stop"' 
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
