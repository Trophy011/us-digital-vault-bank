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
import { 
  Building2, 
  DollarSign, 
  Send, 
  History, 
  LogOut, 
  User,
  Settings,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Globe,
  RefreshCw
} from 'lucide-react';

// Interfaces
interface User {
  id: string;
  fullName: string;
  email: string;
  accountNumber: string;
  country: string;
  role: string;
  conversionFeePending?: boolean;
  conversionFeeAmount?: number;
  conversionFeeCurrency?: string;
}

interface CurrencyBalance {
  currency: string;
  balance: number;
}

interface Transaction {
  id: string;
  user_id: string;
  transaction_type: 'transfer_sent' | 'transfer_received';
  amount: number;
  description: string;
  created_at: string;
  recipient_account?: string;
  transaction_currency: string;
  exchange_rate: number;
  status: 'pending' | 'completed' | 'failed';
}

interface ExchangeRate {
  currency: string;
  rate: number; // Rate relative to USD
}

interface TransferData {
  toAccount: string;
  amount: string;
  description: string;
  currency: string;
  recipientCountry: string;
}

const COUNTRY_ACCOUNT_FORMATS = {
  US: { digits: 10, label: 'US Bank Account (10 digits)' },
  PL: { digits: 20, label: 'Polish Bank Account (20 digits)' },
  UK: { digits: 8, label: 'UK Bank Account (8 digits)' },
  DE: { digits: 10, label: 'German Bank Account (10 digits)' },
  FR: { digits: 11, label: 'French Bank Account (11 digits)' },
  CA: { digits: 12, label: 'Canadian Bank Account (12 digits)' },
  AU: { digits: 9, label: 'Australian Bank Account (9 digits)' },
  JP: { digits: 7, label: 'Japanese Bank Account (7 digits)' },
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [transferData, setTransferData] = useState<TransferData>({
    toAccount: '',
    amount: '',
    description: '',
    currency: 'USD',
    recipientCountry: 'US',
  });
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  useEffect(() => {
    if (user) {
      loadInitialData();
      fetchExchangeRates();
    }
  }, [user]);

  // Simulate fetching exchange rates from an API
  const fetchExchangeRates = async () => {
    try {
      // Placeholder: Replace with actual API call (e.g., exchangeratesapi.io)
      const rates: ExchangeRate[] = [
        { currency: 'USD', rate: 1 },
        { currency: 'PLN', rate: 4.0 },
        { currency: 'EUR', rate: 1.1 },
        { currency: 'GBP', rate: 1.3 },
        { currency: 'CAD', rate: 0.75 },
        { currency: 'AUD', rate: 0.65 },
        { currency: 'JPY', rate: 0.007 },
      ];
      setExchangeRates(rates);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      toast({
        title: 'Exchange Rates Error',
        description: 'Unable to fetch exchange rates. Using default rates.',
        variant: 'destructive',
      });
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [balanceData, transactionData] = await Promise.all([
        loadBalances(),
        loadTransactions(),
      ]);
      setBalances(balanceData || []);
      setTransactions(transactionData || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load account data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (): Promise<CurrencyBalance[] | null> => {
    try {
      const { data, error } = await supabase
        .from('currency_balances')
        .select('currency, balance')
        .eq('user_id', (user as User).id);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading balances:', error);
      throw error;
    }
  };

  const loadTransactions = async (): Promise<Transaction[] | null> => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', (user as User).id)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * transactionsPerPage, currentPage * transactionsPerPage - 1);

      if (error) throw error;

      return data.map((transaction) => ({
        ...transaction,
        transaction_currency: transaction.transaction_currency || 'USD',
        exchange_rate: transaction.exchange_rate || 1.0,
        status: transaction.status || 'completed',
      }));
    } catch (error) {
      console.error('Error loading transactions:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
      toast({
        title: 'Data refreshed',
        description: 'Your account information has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Unable to refresh data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getBalance = (currency: string): number => {
    const balance = balances.find((b) => b.currency === currency);
    return balance?.balance || 0;
  };

  const validateAccountNumber = (accountNumber: string, country: string): boolean => {
    const format = COUNTRY_ACCOUNT_FORMATS[country as keyof typeof COUNTRY_ACCOUNT_FORMATS];
    if (!format) return false;
    const digitsOnly = accountNumber.replace(/\D/g, '');
    return digitsOnly.length === format.digits;
  };

  // Sanitize input to prevent XSS
  const sanitizeInput = (input: string): string => {
    return input.replace(/[<>]/g, '');
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setTransferLoading(true);
    try {
      // Check conversion fee for Polish users
      if ((user as User).conversionFeePending && (user as User).country === 'PL') {
        toast({
          title: 'Transfer Blocked',
          description: `You have a pending conversion fee of ${(user as User).conversionFeeAmount} ${(user as User).conversionFeeCurrency}. Please pay this fee via Bybit before making transfers.`,
          variant: 'destructive',
        });
        return;
      }

      const amount = parseFloat(transferData.amount);
      const currentBalance = getBalance(transferData.currency);

      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Invalid amount',
          description: 'Please enter a valid amount greater than 0.',
          variant: 'destructive',
        });
        return;
      }

      if (amount > currentBalance) {
        toast({
          title: 'Insufficient funds',
          description: `You don't have enough ${transferData.currency} balance for this transfer.`,
          variant: 'destructive',
        });
        return;
      }

      if (!validateAccountNumber(transferData.toAccount, transferData.recipientCountry)) {
        const format = COUNTRY_ACCOUNT_FORMATS[transferData.recipientCountry as keyof typeof COUNTRY_ACCOUNT_FORMATS];
        toast({
          title: 'Invalid account number',
          description: `Please enter a valid ${format.label.toLowerCase()}.`,
          variant: 'destructive',
        });
        return;
      }

      // Find recipient account
      const { data: recipientAccount, error: accountError } = await supabase
        .from('accounts')
        .select('user_id')
        .eq('account_number', transferData.toAccount)
        .single();

      if (accountError || !recipientAccount) {
        toast({
          title: 'Account not found',
          description: 'The recipient account number could not be found.',
          variant: 'destructive',
        });
        return;
      }

      if (recipientAccount.user_id === (user as User).id) {
        toast({
          title: 'Invalid transfer',
          description: 'You cannot transfer money to your own account.',
          variant: 'destructive',
        });
        return;
      }

      // Get recipient profile for email notification
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', recipientAccount.user_id)
        .single();

      // Simulate currency conversion (if recipient uses a different currency)
      const recipientCurrency = transferData.currency; // Placeholder: Assume same currency for simplicity
      const exchangeRate = exchangeRates.find((r) => r.currency === transferData.currency)?.rate || 1.0;
      const convertedAmount = amount * exchangeRate;

      // Create transaction record for sender
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: (user as User).id,
          transaction_type: 'transfer_sent',
          amount: -amount,
          description: sanitizeInput(transferData.description) || `International transfer to ${transferData.recipientCountry} account ${transferData.toAccount}`,
          recipient_account: transferData.toAccount,
          transaction_currency: transferData.currency,
          exchange_rate: exchangeRate,
          status: 'completed',
        });

      if (transactionError) throw transactionError;

      // Update sender balance
      const { error: balanceError } = await supabase
        .from('currency_balances')
        .upsert({
          user_id: (user as User).id,
          currency: transferData.currency,
          balance: currentBalance - amount,
        });

      if (balanceError) throw balanceError;

      // Update recipient balance
      const recipientBalance = await getRecipientBalance(recipientAccount.user_id, recipientCurrency);

      const { error: recipientBalanceError } = await supabase
        .from('currency_balances')
        .upsert({
          user_id: recipientAccount.user_id,
          currency: recipientCurrency,
          balance: recipientBalance + convertedAmount,
        });

      if (recipientBalanceError) throw recipientBalanceError;

      // Create recipient transaction record
      const { error: recipientTransactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: recipientAccount.user_id,
          transaction_type: 'transfer_received',
          amount: convertedAmount,
          description: sanitizeInput(transferData.description) || `International transfer from ${(user as User).fullName}`,
          recipient_account: transferData.toAccount,
          transaction_currency: recipientCurrency,
          exchange_rate: exchangeRate,
          status: 'completed',
        });

      if (recipientTransactionError) throw recipientTransactionError;

      // Send email notification
      if (recipientProfile?.email) {
        try {
          await supabase.functions.invoke('send-transfer-notification', {
            body: {
              recipientEmail: recipientProfile.email,
              senderName: (user as User).fullName,
              amount: convertedAmount,
              currency: recipientCurrency,
              description: sanitizeInput(transferData.description),
            },
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
        }
      }

      toast({
        title: 'Transfer successful',
        description: `${amount} ${transferData.currency} has been sent successfully.`,
      });

      setTransferData({ toAccount: '', amount: '', description: '', currency: 'USD', recipientCountry: 'US' });
      loadInitialData();
    } catch (error) {
      console.error('Transfer error:', error);
      toast({
        title: 'Transfer failed',
        description: 'An error occurred during the transfer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const getRecipientBalance = async (userId: string, currency: string): Promise<number> => {
    const { data } = await supabase
      .from('currency_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    return data?.balance || 0;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    const currencyMap: { [key: string]: string } = {
      USD: 'en-US',
      PLN: 'pl-PL',
      EUR: 'de-DE',
      GBP: 'en-GB',
      CAD: 'en-CA',
      AUD: 'en-AU',
      JPY: 'ja-JP',
    };

    return new Intl.NumberFormat(currencyMap[currency] || 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingSpinner message="Loading your account..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
              <div className="mt-4 space-y-2">
                <Button onClick={handleRefresh} size="sm" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={handleLogout} variant="outline" size="sm" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const totalBalanceUSD = balances.reduce((total, balance) => {
    const rate = exchangeRates.find((r) => r.currency === balance.currency)?.rate || 1;
    return total + balance.balance * rate;
  }, 0);

  const currentAccountFormat = COUNTRY_ACCOUNT_FORMATS[transferData.recipientCountry as keyof typeof COUNTRY_ACCOUNT_FORMATS];

  // Pagination logic
  const totalPages = Math.ceil(transactions.length / transactionsPerPage);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">US Bank</span>
            <span className="text-sm text-gray-500 flex items-center">
              <Globe className="h-4 w-4 mr-1" />
              {(user as User).country}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <span className="text-sm text-gray-600">Welcome, {(user as User).fullName}</span>
            {(user as User).role === 'admin' && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                <Settings className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Conversion Fee Alert for Polish users */}
        {(user as User).conversionFeePending && (user as User).country === 'PL' && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have a pending conversion fee of {(user as User).conversionFeeAmount} {(user as User).conversionFeeCurrency}.
              Please pay this fee via Bybit before making any transfers to other banks.
            </AlertDescription>
          </Alert>
        )}

        {/* Account Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {balances.map((balance) => (
            <Card key={balance.currency} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{balance.currency} Balance</CardTitle>
                <DollarSign className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(balance.balance, balance.currency)}</div>
                {balance.currency === 'USD' && (
                  <p className="text-xs text-blue-100">Account: {(user as User).accountNumber}</p>
                )}
              </CardContent>
            </Card>
          ))}
          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets (USD)</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBalanceUSD)}</div>
              <p className="text-xs text-purple-100">All currencies combined</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="transfer" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transfer">International Transfer</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="account">Account Info</TabsTrigger>
              </TabsList>

              <TabsContent value="transfer">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Send className="h-5 w-5 mr-2" />
                      International Money Transfer
                    </CardTitle>
                    <CardDescription>
                      Transfer money to US Bank customers worldwide with secure international routing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTransfer} className="space-y-4">
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                          value={transferData.currency}
                          onValueChange={(value) => setTransferData({ ...transferData, currency: value })}
                        >
                          <SelectTrigger aria-label="Select currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {balances.map((balance) => (
                              <SelectItem key={balance.currency} value={balance.currency}>
                                {balance.currency} (Balance: {formatCurrency(balance.balance, balance.currency)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="recipientCountry">Recipient Country</Label>
                        <Select
                          value={transferData.recipientCountry}
                          onValueChange={(value) =>
                            setTransferData({ ...transferData, recipientCountry: value, toAccount: '' })
                          }
                        >
                          <SelectTrigger aria-label="Select recipient country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">🇺🇸 United States</SelectItem>
                            <SelectItem value="PL">🇵🇱 Poland</SelectItem>
                            <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                            <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                            <SelectItem value="FR">🇫🇷 France</SelectItem>
                            <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                            <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                            <SelectItem value="JP">🇯🇵 Japan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="toAccount">Recipient Account Number</Label>
                        <Input
                          id="toAccount"
                          type="text"
                          placeholder={`Enter ${currentAccountFormat?.digits || 10}-digit account number`}
                          maxLength={currentAccountFormat?.digits || 10}
                          value={transferData.toAccount}
                          onChange={(e) =>
                            setTransferData({ ...transferData, toAccount: e.target.value.replace(/\D/g, '') })
                          }
                          required
                          aria-describedby="account-format"
                        />
                        <p id="account-format" className="text-xs text-gray-500 mt-1">
                          {currentAccountFormat?.label || 'Account format'}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          max={getBalance(transferData.currency)}
                          value={transferData.amount}
                          onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                          required
                          aria-describedby="amount-error"
                        />
                        {parseFloat(transferData.amount) > getBalance(transferData.currency) && (
                          <p id="amount-error" className="text-xs text-red-500 mt-1">
                            Amount exceeds available balance
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                          id="description"
                          type="text"
                          placeholder="What's this transfer for?"
                          value={transferData.description}
                          onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={
                          transferLoading ||
                          ((user as User).conversionFeePending && (user as User).country === 'PL')
                        }
                      >
                        {transferLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send International Transfer
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <History className="h-5 w-5 mr-2" />
                      Transaction History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {paginatedTransactions.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No transactions yet</p>
                      ) : (
                        paginatedTransactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`p-2 rounded-full ${
                                  transaction.transaction_type === 'transfer_sent'
                                    ? 'bg-red-100 text-red-600'
                                    : transaction.transaction_type === 'transfer_received'
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-blue-100 text-blue-600'
                                }`}
                              >
                                {transaction.transaction_type === 'transfer_sent' ? (
                                  <Send className="h-4 w-4" />
                                ) : transaction.transaction_type === 'transfer_received' ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <CreditCard className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <p className="text-sm text-gray-500">{formatDate(transaction.created_at)}</p>
                                <p className="text-xs text-gray-400">Status: {transaction.status}</p>
                              </div>
                            </div>
                            <div
                              className={`font-bold ${
                                transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.amount >= 0 ? '+' : ''}
                              {formatCurrency(transaction.amount, transaction.transaction_currency)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex justify-between mt-4">
                        <Button
                          variant="outline"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                        >
                          Previous
                        </Button>
                        <span>
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Account Holder</Label>
                        <p className="text-lg font-semibold">{(user as User).fullName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Account Number</Label>
                        <p className="text-lg font-semibold">{(user as User).accountNumber}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email</Label>
                        <p className="text-lg">{(user as User).email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Country</Label>
                        <p className="text-lg">{(user as User).country}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Account Type</Label>
                        <p className="text-lg capitalize">{(user as User).role}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Active Currencies</Label>
                        <p className="text-lg">{balances.map((b) => b.currency).join(', ')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Request New Card
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  Find ATM/Branch
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Exchange Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {exchangeRates
                  .filter((rate) => rate.currency !== 'USD')
                  .map((rate) => (
                    <div key={rate.currency} className="flex justify-between text-sm">
                      <span>USD/{rate.currency}</span>
                      <span>{rate.rate.toFixed(2)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
