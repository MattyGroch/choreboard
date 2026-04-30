import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { setAuthCookies, clearAuthCookies, verifyRefreshToken } from '../lib/jwt';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    setAuthCookies(res, { userId: user.id, role: 'PARENT' });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token as string | undefined;
    if (!token) throw new AppError(401, 'No refresh token');

    const payload = verifyRefreshToken(token);
    setAuthCookies(res, { userId: payload.userId, role: 'PARENT' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

export default router;
