import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';
import { TokenBlacklist } from '../models/token-blacklist.model';

const signToken = (id: string): string => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');
  const options: SignOptions = {
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '86400') // 24 hours in seconds
  };
  return jwt.sign({ id }, process.env.JWT_SECRET, options);
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        status: 'fail',
        message: 'User already exists with this email',
      });
      return;
    }

    // Create new user
    const newUser:any = await User.create({
      email,
      password,
      name,
    });

    // Generate token
    const token = signToken(newUser._id.toString());

    // Remove password from output
    newUser.set('password', undefined, { strict: false });

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: 'Error creating user',
      error,
    });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password',
      });
      return;
    }

    // Check if user exists && password is correct
    const user:any = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password',
      });
      return;
    }

    // Generate token
    const token = signToken(user._id.toString());

    // Remove password from output
    user.set('password', undefined, { strict: false });

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: 'Error logging in',
      error,
    });
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: 'Error getting user details',
      error,
    });
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(400).json({
        status: 'fail',
        message: 'No token provided'
      });
      return;
    }

    // Add token to blacklist
    await TokenBlacklist.create({ token });

    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out'
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: 'Error logging out',
      error
    });
  }
}; 