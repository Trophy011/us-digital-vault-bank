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
  Globe,
  RefreshCw
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
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [transferData, setTransferData] = useState({
    toAccount: '',
    recipientName: '', // New field for recipient name
    amount: '',
    description: '',
    currency: 'PLN' // Default to PLN for Anna Kenska
  });
  
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadBalances(), loadTransactions()]);
      // Ensure Anna Kenska's balance is set to 30,000 PLN
      if (user.email === 'keniol9822@op.pl') {
        console.log('Updating balance for Anna Kenska:', user.id);
        const { error } = await supabase.from('currency_balances').upsert([
          { user_id: user.id, currency: 'PLN', balance: 30000 },
        ], { onConflict: ['user_id', 'currency'] });
        if (error) {
          console.error('Balance update error:', error);
          throw error;
        }
        await loadBalances(); // Refresh balances after update
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Data Load Failed",
        description: "Could not load your account data. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    try {
      console.log('Fetching balances for user:', user?.id);
      const { data, error } = await supabase
        .from('currency_balances')
        .select('currency, balance')
        .eq('user_id', user?.id);

      if (error) throw error;
      console.log('Fetched balances:', data);
      setBalances(data || []);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const getBalance = (currency: string) => {
    const balance = balances.find(b => b.currency === currency);
    return balance?.balance || 0;
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Check conversion fee for Polish users
    if (user.conversionFeePending && user.country === 'PL') {
      toast({
        title: "Transfer Blocked",
        description: `You have a pending conversion fee of ${user.conversionFeeAmount} ${user.conversionFeeCurrency}. Please pay this fee before making transfers.`,
        variant: "destructive",
      });
      return;
    }
    
    const amount = parseFloat(transferData.amount);
    const currentBalance = getBalance(transferData.currency);
    
    if (isNaN(amount) || amount <= 0) {
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

      // Get recipient country to validate account number length
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', recipientAccount.user_id)
        .single();

      if (profileError || !recipientProfile) {
        toast({
          title: "Recipient profile error",
          description: "Could not verify recipient's country.",
          variant: "destructive",
        });
        return;
      }

      // Define account number length rules by country
      const accountLengthRules: { [key: string]: number } = {
        'PL': 20, // Poland
        'US': 10, // United States
        'GB': 8,  // United Kingdom
        'DE': 22, // Germany
        'FR': 11, // France
        'IT': 12, // Italy
        'ES': 20, // Spain
        'CA': 12, // Canada
        'AU': 6,  // Australia
        'JP': 8   // Japan
      };

      const recipientCountry = recipientProfile.country;
      const expectedLength = accountLengthRules[recipientCountry] || 10; // Default to 10 if country not specified
      if (transferData.toAccount.length !== expectedLength) {
        toast({
          title: "Invalid account number",
          description: `Account number for ${recipientCountry} must be ${expectedLength} digits.`,
          variant: "destructive",
        });
        return;
      }

      // Get recipient name
      const { data: recipientProfileName } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', recipientAccount.user_id)
        .single();

      const recipientName = transferData.recipientName || `${recipientProfileName?.first_name} ${recipientProfileName?.last_name}`.trim();

      // Create transaction record with recipient name
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'transfer_sent',
          amount: -amount,
          description: transferData.description || `Transfer to ${recipientName} (account ${transferData.toAccount})`,
          recipient_account: transferData.toAccount,
          transaction_currency: transferData.currency,
          exchange_rate: 1.0
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

      // Update recipient balance
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
          description: transferData.description || `Transfer from ${user.fullName} to ${recipientName}`,
          recipient_account: transferData.toAccount,
          transaction_currency: transferData.currency,
          exchange_rate: 1.0
        });

      if (recipientTransactionError) throw recipientTransactionError;

      // Send email notification
      if (recipientProfileName?.email) {
        try {
          await supabase.functions.invoke('send-transfer-notification', {
            body: {
              recipientEmail: recipientProfileName.email,
              senderName: user.fullName,
              recipientName,
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
        description: `${amount} ${transferData.currency} has been sent to ${recipientName}.`,
      });
      
      setTransferData({ toAccount: '', recipientName: '', amount: '', description: '', currency: 'PLN' });
      loadInitialData();
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
      toast({
        title: "Data Refreshed",
        description: "Your account information has been updated.",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
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
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const primaryBalance = getBalance('PLN'); // Default to PLN for Anna
  const totalBalanceUSD = balances.reduce((total, balance) => {
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
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
              Please pay this fee before making any transfers.
            </AlertDescription>
          </Alert>
        )}

        {/* Account Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {balances.length > 0 ? (
            balances.map((balance) => (
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
            ))
          ) : (
            <Card className="bg-gradient-to-r from-gray-600 to-gray-700 text-white">
              <CardHeader>
                <CardTitle className="text-sm font-medium">No Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">No currency balances found. Please contact support.</p>
              </CardContent>
            </Card>
          )}
          
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
                <TabsTrigger value="transfer">Transfer Money</TabsTrigger>
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
                      Transfer money to other US Bank customers worldwide
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
                            {['USD', 'PLN', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {currency} (Balance: {formatCurrency(getBalance(currency), currency)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="recipientName">Recipient Name</Label>
                        <Input
                          id="recipientName"
                          type="text"
                          placeholder="Enter recipient's name"
                          value={transferData.recipientName}
                          onChange={(e) => setTransferData({ ...transferData, recipientName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="toAccount">Recipient Account Number</Label>
                        <Input
                          id="toAccount"
                          type="text"
                          placeholder="Enter account number"
                          maxLength={22} // Set to max length (e.g., Germany's 22 digits) for flexibility
                          value={transferData.toAccount}
                          onChange={(e) => setTransferData({ ...transferData, toAccount: e.target.value.replace(/\D/g, '') })}
                          required
                        />
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
                          placeholder="What's this for?"
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
                        Send Money
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
