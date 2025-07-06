
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
  accountNumber: string;
  role: 'user' | 'admin';
  balance: number;
  savingsBalance: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
  updateBalance: (newBalance: number) => void;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  dateOfBirth: string;
  ssn: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('bankUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const generateAccountNumber = (): string => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
    // In a real implementation, this would send an actual email
    // For demo purposes, we'll show the OTP in console and alert
    console.log(`OTP for ${email}: ${otp}`);
    alert(`Demo: Your OTP is ${otp} (In production, this would be sent to your email)`);
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      // Check if user already exists
      const users = JSON.parse(localStorage.getItem('bankUsers') || '[]');
      const existingUser = users.find((u: any) => u.email === userData.email);
      
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Generate OTP and store temporarily
      const otp = generateOTP();
      const tempUserData = {
        ...userData,
        accountNumber: generateAccountNumber(),
        role: userData.email === 'admin@usbank.com' ? 'admin' : 'user',
        balance: userData.email === 'admin@usbank.com' ? 100000 : 1000, // Admin gets $100k, users get $1k starter
        savingsBalance: 0,
        otp,
        otpExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
        verified: false
      };

      localStorage.setItem('tempRegistration', JSON.stringify(tempUserData));
      await sendOTPEmail(userData.email, otp);
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    try {
      const tempUserData = JSON.parse(localStorage.getItem('tempRegistration') || '{}');
      
      if (tempUserData.email !== email) {
        throw new Error('Email mismatch');
      }

      if (tempUserData.otp !== otp) {
        throw new Error('Invalid OTP');
      }

      if (Date.now() > tempUserData.otpExpiry) {
        throw new Error('OTP expired');
      }

      // Move from temp to permanent storage
      const users = JSON.parse(localStorage.getItem('bankUsers') || '[]');
      const newUser = {
        id: Date.now().toString(),
        email: tempUserData.email,
        password: tempUserData.password,
        fullName: tempUserData.fullName,
        phoneNumber: tempUserData.phoneNumber,
        address: tempUserData.address,
        dateOfBirth: tempUserData.dateOfBirth,
        ssn: tempUserData.ssn,
        accountNumber: tempUserData.accountNumber,
        role: tempUserData.role,
        balance: tempUserData.balance,
        savingsBalance: tempUserData.savingsBalance,
        verified: true,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem('bankUsers', JSON.stringify(users));
      localStorage.removeItem('tempRegistration');

      return true;
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const users = JSON.parse(localStorage.getItem('bankUsers') || '[]');
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      if (!user.verified) {
        throw new Error('Account not verified');
      }

      const userData: User = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        accountNumber: user.accountNumber,
        role: user.role,
        balance: user.balance,
        savingsBalance: user.savingsBalance
      };

      setUser(userData);
      localStorage.setItem('bankUser', JSON.stringify(userData));
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser);
      localStorage.setItem('bankUser', JSON.stringify(updatedUser));
      
      // Update in users array
      const users = JSON.parse(localStorage.getItem('bankUsers') || '[]');
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? { ...u, balance: newBalance } : u
      );
      localStorage.setItem('bankUsers', JSON.stringify(updatedUsers));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bankUser');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    verifyOTP,
    logout,
    updateBalance
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
