import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { user } from "../db/schema";
import {
  sendToken,
  clearTokens,
  verifyRefreshToken,
  generateToken,
  JwtPayload,
} from "../utils/jwt";
import { AuthRequest } from "../middleware/auth";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, confirmPassword, dominantHand } = req.body;

    if (password !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: "كلمة المرور غير متطابقة",
      });
      return;
    }

    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "البريد الإلكتروني مستخدم بالفعل",
      });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db
      .insert(user)
      .values({
        name,
        email,
        password: hashedPassword,
        dominantHand: dominantHand || null,
        role: "user",
      })
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        dominantHand: user.dominantHand,
        createdAt: user.createdAt,
      });

    const createdUser = newUser[0];

    const payload: JwtPayload = {
      userId: createdUser.id,
      role: createdUser.role as "admin" | "teacher" | "user",
    };
    sendToken(res, payload);

    res.status(201).json({
      success: true,
      message: "تم التسجيل بنجاح",
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        dominantHand: createdUser.dominantHand,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "خطأ في الخادم",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const foundUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!foundUser) {
      res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
      return;
    }

    const payload: JwtPayload = {
      userId: foundUser.id,
      role: foundUser.role as "admin" | "teacher" | "user",
    };
    sendToken(res, payload);

    res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        dominantHand: foundUser.dominantHand,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "خطأ في الخادم",
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  clearTokens(res);
  res.json({
    success: true,
    message: "تم تسجيل الخروج بنجاح",
  });
};

export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "لا يوجد Refresh Token",
      });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({
        success: false,
        message: "Refresh Token غير صالح أو منتهي الصلاحية",
      });
      return;
    }

    const foundUser = await db.query.user.findFirst({
      where: eq(user.id, payload.userId),
    });

    if (!foundUser) {
      res.status(401).json({
        success: false,
        message: "المستخدم غير موجود",
      });
      return;
    }

    const newAccessToken = generateToken({
      userId: payload.userId,
      role: payload.role,
    });

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "تم تجديد التوكن بنجاح",
    });
  } catch (error: any) {
    console.error("Refresh error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "خطأ في الخادم",
    });
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "غير مصرح",
      });
      return;
    }

    const foundUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {
        password: false,
      },
    });

    if (!foundUser) {
      res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
      return;
    }

    res.json({
      success: true,
      user: foundUser,
    });
  } catch (error: any) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "خطأ في الخادم",
    });
  }
};
