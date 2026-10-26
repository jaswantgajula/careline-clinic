import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/index.js';

const client = new OAuth2Client();

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

export function googleAuthReady() {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

export async function verifyGoogleCredential(credential) {
  if (!googleAuthReady()) throw fail('Google sign-in is not configured.', 503);
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified)
      throw fail('Google could not verify this email address.', 401);
    return payload;
  } catch (error) {
    if (error.status) throw error;
    throw fail('Google sign-in could not be verified. Please try again.', 401);
  }
}

export async function findOrCreateGoogleUser(payload) {
  const googleSub = payload.sub;
  const email = payload.email.toLowerCase();
  const avatarUrl = payload.picture;
  const name = (payload.name || email.split('@')[0]).trim().slice(0, 80);

  let user = await User.findOne({ googleSub }).select('+googleSub');
  if (user) {
    if (avatarUrl && user.avatarUrl !== avatarUrl) {
      user.avatarUrl = avatarUrl;
      await user.save();
    }
    return user;
  }

  user = await User.findOne({ email }).select('+googleSub');
  if (user) {
    if (user.role !== 'patient')
      throw fail('Google sign-in cannot be linked automatically to a clinic staff account.', 403);
    if (user.googleSub && user.googleSub !== googleSub)
      throw fail('This email is already linked to another Google account.', 409);

    // Google is authoritative for Gmail and managed Workspace addresses. For other
    // existing accounts, require the password flow before adding a new identity.
    const googleIsAuthoritative = email.endsWith('@gmail.com') || Boolean(payload.hd);
    if (!googleIsAuthoritative)
      throw fail(
        'Sign in with your password first before linking Google to this existing account.',
        409,
      );

    user.googleSub = googleSub;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    await user.save();
    return user;
  }

  try {
    return await User.create({ name, email, googleSub, avatarUrl, role: 'patient' });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const raced = await User.findOne({ $or: [{ googleSub }, { email }] }).select('+googleSub');
    if (raced?.googleSub === googleSub) return raced;
    throw fail('This email is already associated with another account.', 409);
  }
}
