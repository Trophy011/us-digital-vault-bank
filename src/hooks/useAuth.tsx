
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthUser extends User {
  fullName?: string;
  accountNumber?: string;
  role?: 'user' | 'admin';
  country?: string;
  conversionFeePending?: boolean;
  conversionFeeAmount?: number;
  conversionFeeCurrency?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  verifyOTP: (email: string, token: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: any) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  dateOfBirth: string;
  ssn?: string;
  country: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await loadUserProfile(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: User) => {
    try {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .from('admin_accounts')
        .select('email')
        .eq('email', authUser.email)
        .single();

      // Get account number
      const { data: account } = await supabase
        .from('accounts')
        .select('account_number')
        .eq('user_id', authUser.id)
        .single();

      const enhancedUser: AuthUser = {
        ...authUser,
        fullName: profile ? `${profile.first_name} ${profile.last_name}` : '',
        accountNumber: account?.account_number,
        role: adminCheck ? 'admin' : 'user',
        country: profile?.country || 'US',
        conversionFeePending: profile?.conversion_fee_pending || false,
        conversionFeeAmount: profile?.conversion_fee_amount,
        conversionFeeCurrency: profile?.conversion_fee_currency
      };

      setUser(enhancedUser);
    } catch (error) {
      console.error('Error loading profile:', error);
      setUser(authUser as AuthUser);
    }
  };

  const validateSSN = (ssn: string, country: string): boolean => {
    if (country === 'US') {
      // US SSN validation: XXX-XX-XXXX format
      const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
      return ssnRegex.test(ssn);
    }
    return true; // Non-US customers don't need SSN validation
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      // Validate SSN for US customers
      if (userData.country === 'US' && userData.ssn && !validateSSN(userData.ssn, userData.country)) {
        toast({
          title: "Invalid SSN",
          description: "Please enter a valid US SSN in format XXX-XX-XXXX",
          variant: "destructive",
        });
        return false;
      }

      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.fullName.split(' ')[0],
            last_name: userData.fullName.split(' ').slice(1).join(' '),
            phone_number: userData.phoneNumber,
            address: userData.address,
            date_of_birth: userData.dateOfBirth,
            ssn: userData.ssn,
            country: userData.country
          }
        }
      });

      if (error) {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Please check your email to verify your account.",
        });
      }

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const verifyOTP = async (email: string, token: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const updateProfile = async (updates: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Reload user profile
      await loadUserProfile(user);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    isAuthenticated: !!session,
    loading,
    login,
    register,
    verifyOTP,
    logout,
    updateProfile
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
