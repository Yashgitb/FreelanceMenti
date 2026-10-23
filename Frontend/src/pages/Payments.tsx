import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  IndianRupee,
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Filter
} from 'lucide-react';
import { paymentsAPI, Payment, PaymentStats } from '@/lib/api/payments';
import { projectAPI } from '@/lib/api/projects';
import { CommandDialog, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/use-auth';

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
    // Defensive checks for undefined properties
    // Example usage:
    // {payment?.amount ?? 'N/A'}
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    // when project selection changes, fetch payments/stats for that scope
    fetchPayments();
    fetchStats();
  }, [statusFilter, currentPage, selectedProjectId]);

  const fetchPayments = async () => {
    try {
      if (selectedProjectId && selectedProjectId !== 'all') {
        // project-scoped payments
        const resp = await paymentsAPI.getProjectPayments(selectedProjectId);
        setPayments(resp || []);
        setTotalPages(1);
      } else {
        const response = await paymentsAPI.getPayments(
          currentPage,
          10,
          statusFilter === 'all' ? undefined : statusFilter
        );
        setPayments(response.payments);
        setTotalPages(response.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (selectedProjectId && selectedProjectId !== 'all') {
        const projectStats = await paymentsAPI.getProjectPaymentStats(selectedProjectId);
        setStats(projectStats);
      } else {
        const data = await paymentsAPI.getPaymentStats();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      // Fetch active projects (owned by current user) and completed projects, then merge
      const active = await projectAPI.getMyProjects().catch((e) => {
        // Not all users (e.g., freelancers) may be allowed to call /me/projects; ignore errors
        console.debug('getMyProjects failed (possibly not a client):', e?.message || e);
        return [] as any[];
      });

      // completed projects endpoint is paginated; request a large limit for dropdown
      const completedResp = await projectAPI.getCompletedProjects(1, 200).catch((e) => {
        console.debug('getCompletedProjects failed:', e?.message || e);
        return { projects: [] as any[], pagination: { page: 1, limit: 200, pages: 0, total: 0 } };
      });

      const activeArr = Array.isArray(active) ? active : [];
      let completedArr: any[] = [];
      if (Array.isArray(completedResp)) completedArr = completedResp as any[];
      else if (completedResp && Array.isArray((completedResp as any).projects)) completedArr = (completedResp as any).projects;

      // Merge and dedupe by id
      const merged = [...activeArr, ...completedArr];
      const deduped: any[] = [];
      const seen = new Set<string>();
      for (const p of merged) {
        const id = p.id || p._id || p._id?.toString?.();
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        deduped.push({ ...p, id });
      }
      setProjects(deduped);
    } catch (error) {
      console.error('Failed to fetch projects for filter', error);
    }
  };

  const copyToClipboard = async (text: string, label: string = 'Value') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    } catch (e) {
      console.error('Clipboard copy failed', e);
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard', variant: 'destructive' });
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Create a new jsPDF instance
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const reportTitle = user?.role === 'client' ? 'Payment History - Client Report' : 'Earnings Report - Freelancer';
      pdf.text(reportTitle, margin, yPosition);
      yPosition += 15;

      // Add export date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const exportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Exported on: ${exportDate}`, margin, yPosition);
      yPosition += 15;

      // Add stats summary if available
      if (stats) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Summary', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const totalLabel = user?.role === 'client' ? 'Total Spent' : 'Total Earnings';
        const monthlyLabel = user?.role === 'client' ? 'Monthly Spent' : 'Monthly Earnings';
        
        pdf.text(`${totalLabel}: ₹${stats.totalEarnings?.toLocaleString() || '0'}`, margin, yPosition);
        yPosition += 6;
        pdf.text(`${monthlyLabel}: ₹${stats.monthlyEarnings?.toLocaleString() || '0'}`, margin, yPosition);
        yPosition += 6;
        pdf.text(`Total Payments: ${stats.totalPayments || 0}`, margin, yPosition);
        yPosition += 15;
      }

      // Add payments table
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Details', margin, yPosition);
      yPosition += 10;

      // Table headers
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const headers = user?.role === 'client' 
        ? ['Date', 'Transaction ID', 'Amount', 'Status', 'Freelancer', 'Project']
        : ['Date', 'Transaction ID', 'Amount', 'Status', 'Project'];
      const colWidths = user?.role === 'client' 
        ? [20, 35, 20, 20, 30, 45]
        : [25, 40, 25, 25, 55];
      let xPosition = margin;

      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      yPosition += 8;

      // Draw header line
      pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
      yPosition += 5;

      // Add payment rows
      pdf.setFont('helvetica', 'normal');
      payments.forEach((payment) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        xPosition = margin;
        
        // Date
        const date = payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A';
        pdf.text(date, xPosition, yPosition);
        xPosition += colWidths[0];

        // Transaction ID
        const transactionId = payment.paymentDetails?.transactionId || payment._id || 'N/A';
        pdf.text(transactionId.substring(0, 15) + (transactionId.length > 15 ? '...' : ''), xPosition, yPosition);
        xPosition += colWidths[1];

        // Amount
        const amount = payment.amount ? `₹${payment.amount.toLocaleString()}` : 'N/A';
        pdf.text(amount, xPosition, yPosition);
        xPosition += colWidths[2];

        // Status
        const status = payment.status || 'N/A';
        pdf.text(status.charAt(0).toUpperCase() + status.slice(1), xPosition, yPosition);
        xPosition += colWidths[3];

        if (user?.role === 'client') {
          // Freelancer name (for clients)
          const freelancerName = payment.freelancer?.name || 'N/A';
          pdf.text(freelancerName.substring(0, 12) + (freelancerName.length > 12 ? '...' : ''), xPosition, yPosition);
          xPosition += colWidths[4];
        }

        // Project (truncated if too long)
        const projectName = payment.project?.title || 'N/A';
        const maxProjectLength = user?.role === 'client' ? 15 : 20;
        pdf.text(projectName.substring(0, maxProjectLength) + (projectName.length > maxProjectLength ? '...' : ''), xPosition, yPosition);

        yPosition += 8;
      });

      // Save the PDF
      const date = new Date().toISOString().split('T')[0];
      const filename = user?.role === 'client' 
        ? `payment-history-client-${date}.pdf`
        : `earnings-report-freelancer-${date}.pdf`;
      pdf.save(filename);

      toast({
        title: 'Export Successful',
        description: user?.role === 'client' 
          ? `Payment history exported as ${filename}`
          : `Earnings report exported as ${filename}`
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not generate PDF report',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Compute stats on the client to ensure Freelancer section shows correct metrics
  const computedStats = useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        totalEarnings: 0,
        monthlyEarnings: 0,
        pendingAmount: 0,
        completedPayments: 0,
        totalPayments: 0,
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalEarnings = 0;
    let monthlyEarnings = 0;
    let pendingAmount = 0;
    let completedPayments = 0;

    for (const p of payments) {
      if (p.status === 'completed') {
        totalEarnings += p.amount;
        completedPayments += 1;
        const created = new Date(p.createdAt);
        if (created.getMonth() === currentMonth && created.getFullYear() === currentYear) {
          monthlyEarnings += p.amount;
        }
      } else if (p.status === 'pending' || p.status === 'processing') {
        pendingAmount += p.amount;
      }
    }

    return {
      totalEarnings,
      monthlyEarnings,
      pendingAmount,
      completedPayments,
      totalPayments: payments.length,
    };
  }, [payments]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {user?.role === 'client' ? 'Payment History' : 'Earnings & Payments'}
        </h1>
        <p className="text-muted-foreground">Manage your payments and transactions</p>
        <div className="mt-4 flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div>
            <Button variant="outline" onClick={() => setIsProjectDialogOpen(true)} className="w-72 justify-between">
              {selectedProjectId === 'all' ? 'All projects' : projects.find(p => p.id === selectedProjectId)?.title ?? 'Project'}
            </Button>

            <CommandDialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
              <div className="p-2">
                <CommandInput placeholder="Search projects..." />
                <CommandList>
                  <CommandItem onSelect={() => { setSelectedProjectId('all'); setCurrentPage(1); setIsProjectDialogOpen(false); }}>
                    All projects
                  </CommandItem>
                  {projects.length === 0 && <CommandEmpty>No projects</CommandEmpty>}
                  {projects.map((p) => (
                    <CommandItem key={p.id} onSelect={() => { setSelectedProjectId(p.id); setCurrentPage(1); setIsProjectDialogOpen(false); }}>
                      {p.title}
                    </CommandItem>
                  ))}
                </CommandList>
              </div>
            </CommandDialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {(stats || payments) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <IndianRupee className="h-8 w-8  text-green-500" />
                {/* <DollarSign className="h-8 w-8 text-green-500" /> */}
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {user?.role === 'client' ? 'Total Spent' : 'Total Earnings'}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats?.totalEarnings ?? computedStats.totalEarnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {user?.role === 'client' ? 'This Month Spent' : 'This Month Earned'}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats?.monthlyEarnings ?? computedStats.monthlyEarnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {user?.role === 'client' ? 'Pending Payments' : 'Pending Earnings'}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats?.pendingAmount ?? computedStats.pendingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {stats?.completedPayments ?? computedStats.completedPayments} / {stats?.totalPayments ?? computedStats.totalPayments}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              {user?.role === 'client' ? 'All Payments' : 'All Earnings'}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isExporting}>
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {user?.role === 'client' ? 'Payment History' : 'Earnings History'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {/* <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" /> */}
                  <p className="text-lg">
                    {user?.role === 'client' ? 'No payments found' : 'No earnings found'}
                  </p>
                  <p className="text-sm">
                    {user?.role === 'client' 
                      ? 'Your payment history will appear here' 
                      : 'Your earnings history will appear here'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(payment.status)}
                          <div>
                            <p className="font-medium">{payment.project?.title ?? 'Untitled Project'}</p>
                            <p className="text-sm text-muted-foreground">
                              {user?.role === 'client' 
                                ? `Freelancer: ${payment.freelancer?.name ?? 'Unknown'}`
                                : `Client: ${payment.client?.name ?? 'Unknown'}`
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payment.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPayment(payment); setIsDetailOpen(true); }}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Completed payments will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Pending payments will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Failed payments will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Payment Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          {selectedPayment ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Project ID</p>
                <p className="font-medium">{selectedPayment.project?._id ?? '—'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{selectedPayment.client?.name ?? '—'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Freelancer</p>
                <p className="font-medium">{selectedPayment.freelancer?.name ?? '—'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Amount sent</p>
                <p className="font-medium">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{selectedPayment.status ? selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1) : '—'}</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Project ID</p>
                  <p className="font-medium">{selectedPayment.project?._id ?? '—'}</p>
                </div>
                {selectedPayment.project?._id && (
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(selectedPayment.project?._id), 'Project ID')}>Copy</Button>
                )}
              </div>

              {selectedPayment.paymentDetails?.transactionId && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-medium">{selectedPayment.paymentDetails.transactionId}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(selectedPayment.paymentDetails?.transactionId), 'Transaction ID')}>Copy</Button>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="font-medium">
                  {(() => {
                    const t = selectedPayment.paymentType;
                    if (t === 'task_completion') return `Timeline task complete${selectedPayment.metadata?.taskTitle ? ` — ${selectedPayment.metadata.taskTitle}` : selectedPayment.timelineItem ? ` — ${selectedPayment.timelineItem.title}` : ''}`;
                    if (t === 'partial_payment') return `Partial payment${selectedPayment.metadata?.taskTitle ? ` — ${selectedPayment.metadata.taskTitle}` : selectedPayment.timelineItem ? ` — ${selectedPayment.timelineItem.title}` : ''}`;
                    if (t === 'final_payment') return 'Final payment (project completion)';
                    if (t === 'milestone') return `Milestone payment${selectedPayment.metadata?.taskTitle ? ` — ${selectedPayment.metadata.taskTitle}` : ''}`;
                    return selectedPayment.description || (selectedPayment.metadata?.taskTitle ? selectedPayment.metadata.taskTitle : 'Payment');
                  })()}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString() : '—'}</p>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div>No payment selected</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
