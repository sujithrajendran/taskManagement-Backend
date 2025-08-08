import { NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (req: any, res: any, next: NextFunction) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ error: "Access Denied. No token provided." });

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (err: any, decoded: any) => {
      if (err) return res.status(403).json({ error: "Invalid token." });
      req.userId = decoded.userId;
      req.headers["userId"] = decoded.userId;
      req.headers["email"] = decoded.email;
      next();
    }
  );
};

export const authenticateSocket = (
  token: string,
  io: any
): Promise<{ userId: string; email: string }> => {
  return new Promise((resolve, reject) => {
    if (!token) return reject(new Error("Token missing"));

    const jwtToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    jwt.verify(
      jwtToken,
      process.env.JWT_SECRET as string,
      (err: any, decoded: any) => {
        if (err) {
          io.emit("authError", { error: "Invalid token." });
          return reject(new Error("Invalid token."));
        }

        resolve({
          userId: decoded.userId,
          email: decoded.email
        });
      }
    );
  });
};
