import jwt from "jsonwebtoken";
import { Response } from "express";

export interface JwtPayload {
  userId: string;
  role: string;
}

const accessSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
if (!accessSecret || !refreshSecret) {
  throw new Error("JWT_SECRET or REFRESH_TOKEN_SECRET is not defined");
}

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const ACCESS_MAX_AGE = 60 * 60 * 1000;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, accessSecret, {
    expiresIn: ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, refreshSecret, {
    expiresIn: "30d",
    algorithm: "HS256",
  });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, accessSecret, {
      algorithms: ["HS256"],
    }) as JwtPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, refreshSecret, {
      algorithms: ["HS256"],
    }) as JwtPayload;
  } catch (error) {
    return null;
  }
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
};

export const sendToken = (res: Response, payload: JwtPayload) => {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie("token", accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_MAX_AGE,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE,
  });
};

export const clearTokens = (res: Response) => {
  res.clearCookie("token", {
    ...cookieOptions,
  });
  res.clearCookie("refreshToken", {
    ...cookieOptions,
  });
};
