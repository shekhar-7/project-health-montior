import { Request, Response, NextFunction } from 'express';

export const validateUserCredentials = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Email validation using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide a valid email address'
    });
  }

  // Password validation
  // At least 8-16 characters
  // At least one uppercase letter
  // At least one lowercase letter
  // At least one number
  // At least one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
  
  if (!password || !passwordRegex.test(password)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Password must be 8-16 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    });
  }

  next();
}; 