'use server';

import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Registers a new organization and its first admin user in the local SQLite database.
 */
export async function registerOrganization(formData) {
  const companyName  = formData.get('companyName');
  const email        = formData.get('email');
  const password     = formData.get('password');
  const businessType = formData.get('businessType') || 'TRADING'; // MANUFACTURING | SERVICE | TRADING

  if (!companyName || !email || !password) {
    return { success: false, message: 'All fields are required.' };
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: false, message: 'Email already registered.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: companyName, businessType }
      });

      await tx.user.create({
        data: {
          email,
          password: passwordHash,
          name: email.split('@')[0],
          role: 'ADMIN',
          organizationId: org.id
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Local Registration Error:', error);
    return { success: false, message: error.message || String(error) };
  }
}

/**
 * Generates a password reset token and saves it to the database.
 * In a real app, this would send an email. Here we log it to console.
 */
export async function forgotPassword(formData) {
  const email = formData.get('email');

  if (!email) {
    return { success: false, message: 'Email is required.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // For security, don't reveal if user exists. 
    // Just say "If an account exists, a link has been sent"
    if (!user) {
      return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Save token (using a transaction to ensure clean state for this identifier)
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier: email } }),
      prisma.verificationToken.create({
        data: { identifier: email, token, expires }
      })
    ]);

    // SIMULATED EMAIL SENDING
    console.log(`\n--- PASSWORD RESET SIMULATION ---`);
    console.log(`To: ${email}`);
    console.log(`Link: http://localhost:3000/reset-password?token=${token}&email=${encodeURIComponent(email)}`);
    console.log(`----------------------------------\n`);

    return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return { success: false, message: 'An error occurred. Please try again later.' };
  }
}

/**
 * Verifies the token and updates the user's password.
 */
export async function resetPassword(formData) {
  const email = formData.get('email');
  const token = formData.get('token');
  const password = formData.get('password');

  if (!email || !token || !password) {
    return { success: false, message: 'All fields are required.' };
  }

  try {
    // Verify token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { identifier: email, token }
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return { success: false, message: 'Invalid or expired token.' };
    }

    // Update password
    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.user.update({
      where: { email },
      data: { password: passwordHash }
    });

    // Delete token after use
    await prisma.verificationToken.delete({
      where: { identifier: email }
    });

    return { success: true };
  } catch (error) {
    console.error('Reset Password Error:', error);
    return { success: false, message: 'An error occurred. Please try again later.' };
  }
}
