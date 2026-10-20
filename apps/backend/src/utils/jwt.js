import jwt from 'jsonwebtoken';

const generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};

export const generateAccessToken = (user) => {
  return generateToken(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    process.env.JWT_EXPIRE || '7d'
  );
};

export const generateRefreshToken = (user) => {
  return generateToken(
    { 
      id: user._id, 
      email: user.email 
    },
    process.env.JWT_REFRESH_SECRET,
    process.env.JWT_REFRESH_EXPIRE || '30d'
  );
};

export const verifyAccessToken = (token) => {
  return verifyToken(token, process.env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return verifyToken(token, process.env.JWT_REFRESH_SECRET);
};
