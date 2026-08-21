import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "غير مصرح - يرجى تسجيل الدخول",
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      message: "غير مصرح - توكن غير صالح",
    });
    return;
  }

  req.user = payload;
  next();
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "غير مصرح",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "صلاحيات غير كافية",
      });
      return;
    }

    next();
  };
};
