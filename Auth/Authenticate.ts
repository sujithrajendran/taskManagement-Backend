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
