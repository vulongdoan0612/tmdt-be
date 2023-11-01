// middleware/authMiddleware.js

import jwt from "jsonwebtoken";

export const checkAccessToken = (req, res, next) => {
  // Lấy AccessToken từ header hoặc từ cookie, tùy theo cách bạn triển khai
  const accessToken = req.headers.authorization || req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(accessToken, "VinalinkGroup!2020"); // Thay 'your-secret-key' bằng khóa bí mật thực tế
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid AccessToken" });
  }
};
