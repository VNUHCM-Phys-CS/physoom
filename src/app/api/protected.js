import jwt from "jsonwebtoken";

export default function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Authorization header missing or malformed." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    res.status(200).json({ message: "Token is valid!", user: decoded });
  } catch (err) {
    res.status(401).json({ message: "Invalid token." });
  }
}
