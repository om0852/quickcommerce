import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, contactNumber, message } = await req.json();

    if (!email || !contactNumber || !message) {
      return NextResponse.json(
        { error: 'Email, contact number, and message are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Configure the email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Set up the email data
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "malav2202@gmail.com",
      replyTo: email,
      subject: 'New User Feedback - QuickCommerce',
      text: `You have received new feedback.\n\nFrom: ${email}${contactNumber ? `\nContact Number: ${contactNumber}` : ''}\n\nMessage:\n${message}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { success: true, message: 'Feedback sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending feedback email:', error);
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    );
  }
}
