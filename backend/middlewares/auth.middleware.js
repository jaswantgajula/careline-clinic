import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
export async function auth(req, res, next) {
  try {
    const data = jwt.verify(req.cookies.session, process.env.JWT_SECRET);
    req.user = await User.findById(data.id);
    if (!req.user) return res.status(401).json({ message: 'Please sign in.' });
    next();
  } catch {
    return res.status(401).json({ message: 'Please sign in.' });
  }
}
export const roles =
  (...allowed) =>
  (req, res, next) =>
    allowed.includes(req.user.role)
      ? next()
      : res.status(403).json({ message: 'You do not have access to this action.' });
