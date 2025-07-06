
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
  TrendingUp
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'transfer_sent' | 'transfer_received' | 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  date: string;
  fromAccount?: string;
  toAccount?: string;
}

const Dashboard = () => {
  const { user, logout, updateBalance } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [transferData, setTransferData] = useState({
    toAccount: '',
    amount: '',
    description: ''
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // Load transactions from localStorage
    const savedTransactions = localStorage.getItem(`transactions_${user?.id}`);
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
  }, [user?.id]);

  const saveTransaction = (transaction: Transaction) => {
    const updatedTransactions = [transaction, ...transactions].slice(0, 50); // Keep last 50 transactions
    setTransactions(updatedTransactions);
    localStorage.setItem(`transactions_${user?.id}`, JSON.stringify(updatedTransactions));
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    const amount = parseFloat(transferData.amount);
    
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    
    if (amount > user.balance) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough balance for this transfer.",
        variant: "destructive",
      });
      return;
    }

    // Find recipient
    const users = JSON.parse(localStorage.getItem('bankUsers') || '[]');
    const recipient = users.find((u: any) => u.accountNumber === transferData.toAccount);
    
    if (!recipient) {
      toast({
        title: "Account not found",
        description: "The recipient account number could not be found.",
        variant: "destructive",
      });
      return;
    }

    if (recipient.accountNumber === user.accountNumber) {
      toast({
        title: "Invalid transfer",
        description: "You cannot transfer money to your own account.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update sender balance
      const newSenderBalance = user.balance - amount;
      updateBalance(newSenderBalance);
      
      // Update recipient balance
      const newRecipientBalance = recipient.balance + amount;
      const updatedUsers = users.map((u: any) => 
        u.accountNumber === recipient.accountNumber 
          ? { ...u, balance: newRecipientBalance }
          : u.accountNumber === user.accountNumber
          ? { ...u, balance: newSenderBalance }
          : u
      );
      localStorage.setItem('bankUsers', JSON.stringify(updatedUsers));

      // Create transaction records
      const senderTransaction: Transaction = {
        id: Date.now().toString(),
        type: 'transfer_sent',
        amount: -amount,
        description: transferData.description || `Transfer to ${recipient.fullName}`,
        date: new Date().toISOString(),
        fromAccount: user.accountNumber,
        toAccount: recipient.accountNumber
      };
      
      const recipientTransaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: 'transfer_received',
        amount: amount,
        description: transferData.description || `Transfer from ${user.fullName}`,
        date: new Date().toISOString(),
        fromAccount: user.accountNumber,
        toAccount: recipient.accountNumber
      };

      // Save sender transaction
      saveTransaction(senderTransaction);
      
      // Save recipient transaction
      const recipientTransactions = JSON.parse(localStorage.getItem(`transactions_${recipient.id}`) || '[]');
      const updatedRecipientTransactions = [recipientTransaction, ...recipientTransactions].slice(0, 50);
      localStorage.setItem(`transactions_${recipient.id}`, JSON.stringify(updatedRecipientTransactions));

      toast({
        title: "Transfer successful",
        description: `$${amount.toFixed(2)} has been sent to ${recipient.fullName}.`,
      });
      
      setTransferData({ toAccount: '', amount: '', description: '' });
    } catch (error) {
      toast({
        title: "Transfer failed",
        description: "An error occurred during the transfer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">US Bank</span>
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
        {/* Account Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checking Balance</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(user.balance)}</div>
              <p className="text-xs text-blue-100">Account: {user.accountNumber}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Savings Balance</CardTitle>
              <PiggyBank className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(user.savingsBalance)}</div>
              <p className="text-xs text-green-100">2.5% APY</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(user.balance + user.savingsBalance)}</div>
              <p className="text-xs text-purple-100">All accounts combined</p>
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
                      Send Money
                    </CardTitle>
                    <CardDescription>
                      Transfer money to other US Bank customers instantly
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTransfer} className="space-y-4">
                      <div>
                        <Label htmlFor="toAccount">Recipient Account Number</Label>
                        <Input
                          id="toAccount"
                          type="text"
                          placeholder="Enter 10-digit account number"
                          maxLength={10}
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
                          max={user.balance}
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
                      <Button type="submit" className="w-full">
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
                    <CardDescription>
                      Your recent banking activity
                    </CardDescription>
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
                                transaction.type === 'transfer_sent' ? 'bg-red-100 text-red-600' :
                                transaction.type === 'transfer_received' ? 'bg-green-100 text-green-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {transaction.type === 'transfer_sent' ? <Send className="h-4 w-4" /> :
                                 transaction.type === 'transfer_received' ? <TrendingUp className="h-4 w-4" /> :
                                 <CreditCard className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                              </div>
                            </div>
                            <div className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
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
                    <CardDescription>
                      Your personal banking details
                    </CardDescription>
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
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Banking Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium text-green-600">💡 Savings Tip</p>
                    <p className="text-gray-600">Set up automatic transfers to grow your savings effortlessly.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-blue-600">🔒 Security</p>
                    <p className="text-gray-600">Never share your account details with anyone.</p>
                  </div>
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
