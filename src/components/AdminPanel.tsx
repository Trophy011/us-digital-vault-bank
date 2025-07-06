
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  ArrowLeft,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  CreditCard
} from 'lucide-react';

interface BankUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  accountNumber: string;
  balance: number;
  savingsBalance: number;
  role: 'user' | 'admin';
  verified: boolean;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  totalBalance: number;
  totalSavings: number;
  totalTransactions: number;
  activeUsers: number;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<BankUser[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalBalance: 0,
    totalSavings: 0,
    totalTransactions: 0,
    activeUsers: 0
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = () => {
    // Load all users
    const allUsers: BankUser[] = JSON.parse(localStorage.getItem('bankUsers') || '[]');
    setUsers(allUsers);
    
    // Calculate statistics
    const totalBalance = allUsers.reduce((sum, user) => sum + user.balance, 0);
    const totalSavings = allUsers.reduce((sum, user) => sum + user.savingsBalance, 0);
    
    // Count total transactions across all users
    let totalTransactions = 0;
    allUsers.forEach(user => {
      const userTransactions = JSON.parse(localStorage.getItem(`transactions_${user.id}`) || '[]');
      totalTransactions += userTransactions.length;
    });

    setStats({
      totalUsers: allUsers.length,
      totalBalance,
      totalSavings,
      totalTransactions,
      activeUsers: allUsers.filter(u => u.verified).length
    });
  };

  const handleUserAction = (userId: string, action: 'suspend' | 'activate' | 'delete') => {
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        switch (action) {
          case 'suspend':
            return { ...user, verified: false };
          case 'activate':
            return { ...user, verified: true };
          default:
            return user;
        }
      }
      return user;
    }).filter(user => action === 'delete' ? user.id !== userId : true);

    setUsers(updatedUsers);
    localStorage.setItem('bankUsers', JSON.stringify(updatedUsers));
    
    toast({
      title: "Action completed",
      description: `User has been ${action}d successfully.`,
    });
    
    loadSystemData(); // Refresh stats
  };

  const adjustUserBalance = (userId: string, newBalance: number) => {
    const updatedUsers = users.map(user => 
      user.id === userId ? { ...user, balance: Math.max(0, newBalance) } : user
    );
    
    setUsers(updatedUsers);
    localStorage.setItem('bankUsers', JSON.stringify(updatedUsers));
    
    toast({
      title: "Balance updated",
      description: "User balance has been adjusted successfully.",
    });
    
    loadSystemData();
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.accountNumber.includes(searchQuery)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-blue-900">US Bank Admin</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Admin Panel
            </Badge>
            <span className="text-sm text-gray-600">{user.fullName}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* System Statistics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</div>
              <p className="text-xs text-muted-foreground">
                Checking accounts
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSavings)}</div>
              <p className="text-xs text-muted-foreground">
                Savings accounts
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Admin Interface */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="transactions">Transaction Monitoring</TabsTrigger>
            <TabsTrigger value="system">System Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage all bank customers and their accounts
                </CardDescription>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search users by name, email, or account number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((bankUser) => (
                    <div key={bankUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {bankUser.fullName.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {bankUser.fullName}
                            </p>
                            <Badge variant={bankUser.verified ? "default" : "destructive"}>
                              {bankUser.verified ? "Active" : "Suspended"}
                            </Badge>
                            {bankUser.role === 'admin' && (
                              <Badge variant="secondary">Admin</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{bankUser.email}</p>
                          <p className="text-sm text-gray-500">Account: {bankUser.accountNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(bankUser.balance)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Savings: {formatCurrency(bankUser.savingsBalance)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newBalance = prompt('Enter new balance:', bankUser.balance.toString());
                            if (newBalance && !isNaN(parseFloat(newBalance))) {
                              adjustUserBalance(bankUser.id, parseFloat(newBalance));
                            }
                          }}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUserAction(bankUser.id, bankUser.verified ? 'suspend' : 'activate')}
                        >
                          {bankUser.verified ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this user?')) {
                              handleUserAction(bankUser.id, 'delete');
                            }
                          }}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Monitoring</CardTitle>
                <CardDescription>
                  Monitor all banking transactions in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Transaction monitoring dashboard coming soon...</p>
                  <p className="text-sm text-gray-400 mt-2">
                    View real-time transaction flows, detect suspicious activity, and generate reports.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure banking system parameters and security settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Security Settings</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Two-Factor Authentication</span>
                        <Badge variant="outline" className="text-green-600">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Session Timeout</span>
                        <span className="text-sm text-gray-500">30 minutes</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-base font-medium">System Limits</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Daily Transfer Limit</span>
                        <span className="text-sm text-gray-500">$10,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Monthly Transaction Limit</span>
                        <span className="text-sm text-gray-500">$50,000</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-base font-medium">Backup & Recovery</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Last Backup</span>
                        <span className="text-sm text-gray-500">2 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Backup Status</span>
                        <Badge variant="outline" className="text-green-600">Active</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
