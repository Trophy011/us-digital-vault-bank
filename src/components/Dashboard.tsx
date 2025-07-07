
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
import { 
  Building2, 
  DollarSign, 
  Send, 
  History, 
  PiggyBank, 
  LogOut, 
  User,
  Settings,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Globe
} from 'lucide-react';

interface CurrencyBalance {
  currency: string;
  balance: number;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
  recipient_account?: string;
  transaction_currency: string;
  exchange_rate: number;
  status: string;
}

const COUNTRY_ACCOUNT_FORMATS = {
  'US': { digits: 10, label: 'US Bank Account (10 digits)' },
  'PL': { digits: 20, label: 'Polish Bank Account (20 digits)' },
  'UK': { digits: 8, label: 'UK Bank Account (8 digits)' },
  'DE': { digits: 10, label: 'German Bank Account (10 digits)' },
  'FR': { digits: 11, label: 'French Bank Account (11 digits)' },
  'CA': { digits: 12, label: 'Canadian Bank Account (12 digits)' },
  'AU': { digits: 9, label: 'Australian Bank Account (9 digits)' },
  'JP': { digits: 7, label: 'Japanese Bank Account (7 digits)' }
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [transferData, setTransferData] = useState({
    toAccount: '',
    amount: '',
    description: '',
    currency: 'USD',
    recipientCountry: 'US'
  });
  
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBalances();
      loadTransactions();
    }
  }, [user]);

  const loadBalances = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('currency_balances')
        .select('currency, balance')
        .eq('user_id', user.id);

      if (error) throw error;
      setBalances(data || []);
    } catch (error) {
      console.error('Error loading balances:', error);
      toast({
        title: "Error loading balances",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      
      const mappedTransactions = (data || []).map(transaction => ({
        ...transaction,
        transaction_currency: transaction.transaction_currency || 'USD',
        exchange_rate: transaction.exchange_rate || 1.0,
        status: transaction.status || 'completed'
      }));
      
      setTransactions(mappedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error loading transactions",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    }
  };

  const getBalance = (currency: string) => {
    const balance = balances.find(b => b.currency === currency);
    return balance?.balance || 0;
  };

  const validateAccountNumber = (accountNumber: string, country: string) => {
    const format = COUNTRY_ACCOUNT_FORMATS[country as keyof typeof COUNTRY_ACCOUNT_FORMATS];
    if (!format) return false;
    
    const digitsOnly = accountNumber.replace(/\D/g, '');
    return digitsOnly.length === format.digits;
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Check conversion fee for Polish users
    if (user.conversionFeePending && user.country === 'PL') {
      toast({
        title: "Transfer Blocked",
        description: `You have a pending conversion fee of ${user.conversionFeeAmount} ${user.conversionFeeCurrency}. Please pay this fee via Bybit before making transfers.`,
        variant: "destructive",
      });
      return;
    }
    
    const amount = parseFloat(transferData.amount);
    const currentBalance = getBalance(transferData.currency);
    
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    
    if (amount > currentBalance) {
      toast({
        title: "Insufficient funds",
        description: `You don't have enough ${transferData.currency} balance for this transfer.`,
        variant: "destructive",
      });
      return;
    }

    if (!validateAccountNumber(transferData.toAccount, transferData.recipientCountry)) {
      const format = COUNTRY_ACCOUNT_FORMATS[transferData.recipientCountry as keyof typeof COUNTRY_ACCOUNT_FORMATS];
      toast({
        title: "Invalid account number",
        description: `Please enter a valid ${format.label.toLowerCase()}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Find recipient account
      const { data: recipientAccount, error: accountError } = await supabase
        .from('accounts')
        .select('user_id')
        .eq('account_number', transferData.toAccount)
        .single();

      if (accountError || !recipientAccount) {
        toast({
          title: "Account not found",
          description: "The recipient account number could not be found.",
          variant: "destructive",
        });
        return;
      }

      if (recipientAccount.user_id === user.id) {
        toast({
          title: "Invalid transfer",
          description: "You cannot transfer money to your own account.",
          variant: "destructive",
        });
        return;
      }

      // Get recipient profile for email notification
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', recipientAccount.user_id)
        .single();

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'transfer_sent',
          amount: -amount,
          description: transferData.description || `International transfer to ${transferData.recipientCountry} account ${transferData.toAccount}`,
          recipient_account: transferData.toAccount,
          transaction_currency: transferData.currency,
          exchange_rate: 1.0,
          status: 'completed'
        });

      if (transactionError) throw transactionError;

      // Update sender balance
      const { error: balanceError } = await supabase
        .from('currency_balances')
        .upsert({
          user_id: user.id,
          currency: transferData.currency,
          balance: currentBalance - amount
        });

      if (balanceError) throw balanceError;

      // Update recipient balance (assuming same currency for now)
      const recipientBalance = await getRecipientBalance(recipientAccount.user_id, transferData.currency);
      
      const { error: recipientBalanceError } = await supabase
        .from('currency_balances')
        .upsert({
          user_id: recipientAccount.user_id,
          currency: transferData.currency,
          balance: recipientBalance + amount
        });

      if (recipientBalanceError) throw recipientBalanceError;

      // Create recipient transaction record
      const { error: recipientTransactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: recipientAccount.user_id,
          transaction_type: 'transfer_received',
          amount: amount,
          description: transferData.description || `International transfer from ${user.fullName}`,
          recipient_account: transferData.toAccount,
          transaction_currency: transferData.currency,
          exchange_rate: 1.0,
          status: 'completed'
        });

      if (recipientTransactionError) throw recipientTransactionError;

      // Send email notification
      if (recipientProfile?.email) {
        try {
          await supabase.functions.invoke('send-transfer-notification', {
            body: {
              recipientEmail: recipientProfile.email,
              senderName: user.fullName,
              amount,
              currency: transferData.currency,
              description: transferData.description
            }
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
        }
      }

      toast({
        title: "Transfer successful",
        description: `${amount} ${transferData.currency} has been sent successfully.`,
      });
      
      setTransferData({ toAccount: '', amount: '', description: '', currency: 'USD', recipientCountry: 'US' });
      loadBalances();
      loadTransactions();
    } catch (error) {
      console.error('Transfer error:', error);
      toast({
        title: "Transfer failed",
        description: "An error occurred during the transfer. Please try again.",
        variant: "destructive",
      });
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

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const currencyMap: { [key: string]: string } = {
      'USD': 'en-US',
      'PLN': 'pl-PL',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'CAD': 'en-CA',
      'AUD': 'en-AU',
      'JPY': 'ja-JP'
    };

    return new Intl.NumberFormat(currencyMap[currency] || 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-xl">Loading your account...</div>
      </div>
    );
  }

  if (!user) return null;

  const totalBalanceUSD = balances.reduce((total, balance) => {
    // Simple conversion rates for demo
    const rates: { [key: string]: number } = {
      'USD': 1,
      'PLN': 0.25,
      'EUR': 1.1,
      'GBP': 1.3,
      'CAD': 0.75,
      'AUD': 0.65,
      'JPY': 0.007
    };
    return total + (balance.balance * (rates[balance.currency] || 1));
  }, 0);

  const currentAccountFormat = COUNTRY_ACCOUNT_FORMATS[transferData.recipientCountry as keyof typeof COUNTRY_ACCOUNT_FORMATS];

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
              {user.country}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {user.fullName}</span>
            {user.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/admin')}
              >
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
        {user.conversionFeePending && user.country === 'PL' && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have a pending conversion fee of {user.conversionFeeAmount} {user.conversionFeeCurrency}. 
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
                  <p className="text-xs text-blue-100">Account: {user.accountNumber}</p>
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
                        <Select value={transferData.currency} onValueChange={(value) => setTransferData({ ...transferData, currency: value })}>
                          <SelectTrigger>
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
                        <Select value={transferData.recipientCountry} onValueChange={(value) => setTransferData({ ...transferData, recipientCountry: value, toAccount: '' })}>
                          <SelectTrigger>
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
                          onChange={(e) => setTransferData({ ...transferData, toAccount: e.target.value.replace(/\D/g, '') })}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
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
                        />
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
                        disabled={user.conversionFeePending && user.country === 'PL'}
                      >
                        <Send className="h-4 w-4 mr-2" />
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
                      {transactions.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No transactions yet</p>
                      ) : (
                        transactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${
                                transaction.transaction_type === 'transfer_sent' ? 'bg-red-100 text-red-600' :
                                transaction.transaction_type === 'transfer_received' ? 'bg-green-100 text-green-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {transaction.transaction_type === 'transfer_sent' ? <Send className="h-4 w-4" /> :
                                 transaction.transaction_type === 'transfer_received' ? <TrendingUp className="h-4 w-4" /> :
                                 <CreditCard className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <p className="text-sm text-gray-500">{formatDate(transaction.created_at)}</p>
                                <p className="text-xs text-gray-400">Status: {transaction.status}</p>
                              </div>
                            </div>
                            <div className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount, transaction.transaction_currency)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
                        <p className="text-lg font-semibold">{user.fullName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Account Number</Label>
                        <p className="text-lg font-semibold">{user.accountNumber}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email</Label>
                        <p className="text-lg">{user.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Country</Label>
                        <p className="text-lg">{user.country}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Account Type</Label>
                        <p className="text-lg capitalize">{user.role}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Active Currencies</Label>
                        <p className="text-lg">{balances.map(b => b.currency).join(', ')}</p>
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
                <div className="flex justify-between text-sm">
                  <span>USD/PLN</span>
                  <span>4.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>EUR/USD</span>
                  <span>1.10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GBP/USD</span>
                  <span>1.30</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
