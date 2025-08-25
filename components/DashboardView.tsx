
import React, { useMemo, useState } from 'react';
import { TransactionRecord, IncomeRecord, InvestmentTransferRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { InformationCircleIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, BanknotesIcon, HashtagIcon } from './common/Icons';

interface DashboardViewProps {
  transactions: TransactionRecord[];
  incomeRecords: IncomeRecord[];
  investmentTransferRecords: InvestmentTransferRecord[];
}

const EXPENSE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82Ca9D', '#FF5733', '#C70039', '#900C3F', '#581845'];
const INCOME_COLORS = ['#34D399', '#FBBF24', '#60A5FA', '#EC4899', '#A78BFA', '#2DD4BF', '#F472B6', '#FB923C', '#818CF8', '#C084FC'];
const INVESTMENT_COLORS = ['#A020F0', '#7DF9FF', '#FFD700', '#FF7F50', '#6495ED', '#DE3163', '#9FE2BF', '#40E0D0', '#CCCCFF', '#FFBF00'];


const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-semibold text-sm">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="text-xs">{`$${value.toFixed(2)}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" className="text-xs">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

const StatCard: React.FC<{title: string, value: React.ReactNode, icon: React.ReactNode, valueColor?: string, subText?: string}> = ({ title, value, icon, valueColor, subText}) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-4 h-full">
        <div className={`p-3 rounded-full ${valueColor ? (valueColor.includes('green') ? 'bg-green-100' : (valueColor.includes('red') ? 'bg-red-100' : (valueColor.includes('purple') ? 'bg-purple-100' : 'bg-blue-100'))) : 'bg-blue-100'}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <div className={`text-2xl font-bold ${valueColor || 'text-gray-900'}`}>
                {value}
            </div>
            {subText && <p className="text-xs text-gray-500">{subText}</p>}
        </div>
    </div>
);


const DashboardView: React.FC<DashboardViewProps> = ({ transactions, incomeRecords, investmentTransferRecords }) => {
  const [activeExpensePieIndex, setActiveExpensePieIndex] = useState(0);
  const [activeIncomePieIndex, setActiveIncomePieIndex] = useState(0);
  const [activeInvestmentTypePieIndex, setActiveInvestmentTypePieIndex] = useState(0);
  const [activeInvestmentPlatformPieIndex, setActiveInvestmentPlatformPieIndex] = useState(0);

  const onExpensePieEnter = (_: any, index: number) => setActiveExpensePieIndex(index);
  const onIncomePieEnter = (_: any, index: number) => setActiveIncomePieIndex(index);
  const onInvestmentTypePieEnter = (_: any, index: number) => setActiveInvestmentTypePieIndex(index);
  const onInvestmentPlatformPieEnter = (_: any, index: number) => setActiveInvestmentPlatformPieIndex(index);
  
  const totalExpenses = useMemo(() => transactions.reduce((sum, t) => sum + t.amountPaid, 0), [transactions]);
  const totalIncome = useMemo(() => incomeRecords.reduce((sum, i) => sum + i.amountReceived, 0), [incomeRecords]);
  const netBalance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  const categorySpend = useMemo(() => {
    const spend: { [key: string]: number } = {};
    transactions.forEach(t => {
      if (t.expenseType) spend[t.expenseType] = (spend[t.expenseType] || 0) + t.amountPaid;
    });
    return Object.entries(spend)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10); 
  }, [transactions]);

  const topIncomeSources = useMemo(() => {
    const income: { [key: string]: number } = {};
    incomeRecords.forEach(i => {
      if (i.incomeType) income[i.incomeType] = (income[i.incomeType] || 0) + i.amountReceived;
    });
    return Object.entries(income)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [incomeRecords]);

  const monthlyExpenseData = useMemo(() => {
    const spend: { [key: string]: number } = {}; 
    transactions.forEach(t => {
      const monthYear = t.dateOfPayment.substring(0, 7); 
      spend[monthYear] = (spend[monthYear] || 0) + t.amountPaid;
    });
    return Object.entries(spend)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name)); 
  }, [transactions]);

  const monthlyCombinedData = useMemo(() => {
    const combined: { [monthYear: string]: { income: number, expense: number } } = {};
    
    incomeRecords.forEach(i => {
      const monthYear = i.dateOfReceipt.substring(0, 7);
      combined[monthYear] = combined[monthYear] || { income: 0, expense: 0 };
      combined[monthYear].income += i.amountReceived;
    });

    transactions.forEach(t => {
      const monthYear = t.dateOfPayment.substring(0, 7);
      combined[monthYear] = combined[monthYear] || { income: 0, expense: 0 };
      combined[monthYear].expense += t.amountPaid;
    });

    return Object.entries(combined)
      .map(([name, values]) => ({ name, income: values.income, expense: values.expense }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions, incomeRecords]);

  // Investment & Transfer Analytics
  const investmentTransferSummaryData = useMemo(() => {
    const totalByCurrency: Record<string, number> = {};
    investmentTransferRecords.forEach(r => {
        totalByCurrency[r.currency] = (totalByCurrency[r.currency] || 0) + r.amountTransferred;
    });
    const recordCount = investmentTransferRecords.length;
    return { totalByCurrency, recordCount };
  }, [investmentTransferRecords]);

  const topInvestmentTransferTypes = useMemo(() => {
    const byType: { [key: string]: number } = {};
    investmentTransferRecords.forEach(r => {
      if (r.transferType) byType[r.transferType] = (byType[r.transferType] || 0) + r.amountTransferred;
    });
    return Object.entries(byType)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);
  }, [investmentTransferRecords]);
  
  const topInvestmentPlatforms = useMemo(() => {
    const byPlatform: { [key: string]: number } = {};
    investmentTransferRecords.forEach(r => {
      if (r.transferToPlatform) byPlatform[r.transferToPlatform] = (byPlatform[r.transferToPlatform] || 0) + r.amountTransferred;
    });
    return Object.entries(byPlatform)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);
  }, [investmentTransferRecords]);

  const monthlyInvestmentActivity = useMemo(() => {
    const activity: { [key: string]: number } = {}; 
    investmentTransferRecords.forEach(r => {
      const monthYear = r.dateOfTransfer.substring(0, 7); 
      activity[monthYear] = (activity[monthYear] || 0) + r.amountTransferred;
    });
    return Object.entries(activity)
      .map(([name, value]) => ({ name, value })) // 'value' represents sum of amountTransferred
      .sort((a, b) => a.name.localeCompare(b.name)); 
  }, [investmentTransferRecords]);


  if (transactions.length === 0 && incomeRecords.length === 0 && investmentTransferRecords.length === 0) {
    return (
      <div className="text-center py-10">
        <InformationCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Dashboard Unavailable</h2>
        <p className="text-gray-500">Please upload and process data to view the dashboard, or adjust global filters.</p>
      </div>
    );
  }

  const netBalanceColor = netBalance >= 0 ? 'text-green-600' : 'text-red-600';
  const netBalanceIcon = netBalance >= 0 ? <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" /> : <ArrowTrendingDownIcon className="w-6 h-6 text-red-500" />;
  
  const formattedInvestmentTotal = Object.entries(investmentTransferSummaryData.totalByCurrency)
    .map(([_, amount]) => `${amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
    .join(', ') || "N/A";


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Financial Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Income" value={totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} icon={<CurrencyDollarIcon className="w-6 h-6 text-green-500"/>} valueColor="text-green-600" />
        <StatCard title="Total Expenses" value={totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} icon={<CurrencyDollarIcon className="w-6 h-6 text-red-500"/>} valueColor="text-red-600" />
        <StatCard title="Net Balance" value={netBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} icon={netBalanceIcon} valueColor={netBalanceColor} />
        <StatCard 
            title="Total Invested/Transferred" 
            value={formattedInvestmentTotal}
            subText={investmentTransferSummaryData.recordCount > 0 ? `Across ${investmentTransferSummaryData.recordCount} records` : "No records"}
            icon={<BanknotesIcon className="w-6 h-6 text-purple-500"/>} 
            valueColor="text-purple-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Expense Categories */}
        <div className="bg-white p-6 rounded-lg shadow-lg h-[450px] flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Top 10 Expense Categories</h3>
          {categorySpend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeExpensePieIndex}
                  activeShape={renderActiveShape}
                  data={categorySpend}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={onExpensePieEnter}
                >
                  {categorySpend.map((entry, index) => (
                    <Cell key={`cell-expense-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center flex-grow flex items-center justify-center">No expense data matching current filters.</p>}
        </div>

        {/* Top Income Sources */}
        <div className="bg-white p-6 rounded-lg shadow-lg h-[450px] flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Top 10 Income Sources</h3>
          {topIncomeSources.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIncomePieIndex}
                  activeShape={renderActiveShape}
                  data={topIncomeSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  fill="#82ca9d"
                  dataKey="value"
                  onMouseEnter={onIncomePieEnter}
                >
                  {topIncomeSources.map((entry, index) => (
                    <Cell key={`cell-income-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center flex-grow flex items-center justify-center">No income data matching current filters.</p>}
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white p-6 rounded-lg shadow-lg h-[450px] flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Monthly Expenses</h3>
           {monthlyExpenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpenseData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="value" name="Total Expenses" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
           ) : <p className="text-gray-500 text-center flex-grow flex items-center justify-center">No expense data matching current filters for this chart.</p>}
        </div>

        {/* Monthly Income vs Expense */}
        <div className="bg-white p-6 rounded-lg shadow-lg h-[450px] flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Monthly Income vs. Expense</h3>
          {monthlyCombinedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCombinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="income" name="Total Income" fill="#34D399" />
                <Bar dataKey="expense" name="Total Expenses" fill="#FBBF24" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center flex-grow flex items-center justify-center">No data matching current filters for this chart.</p>}
        </div>

        {/* Top Investment/Transfer Types */}
        <div className="bg-white p-6 rounded-lg shadow-lg h-[450px] flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Top Investment/Transfer Types</h3>
          {topInvestmentTransferTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeInvestmentTypePieIndex}
                  activeShape={renderActiveShape}
                  data={topInvestmentTransferTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  fill="#A020F0" 
                  dataKey="value"
                  onMouseEnter={onInvestmentTypePieEnter}
                >
                  {topInvestmentTransferTypes.map((entry, index) => (
                    <Cell key={`cell-inv-type-${index}`} fill={INVESTMENT_COLORS[index % INVESTMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `Sum: ${value.toLocaleString(undefined, {style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center flex-grow flex items-center justify-center">No investment/transfer data for this chart.</p>}
        </div>

        {/* Top Transfer Destinations/Platforms */}
        <div className="bg-white p-6 rounded-lg shadow-lg h-[450px] flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Top Transfer Destinations/Platforms</h3>
          {topInvestmentPlatforms.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeInvestmentPlatformPieIndex}
                  activeShape={renderActiveShape}
                  data={topInvestmentPlatforms}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  fill="#7DF9FF"
                  dataKey="value"
                  onMouseEnter={onInvestmentPlatformPieEnter}
                >
                  {topInvestmentPlatforms.map((entry, index) => (
                    <Cell key={`cell-inv-platform-${index}`} fill={INVESTMENT_COLORS[index % INVESTMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `Sum: ${value.toLocaleString(undefined, {style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center flex-grow flex items-center justify-center">No investment/transfer data for this chart.</p>}
        </div>

        {/* Monthly Investment/Transfer Activity */}
        <div className="bg-white p-6 rounded-lg shadow-lg h-[450px] flex flex-col lg:col-span-2"> {/* Span 2 if it's the last one in a 2-col grid */}
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Monthly Investment/Transfer Activity</h3>
           {monthlyInvestmentActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyInvestmentActivity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => value.toLocaleString()} />
                <Tooltip formatter={(value: number) => `Total: ${value.toLocaleString(undefined, {style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
                <Legend />
                <Bar dataKey="value" name="Total Transferred Amount" fill={INVESTMENT_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
           ) : <p className="text-gray-500 text-center flex-grow flex items-center justify-center">No investment/transfer data for this chart.</p>}
        </div>

      </div>
    </div>
  );
};

export default DashboardView;
